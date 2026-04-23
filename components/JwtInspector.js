'use client';

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
  const display = Array.isArray(value)
    ? value.length === 0 ? '[]' : value.join(', ')
    : typeof value === 'object' && value !== null
    ? JSON.stringify(value, null, 2)
    : String(value);

  const isTimestamp = label === 'iat' || label === 'exp';
  const formatted = isTimestamp
    ? `${new Date(value * 1000).toUTCString()} (${display})`
    : display;

  return (
    <div className="py-2.5 border-b border-white/[0.04] last:border-0">
      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xs break-all ${typeof value === 'object' ? 'font-mono text-indigo-300' : 'text-zinc-200'}`}>
        {typeof value === 'object' && value !== null && !Array.isArray(value)
          ? <pre className="whitespace-pre-wrap font-mono text-indigo-300">{formatted}</pre>
          : formatted}
      </p>
    </div>
  );
}

export default function JwtInspector({ jwt, open, onClose }) {
  if (!open) return null;

  const claims = decodeJwt(jwt);

  const claimDescriptions = {
    sub: 'Subject — Sigma user identity',
    iss: 'Issuer — your Sigma Client ID',
    jti: 'JWT ID — unique token identifier (replay protection)',
    iat: 'Issued at',
    exp: 'Expires at',
    account_type: 'Sigma account type',
    teams: 'Sigma team memberships',
    user_attributes: 'Row-level security attributes',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-96 max-w-full z-50 bg-[#0d0d10] border-l border-white/[0.07] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-white">JWT Claims Inspector</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">Decoded Sigma embed token</p>
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

        {/* Claims */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {claims ? (
            <>
              <div className="bg-indigo-500/[0.08] border border-indigo-500/20 rounded-lg px-4 py-3 mb-4">
                <p className="text-[10px] text-indigo-300 leading-relaxed">
                  This token is signed server-side with your Sigma secret and sent to Sigma to authenticate the embed. It is never stored in the browser.
                </p>
              </div>
              {Object.entries(claims).map(([key, value]) => (
                <div key={key}>
                  <ClaimRow label={key} value={value} />
                  {claimDescriptions[key] && (
                    <p className="text-[10px] text-zinc-600 mb-1 -mt-1">{claimDescriptions[key]}</p>
                  )}
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-zinc-500 text-center mt-8">No token available yet.</p>
          )}
        </div>

        {/* Raw token */}
        {jwt && (
          <div className="px-5 py-4 border-t border-white/[0.06]">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Raw token</p>
            <div className="bg-white/[0.03] rounded-lg p-3 font-mono text-[9px] text-zinc-600 break-all leading-relaxed max-h-24 overflow-y-auto">
              {jwt}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
