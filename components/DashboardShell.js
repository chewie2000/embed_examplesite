'use client';

import { useState, useCallback } from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import SigmaEmbed from './SigmaEmbed';
import ContentTree from './ContentTree';
import JwtInspector from './JwtInspector';
import ExpiryBadge from './ExpiryBadge';
import ConceptDemoPage from './ConceptDemoPage';

/**
 * NAV_ITEMS — defines the sidebar navigation and the embeds shown per page.
 *
 * Each item has an `embeds` array. Multiple embeds render in a CSS grid.
 * Each embed:
 *   mode  — maps to {MODE}_SIGMA_BASE_URL in .env.local ('' = SIGMA_BASE_URL)
 *   label — displayed as the embed title and in the JWT inspector
 *   span  — grid column span out of 12 (12 = full width, 6 = half, etc.)
 *
 * Example multi-embed page:
 *   embeds: [
 *     { mode: 'kpi',   label: 'KPIs',        span: 4 },
 *     { mode: 'sales', label: 'Sales Trend',  span: 8 },
 *   ]
 */
const NAV_ITEMS = [
  {
    label: 'Workbook - Internal User example',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    badge: { text: 'Authenticated embed', tone: 'info' },
    description: 'A standard authenticated embed for a logged-in user. The JWT\'s sub claim carries this user\'s real identity, so Sigma applies whatever permissions, teams, and row-level security that user already has — nothing here is anonymous or shared.',
    docs: [
      { label: 'JWT claims reference', href: 'https://help.sigmacomputing.com/docs/json-web-token-claims-reference' },
    ],
    embeds: [
      { mode: '', label: 'Workbook - Internal User example', span: 12 },
    ],
  },
  {
    label: 'Workbook - Secured filtered URL',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    badge: { text: 'Filtered via URL params', tone: 'info' },
    description: 'The same workbook as the example above, but this page also layers on a per-user region filter applied as a URL parameter sourced from Clerk publicMetadata — separate from, and in addition to, whatever access control the JWT itself already grants.',
    docs: [
      { label: 'Embed URL parameters', href: 'https://help.sigmacomputing.com/docs/special-characters-for-url-parameters' },
    ],
    embeds: [
      { mode: 'secured', label: 'Workbook - Secured filtered URL', span: 12 },
    ],
  },
];

const spanClass = {
  1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4',
  5: 'col-span-5', 6: 'col-span-6', 7: 'col-span-7', 8: 'col-span-8',
  9: 'col-span-9', 10: 'col-span-10', 11: 'col-span-11', 12: 'col-span-12',
};

