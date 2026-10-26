'use client';

import { useState } from 'react';

/**
 * "How it works" — the Sigma side of headless agent embedding, step by step.
 * Deliberately about Sigma's REST API only: sign-in and hosting are
 * incidental, and any server that can keep a client secret and call these
 * endpoints will do. Snippets are plain curl / fetch.
 *
 * Findings labelled "Verified" were tested against a live Sigma org on
 * 2026-10-26 (bead embed_examplesite-9yf); "Reported" ones come from the
 * plugs-dashboard reference app and have not been reproduced here.
 */
const DOC = {
  start: { label: 'Get started with the Sigma REST API', href: 'https://help.sigmacomputing.com/reference/get-started-sigma-api' },
  creds: { label: 'Generate API client credentials', href: 'https://help.sigmacomputing.com/reference/generate-client-credentials' },
  token: { label: 'Get access token', href: 'https://help.sigmacomputing.com/reference/post-token' },
  impersonate: { label: 'Impersonate users', href: 'https://help.sigmacomputing.com/docs/impersonate-users' },
  listAgents: { label: 'List agents in a workbook', href: 'https://help.sigmacomputing.com/reference/list-agents-in-workbook' },
  runAgent: { label: 'Run a Sigma agent', href: 'https://help.sigmacomputing.com/reference/run-agent' },
  callApi: { label: 'Call Sigma agents with the API', href: 'https://help.sigmacomputing.com/docs/call-agents-with-the-api' },
  embedAgent: { label: 'Embed a Sigma agent', href: 'https://help.sigmacomputing.com/docs/embed-agent' },
  about: { label: 'About Sigma agents', href: 'https://help.sigmacomputing.com/docs/sigma-agents' },
};

