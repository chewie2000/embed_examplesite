'use client';

import { useState } from 'react';

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function ClaimRow({ label, value }) {
  const isTimestamp = label === 'iat' || label === 'exp';
  const isObject = typeof value === 'object' && value !== null;
  const isArray = Array.isArray(value);

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
    <div className="py-2.5 border-b border-white/[0.04] last:border-0">
      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      {isObject && !isArray ? (
        <pre className="text-[11px] whitespace-pre-wrap font-mono text-indigo-300 leading-relaxed">{display}</pre>
      ) : (
        <p className="text-xs text-zinc-200 break-all">{display}</p>
      )}
    </div>
  );
}

const claimDescriptions = {
  sub: 'Subject — Sigma user identity',
  iss: 'Issuer — your Sigma Client ID',
  jti: 'JWT ID — unique per request, prevents replay attacks',
  iat: 'Issued at',
  exp: 'Expires at',
  account_type: 'Sigma account type (viewer, creator, admin)',
  teams: 'Sigma team memberships',
  user_attributes: 'Row-level security attributes passed to Sigma',
};

const FLOW_STEPS = [
  {
    actor: 'Browser',
    color: 'zinc',
    label: 'User loads dashboard',
    endpoint: null,
    detail: 'Clerk session cookie is present from sign-in',
  },
  {
    actor: 'Browser → Server',
    color: 'indigo',
    label: 'Request signed embed URL',
    endpoint: 'GET /api/sigma/jwt',
    detail: 'One request per embed on the page. Session cookie sent automatically.',
  },
  {
    actor: 'Server',
    color: 'violet',
    label: 'Verify Clerk session',
    endpoint: 'auth() — Clerk SDK',
    detail: 'Confirms the user is authenticated, resolves userId',
  },
  {
    actor: 'Server',
    color: 'violet',
    label: 'Read user profile',
    endpoint: 'currentUser() — Clerk SDK',
    detail: 'Fetches publicMetadata: sigmaEmail, accountType, teams, userAttributes',
  },
  {
    actor: 'Server',
    color: 'indigo',
    label: 'Sign the JWT',
    endpoint: 'jose — HS256 / SIGMA_SECRET',
    detail: 'Payload: sub, iss, jti, iat, exp + optional claims. Secret never leaves server.',
  },
  {
    actor: 'Server → Browser',
    color: 'indigo',
    label: 'Return embed URL',
    endpoint: '{ embedUrl, jwt }',
    detail: 'embedUrl contains :jwt= param. Browser sets this as the iframe src. Repeated per embed on the page.',
  },
  {
    actor: 'Browser → Sigma',
    color: 'emerald',
    label: 'iframe loads embed URL',
    endpoint: 'app.sigmacomputing.com',
    detail: 'Sigma verifies the JWT signature using SIGMA_CLIENT_ID + SIGMA_SECRET. Applies RLS from user_attributes.',
  },
];

const actorColors = {
  zinc:    { dot: 'bg-zinc-500',    badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',       line: 'bg-zinc-700' },
  indigo:  { dot: 'bg-indigo-500',  badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20', line: 'bg-indigo-900' },
  violet:  { dot: 'bg-violet-500',  badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20', line: 'bg-violet-900' },
  emerald: { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', line: 'bg-emerald-900' },
};

function FlowDiagram({ embedCount }) {
  return (
    <div className="py-3 space-y-0">
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { color: 'zinc',    label: 'Browser' },
          { color: 'indigo',  label: 'Next.js server' },
          { color: 'violet',  label: 'Clerk' },
          { color: 'emerald', label: 'Sigma' },
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

function maskEmbedUrl(embedUrl) {
  try {
    const url = new URL(embedUrl);
    const parts = url.pathname.split('/');
    // pathname: /org/workbook/WorkbookName-id
    const org = parts[1] ?? '…';
    return `${url.origin}/${org}/workbook/***`;
  } catch {
    return '***';
  }
}

function ClaimsPanel({ jwts, embeds }) {
  const [activeEmbed, setActiveEmbed] = useState(embeds[0]?.mode ?? '');
  const entry = jwts[activeEmbed];
  const jwt = entry?.jwt;
  const embedUrl = entry?.embedUrl;
  const claims = jwt ? decodeJwt(jwt) : null;
  const isMulti = embeds.length > 1;

  return (
    <div className="py-3">
      {/* Embed selector — only shown when multiple embeds on page */}
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
              {!jwts[e.mode] && <span className="ml-1 text-zinc-700">·</span>}
            </button>
          ))}
        </div>
      )}

      {claims ? (
        <>
          <div className="bg-indigo-500/[0.08] border border-indigo-500/20 rounded-lg px-4 py-3 mb-4">
            <p className="text-[10px] text-indigo-300 leading-relaxed">
              Signed server-side with SIGMA_SECRET using HS256. Never stored in the browser — Sigma verifies the signature on every embed load.
            </p>
          </div>

          {/* Endpoints */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 mb-4 space-y-2.5">
            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Endpoints</p>
            <div>
              <p className="text-[10px] text-zinc-500 mb-1">Token issued by</p>
              <code className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded block">
                GET /api/sigma/jwt{activeEmbed ? `?mode=${activeEmbed}` : ''}
              </code>
            </div>
            {embedUrl && (
              <div>
                <p className="text-[10px] text-zinc-500 mb-1">Sigma embed endpoint</p>
                <code className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded block break-all">
                  {maskEmbedUrl(embedUrl)}
                </code>
              </div>
            )}
          </div>
          {Object.entries(claims).map(([key, value]) => (
            <div key={key}>
              <ClaimRow label={key} value={value} />
              {claimDescriptions[key] && (
                <p className="text-[10px] text-zinc-600 mb-1 -mt-1.5">{claimDescriptions[key]}</p>
              )}
            </div>
          ))}
        </>
      ) : (
        <p className="text-sm text-zinc-500 text-center mt-8">
          {jwts && Object.keys(jwts).length > 0 ? 'Select an embed above.' : 'No token available yet.'}
        </p>
      )}
    </div>
  );
}

export default function JwtInspector({ jwts, embeds, open, onClose }) {
  const [tab, setTab] = useState('flow');
  if (!open) return null;

  const activeEmbedJwt = Object.values(jwts)[0]?.jwt;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed top-0 right-0 h-full w-[420px] max-w-full z-50 bg-[#0d0d10] border-l border-white/[0.07] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-white">JWT Claims Inspector</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Sigma embed authentication
              {embeds.length > 1 && ` · ${embeds.length} embeds`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] px-5 gap-4">
          {['flow', 'claims'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 text-xs font-medium capitalize border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'flow' ? 'Auth Flow' : 'Decoded Claims'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5">
          {tab === 'flow' && <FlowDiagram embedCount={embeds.length} />}
          {tab === 'claims' && <ClaimsPanel jwts={jwts} embeds={embeds} />}
        </div>

        {/* Raw token footer */}
        {tab === 'claims' && activeEmbedJwt && (
          <div className="px-5 py-4 border-t border-white/[0.06]">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Raw token</p>
            <div className="bg-white/[0.03] rounded-lg p-3 font-mono text-[9px] text-zinc-600 break-all leading-relaxed max-h-24 overflow-y-auto">
              {activeEmbedJwt}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
