'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ContentTree from './ContentTree';
import InfoButton from './InfoButton';
import { useDashboardChrome } from '@/lib/dashboard-context';

/**
 * Folder Explorer's left panel — just the Content Browser tree, read from the
 * default org (org=''), with none of Legacy's example switcher.
 */
export default function FolderExplorerSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { treeRefreshSignal } = useDashboardChrome();

  const base = '/dashboard/folder-explorer/browse/';
  const isBrowseView = pathname.startsWith(base);
  const browseUrlId = isBrowseView ? pathname.split(base)[1] : undefined;
  const browseBookmarkId = searchParams.get('bookmark') || undefined;

  // Carry the menu/Assistant switches across selections so they stay put
  // while browsing.
  const carryMenuParams = (qs) => {
    for (const k of ['menu', 'pos', 'assistant']) {
      if (searchParams.has(k)) qs.set(k, searchParams.get(k));
    }
    return qs;
  };

  const handleSelectWorkbook = (node) => {
    const qs = carryMenuParams(new URLSearchParams({ name: node.name }));
    router.push(`${base}${node.urlId}?${qs.toString()}`);
  };

  const handleSelectBookmark = (node) => {
    const qs = carryMenuParams(new URLSearchParams({ name: node.name, bookmark: node.bookmarkId, auto: '1' }));
    if (node.parentName) qs.set('parent', node.parentName);
    router.push(`${base}${node.urlId}?${qs.toString()}`);
  };

  return (
    <aside className="w-64 shrink-0 border-r border-black/[0.06] bg-white flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col pt-3">
        <div className="flex items-center gap-1.5 mb-1 px-3">
          <p className="text-[10px] font-semibold text-ink-secondary uppercase tracking-widest">
            Folder Explorer
          </p>
          <InfoButton title="Live content discovery via the Sigma REST API">
            This tree isn&apos;t hardcoded — it&apos;s fetched live from Sigma&apos;s REST API
            (<code className="text-brand-600">GET /v2/members/&#123;memberId&#125;/files</code>),
            scoped to the EMBED workspace and to exactly what this logged-in embed user can access.
            <a
              href="https://help.sigmacomputing.com/reference/list-accessible-inodes"
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
            >
              Sigma docs: List member files (API reference) ↗
            </a>
          </InfoButton>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-2">
          <ContentTree
            compact
            org="default"
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