const STEPS = [
  {
    n: 1,
    title: 'Authenticate your app with an API client',
    endpoint: 'POST /v2/auth/token',
    docs: [DOC.creds, DOC.token, DOC.start],
    body: [
      'Create an API client in Sigma (Administration → Developer Access) and keep its client ID and secret on your server. Exchange them for a short-lived bearer token using the client-credentials grant.',
      'Per Sigma’s docs, the credentials must belong to a user with at least Can view access to the workbook that holds the agent, because the agent runs with that user’s permissions. The API host depends on your Sigma cloud and region (for example AWS US is aws-api.sigmacomputing.com). Cache the token and reuse it until just before it expires.',
    ],
    curl: `curl -X POST "$SIGMA_API/v2/auth/token" \\
  -d grant_type=client_credentials \\
  -d client_id="$CLIENT_ID" \\
  -d client_secret="$CLIENT_SECRET"`,
    js: `const res = await fetch(\`\${SIGMA_API}/v2/auth/token\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }),
});
const { access_token, expires_in } = await res.json();`,
  },
  {
    n: 2,
    title: 'Discover the agents a user can reach',
    endpoint: 'GET /v2/workbooks/{workbookId}/agents',
    docs: [DOC.listAgents, DOC.impersonate],
    body: [
      'Each workbook agent belongs to a workbook. List a workbook’s agents to get each agentId, name and description. There is also an org-wide list, GET /v2/workbookAgents.',
      'In our testing the org-wide list returned only agents the caller can edit, so for an API client that merely views them it can come back empty. Asking each workbook directly did return the agent.',
      'To list agents as the signed-in user rather than as your API client, exchange for a user token first (below). The token acts as the user, with your API client as the actor, so Sigma answers with what that user can see. Sigma’s docs describe this as an admin-level flow: the caller needs the Admin account type.',
    ],
    curl: `curl "$SIGMA_API/v2/workbooks/$WORKBOOK_ID/agents" \\
  -H "Authorization: Bearer $TOKEN"`,
    js: `// 1. A JWT naming the user, signed HS256 with your client secret
const subject_token = signJwt(
  { sub: userEmail, iss: CLIENT_ID },
  CLIENT_SECRET,
  { alg: 'HS256', kid: CLIENT_ID },
);

// 2. Exchange it (your API client's own token is the actor)
const res = await fetch(\`\${SIGMA_API}/v2/auth/token\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: \`Bearer \${apiToken}\`,
  },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    actor_token: apiToken,
    actor_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    subject_token,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
  }),
});
const { access_token: userToken } = await res.json();

// 3. List a workbook's agents as that user
const agents = await (await fetch(
  \`\${SIGMA_API}/v2/workbooks/\${workbookId}/agents\`,
  { headers: { Authorization: \`Bearer \${userToken}\` } },
)).json();`,
  },
  {
    n: 3,
    title: 'Run an agent',
    endpoint: 'POST /v2/workbooks/{workbookId}/agents/{agentId}',
    docs: [DOC.runAgent, DOC.callApi],
    body: [
      'Send the conversation as a list of messages. Set stream to true to receive the answer as it is written, and maxTurns to cap how many tool steps the agent may take. metadata is free-form and is yours to use for tracing.',
      'The agent runs its own tools against the workbook’s data sources, using the instructions its builder configured in Sigma. Your app does not choose the SQL.',
    ],
    curl: `curl -X POST "$SIGMA_API/v2/workbooks/$WORKBOOK_ID/agents/$AGENT_ID" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{ "role": "user", "content": "Which region has the highest gross revenue?" }],
    "stream": false,
    "maxTurns": 8,
    "metadata": { "app": "my-app" }
  }'`,
    js: `const res = await fetch(
  \`\${SIGMA_API}/v2/workbooks/\${workbookId}/agents/\${agentId}\`,
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json',
    },
    body: JSON.stringify({ messages, stream: true, maxTurns: 8, metadata: { app: 'my-app' } }),
  },
);`,
  },
  {
    n: 4,
    title: 'Read the answer as it streams',
    endpoint: 'text/event-stream (or JSON when stream is false)',
    docs: [DOC.callApi, DOC.runAgent],
    body: [
      'With stream on, the response is server-sent events: lines starting data: followed by JSON, separated by a blank line. While the agent works you receive progress events (reasoning and tool activity) that are not the answer, then text deltas for the answer itself, then a final agent.run object.',
      'The final object carries the runId, status, usage and the full output, including every tool call and result. Keep it: you need it to continue the conversation (next step).',
      'Event details here follow the plugs-dashboard reference app; check them against the API reference for your version.',
    ],
    js: `const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  let end;
  while ((end = buffer.indexOf('\\n\\n')) !== -1) {
    const frame = buffer.slice(0, end);
    buffer = buffer.slice(end + 2);
    const data = frame.split('\\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('\\n');
    if (!data || data === '[DONE]') continue;
    const event = JSON.parse(data);
    if (event.object === 'agent.run') finalRun = event;      // full output + usage
    else if (event.delta && event.channel !== 'reasoning' && event.channel !== 'tool') showText(event.delta);
  }
}`,
  },
  {
    n: 5,
    title: 'Continue the conversation (the API is stateless)',
    endpoint: 'messages[] on every call',
    docs: [DOC.runAgent],
    body: [
      'Sigma does not keep the conversation for you. On each turn, send the whole history: your earlier user messages plus the output of each previous run, then the new question.',
      'Two things to clean up before replaying: the output begins with the agent’s own instructions echoed back, which you should drop; and any tool call without a matching tool result will make the next turn fail or stall, so remove it.',
      'This demo keeps that history in your browser, which is why a conversation can resume later.',
    ],
    js: `// after a completed run
history.push({ role: 'user', content: question }, ...replayable(run.output));

// next turn
const body = { messages: [...history, { role: 'user', content: nextQuestion }], stream: true };`,
  },
  {
    n: 6,
    title: 'Handle runs that stop early',
    endpoint: 'status and incompleteDetails.reason',
    docs: [DOC.runAgent],
    body: [
      'A run can finish as incomplete. The reason tells you what to do: max_turns or token_limit means the agent needed more room, so retry with a higher maxTurns or maxOutputTokens; deadline means it ran out of time, so ask a narrower question.',
      'A stream can also carry an error event (for example a permission error). Surface its message to the user rather than a blank answer.',
    ],
    js: `if (run.status === 'incomplete') {
  switch (run.incompleteDetails?.reason) {
    case 'max_turns':
    case 'token_limit': /* retry with more room, or ask the user to narrow it */ break;
    case 'deadline':    /* narrower question */ break;
  }
}`,
  },
];

