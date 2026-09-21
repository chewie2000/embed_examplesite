'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import JwtInspector from './JwtInspector';
import ExpiryBadge from './ExpiryBadge';
import { useDashboardChrome } from '@/lib/dashboard-context';

// Breadcrumb prefix per area of the dashboard. The page itself supplies the
// second half via setPageTitle().
function sectionLabel(pathname) {
  if (pathname.startsWith('/dashboard/legacy/browse/')) return 'Content Browser';
  if (pathname.startsWith('/dashboard/legacy')) return 'Legacy Examples';
  return 'Use Cases';
}

/**
 * Chrome shared by every /dashboard route: top nav and the JWT inspector.
 *
 * Deliberately does NOT include a sidebar — the example switcher and Content
 * Browser belong to the Legacy Examples use case (see LegacySidebar), not to
 * every route. Each route composes its own body row, so the gallery can be a
 * clean full-width grid while Legacy Examples gets its left panel.
 */
export default function DashboardChrome({ user, children }) {
  const pathname = usePathname();
  const {
    jwts, pageTitle,
    inspectorOpen, setInspectorOpen,
    sessionLength, regenerate,
  } = useDashboardChrome();

  const inspectorEmbeds = Object.entries(jwts).map(([mode, v]) => ({ mode, label: v.label }));

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Top nav ── */}
      <header className="h-14 shrink-0 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl flex items-center px-4 gap-4 sticky top-0 z-40">

        <Link href="/" className="flex items-center gap-2 group mr-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center shadow-card">
            <span className="text-white text-base font-bold">🎯</span>
          </div>
          <span className="text-sm font-semibold text-ink-primary hidden sm:block">Embed Success</span>
        </Link>

        <div className="h-5 w-px bg-black/10" />

        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-ink-secondary hover:text-ink-primary transition-colors">
            {sectionLabel(pathname)}
          </Link>
          {pageTitle && (
            <>
              <svg className="w-3 h-3 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-ink-primary font-medium">{pageTitle}</span>
            </>
          )}
        </div>

        <div className="flex-1" />

        {/* Live JWT expiry countdown — visible without opening the inspector */}
        {Object.values(jwts)[0]?.jwt && (
          <ExpiryBadge jwt={Object.values(jwts)[0].jwt} />
        )}

        <button
          onClick={() => setInspectorOpen(true)}
          title="View JWT claims"
          className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-brand-600 border border-black/[0.06] hover:border-brand-500/30 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
          JWT Claims
          {Object.keys(jwts).length > 1 && (
            <span className="bg-brand-50 text-brand-600 text-[10px] px-1.5 py-0.5 rounded-full">
              {Object.keys(jwts).length}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-medium text-ink-primary">{user.name}</span>
            <span className="text-[10px] text-ink-secondary">{user.email}</span>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* ── Body — each route supplies its own layout (sidebar or not) ── */}
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>

      <JwtInspector
        jwts={jwts}
        embeds={inspectorEmbeds}
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        sessionLength={sessionLength}
        onRegenerate={regenerate}
      />
    </div>
  );
}
