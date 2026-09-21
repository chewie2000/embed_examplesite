'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SWAP_TEAMS } from '@/lib/teams';

const teamIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const fileIcon = (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

/**
 * Team + file picker for the Team Swapping use case.
 *
 * Both selections live in the URL (`?team=<slug>&urlId=<workbook urlId>`)
 * rather than component state — survives a refresh, can be linked to
 * mid-demo, and gives the page a param to re-sign its JWT server-side from.
 * Picking a team is unaffected: the flow is select team, then select a file
 * from that team's workspace, then the embed appears — nothing auto-loads.
 */
export default function TeamSwapSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSlug = searchParams.get('team');
  const activeUrlId = searchParams.get('urlId');

  const [state, setState] = useState({ status: 'idle' });

  const load = useCallback(async (slug) => {
    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/sigma/team-files?team=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load files.');
      setState({ status: 'ready', files: data.files ?? [] });
    } catch (err) {
      setState({ status: 'error', error: err.message });
    }
  }, []);

  useEffect(() => {
    if (activeSlug) load(activeSlug);
    else setState({ status: 'idle' });
  }, [activeSlug, load]);

  const selectFile = (urlId) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set('urlId', urlId);
    router.push(`${pathname}?${qs.toString()}`);
  };

  return (
    <aside className="w-64 shrink-0 border-r border-black/[0.06] bg-white flex flex-col">
      <div className="p-3 gap-0.5 flex flex-col shrink-0">
        <p className="text-[10px] font-semibold text-ink-secondary uppercase tracking-widest mb-2 px-2 pt-1">
          Teams
        </p>
        {SWAP_TEAMS.map((team) => {
          const isActive = activeSlug === team.slug;
          return (
            <Link
              key={team.slug}
              href={`${pathname}?team=${team.slug}`}
              className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 border border-brand-500/20'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-black/[0.03] border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-brand-500' : 'text-zinc-400'}>{teamIcon}</span>
              {team.name}
            </Link>
          );
        })}
      </div>

      {activeSlug && (
        <div className="flex-1 min-h-0 flex flex-col border-t border-black/[0.06] pt-2">
          <p className="text-[10px] font-semibold text-ink-secondary uppercase tracking-widest mb-1 px-3">
            Files
          </p>
          <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-2">
            {state.status === 'loading' && (
              <div className="p-2 space-y-1.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-7 rounded-lg bg-black/[0.04] animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
                ))}
              </div>
            )}

            {state.status === 'error' && (
              <div className="flex flex-col items-center gap-2 text-center p-3">
                <p className="text-[11px] text-ink-secondary leading-relaxed">{state.error}</p>
                <button
                  onClick={() => load(activeSlug)}
                  className="text-[11px] text-ink-secondary hover:text-ink-primary border border-black/[0.08] hover:border-black/[0.18] px-2.5 py-1 rounded-lg transition-all"
                >
                  Retry
                </button>
              </div>
            )}

            {state.status === 'ready' && state.files.length === 0 && (
              <p className="text-[11px] text-ink-secondary leading-relaxed px-2 py-1">
                No files in this workspace yet.
              </p>
            )}

            {state.status === 'ready' && state.files.map((file) => {
              const isActive = activeUrlId === file.urlId;
              return (
                <button
                  key={file.urlId}
                  onClick={() => selectFile(file.urlId)}
                  className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-sm truncate transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-600 border border-brand-500/20'
                      : 'text-ink-secondary hover:text-ink-primary hover:bg-black/[0.03] border border-transparent'
                  }`}
                >
                  <span className={isActive ? 'text-brand-500' : 'text-zinc-400'}>{fileIcon}</span>
                  <span className="truncate">{file.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
