'use client';

import { useState, useEffect, useRef } from 'react';

// Triggers our retry overlay before Chrome's ~30s ERR_TIMED_OUT page would render.
const IFRAME_LOAD_TIMEOUT_MS = 25_000;
const FETCH_SLOW_WARNING_MS = 8_000;
// There's no confirmation event for workbook:mode:update itself, so bookmark
// actions that depend on Explore mode already being active (select, and the
// select-then-update pairing) wait this long after sending mode:update /
// select before firing the next message — otherwise Sigma can silently drop
// or reject them if they arrive before the mode switch has finished.
const BOOKMARK_ACTION_DELAY_MS = 700;

export default function SigmaEmbed({
  mode = '', urlId, label, onJwt, initialEmbedUrl, initialJwt, sessionLength, refreshKey = 0,
  showModeToggle = false, initialBookmarkId = null, autoExplore = false, onBookmarkChange, onBookmarkDeleted,
}) {
  // Distinct key for ad hoc content-browser embeds (discovered urlId) vs the
  // pre-configured {mode}_SIGMA_BASE_URL examples — used for onJwt/inspector keying.
  const jwtKey = urlId ? `tree:${urlId}` : mode;

  const [embedUrl, setEmbedUrl] = useState(initialEmbedUrl || null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!initialEmbedUrl);
  const [slowLoad, setSlowLoad] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeSlow, setIframeSlow] = useState(false);
  const [iframeTimedOut, setIframeTimedOut] = useState(false);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [workbookMode, setWorkbookMode] = useState('view');
  const [bookmarkId, setBookmarkId] = useState(initialBookmarkId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', text } | null
  const iframeRef = useRef(null);
  // bookmarkId we most recently asked Sigma to delete, cleared once ondelete
  // confirms it. Lets the watchdog below tell you if Sigma never responded at
  // all, instead of the action silently appearing to do nothing.
  const pendingDeleteIdRef = useRef(null);

  const getTargetOrigin = () => {
    try {
      return new URL(embedUrl).origin;
    } catch {
      return null;
    }
  };

  const postToIframe = (payload) => {
    const targetOrigin = getTargetOrigin();
    if (!targetOrigin) return;
    iframeRef.current?.contentWindow?.postMessage(payload, targetOrigin);
  };

  // Sends the Sigma Embed SDK's inbound `workbook:mode:update` postMessage event
  // to switch the iframe's interaction mode. No-ops silently on Sigma's side if
  // the embed user's account type lacks the required permission (e.g. "Full
  // explore" for explore mode) — there's no error we can surface for that case.
  // https://help.sigmacomputing.com/docs/inbound-event-reference
  const sendWorkbookMode = (nextMode) => {
    setWorkbookMode(nextMode);
    postToIframe({ type: 'workbook:mode:update', mode: nextMode });
    // Entering Explore with an existing bookmark: auto-select it so Save
    // always has something to update, rather than erroring on first click.
    // Delayed — see BOOKMARK_ACTION_DELAY_MS.
    if (nextMode === 'explore' && bookmarkId) {
      setTimeout(() => postToIframe({ type: 'workbook:bookmark:select', bookmarkId }), BOOKMARK_ACTION_DELAY_MS);
    }
  };

  const persistBookmark = async (entry) => {
    try {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlId, bookmarkId: entry?.id ?? null, name: entry?.name }),
      });
    } catch {
      // best-effort — the Sigma-side bookmark still exists even if our
      // mapping fails to persist; a page refresh's fresh GET will re-sync.
    }
  };

  const handleSave = () => {
    if (!bookmarkId) {
      const name = `${label || 'Exploration'} — ${new Date().toLocaleString()}`;
      postToIframe({ type: 'workbook:bookmark:create', name, isDefault: false, isShared: false });
      return;
    }
    // Always re-select right before updating, even if we believe it's already
    // selected — cheap and idempotent, and removes any doubt about whether an
    // earlier auto-select (on switching to Explore) actually landed in time.
    postToIframe({ type: 'workbook:bookmark:select', bookmarkId });
    setTimeout(() => postToIframe({ type: 'workbook:bookmark:update' }), BOOKMARK_ACTION_DELAY_MS);
  };

  const handleDeleteClick = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 4000);
      return;
    }
    setConfirmingDelete(false);
    // Same select-first pattern as update — the docs don't document a
    // "selected" prerequisite for delete, but it's consistent with the rest
    // of the bookmark API and cheap to do regardless.
    postToIframe({ type: 'workbook:bookmark:select', bookmarkId });
    pendingDeleteIdRef.current = bookmarkId;
    setTimeout(() => {
      postToIframe({ type: 'workbook:bookmark:delete', bookmarkId });
      // Watchdog — if neither ondelete nor workbook:error ever arrives, say so
      // explicitly rather than leaving it looking like nothing happened.
      setTimeout(() => {
        if (pendingDeleteIdRef.current === bookmarkId) {
          setFeedback({
            type: 'error',
            text: 'Sigma never responded to the delete request — open the browser devtools console for any workbook:error / postMessage logs.',
          });
        }
      }, 4000);
    }, BOOKMARK_ACTION_DELAY_MS);
  };

  // Outbound events from the iframe — bookmark confirmations and errors.
  // https://help.sigmacomputing.com/docs/outbound-event-reference
  useEffect(() => {
    function handleMessage(event) {
      const targetOrigin = getTargetOrigin();
      if (!targetOrigin || event.origin !== targetOrigin) return;
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (typeof data.type === 'string' && data.type.startsWith('workbook:')) {
        console.log('[SigmaEmbed] outbound event:', data);
      }

      if (data.type === 'workbook:bookmark:oncreate') {
        // Explicitly select the new bookmark rather than assume Sigma does —
        // guarantees the very next Save can call update, not fail on it. No
        // delay needed here: creating a bookmark only happens while already
        // in Explore mode, so there's no pending mode switch to race against.
        postToIframe({ type: 'workbook:bookmark:select', bookmarkId: data.bookmarkId });
        setBookmarkId(data.bookmarkId);
        persistBookmark({ id: data.bookmarkId, name: data.bookmarkName });
        setFeedback({ type: 'success', text: `Bookmark "${data.bookmarkName}" saved.` });
        onBookmarkChange?.();
        // Explore → Save → View: reinforces the save as a discrete action
        // rather than leaving the user sitting in an open-ended Explore session.
        setTimeout(() => sendWorkbookMode('view'), BOOKMARK_ACTION_DELAY_MS);
      } else if (data.type === 'workbook:bookmark:onupdate') {
        setFeedback({ type: 'success', text: 'Bookmark updated.' });
        setTimeout(() => sendWorkbookMode('view'), BOOKMARK_ACTION_DELAY_MS);
      } else if (data.type === 'workbook:bookmark:ondelete') {
        pendingDeleteIdRef.current = null;
        setBookmarkId(null);
        persistBookmark(null);
        setFeedback({ type: 'success', text: 'Bookmark deleted.' });
        onBookmarkDeleted?.();
      } else if (data.type === 'workbook:error') {
        pendingDeleteIdRef.current = null;
        const text = data.message || 'Something went wrong with that bookmark action.';
        setFeedback({ type: 'error', text: data.code ? `${text} (${data.code})` : text });
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedUrl, urlId]);

  // Auto-dismiss feedback banner
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Opened via the tree's bookmark row: once loaded, switch to Explore and
  // select the bookmark automatically so the user lands on their saved version.
  useEffect(() => {
    if (!iframeLoaded || !autoExplore) return;
    sendWorkbookMode('explore');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeLoaded]);

  // Notify parent of server-side generated JWT on mount
  useEffect(() => {
    if (initialEmbedUrl && initialJwt && onJwt) {
      onJwt(jwtKey, initialJwt, initialEmbedUrl);
    }
  }, []);

  // Client-side fetch — used when no initial data, mode/urlId changes, sessionLength changes, or refreshKey bumps
  useEffect(() => {
    // Skip fetch only on the very first render when we have server-side data and no overrides yet
    if (initialEmbedUrl && sessionLength === undefined && refreshKey === 0 && localRefreshKey === 0) return;

    setEmbedUrl(null);
    setError(null);
    setLoading(true);
    setSlowLoad(false);
    setIframeLoaded(false);
    setIframeTimedOut(false);
    setWorkbookMode('view');
    setBookmarkId(initialBookmarkId);
    setConfirmingDelete(false);
    setFeedback(null);

    async function fetchEmbedUrl() {
      try {
        const params = new URLSearchParams();
        if (urlId) params.set('urlId', urlId);
        else if (mode) params.set('mode', mode);
        if (sessionLength !== undefined) params.set('sessionLength', String(sessionLength));
        const qs = params.toString();
        const res = await fetch(`/api/sigma/jwt${qs ? `?${qs}` : ''}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate embed URL.');
        setEmbedUrl(data.embedUrl);
        if (onJwt && data.jwt) onJwt(jwtKey, data.jwt, data.embedUrl);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEmbedUrl();
  }, [mode, urlId, sessionLength, refreshKey, localRefreshKey]);

  // Progressive loading warning during JWT fetch
  useEffect(() => {
    if (!loading) { setSlowLoad(false); return; }
    const timer = setTimeout(() => setSlowLoad(true), FETCH_SLOW_WARNING_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  // Iframe load timeout — fires our overlay BEFORE Chrome shows its own error page
  useEffect(() => {
    if (!embedUrl || iframeLoaded) return;
    const timer = setTimeout(() => setIframeTimedOut(true), IFRAME_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [embedUrl, iframeLoaded, localRefreshKey, refreshKey]);

  // Sigma workbooks that haven't been viewed recently can take a while to "wake up"
  // (compute + warehouse connection spin-up) on first load. Surface a reassuring
  // message well before the hard timeout, so it doesn't look stuck.
  useEffect(() => {
    if (!embedUrl || iframeLoaded) { setIframeSlow(false); return; }
    const timer = setTimeout(() => setIframeSlow(true), FETCH_SLOW_WARNING_MS);
    return () => clearTimeout(timer);
  }, [embedUrl, iframeLoaded, localRefreshKey, refreshKey]);

  const retry = () => {
    setIframeLoaded(false);
    setIframeTimedOut(false);
    setIframeSlow(false);
    setLocalRefreshKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="w-full h-full p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-6 w-28 rounded-md bg-white/[0.04] animate-pulse" />
          <div className="h-6 w-16 rounded-md bg-white/[0.04] animate-pulse" />
          <div className="flex-1" />
          <div className="h-6 w-20 rounded-md bg-white/[0.04] animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
        <div className="h-36 rounded-xl bg-white/[0.04] animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-7 rounded-lg bg-white/[0.04] animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-white/[0.03] animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
          ))}
        </div>
        {slowLoad && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-xs text-amber-400/80">Sigma is taking longer than usual — still loading…</p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-zinc-200 text-sm mb-1">
            {label ? `"${label}" not configured` : 'Embed not configured'}
          </p>
          <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">{error}</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3 text-left text-[10px] font-mono text-zinc-500 max-w-xs w-full space-y-1">
          <p className="font-sans font-medium text-zinc-400 mb-1.5">Required in .env.local</p>
          <p>SIGMA_CLIENT_ID=your_client_id</p>
          <p>SIGMA_SECRET=your_secret</p>
          <p>{mode ? `${mode.toUpperCase()}_SIGMA_BASE_URL=...` : 'SIGMA_BASE_URL=...'}</p>
        </div>
        <button
          onClick={retry}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/[0.18] px-4 py-2 rounded-lg transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      {/* View/Explore mode toggle — its own strip above the iframe, so it can
          never sit on top of embedded content (workbooks vary in what they
          render near the top of the page). Sends the Embed SDK's
          workbook:mode:update inbound event to the iframe. */}
      {showModeToggle && (
        <div className="shrink-0 flex flex-col border-b border-white/[0.06] bg-[#0d0d10]">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              {workbookMode === 'explore' && (
                <button
                  onClick={handleSave}
                  disabled={!iframeLoaded}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {bookmarkId ? 'Update bookmark' : 'Save as bookmark'}
                </button>
              )}
              {autoExplore && bookmarkId && (
                <button
                  onClick={handleDeleteClick}
                  disabled={!iframeLoaded}
                  title="Delete your saved bookmark for this workbook"
                  className={`text-xs px-2.5 py-1 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    confirmingDelete
                      ? 'bg-red-500/20 text-red-300'
                      : 'text-zinc-500 hover:text-red-300 hover:bg-red-500/10'
                  }`}
                >
                  {confirmingDelete ? 'Confirm delete?' : 'Delete bookmark'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              {['view', 'explore'].map((m) => (
                <button
                  key={m}
                  onClick={() => sendWorkbookMode(m)}
                  disabled={!iframeLoaded}
                  title={m === 'explore' ? 'Requires the embed user\'s account type to allow Explore ("Full explore" permission)' : undefined}
                  className={`text-xs px-2.5 py-1 rounded-md capitalize transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    workbookMode === m
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {feedback && (
            <div className={`flex items-center gap-1.5 px-2.5 pb-1.5 text-[11px] ${feedback.type === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${feedback.type === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`} />
              {feedback.text}
            </div>
          )}
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <iframe
          ref={iframeRef}
          key={localRefreshKey}
          src={embedUrl}
          className="w-full h-full border-0"
          title={label || 'Sigma Analytics'}
          allow="fullscreen"
          onLoad={() => setIframeLoaded(true)}
        />

        {/* Pre-load shimmer while iframe is still loading */}
        {!iframeLoaded && !iframeTimedOut && (
          <div className="absolute inset-0 bg-[#0d0d10] flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-500">Loading Sigma workbook…</p>
              {iframeSlow && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <p className="text-xs text-amber-400/80 max-w-xs text-center leading-relaxed">
                    First load after a while can take longer — Sigma is warming up the workbook.
                  </p>
                </div>
              )}
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
                The workbook didn't load within {IFRAME_LOAD_TIMEOUT_MS / 1000} seconds. This sometimes happens on first load — Sigma may need to warm up.
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
            <p className="text-[10px] text-zinc-600">A fresh JWT will be issued.</p>
          </div>
        )}
      </div>
    </div>
  );
}
