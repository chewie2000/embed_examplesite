'use client';

import { useState, useEffect } from 'react';

// Triggers our retry overlay before Chrome's ~30s ERR_TIMED_OUT page would render.
const IFRAME_LOAD_TIMEOUT_MS = 25_000;

/**
 * Renders a Sigma embed from a pre-signed URL.
 *
 * Unlike components/SigmaEmbed.js, this component never fetches a JWT — the
 * embed URL is signed server-side in app/interested/page.js with a STATIC sub,
 * and no JWT-minting endpoint is exposed for anonymous visitors. "Retry"
 * therefore just re-mounts the iframe with the same (still-valid) URL; if the
 * embed session has fully expired, a page refresh issues a fresh one.
 */
export default function AnonymousEmbed({ embedUrl, label = 'Sigma Analytics' }) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeTimedOut, setIframeTimedOut] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Iframe load timeout — fires our overlay BEFORE Chrome shows its own error page
  useEffect(() => {
    if (iframeLoaded) return;
    const timer = setTimeout(() => setIframeTimedOut(true), IFRAME_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [iframeLoaded, refreshKey]);

  const retry = () => {
    setIframeLoaded(false);
    setIframeTimedOut(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="relative w-full h-full">
      <iframe
        key={refreshKey}
        src={embedUrl}
        className="w-full h-full border-0"
        title={label}
        allow="fullscreen"
        onLoad={() => setIframeLoaded(true)}
      />

      {/* Pre-load shimmer while iframe is still loading */}
      {!iframeLoaded && !iframeTimedOut && (
        <div className="absolute inset-0 bg-[#0d0d10] flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-500">Loading Sigma workbook…</p>
          </div>
        </div>
      )}

      {/* Timeout overlay — covers Chrome's native error page */}
      {iframeTimedOut && (
        <div className="absolute inset-0 bg-[#0d0d10] flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-zinc-200 text-sm mb-1">Sigma is taking too long to respond</p>
            <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
              The workbook didn&apos;t load within {IFRAME_LOAD_TIMEOUT_MS / 1000} seconds. This sometimes
              happens on first load — Sigma may need to warm up.
            </p>
          </div>
          <button
            onClick={retry}
            className="inline-flex items-center gap-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
