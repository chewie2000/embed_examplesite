import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  AGENT_LIMITS, isSafeSigmaId, validateUserMessage, sanitizeHistory, requireUserAgent,
  startAgentRun, createAgentEventParser, extractAssistantText, replayableOutput,
} from '@/lib/sigma-agents';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Per-instance, best-effort throttle (serverless instances don't share memory).
const recentRequests = new Map();
function allowRequest(email) {
  const now = Date.now();
  const recent = (recentRequests.get(email) || []).filter((t) => now - t < 60_000);
  if (recent.length >= AGENT_LIMITS.requestsPerMinute) { recentRequests.set(email, recent); return false; }
  recent.push(now);
  recentRequests.set(email, recent);
  return true;
}

const json = (body, status) => NextResponse.json(body, { status });

/**
 * POST /api/sigma/agents/run  { workbookId, agentId, message, history }
 *
 * Re-checks that the signed-in user can reach this agent (as the user), then
 * runs it and re-emits a simplified SSE stream: status | delta | done | error.
 * `done` carries `history` — the replayable run output the browser sends back
 * next turn, because Sigma's agent API is stateless.
 */
export async function POST(request) {
  const user = await currentUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const email = user.publicMetadata?.sigmaEmail || user.emailAddresses[0]?.emailAddress;

  const body = await request.json().catch(() => ({}));
  const { workbookId, agentId } = body;
  const validation = validateUserMessage(body.message);
  if (!isSafeSigmaId(workbookId) && !/^[0-9a-f-]{36}$/.test(String(workbookId))) return json({ error: 'A valid workbook is required.' }, 400);
  if (!isSafeSigmaId(agentId)) return json({ error: 'A valid agent is required.' }, 400);
  if (!validation.ok) return json({ error: validation.error }, 400);
  if (!allowRequest(email)) return json({ error: 'Too many agent requests. Wait a minute and try again.' }, 429);

  try {
    await requireUserAgent(email, workbookId, agentId);
  } catch (error) {
    return json({ error: error.message }, error.status || 502);
  }

  const history = sanitizeHistory(body.history);
  const messages = [...history, { role: 'user', content: validation.text }];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      // Warehouse lookups can leave the stream silent for 30s+; comments keep proxies open.
      const heartbeat = setInterval(() => controller.enqueue(encoder.encode(': keep-alive\n\n')), 10_000);
      const abort = new AbortController();
      request.signal.addEventListener('abort', () => abort.abort());

      try {
        const upstream = await startAgentRun({ workbookId, agentId, messages, email, signal: abort.signal });
        if (!upstream.ok) {
          const text = await upstream.text();
          let message = 'The workbook agent could not answer.';
          try { const parsed = JSON.parse(text); message = parsed.message || parsed.error || message; } catch { /* keep default */ }
          send({ type: 'error', message });
          return;
        }

        const parser = createAgentEventParser();
        const decoder = new TextDecoder();
        let streamed = '';
        let upstreamError = null;
        const handle = (events) => {
          for (const event of events) {
            if (event.type === 'error') upstreamError = upstreamError || event;
            else if (event.type === 'delta') { streamed += event.text; send({ type: 'delta', text: event.text }); }
            else if (event.type === 'status') send({ type: 'status', text: event.text });
          }
        };
        for await (const chunk of upstream.body) handle(parser.push(decoder.decode(chunk, { stream: true })));
        handle(parser.finish());

        if (upstreamError) { send({ type: 'error', message: upstreamError.message }); return; }

        const run = parser.finalRun;
        const text = extractAssistantText(run?.output) || streamed.trim();
        if (!text) {
          const reason = run?.incompleteDetails?.reason;
          send({
            type: 'error',
            message: {
              max_turns: 'The agent needed more steps than allowed before answering. Try a narrower question.',
              token_limit: 'The agent hit its output limit before answering. Try again.',
              deadline: 'The agent took too long to finish. Try again.',
            }[reason] || 'The agent did not return an answer. Try again.',
          });
          return;
        }
        const output = Array.isArray(run?.output) ? replayableOutput(run.output) : [{ role: 'assistant', content: text }];
        send({ type: 'done', text, runId: run?.runId || null, status: run?.status || 'completed', history: [...history, { role: 'user', content: validation.text }, ...output] });
      } catch (error) {
        if (!abort.signal.aborted) {
          console.error('[/api/sigma/agents/run]', error.message);
          send({ type: 'error', message: 'The workbook agent could not answer.' });
        }
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}
