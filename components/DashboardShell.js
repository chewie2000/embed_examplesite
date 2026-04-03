'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SigmaEmbed from './SigmaEmbed';

const NAV_ITEMS = [
  { label: 'Overview', mode: '' },
  // Add more sections here as you add workbooks to Sigma
  // { label: 'Sales', mode: 'sales' },
  // { label: 'Marketing', mode: 'marketing' },
];

/**
 * DashboardShell
 *
 * Client component — handles navigation state and logout.
 * Receives the decoded session from the server component (app/dashboard/page.js).
 *
 * @param {{ user: { email: string, name: string, accountType: string } }} props
 */
export default function DashboardShell({ user }) {
  const [activeMode, setActiveMode] = useState('');
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top nav ── */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center group-hover:bg-indigo-700 transition">
            <span className="text-white text-xs font-bold">P</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">Prism Analytics</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:block">{user.name}</span>
          <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full capitalize font-medium">
            {user.accountType}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-700 transition ml-2"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-52 bg-white border-r border-gray-100 p-3 flex flex-col gap-0.5 shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 px-2 pt-1">
            Analytics
          </p>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveMode(item.mode)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition font-medium ${
                activeMode === item.mode
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-5">
            <h1 className="text-lg font-bold text-gray-900">
              {NAV_ITEMS.find((i) => i.mode === activeMode)?.label ?? 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-400">
              Signed in as <span className="font-medium text-gray-600">{user.email}</span>
            </p>
          </div>

          {/* Sigma embed container */}
          <div
            className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm"
            style={{ height: 'calc(100vh - 170px)' }}
          >
            <SigmaEmbed mode={activeMode} />
          </div>
        </main>
      </div>
    </div>
  );
}
