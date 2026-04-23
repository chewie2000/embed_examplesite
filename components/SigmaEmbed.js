'use client';

import { useState, useEffect } from 'react';

export default function SigmaEmbed({ mode = '', onJwt }) {
  const [embedUrl, setEmbedUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEmbedUrl() {
      try {
        const params = mode ? `?mode=${encodeURIComponent(mode)}` : '';
        const res = await fetch(`/api/sigma/jwt${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate embed URL.');
        setEmbedUrl(data.embedUrl);
        if (onJwt && data.jwt) onJwt(data.jwt);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEmbedUrl();
  }, [mode]);

  if (loading) {
    return (
      <div className="w-full h-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-32 rounded-md bg-white/[0.04] animate-pulse" />
          <div className="h-7 w-20 rounded-md bg-white/[0.04] animate-pulse" />
          <div className="flex-1" />
          <div className="h-7 w-24 rounded-md bg-white/[0.04] animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-xl bg-white/[0.04] animate-pulse" />
        <div className="space-y-2">
          <div className="h-8 rounded-lg bg-white/[0.04] animate-pulse" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-zinc-200 mb-1">Sigma embed not configured</p>
          <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">{error}</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4 text-left text-xs font-mono text-zinc-500 max-w-sm w-full space-y-1">
          <p className="font-sans font-medium text-zinc-400 mb-2">Required in .env.local</p>
          <p>SIGMA_CLIENT_ID=your_client_id</p>
          <p>SIGMA_SECRET=your_secret</p>
          <p>SIGMA_BASE_URL=https://app.sigmacomputing.com/...</p>
          <p>SESSION_SECRET=a_random_32_char_string</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={embedUrl}
      className="w-full h-full border-0"
      title="Sigma Analytics"
      allow="fullscreen"
    />
  );
}
