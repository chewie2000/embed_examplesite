/**
 * Sigma workbook agents (server-side only): discovering which agents a given
 * embed user can reach, and running one.
 *
 * Discovery runs AS the user (an impersonated REST token), so what comes back
 * is what Sigma says that member can access — not what the API client can
 * see. Same two-token split as the plugs-dashboard Agent Hub:
 *   - user token     -> list agents / workbooks (access check)
 *   - service token  -> run the agent
 * The run uses the service token because Sigma has been seen to refuse agent
 * runs under an impersonation token ("Sigma agents can only be run by an
 * authenticated user"). That means the run itself is NOT scoped to the user's
 * row-level security — see the note on the page.
 */
import { SignJWT } from 'jose';
import { getApiBase, getApiCredentials, getApiToken, buildEmbedUserTree } from '@/lib/sigma-api';

export const AGENT_LIMITS = {
  maxMessageChars: 4000,
  maxToolTurns: 8,
  maxHistoryItems: 60,
  maxItemChars: 30_000,
  requestsPerMinute: 20,
};

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
export const isSafeSigmaId = (value) => typeof value === 'string' && SAFE_ID.test(value);

// ── Impersonated (per-user) token ───────────────────────────────────────────
const userTokens = new Map(); // email -> { token, expiresAt }