const IDENTITY_ROWS = [
  { how: 'API client token (client credentials)', result: 'Runs the agent', status: 'Verified 26 Oct 2026', tone: 'ok', note: 'The run is attributed to the API client’s own service user, not to the person using your app.' },
  { how: 'Token exchange, acting as the user', result: '403 permission_denied: “Sigma agents can only be run by an authenticated user.”', status: 'Verified 26 Oct 2026, for the one user tried', tone: 'bad', note: 'The token genuinely identifies the user (with your API client as the actor), and the agent run refused it. It worked for listing what the user can see. Sigma’s own guide to building a custom agent UI says to impersonate the user on each call, which is not what we saw, so this may depend on the user (for example their account type) or on the platform version. We are checking.' },
  { how: 'impersonate=<email> on the token request', result: 'Runs, but is not impersonating', status: 'Verified 26 Oct 2026', tone: 'warn', note: 'The token that comes back is identical to the plain API client token. Sigma ignores the parameter, so do not treat it as a way to run as the user.' },
  { how: 'A real user session (for example Sigma’s own MCP connector, signed in as the user)', result: 'Runs the agent', status: 'Verified 26 Oct 2026', tone: 'ok', note: 'Shows Sigma can run agents as a genuine signed-in user. Whether an app can obtain such a token for its end users is still being investigated.' },
];

const TONE = { ok: 'text-mint-ink', bad: 'text-red-600', warn: 'text-amber-700' };

