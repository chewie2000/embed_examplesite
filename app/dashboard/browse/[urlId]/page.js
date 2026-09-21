'use client';

import { useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import SigmaEmbed from '@/components/SigmaEmbed';
import { useDashboardChrome } from '@/lib/dashboard-context';

/**
 * A workbook (or bookmark) opened from the sidebar Content Browser tree —
 * dynamic, user-picked content discovered via the Sigma REST API, rather
 * than one of the curated LEGACY_EXAMPLES. Everything needed to reconstruct
 * the view travels in the URL (name/bookmark/auto/parent as query params) so
 * this, like every other use case now, is a real bookmarkable/shareable
 * route rather than client-state — a refresh here lands you back exactly
 * where you were, which the old tree-view overlay could never do.
 */
export default function BrowseWorkbookPage() {
  const { urlId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setJwt, setPageTitle, sessionLength, refreshKey, bumpTreeRefresh } = useDashboardChrome();

  const name = searchParams.get('name') || 'Workbook';
  const bookmarkId = searchParams.get('bookmark') || null;
  const autoExplore = searchParams.get('auto') === '1';
  const parentName = searchParams.get('parent') || name;

  useEffect(() => {
    setPageTitle(name);
  }, [name, setPageTitle]);

  const handleBookmarkChange = useCallback(() => {
    bumpTreeRefresh();
  }, [bumpTreeRefresh]);

  // Fires after a confirmed bookmark delete — the bookmark-opened view is now
  // orphaned, so drop back to the plain parent workbook and refresh the tree
  // so the (now-gone) bookmark row disappears.
  const handleBookmarkDeleted = useCallback(() => {
    bumpTreeRefresh();
    const qs = new URLSearchParams({ name: parentName });
    router.replace(`/dashboard/browse/${urlId}?${qs.toString()}`);
  }, [bumpTreeRefresh, parentName, router, urlId]);

  return (
    <div className="rounded-xl border border-black/[0.06] shadow-card overflow-hidden bg-white h-full min-h-[420px] flex flex-col">
      <SigmaEmbed
        key={`${urlId}:${bookmarkId ?? 'plain'}`}
        urlId={urlId}
        label={name}
        onJwt={(mode, jwt, embedUrl) => setJwt(mode, jwt, embedUrl, name)}
        sessionLength={sessionLength}
        refreshKey={refreshKey}
        showModeToggle
        initialBookmarkId={bookmarkId}
        autoExplore={autoExplore}
        onBookmarkChange={handleBookmarkChange}
        onBookmarkDeleted={handleBookmarkDeleted}
      />
    </div>
  );
}
