'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { SWAP_TEAMS } from '@/lib/teams';

const teamIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

/**
 * Team picker for the Team Swapping use case.
 *
 * Selection lives in the URL (`?team=<slug>`) rather than component state, so
 * it survives a refresh and can be linked to mid-demo — and so the page can
 * later re-sign its JWT server-side from the same param.
 */
export default function TeamSwapSidebar() {
  const pathname = usePathname();
  const activeSlug = useSearchParams().get('team');

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
    </aside>
  );
}
