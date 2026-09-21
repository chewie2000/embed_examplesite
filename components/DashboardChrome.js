'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import ContentTree from './ContentTree';
import JwtInspector from './JwtInspector';
import ExpiryBadge from './ExpiryBadge';
import { useDashboardChrome } from '@/lib/dashboard-context';
import { LEGACY_EXAMPLES } from '@/lib/legacy-examples';

const NAV_LINKS = LEGACY_EXAMPLES.map((e) => ({
  href: `/dashboard/legacy/${e.slug}`,
  label: e.title,
  icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
}));

export default function DashboardChrome({ user, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    jwts, pageTitle,
    inspectorOpen, setInspectorOpen,
    sessionLength, regenerate,
    treeRefreshSignal,
  } = useDashboardChrome();

  const isBrowseView = pathname.startsWith('/dashboard/browse/');
  const browseUrlId = isBrowseView ? pathname.split('/dashboard/browse/')[1] : undefined;
  const browseBookmarkId = searchParams.get('bookmark') || undefined;

  const handleSelectWorkbook = (node) => {
    const qs = new URLSearchParams({ name: node.name });
    router.push(`/dashboard/browse/${node.urlId}?${qs.toString()}`);
  };

  const handleSelectBookmark = (node) => {
    const qs = new URLSearchParams({ name: node.name, bookmark: node.bookmarkId, auto: '1' });
    if (node.parentName) qs.set('parent', node.parentName);
    router.push(`/dashboard/browse/${node.urlId}?${qs.toString()}`);
  };

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
          <span className="text-ink-secondary">{isBrowseView ? 'Content Browser' : 'Analytics'}</span>
          <svg className="w-3 h-3 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-ink-primary font-medium">{pageTitle}</span>
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

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-64 shrink-0 border-r border-black/[0.06] bg-white flex flex-col">
          <div className="p-3 gap-0.5 flex flex-col shrink-0">
            <p className="text-[10px] font-semibold text-ink-secondary uppercase tracking-widest mb-2 px-2 pt-1">
              Analytics
            </p>
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-600 border border-brand-500/20'
                      : 'text-ink-secondary hover:text-ink-primary hover:bg-black/[0.03] border border-transparent'
                  }`}
                >
                  <span className={isActive ? 'text-brand-500' : 'text-zinc-400'}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Content Browser — persistent tree, scoped to the logged-in embed user via the Sigma REST API */}
          <div className="flex-1 min-h-0 flex flex-col border-t border-black/[0.06] pt-2">
            <p className="text-[10px] font-semibold text-ink-secondary uppercase tracking-widest mb-1 px-3">
              Content Browser
            </p>
            <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-2">
              <ContentTree
                compact
                selectedUrlId={isBrowseView && !browseBookmarkId ? browseUrlId : undefined}
                selectedBookmarkId={isBrowseView ? browseBookmarkId : undefined}
                onSelectWorkbook={handleSelectWorkbook}
                onSelectBookmark={handleSelectBookmark}
                refreshSignal={treeRefreshSignal}
              />
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col overflow-hidden p-4 gap-3">

          {/* Utility bar — kept separate from the page content below so it
              stays put regardless of which route is active. */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {isBrowseView && (
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary border border-black/[0.06] hover:border-black/[0.14] rounded-lg px-3 py-1.5 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to use cases
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs text-ink-secondary border border-black/[0.06] rounded-lg px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-mint-500 animate-pulse" />
              Live
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {children}
          </div>
        </main>
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
