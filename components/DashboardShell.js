'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SigmaEmbed from './SigmaEmbed';

const NAV_ITEMS = [
  {
    label: 'Overview',
    mode: '',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  // Add more sections here as you add workbooks:
  // { label: 'Sales', mode: 'sales', icon: (...) },
];

export default function DashboardShell({ user }) {
  const [activeMode, setActiveMode] = useState('');
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const activeItem = NAV_ITEMS.find((i) => i.mode === activeMode) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">

      {/* ── Top nav ── */}
      <header className="h-14 shrink-0 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl flex items-center px-4 gap-4 sticky top-0 z-40">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group mr-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <span className="text-white text-[10px] font-bold">E</span>
          </div>
          <span className="text-sm font-semibold text-white hidden sm:block">Embed Success</span>
        </Link>

        {/* Divider */}
        <div className="h-5 w-px bg-white/10" />

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500">Analytics</span>
          <svg className="w-3 h-3 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-zinc-300 font-medium">{activeItem.label}</span>
        </div>

        <div className="flex-1" />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-medium text-zinc-300">{user.name}</span>
            <span className="text-[10px] text-zinc-600">{user.email}</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.name?.[0] ?? '?'}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-white/[0.06] hover:border-white/[0.12] px-3 py-1.5 rounded-lg"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-52 shrink-0 border-r border-white/[0.06] bg-[#09090b] flex flex-col p-3 gap-0.5">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2 px-2 pt-1">
            Analytics
          </p>
          {NAV_ITEMS.map((item) => {
            const isActive = activeMode === item.mode;
            return (
              <button
                key={item.label}
                onClick={() => setActiveMode(item.mode)}
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
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 border border-white/[0.06] rounded-lg px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
            </div>
          </div>

          {/* Embed container */}
          <div className="flex-1 rounded-xl border border-white/[0.06] overflow-hidden bg-[#0d0d10] min-h-0">
            <SigmaEmbed mode={activeMode} />
          </div>

        </main>
      </div>
    </div>
  );
}
