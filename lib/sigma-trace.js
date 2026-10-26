/**
 * Call tracing for the Agent Chat walkthrough (server-side only).
 *
 * Every real Sigma REST call the agent flow makes is recorded as an entry so
 * the page can show customers exactly what happened: method, path, status,
 * timing, and a trimmed request/response. Secrets are never recorded —
 * anything keyed like a secret, token, assertion or authorization header is
 * masked before it leaves this module.
 *
 * A `trace` is any object with push(entry) and length (a plain array works).
 */
const SECRET_KEY = /secret|token|assertion|authorization|password/i;
// token_type, actor_token_type, subject_token_type describe a token; they hold no secret.
const NOT_SECRET_KEY = /_type$/i;
const MASK = '••••••••';
const isSecretKey = (key) => SECRET_KEY.test(key) && !NOT_SECRET_KEY.test(key);

export function redact(value, depth = 0) {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, isSecretKey(k) ? MASK : redact(v, depth + 1)]));
  }
  if (typeof value === 'string' && value.length > 400) return `${value.slice(0, 400)}… (${value.length} chars)`;
  return value;
}

export function pathOf(url) {
  try { const u = new URL(url); return u.pathname + u.search; } catch { return url; }
}

/** Form bodies (URLSearchParams) as a redacted plain object. */
export function formToObject(body) {
  return redact(Object.fromEntries(new URLSearchParams(String(body)).entries()));
}

export function record(trace, entry) {
  if (!trace) return null;
  const full = { id: trace.length + 1, at: Date.now(), ...entry };
  trace.push(full);
  return full;
}

/**
 * fetch() that records itself. `request` is the already-summarised body to
 * show (never the raw one); `summarize(json)` shapes the response. Pass
 * readBody:false for streaming responses so the stream is left untouched.
 */
export async function tracedFetch(trace, url, init = {}, { step, label, request, summarize, readBody = true, note } = {}) {
  const started = Date.now();
  const res = await fetch(url, init);
  const ms = Date.now() - started;
  let response;
  if (readBody) {
    const json = await res.clone().json().catch(() => null);
    response = json == null ? undefined : (summarize ? summarize(json) : redact(json));
  } else {
    response = { note: 'Streaming response — events shown below as they arrive.' };
  }
  const entry = record(trace, { step, label, method: init.method || 'GET', path: pathOf(url), status: res.status, ms, request, response, note });
  return { res, entry };
}
