'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ContentTree from './ContentTree';
import { useDashboardChrome } from '@/lib/dashboard-context';
import { LEGACY_EXAMPLES } from '@/lib/legacy-examples';

const NAV_LINKS = LEGACY_EXAMPLES.map((e) => ({
  href: `/dashboard/legacy/${e.slug}`,
  label: e.title,
  icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
}));

/**
 * The left panel that belongs to the Legacy Examples use case — the example
 * switcher plus the Content Browser tree. Both were part of what the original
 * demo was showing off, so they live inside this use case rather than being
 * global chrome on every /dashboard route (which would put them on the
 * use-case gallery too, where they mean nothing).
 */
export default function LegacySidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { treeRefreshSignal } = useDashboardChrome();

  const isBrowseView = pathname.startsWith('/dashboard/legacy/browse/');
  const browseUrlId = isBrowseView ? pathname.split('/dashboard/legacy/browse/')[1] : undefined;
  const browseBookmarkId = searchParams.get('bookmark') || undefined;

  const handleSelectWorkbook = (node) => {
    const qs = new URLSearchParams({ name: node.name });
    router.push(`/dashboard/legacy/browse/${node.urlId}?${qs.toString()}`);
  };

  const handleSelectBookmark = (node) => {
    const qs = new URLSearchParams({ name: node.name, bookmark: node.bookmarkId, auto: '1' });
    if (node.parentName) qs.set('parent', node.parentName);
    router.push(`/dashboard/legacy/browse/${node.urlId}?${qs.toString()}`);
  };

  return (
    <aside className="w-64 shrink-0 border-r border-black/[0.06] bg-white flex flex-col">
      <div className="p-3 gap-0.5 flex flex-col shrink-0">
        <p className="text-[10px] font-semibold text-ink-secondary uppercase tracking-widest mb-2 px-2 pt-1">
          Legacy Examples
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

      {/* Content Browser — tree of what this embed user can reach, via the Sigma REST API */}
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
  );
}
