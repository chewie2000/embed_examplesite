'use client';

import { useState, useEffect } from 'react';

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function useCountdown(exp) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!exp) return;
    const tick = () => setRemaining(Math.max(0, exp - Math.floor(Date.now() / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [exp]);
  return remaining;
}

export default function ExpiryBadge({ exp, jwt }) {
  // Accept either an exp claim directly or a JWT to decode
  const resolvedExp = exp ?? (jwt ? decodeJwt(jwt)?.exp : null);
  const remaining = useCountdown(resolvedExp);
  if (remaining === null) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = remaining === 0 ? 'Expired' : `${mins}m ${String(secs).padStart(2, '0')}s`;
  const color = remaining === 0
    ? 'bg-red-500/15 border-red-500/30 text-red-400'
    : remaining < 60
    ? 'bg-red-500/10 border-red-500/20 text-red-400'
    : remaining < 300
    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';

  return (
    <span
      title="JWT expiry — controlled by the exp claim. Click 'JWT Claims' → Session tab to adjust."
      className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-full border ${color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${remaining === 0 ? 'bg-red-500' : remaining < 300 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
      {remaining > 0 ? `JWT in ${label}` : 'JWT expired'}
    </span>
  );
}
