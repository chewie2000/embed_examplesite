'use client';

import { useState, useEffect } from 'react';

/**
 * SigmaEmbed
 *
 * Fetches a signed embed URL from /api/sigma/jwt then renders
 * the Sigma iframe. Handles loading, error, and unconfigured states.
 *
 * @param {{ mode?: string }} props
 *   mode — optional mode string passed to /api/sigma/jwt?mode=<mode>
 *          Maps to a mode-prefixed SIGMA_BASE_URL in .env.local
 *          (e.g. mode="dashboard" → DASHBOARD_SIGMA_BASE_URL)
 */
export default function SigmaEmbed({ mode = '' }) {
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
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading Sigma embed…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <div>
          <p className="font-semibold text-gray-800 mb-1">Sigma embed not configured</p>
          <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
            {error}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 text-left text-xs font-mono text-gray-500 max-w-sm w-full space-y-1">
          <p className="font-sans font-semibold text-gray-600 mb-2 not-italic">Required in .env.local</p>
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
