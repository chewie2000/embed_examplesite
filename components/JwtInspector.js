'use client';

import { useState, useCallback } from 'react';
import ExpiryBadge from './ExpiryBadge';

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function parseMaskedEmbed(embedUrl) {
  try {
    const url = new URL(embedUrl);
    const org = url.pathname.split('/')[1] ?? '…';
    const params = new URLSearchParams(url.search);
    const lines = [];
    const filters = {}; // non-`:`-prefixed params = URL filters from Clerk metadata
    for (const [key] of params.entries()) {
      lines.push({ key, value: key === ':jwt' ? '***' : params.get(key), isFilter: !key.startsWith(':') });
      if (!key.startsWith(':')) filters[key] = params.get(key);
    }
    return {
      base: `GET ${url.origin}/${org}/workbook/***`,
      params: lines,
      filters,
    };
  } catch {
    return { base: 'GET ***', params: [], filters: {} };
  }
}

// ── Claims ────────────────────────────────────────────────────────────────────

const claimMeta = {
  sub:            { desc: 'Subject — Sigma user identity (maps to Sigma account)', rls: false },
  iss:            { desc: 'Issuer — your Sigma Client ID', rls: false },
  jti:            { desc: 'JWT ID — unique per request, prevents replay attacks', rls: false },
  iat:            { desc: 'Issued at', rls: false },
  exp:            { desc: 'Expires at', rls: false },
  account_type:   { desc: 'Sigma account type (viewer, creator, admin)', rls: false },
  teams:          { desc: 'Sigma team memberships', rls: false },
  user_attributes:{ desc: 'Row-level security attributes — Sigma filters data using these values', rls: true },
};

