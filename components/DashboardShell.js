'use client';

import { useState, useCallback } from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import SigmaEmbed from './SigmaEmbed';
import JwtInspector from './JwtInspector';

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

  const activeItem = NAV_ITEMS[activeIndex] ?? NAV_ITEMS[0];
  const isMultiEmbed = activeItem.embeds.length > 1;

  const handleJwt = useCallback((mode, jwt, embedUrl) => {
    setJwts((prev) => ({ ...prev, [mode]: { jwt, embedUrl } }));
  }, []);

  const handleNavChange = (index) => {
    setActiveIndex(index);
    setJwts({});
    setHasNavigated(true);
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">

      {/* ── Top nav ── */}
      <header className="h-14 shrink-0 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl flex items-center px-4 gap-4 sticky top-0 z-40">

        <Link href="/" className="flex items-center gap-2 group mr-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <span className="text-white text-base font-bold">🎯</span>
          </div>
          <span className="text-sm font-semibold text-white hidden sm:block">Embed Success</span>
        </Link>

        <div className="h-5 w-px bg-white/10" />

        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500">Analytics</span>
          <svg className="w-3 h-3 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-zinc-300 font-medium">{activeItem.label}</span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setInspectorOpen(true)}
          title="View JWT claims"
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-300 border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/[0.06] px-3 py-1.5 rounded-lg transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
          JWT Claims
          {Object.keys(jwts).length > 1 && (
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded-full">
              {Object.keys(jwts).length}
            </span>
          )}

        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-medium text-zinc-300">{user.name}</span>
            <span className="text-[10px] text-zinc-600">{user.email}</span>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-52 shrink-0 border-r border-white/[0.06] bg-[#09090b] flex flex-col p-3 gap-0.5">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2 px-2 pt-1">
            Analytics
          </p>
          {NAV_ITEMS.map((item, index) => {
            const isActive = activeIndex === index;
            return (
              <button
                key={item.label}
                onClick={() => handleNavChange(index)}
                className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <span className={isActive ? 'text-indigo-400' : 'text-zinc-600'}>
                  {item.icon}
                </span>
                {item.label}
                {item.embeds.length > 1 && (
                  <span className="ml-auto text-[10px] text-zinc-600">{item.embeds.length}</span>
                )}
              </button>
            );
          })}
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col overflow-hidden p-4 gap-4">

          {/* Page header */}
          <div className="flex items-center justify-between shrink-0">
            <div>
              <h1 className="text-base font-semibold text-white">{activeItem.label}</h1>
              <p className="text-xs text-zinc-600 mt-0.5">
                Signed in as <span className="text-zinc-500">{user.email}</span>
                {isMultiEmbed && (
                  <span className="text-zinc-600"> · {activeItem.embeds.length} embeds</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 border border-white/[0.06] rounded-lg px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
            </div>
          </div>

          {/* Embed grid */}
          <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
            {activeItem.embeds.map((embed) => (
              <div
                key={embed.mode}
                className={`${spanClass[embed.span] ?? 'col-span-12'} rounded-xl border border-white/[0.06] overflow-hidden bg-[#0d0d10] flex flex-col min-h-0`}
              >
                {isMultiEmbed && (
                  <div className="px-4 py-2 border-b border-white/[0.04] shrink-0">
                    <p className="text-[11px] font-medium text-zinc-500">{embed.label}</p>
                  </div>
                )}
                <div className="flex-1 min-h-0">
                  <SigmaEmbed
                  mode={embed.mode}
                  label={embed.label}
                  onJwt={handleJwt}
                  initialEmbedUrl={!hasNavigated && embed.mode === '' ? initialEmbedData?.embedUrl : undefined}
                  initialJwt={!hasNavigated && embed.mode === '' ? initialEmbedData?.jwt : undefined}
                />
                </div>
              </div>
            ))}
          </div>

        </main>
      </div>

      <JwtInspector jwts={jwts} embeds={activeItem.embeds} open={inspectorOpen} onClose={() => setInspectorOpen(false)} />
    </div>
  );
}