async function exchangeForUserToken(email) {
  const { clientId, secret } = getApiCredentials('');
  const base = getApiBase('');
  const actorToken = await getApiToken('');

  const subjectToken = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', kid: clientId })
    .setSubject(email)
    .setIssuer(clientId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));

  const res = await fetch(`${base}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Bearer ${actorToken}` },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      actor_token: actorToken,
      actor_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      subject_token: subjectToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Could not act as ${email} in Sigma (${res.status}): ${data.message || data.code || 'token exchange failed'}`);
  }
  return { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
}

export async function getUserApiToken(email) {
  const key = email.trim().toLowerCase();
  const cached = userTokens.get(key);
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;
  const fresh = await exchangeForUserToken(email);
  userTokens.set(key, fresh);
  return fresh.token;
}

async function userGet(token, path) {
  const res = await fetch(`${getApiBase('')}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Sigma API GET ${path} failed (${res.status}): ${data.message || data.code || 'unknown error'}`);
  return data;
}

function normalizeAgent(entry, workbookId) {
  if (!entry || !isSafeSigmaId(entry.agentId)) return null;
  return {
    agentId: entry.agentId,
    workbookId: entry.workbookId || workbookId || null,
    name: entry.agentName || entry.name || 'Workbook agent',
    description: entry.agentDescription || entry.description || '',
  };
}

async function listAgentsForWorkbook(token, workbookId) {
  const agents = [];
  let page = null;
  for (let i = 0; i < 5; i++) {
    const qs = page ? `?page=${encodeURIComponent(page)}` : '';
    const data = await userGet(token, `/workbooks/${encodeURIComponent(workbookId)}/agents${qs}`);
    agents.push(...(data.entries ?? []).map((e) => normalizeAgent(e, workbookId)).filter(Boolean));
    page = data.nextPage || data.nextPageToken || null;
    if (!page) break;
  }
  return agents;
}

// Workbook rows from the user's own file tree: id + urlId + name.
function workbooksFromTree(nodes, out = []) {
  for (const node of nodes ?? []) {
    if (node.type === 'workbook' && node.id) out.push({ workbookId: node.id, workbookUrlId: node.urlId, workbookName: node.name });
    if (node.children) workbooksFromTree(node.children, out);
  }
  return out;
}

async function mapLimit(items, limit, fn) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }));
  return results;
}

const discoveryCache = new Map(); // email -> { agents, expiresAt }
const DISCOVERY_TTL_MS = 60_000;

/**
 * Every agent the signed-in user can reach, as Sigma reports it for that user.
 * Two sources, merged:
 *   1. GET /v2/workbookAgents as the user (agents the user can edit)
 *   2. GET /v2/workbooks/{id}/agents as the user, for each workbook in the
 *      user's own file tree (covers view-only access, which the org-wide
 *      listing leaves out)
 * If impersonation fails this throws — it never falls back to the service
 * token, because that would widen the list beyond what the user can see.
 */
export async function discoverUserAgents(email) {
  const key = email.trim().toLowerCase();
  const cached = discoveryCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.agents;

  const token = await getUserApiToken(email);
  const found = new Map(); // workbookId::agentId -> agent
  const add = (agent) => agent && found.set(`${agent.workbookId}::${agent.agentId}`, agent);

  try {
    const listed = await apiGetAllAs(token, '/workbookAgents?pageSize=100');
    listed.map((e) => normalizeAgent(e)).forEach(add);
  } catch (error) {
    console.error('[sigma-agents] /workbookAgents as user failed:', error.message);
  }

  const { tree } = await buildEmbedUserTree(email);
  const workbooks = workbooksFromTree(tree);
  await mapLimit(workbooks, 6, async (wb) => {
    try {
      (await listAgentsForWorkbook(token, wb.workbookId)).forEach(add);
    } catch (error) {
      // A workbook the user can open but not list agents for is just skipped.
      console.error(`[sigma-agents] agents for ${wb.workbookId}:`, error.message);
    }
  });

  // Attach workbook names / urlIds (from the tree, else a user-scoped lookup).
  const byId = new Map(workbooks.map((wb) => [wb.workbookId, wb]));
  const agents = [];
  for (const agent of found.values()) {
    let wb = byId.get(agent.workbookId);
    if (!wb) {
      try {
        const data = await userGet(token, `/workbooks/${encodeURIComponent(agent.workbookId)}`);
        const match = String(data.url || '').match(/\/workbook\/([^/?#]+)/);
        wb = { workbookName: data.name || 'Workbook', workbookUrlId: match?.[1] || data.workbookUrlId || null };
      } catch {
        wb = { workbookName: 'Workbook', workbookUrlId: null };
      }
    }
    agents.push({ ...agent, workbookName: wb.workbookName, workbookUrlId: wb.workbookUrlId });
  }
  agents.sort((a, b) => a.workbookName.localeCompare(b.workbookName) || a.name.localeCompare(b.name));

  discoveryCache.set(key, { agents, expiresAt: Date.now() + DISCOVERY_TTL_MS });
  return agents;
}

async function apiGetAllAs(token, path) {
  const entries = [];
  let page = null;
  for (let i = 0; i < 20; i++) {
    const sep = path.includes('?') ? '&' : '?';
    const data = await userGet(token, `${path}${page ? `${sep}pageToken=${encodeURIComponent(page)}` : ''}`);
    entries.push(...(data.entries ?? []));
    page = data.nextPageToken || null;
    if (!page) break;
  }
  return entries;
}

/** Throws a 404-flavoured error unless the user can currently reach this agent. */
export async function requireUserAgent(email, workbookId, agentId) {
  const agents = await discoverUserAgents(email);
  const agent = agents.find((a) => a.workbookId === workbookId && a.agentId === agentId);
  if (!agent) {
    const error = new Error('This workbook agent is not available to you.');
    error.status = 404;
    throw error;
  }
  return agent;
}

// ── Request validation ──────────────────────────────────────────────────────
export function validateUserMessage(message) {
  if (typeof message !== 'string' || !message.trim()) return { ok: false, error: 'Enter a message.' };
  const text = message.trim();
  if (text.length > AGENT_LIMITS.maxMessageChars) {
    return { ok: false, error: `Messages are limited to ${AGENT_LIMITS.maxMessageChars} characters.` };
  }
  return { ok: true, text };
}

/**
 * The Sigma agent API is stateless, so the browser carries the conversation.
 * Nothing it sends is trusted: only known roles, string content, and
 * well-formed tool calls survive, with size caps.
 */
export function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const clean = [];
  for (const item of history.slice(-AGENT_LIMITS.maxHistoryItems)) {
    if (!item || typeof item !== 'object') continue;
    if (!['user', 'assistant', 'tool'].includes(item.role)) continue;
    const copy = { role: item.role };
    if (typeof item.content === 'string') copy.content = item.content.slice(0, AGENT_LIMITS.maxItemChars);
    if (item.role === 'tool') {
      if (!isSafeSigmaId(item.tool_call_id)) continue;
      copy.tool_call_id = item.tool_call_id;
    }
    if (item.role === 'assistant' && Array.isArray(item.tool_calls)) {
      copy.tool_calls = item.tool_calls
        .filter((c) => c && typeof c.id === 'string' && c.function && typeof c.function.name === 'string')
        .map((c) => ({ id: c.id, type: c.type || 'function', function: { name: c.function.name, arguments: String(c.function.arguments ?? '').slice(0, AGENT_LIMITS.maxItemChars) } }));
      if (!copy.tool_calls.length) delete copy.tool_calls;
    }
    if (copy.content == null && !copy.tool_calls) continue;
    clean.push(copy);
  }
  return clean;
}

/** Calls Sigma with the service token and returns the raw fetch Response (streaming). */
export async function startAgentRun({ workbookId, agentId, messages, email, signal }) {
  const token = await getApiToken('');
  return fetch(`${getApiBase('')}/workbooks/${encodeURIComponent(workbookId)}/agents/${encodeURIComponent(agentId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' },
    body: JSON.stringify({
      messages,
      stream: true,
      maxTurns: AGENT_LIMITS.maxToolTurns,
      metadata: { app: 'embed-examplesite', userEmail: email },
    }),
    signal,
    cache: 'no-store',
  });
}

