'use client';

import { usePathname, useRouter } from 'next/navigation';

/**
 * The main content column for any /dashboard route — utility bar plus a
 * scrolling content area.
 *
 * Lives here rather than in DashboardChrome because each route decides what
 * else sits in the body row beside it: the gallery renders this alone, while
 * Legacy Examples renders its own sidebar next to it (the sidebar is part of
 * that use case, not global chrome).
 */
export default function UseCaseMain({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isGallery = pathname === '/dashboard';

  return (
    <main className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
      <div className="flex items-center justify-end gap-2 shrink-0">
        {!isGallery && (
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
  );
}