export default function DashboardShell({ user, initialEmbedData }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [jwts, setJwts] = useState({});
  const [inspectorOpen, setInspectorOpen] = useState(false);
  // Server-rendered embed URL is only valid on first dashboard load.
  // Once the user navigates, subsequent visits to the default embed must
  // fetch a fresh JWT client-side rather than reusing the stale initial one.
  const [hasNavigated, setHasNavigated] = useState(false);
  // Custom session length (seconds) — used by the JWT inspector for demo purposes.
  // undefined means "use server default from SESSION_LENGTH env var".
  const [sessionLength, setSessionLength] = useState(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  // Workbook (or bookmark) opened from the sidebar Content Browser tree
  // (discovered via the Sigma REST API), rather than one of the
  // pre-configured NAV_ITEMS examples.
  // { urlId, name, bookmarkId?, autoExplore? } | null
  const [selectedTreeWorkbook, setSelectedTreeWorkbook] = useState(null);
  // Bumped whenever a bookmark is created/deleted, so the sidebar tree
  // refetches and shows/hides the bookmark row accordingly.
  const [treeRefreshSignal, setTreeRefreshSignal] = useState(0);

  const activeItem = NAV_ITEMS[activeIndex] ?? NAV_ITEMS[0];
  const isTreeView = !!selectedTreeWorkbook;
  const isMultiEmbed = !isTreeView && activeItem.embeds.length > 1;
  const pageLabel = isTreeView ? selectedTreeWorkbook.name : activeItem.label;
  // JwtInspector keys jwts by `mode` — mirror SigmaEmbed's jwtKey for tree embeds.
  const treeJwtMode = isTreeView ? `tree:${selectedTreeWorkbook.urlId}` : null;
  const inspectorEmbeds = isTreeView
    ? [{ mode: treeJwtMode, label: selectedTreeWorkbook.name }]
    : activeItem.embeds;

  const handleJwt = useCallback((mode, jwt, embedUrl) => {
    setJwts((prev) => ({ ...prev, [mode]: { jwt, embedUrl } }));
  }, []);

  const handleNavChange = (index) => {
    setActiveIndex(index);
    setSelectedTreeWorkbook(null);
    setJwts({});
    setHasNavigated(true);
  };

  const handleSelectWorkbook = useCallback((node) => {
    // node.bookmarkId (if any) travels along so SigmaEmbed can auto-select the
    // user's existing bookmark the moment they manually switch to Explore —
    // it just doesn't auto-load/auto-explore on open like the bookmark row does.
    setSelectedTreeWorkbook({ urlId: node.urlId, name: node.name, bookmarkId: node.bookmarkId ?? null, autoExplore: false });
    setJwts({});
    setHasNavigated(true);
  }, []);

  const handleSelectBookmark = useCallback((node) => {
    setSelectedTreeWorkbook({
      urlId: node.urlId,
      name: node.name,
      parentName: node.parentName,
      bookmarkId: node.bookmarkId,
      autoExplore: true,
    });
    setJwts({});
    setHasNavigated(true);
  }, []);

  const handleBookmarkChange = useCallback(() => {
    setTreeRefreshSignal((k) => k + 1);
  }, []);

  // Fires after a confirmed bookmark delete — the bookmark-opened view is now
  // orphaned, so drop back to the plain parent workbook and refresh the tree
  // so the (now-gone) bookmark row disappears.
  const handleBookmarkDeleted = useCallback(() => {
    setSelectedTreeWorkbook((prev) =>
      prev ? { urlId: prev.urlId, name: prev.parentName || prev.name, bookmarkId: null, autoExplore: false } : prev
    );
    setTreeRefreshSignal((k) => k + 1);
  }, []);

  const handleRegenerate = useCallback((newLength) => {
    setSessionLength(newLength);
    setRefreshKey((k) => k + 1);
  }, []);

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
          <span className="text-ink-secondary">{isTreeView ? 'Content Browser' : 'Analytics'}</span>
          <svg className="w-3 h-3 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-ink-primary font-medium">{pageLabel}</span>
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
            {NAV_ITEMS.map((item, index) => {
              const isActive = !isTreeView && activeIndex === index;
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavChange(index)}
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
                  {item.embeds.length > 1 && (
                    <span className="ml-auto text-[10px] text-zinc-400">{item.embeds.length}</span>
                  )}
                </button>
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
                selectedUrlId={isTreeView && !selectedTreeWorkbook.autoExplore ? selectedTreeWorkbook.urlId : undefined}
                selectedBookmarkId={isTreeView && selectedTreeWorkbook.autoExplore ? selectedTreeWorkbook.bookmarkId : undefined}
                onSelectWorkbook={handleSelectWorkbook}
                onSelectBookmark={handleSelectBookmark}
                refreshSignal={treeRefreshSignal}
              />
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col overflow-hidden p-4 gap-3">

          {/* Utility bar — kept separate from the concept description below so
              it stays put regardless of which page/view is active. */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {isTreeView && (
              <button
                onClick={() => setSelectedTreeWorkbook(null)}
                className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary border border-black/[0.06] hover:border-black/[0.14] rounded-lg px-3 py-1.5 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to {activeItem.label}
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs text-ink-secondary border border-black/[0.06] rounded-lg px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-mint-500 animate-pulse" />
              Live
            </div>
          </div>

          {isTreeView ? (
            /* Workbook opened from the sidebar Content Browser tree — dynamic,
               user-picked content, so it gets a simple header rather than the
               canned description/docs a curated NAV_ITEMS concept page has. */
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <div>
                <h1 className="text-base font-semibold text-ink-primary">{pageLabel}</h1>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Signed in as <span className="text-ink-secondary">{user.email}</span>
                  <span className="text-ink-secondary"> · opened from Content Browser</span>
                </p>
              </div>
              <div className="flex-1 min-h-0 rounded-xl border border-black/[0.06] shadow-card overflow-hidden bg-white flex flex-col">
                <SigmaEmbed
                  key={`${selectedTreeWorkbook.urlId}:${selectedTreeWorkbook.autoExplore ? selectedTreeWorkbook.bookmarkId : 'plain'}`}
                  urlId={selectedTreeWorkbook.urlId}
                  label={selectedTreeWorkbook.name}
                  onJwt={handleJwt}
                  sessionLength={sessionLength}
                  refreshKey={refreshKey}
                  showModeToggle
                  initialBookmarkId={selectedTreeWorkbook.bookmarkId}
                  autoExplore={selectedTreeWorkbook.autoExplore}
                  onBookmarkChange={handleBookmarkChange}
                  onBookmarkDeleted={handleBookmarkDeleted}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ConceptDemoPage
                badge={activeItem.badge}
                title={activeItem.label}
                description={activeItem.description}
                docs={activeItem.docs}
              >
                {/* Embed grid */}
                <div className="grid grid-cols-12 gap-3 h-full min-h-[420px]">
                  {activeItem.embeds.map((embed) => (
                    <div
                      key={embed.mode}
                      className={`${spanClass[embed.span] ?? 'col-span-12'} rounded-xl border border-black/[0.06] shadow-card overflow-hidden bg-white flex flex-col min-h-0`}
                    >
                      {isMultiEmbed && (
                        <div className="px-4 py-2 border-b border-black/[0.04] shrink-0">
                          <p className="text-[11px] font-medium text-ink-secondary">{embed.label}</p>
                        </div>
                      )}
                      <div className="flex-1 min-h-0">
                        <SigmaEmbed
                        mode={embed.mode}
                        label={embed.label}
                        onJwt={handleJwt}
                        initialEmbedUrl={!hasNavigated && embed.mode === '' ? initialEmbedData?.embedUrl : undefined}
                        initialJwt={!hasNavigated && embed.mode === '' ? initialEmbedData?.jwt : undefined}
                        sessionLength={sessionLength}
                        refreshKey={refreshKey}
                      />
                      </div>
                    </div>
                  ))}
                </div>
              </ConceptDemoPage>
            </div>
          )}

        </main>
      </div>

      <JwtInspector
        jwts={jwts}
        embeds={inspectorEmbeds}
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        sessionLength={sessionLength}
        onRegenerate={handleRegenerate}
      />
    </div>
  );
}