export default function AgentWalkthrough({ onShowLive }) {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-1 pb-8 space-y-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight text-ink-primary">Embedding a Sigma agent without embedding a workbook</h2>
          <p className="mt-2 text-sm text-ink-secondary leading-relaxed">
            Sigma workbook agents can be called over the REST API, so your app can offer a chat experience with its own look and feel and no workbook on screen. Your server authenticates to Sigma, finds the agents a user may use, runs one, and streams the answer back to your page. The steps below are the whole Sigma side. Use the <span className="font-medium text-ink-primary">Try it</span> tab to watch each one happen with real calls.
          </p>
          <div className="mt-3 rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-xs text-ink-secondary leading-relaxed">
            <span className="font-medium text-ink-primary">Your app’s side is incidental.</span> This demo signs users in and is hosted with common tools, but none of that is part of the pattern. Any server that can keep the client secret private and call these endpoints will do. The browser never sees the secret or a Sigma bearer token.
          </div>
        </div>

        {STEPS.map((step) => <Step key={step.n} step={step} onShowLive={onShowLive} />)}

        <section className="rounded-xl border border-black/[0.08] shadow-card bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink-secondary">Step 7</p>
              <h3 className="text-base font-medium text-ink-primary">Whose identity runs the agent?</h3>
            </div>
            <button type="button" onClick={() => onShowLive(3)} className="shrink-0 text-xs rounded-lg border border-brand-500/30 bg-brand-50 text-brand-600 px-2.5 py-1">See it live</button>
          </div>
          <p className="mt-2 text-sm text-ink-secondary leading-relaxed">
            This is the part to design carefully. Per Sigma’s docs, the API runs the agent with the calling user’s permissions and row-level security, so the question is which user that is. We tested each way of getting a token against the same agent and the same question.
          </p>
          <div className="mt-3 divide-y divide-black/[0.06] border border-black/[0.06] rounded-lg">
            {IDENTITY_ROWS.map((row) => (
              <div key={row.how} className="p-3">
                <p className="text-sm font-medium text-ink-primary">{row.how}</p>
                <p className={'text-sm ' + TONE[row.tone]}>{row.result}</p>
                <p className="mt-1 text-xs text-ink-secondary leading-relaxed">{row.note}</p>
                <p className="mt-1 text-[11px] text-ink-secondary">{row.status}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-ink-secondary leading-relaxed space-y-2">
            <p><span className="font-medium text-ink-primary">What this demo does:</span> it checks what the signed-in user can see (step 2, as the user) and then runs the agent with the API client’s own credentials (step 3). The check limits which agents a user is offered. The run uses the API client’s user, so the agent sees what that user can see, which is not narrowed by the person’s own row-level security.</p>
            <p><span className="font-medium text-ink-primary">Agents that use external tools</span> (for example GitHub or Notion through MCP) may need the connection to be authorised by a real user. The reference app reports a “re-authorize this MCP server” message when such an agent is run as the API client. Reported, not yet reproduced here.</p>
            <DocLinks docs={[DOC.callApi, DOC.embedAgent, DOC.impersonate]} />
            <p className="text-xs">Still being investigated: whether impersonating a different user (or one with another account type) can run an agent as Sigma’s docs describe, and whether an embedded end user can get a real user-authenticated token.</p>
          </div>
        </section>

        <section className="rounded-xl border border-black/[0.08] bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-ink-secondary mb-2">API help</p>
          <p className="text-xs text-ink-secondary leading-relaxed mb-2">Sigma’s own pages for everything on this page. Each step above links to the ones it uses.</p>
          <DocLinks docs={Object.values(DOC)} />
        </section>
      </div>
    </div>
  );
}

function Step({ step, onShowLive }) {
  const hasCurl = Boolean(step.curl);
  const [lang, setLang] = useState(hasCurl ? 'curl' : 'js');
  const code = lang === 'curl' ? step.curl : step.js;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <section className="rounded-xl border border-black/[0.08] shadow-card bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-ink-secondary">Step {step.n}</p>
          <h3 className="text-base font-medium text-ink-primary">{step.title}</h3>
          <p className="mt-0.5 text-xs font-mono text-ink-secondary break-all">{step.endpoint}</p>
        </div>
        <button type="button" onClick={() => onShowLive(step.n)} className="shrink-0 text-xs rounded-lg border border-brand-500/30 bg-brand-50 text-brand-600 px-2.5 py-1">See it live</button>
      </div>
      <div className="mt-2 space-y-2 text-sm text-ink-secondary leading-relaxed">
        {step.body.map((p) => <p key={p}>{p}</p>)}
      </div>
      {step.docs && <div className="mt-3"><DocLinks docs={step.docs} /></div>}
      {code && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            {hasCurl ? (
              <>
                <LangTab active={lang === 'curl'} onClick={() => setLang('curl')}>curl</LangTab>
                <LangTab active={lang === 'js'} onClick={() => setLang('js')}>JavaScript</LangTab>
              </>
            ) : (
              <span className="text-[11px] text-ink-secondary">JavaScript</span>
            )}
            <button type="button" onClick={copy} className="ml-auto text-[11px] text-ink-secondary hover:text-ink-primary">{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <pre className="text-[12px] leading-relaxed bg-zinc-900 text-zinc-100 rounded-lg p-3 overflow-x-auto"><code>{code}</code></pre>
        </div>
      )}
    </section>
  );
}

function LangTab({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={'text-[11px] rounded-md px-2 py-0.5 border ' + (active ? 'bg-ink-primary text-white border-transparent' : 'border-black/[0.1] text-ink-secondary')}>
      {children}
    </button>
  );
}

function DocLinks({ docs }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {docs.map((doc) => (
        <li key={doc.href}>
          <a
            href={doc.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 border border-brand-500/20 hover:border-brand-500/40 bg-brand-50 px-2.5 py-1 rounded-lg transition-colors"
          >
            {doc.label}
            <span aria-hidden>↗</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