// ── Stream parsing ──────────────────────────────────────────────────────────
function interpretEvent(json) {
  if (!json || typeof json !== 'object') return [];
  if (json.object === 'agent.run' || Array.isArray(json.output)) return [{ type: 'run', run: json }];
  const type = String(json.type || json.event || '');
  if (type === 'error') return [{ type: 'error', message: json.message || 'The workbook agent could not answer.' }];
  // Reasoning and tool arguments are not the answer; only the answer channel is.
  if (type.startsWith('tool-') || json.tool_calls || json.toolCall) return [{ type: 'status', text: 'Checking workbook data…' }];
  const channel = json.channel || '';
  const delta = typeof json.delta === 'string' ? json.delta : (typeof json.delta?.text === 'string' ? json.delta.text : '');
  if (delta && channel !== 'reasoning' && channel !== 'tool') return [{ type: 'delta', text: delta }];
  return [];
}

/** Incremental parser for Sigma's SSE (or plain-JSON) agent response. */
export function createAgentEventParser() {
  let buffer = '';
  let mode = null;
  let finalRun = null;

  const consumeJson = (value) => {
    const events = interpretEvent(value);
    const run = events.find((e) => e.type === 'run');
    if (run) finalRun = run.run;
    return events;
  };
  const dataOf = (block) => block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('\n');
  const parseData = (data, events) => {
    if (!data || data === '[DONE]') return;
    try { events.push(...consumeJson(JSON.parse(data))); } catch { /* ignore partial/non-JSON frames */ }
  };

  const drainSse = (flush) => {
    const events = [];
    let split = buffer.indexOf('\n\n');
    while (split !== -1) {
      const block = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      parseData(dataOf(block), events);
      split = buffer.indexOf('\n\n');
    }
    if (flush && buffer.trim()) {
      parseData(dataOf(buffer), events);
      buffer = '';
    }
    return events;
  };

  return {
    push(chunk) {
      buffer += chunk;
      if (!mode) {
        const t = buffer.trimStart();
        if (t.startsWith('data:') || t.startsWith('event:')) mode = 'sse';
        else if (t.startsWith('{') || t.startsWith('[')) mode = 'json';
      }
      return mode === 'sse' ? drainSse(false) : [];
    },
    finish() {
      if (mode === 'sse') return drainSse(true);
      const t = buffer.trim();
      buffer = '';
      if (!t) return [];
      try { return consumeJson(JSON.parse(t)); } catch { return []; }
    },
    get finalRun() { return finalRun; },
  };
}

export function extractAssistantText(output) {
  if (!Array.isArray(output)) return '';
  const answers = output.filter((i) => i && i.role === 'assistant' && typeof i.content === 'string' && i.content.trim() && !i.tool_calls);
  return answers.length ? answers[answers.length - 1].content.trim() : '';
}

/**
 * Items from a finished run worth replaying next turn. Drops the builder's
 * own instructions (echoed back as a leading user item) and any tool call
 * whose result is missing, which makes Sigma reject or stall the next turn.
 */
export function replayableOutput(output) {
  if (!Array.isArray(output)) return [];
  const answered = new Set(output.filter((i) => i?.role === 'tool').map((i) => i.tool_call_id));
  const items = [];
  for (const item of output) {
    if (!item || typeof item !== 'object' || !item.role) continue;
    const copy = { role: item.role };
    if (item.content != null) copy.content = item.content;
    if (Array.isArray(item.tool_calls)) {
      copy.tool_calls = item.tool_calls.filter((c) => answered.has(c.id));
      if (!copy.tool_calls.length) delete copy.tool_calls;
    }
    if (item.tool_call_id) copy.tool_call_id = item.tool_call_id;
    if (copy.role === 'assistant' && copy.content == null && !copy.tool_calls) continue;
    items.push(copy);
  }
  // Skip the echoed builder instructions: everything before the first assistant item.
  const firstAssistant = items.findIndex((i) => i.role === 'assistant');
  return firstAssistant > 0 ? items.slice(firstAssistant) : items;
}