function ClaimRow({ label, value, exp }) {
  const isTimestamp = label === 'iat' || label === 'exp';
  const isObject = typeof value === 'object' && value !== null;
  const isArray = Array.isArray(value);
  const isRls = claimMeta[label]?.rls === true;

  let display;
  if (isTimestamp) {
    display = `${new Date(value * 1000).toUTCString()} (${value})`;
  } else if (isArray) {
    display = value.length === 0 ? '[ ]' : value.join(', ');
  } else if (isObject) {
    display = JSON.stringify(value, null, 2);
  } else {
    display = String(value);
  }

  return (
    <div className={`py-2.5 border-b border-white/[0.04] last:border-0 ${isRls ? 'rounded-lg bg-amber-500/[0.06] border border-amber-500/20 px-3 my-1' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
        {isRls && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
            RLS
          </span>
        )}
        {label === 'exp' && <ExpiryBadge exp={value} />}
      </div>
      {isObject && !isArray ? (
        <pre className="text-[11px] whitespace-pre-wrap font-mono text-amber-300 leading-relaxed">{display}</pre>
      ) : (
        <p className={`text-xs break-all ${isRls ? 'text-amber-200' : 'text-zinc-200'}`}>{display}</p>
      )}
    </div>
  );
}

// ── Security callout ──────────────────────────────────────────────────────────

function SecurityCallout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-zinc-900 border border-white/[0.06] rounded-lg mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <span className="text-xs font-medium text-zinc-300">Why is this secure?</span>
        </div>
        <svg className={`w-3.5 h-3.5 text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2.5 border-t border-white/[0.04] pt-3">
          {[
            { icon: '🔒', title: 'Secret never leaves the server', body: 'SIGMA_SECRET is only accessible server-side. The browser receives a signed token, never the key used to sign it.' },
            { icon: '⏱️', title: 'Tokens are time-limited', body: 'Every token has an exp claim. Even if intercepted, it expires quickly and cannot be reused.' },
            { icon: '🎲', title: 'Replay attacks prevented', body: 'The jti claim is a unique UUID generated per request. Sigma rejects tokens with a jti it has already seen.' },
            { icon: '🚫', title: 'Users cannot modify claims', body: 'The signature covers the entire payload. Any tampering with sub, user_attributes, or any other claim invalidates the signature.' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="flex gap-2.5">
              <span className="text-sm mt-0.5 shrink-0">{icon}</span>
              <div>
                <p className="text-[11px] font-medium text-zinc-300">{title}</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5">{body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Claims panel ──────────────────────────────────────────────────────────────

function ClaimsPanel({ jwts, embeds }) {
  const [activeEmbed, setActiveEmbed] = useState(embeds[0]?.mode ?? '');
  const [copied, setCopied] = useState(false);
  const entry = jwts[activeEmbed];
  const jwt = entry?.jwt;
  const embedUrl = entry?.embedUrl;
  const claims = jwt ? decodeJwt(jwt) : null;
  const isMulti = embeds.length > 1;

  const copyToken = useCallback(async () => {
    if (!jwt) return;
    await navigator.clipboard.writeText(jwt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [jwt]);

  return (
    <div className="py-3">
      {isMulti && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {embeds.map((e) => (
            <button
              key={e.mode}
              onClick={() => setActiveEmbed(e.mode)}
              className={`text-[11px] px-3 py-1 rounded-lg border transition-all ${
                activeEmbed === e.mode
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                  : 'bg-white/[0.03] border-white/[0.06] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      )}

      {claims ? (
        <>
          <SecurityCallout />

          {/* Endpoints */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 mb-4 space-y-2.5">
            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Endpoints</p>
            <div>
              <p className="text-[10px] text-zinc-500 mb-1">Token issued by</p>
              <code className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded block">
                GET /api/sigma/jwt{activeEmbed ? `?mode=${activeEmbed}` : ''}
              </code>
            </div>
            {embedUrl && (() => {
              const { base, params, filters } = parseMaskedEmbed(embedUrl);
              const filterEntries = Object.entries(filters);
              return (
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1">Sigma embed API call</p>
                  <div className="text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-2 rounded break-all leading-relaxed">
                    <span className="text-emerald-400 font-semibold">{base}</span>
                    {params.map((p, i) => (
                      <div
                        key={i}
                        className={`pl-2 ${p.isFilter ? 'text-amber-300' : 'text-emerald-600'}`}
                        title={p.isFilter ? 'URL filter from Clerk publicMetadata' : 'Sigma embed control'}
                      >
                        {i === 0 ? '?' : '&'}{p.key}={p.value}
                        {p.isFilter && <span className="text-[9px] text-amber-500 ml-1.5">← from metadata</span>}
                      </div>
                    ))}
                  </div>

                  {/* URL filter params explanation — sits with the API call since they're part of it */}
                  {filterEntries.length > 0 && (
                    <div className="mt-2 bg-amber-500/[0.06] border border-amber-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">URL filters in this call</p>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                          from metadata
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-300/80 leading-relaxed mb-2">
                        These come from Clerk <code className="bg-amber-500/10 px-1 rounded">publicMetadata</code> and are appended to the URL — they are NOT part of the JWT.
                      </p>
                      <div className="space-y-1">
                        {filterEntries.map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2 text-[11px] font-mono">
                            <span className="text-amber-400">{k}</span>
                            <span className="text-amber-600">=</span>
                            <span className="text-amber-200">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Claims */}
          {Object.entries(claims).map(([key, value]) => (
            <div key={key}>
              <ClaimRow label={key} value={value} />
              {claimMeta[key]?.desc && (
                <p className="text-[10px] text-zinc-600 mb-1 -mt-1.5 px-1">{claimMeta[key].desc}</p>
              )}
            </div>
          ))}
        </>
      ) : (
        <p className="text-sm text-zinc-500 text-center mt-8">
          {Object.keys(jwts).length > 0 ? 'Select an embed above.' : 'No token available yet.'}
        </p>
      )}

      {/* Raw token + actions */}
      {jwt && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Raw token</p>
            <div className="flex items-center gap-2">
              <button
                onClick={copyToken}
                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {copied ? (
                  <><svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><span className="text-emerald-400">Copied</span></>
                ) : (
                  <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>Copy</>
                )}
              </button>
              <span className="text-zinc-700">·</span>
              <a
                href={`https://jwt.io/#debugger-io?token=${encodeURIComponent(jwt)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Open in jwt.io ↗
              </a>
            </div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 font-mono text-[9px] text-zinc-600 break-all leading-relaxed max-h-24 overflow-y-auto">
            {jwt}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Flow diagram ──────────────────────────────────────────────────────────────

const FLOW_STEPS = [
  { color: 'zinc',    label: 'User loads dashboard',       endpoint: null,                        detail: 'Clerk session cookie is present from sign-in' },
  { color: 'indigo',  label: 'Request signed embed URL',   endpoint: 'GET /api/sigma/jwt',         detail: 'One request per embed on the page. Session cookie sent automatically.' },
  { color: 'violet',  label: 'Verify Clerk session',       endpoint: 'auth() — Clerk SDK',         detail: 'Confirms the user is authenticated, resolves userId' },
  { color: 'violet',  label: 'Read user profile',          endpoint: 'currentUser() — Clerk SDK',  detail: 'Fetches publicMetadata: sigmaEmail, accountType, teams, userAttributes' },
  { color: 'indigo',  label: 'Sign the JWT locally',        endpoint: 'jose — HS256 / SIGMA_SECRET',detail: 'No API call to Sigma. The JWT is signed on your server using HMAC-SHA256 (HS256) with SIGMA_SECRET as the key. Sigma verifies using the same shared secret — your key never leaves your server.' },
  { color: 'indigo',  label: 'Return embed URL',           endpoint: '{ embedUrl, jwt }',          detail: 'embedUrl contains :jwt= param. Browser sets this as the iframe src. Repeated per embed on the page.' },
  { color: 'emerald', label: 'iframe loads embed URL',     endpoint: 'app.sigmacomputing.com',     detail: 'Sigma verifies the JWT signature using SIGMA_CLIENT_ID + SIGMA_SECRET. Applies RLS from user_attributes.' },
];

const actorColors = {
  zinc:    { dot: 'bg-zinc-500',    badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',       line: 'bg-zinc-700' },
  indigo:  { dot: 'bg-indigo-500',  badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20', line: 'bg-indigo-900' },
  violet:  { dot: 'bg-violet-500',  badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20', line: 'bg-violet-900' },
  emerald: { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', line: 'bg-emerald-900' },
};

function FlowDiagram({ embedCount }) {
  return (
    <div className="py-3">
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { color: 'zinc', label: 'Browser' }, { color: 'indigo', label: 'Next.js server' },
          { color: 'violet', label: 'Clerk' }, { color: 'emerald', label: 'Sigma' },
        ].map(({ color, label }) => (
          <span key={color} className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border ${actorColors[color].badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${actorColors[color].dot}`} />
            {label}
          </span>
        ))}
      </div>

      {embedCount > 1 && (
        <div className="bg-violet-500/[0.08] border border-violet-500/20 rounded-lg px-3 py-2.5 mb-4">
          <p className="text-[10px] text-violet-300 leading-relaxed">
            <span className="font-semibold">{embedCount} embeds on this page.</span> Steps 2 and 6 repeat once per embed — each gets its own independently signed JWT.
          </p>
        </div>
      )}

      {FLOW_STEPS.map((step, i) => {
        const c = actorColors[step.color];
        const isLast = i === FLOW_STEPS.length - 1;
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0 w-6">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${c.dot}`} />
              {!isLast && <div className={`w-px flex-1 my-1 ${c.line}`} />}
            </div>
            <div className="pb-5">
              <p className="text-xs font-medium text-zinc-200 leading-snug">{step.label}</p>
              {step.endpoint && (
                <code className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded border font-mono ${c.badge}`}>
                  {step.endpoint}
                </code>
              )}
              <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{step.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Session length control ────────────────────────────────────────────────────

const PRESETS = [
  { label: '30s',  value: 30,    note: 'Fast expiry demo' },
  { label: '1m',   value: 60 },
  { label: '5m',   value: 300 },
  { label: '1h',   value: 3600,  note: 'Default' },
];

function SessionLengthControl({ sessionLength, onRegenerate }) {
  // Pending value — only applied when the user clicks Apply
  const [pending, setPending] = useState(sessionLength?.toString() ?? '');
  const pendingNumber = parseInt(pending);
  const pendingValid = !isNaN(pendingNumber) && pendingNumber >= 30;
  const hasChange = pending !== (sessionLength?.toString() ?? '');

  const apply = () => {
    if (pendingValid) onRegenerate(pendingNumber);
  };

  return (
    <div className="py-3 space-y-4">
      <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-lg px-3 py-2.5">
        <p className="text-[10px] text-amber-300 leading-relaxed">
          <span className="font-semibold">Demo control.</span> Override the JWT <code className="bg-amber-500/10 px-1 py-0.5 rounded text-amber-200">exp</code> claim to see what happens when a token expires while the embed is in use. Minimum 30 seconds.
        </p>
        <p className="text-[10px] text-amber-300/70 leading-relaxed mt-1.5">
          Select a preset or enter a custom value, then click <span className="font-semibold">Apply & regenerate</span> — the active token is not touched until you do.
        </p>
      </div>

      <div>
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Quick presets</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(({ label, value, note }) => {
            const isPending = pending === String(value);
            const isActive = sessionLength === value;
            return (
              <button
                key={value}
                onClick={() => setPending(String(value))}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                  isPending
                    ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 ring-1 ring-indigo-500/30'
                    : isActive
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/[0.03] border-white/[0.06] text-zinc-300 hover:border-white/[0.12] hover:bg-white/[0.05]'
                }`}
              >
                <p className="text-sm font-mono font-semibold">{label}</p>
                {note && <p className="text-[10px] text-zinc-500 mt-0.5">{note}</p>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Custom (seconds)</p>
        <div className="flex gap-2">
          <input
            type="number"
            min="30"
            max="2592000"
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            placeholder="e.g. 45"
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <p className="text-[10px] text-zinc-600 mt-1.5">Range: 30 – 2,592,000 seconds (30 days max)</p>
      </div>

      <button
        onClick={apply}
        disabled={!pendingValid || !hasChange}
        className="w-full px-3 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors shadow-lg shadow-indigo-500/20"
      >
        Apply & regenerate JWT
      </button>

      <div>
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Active</p>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 flex items-center justify-between">
          <span className="text-xs text-zinc-300 font-mono">
            {sessionLength !== undefined ? `${sessionLength}s` : 'Server default (SESSION_LENGTH)'}
          </span>
          {sessionLength !== undefined && (
            <button
              onClick={() => { setPending(''); onRegenerate(undefined); }}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Reset to default
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function JwtInspector({ jwts, embeds, open, onClose, sessionLength, onRegenerate }) {
  const [tab, setTab] = useState('flow');

  const firstEntry = Object.values(jwts)[0];
  const firstClaims = firstEntry?.jwt ? decodeJwt(firstEntry.jwt) : null;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed top-0 right-0 h-full w-[420px] max-w-full z-50 bg-[#0d0d10] border-l border-white/[0.07] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white">JWT Claims Inspector</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-[10px] text-zinc-500">
                Sigma embed authentication{embeds.length > 1 && ` · ${embeds.length} embeds`}
              </p>
              {firstClaims?.exp && <ExpiryBadge exp={firstClaims.exp} />}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] px-5 gap-4">
          {[['flow', 'Auth Flow'], ['claims', 'Decoded Claims'], ['session', 'Session']].map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5">
          {tab === 'flow' && <FlowDiagram embedCount={embeds.length} />}
          {tab === 'claims' && <ClaimsPanel jwts={jwts} embeds={embeds} />}
          {tab === 'session' && <SessionLengthControl sessionLength={sessionLength} onRegenerate={onRegenerate} />}
        </div>
      </div>
    </>
  );
}
