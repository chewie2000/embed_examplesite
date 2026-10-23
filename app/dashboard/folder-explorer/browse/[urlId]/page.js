'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import SigmaEmbed from '@/components/SigmaEmbed';
import EmbedMenuControls from '@/components/EmbedMenuControls';
import { resolveMenuState } from '@/lib/embed-url-params';
import { useDashboardChrome } from '@/lib/dashboard-context';

/**
 * A workbook (or bookmark) opened from the Folder Explorer tree — dynamic,
 * user-picked content on the default org (no `org` prop on SigmaEmbed). Sits
 * under /dashboard/folder-explorer to inherit that sidebar. State (name/bookmark/
 * auto/parent) lives entirely in query params, so this is a real
 * bookmarkable route — a refresh lands you back where you were.
 */
export default function FolderExplorerBrowsePage() {
  const { urlId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setJwt, clearJwts, setPageTitle, sessionLength, refreshKey, bumpTreeRefresh } = useDashboardChrome();

  const name = searchParams.get('name') || 'Workbook';
  const bookmarkId = searchParams.get('bookmark') || null;
  const autoExplore = searchParams.get('auto') === '1';
  const parentName = searchParams.get('parent') || name;

  // Menu/Assistant switches live in the URL beside name/bookmark, so a refresh
  // or shared link keeps them.
  const menuState = useMemo(
    () => resolveMenuState({ menu: searchParams.get('menu'), pos: searchParams.get('pos'), assistant: searchParams.get('assistant') }),
    [searchParams]
  );

  const updateMenuState = useCallback((patch) => {
    const next = { ...menuState, ...patch };
    const qs = new URLSearchParams(searchParams.toString());
    qs.set('menu', next.visible ? '1' : '0');
    qs.set('pos', next.position);
    qs.set('assistant', next.assistant ? '1' : '0');
    router.replace(`/dashboard/folder-explorer/browse/${urlId}?${qs.toString()}`);
  }, [menuState, router, searchParams, urlId]);

  useEffect(() => {
    setPageTitle(name);
  }, [name, setPageTitle]);

  // Cleanup fires when the opened workbook changes or we leave — clearing the
  // previous workbook's JWT without racing the next one's registration.
  useEffect(() => clearJwts, [clearJwts, urlId, bookmarkId]);

  const handleBookmarkChange = useCallback(() => {
    bumpTreeRefresh();
  }, [bumpTreeRefresh]);

  // Fires after a confirmed bookmark delete — the bookmark-opened view is now
  // orphaned, so drop back to the plain parent workbook and refresh the tree
  // so the (now-gone) bookmark row disappears.
  const handleBookmarkDeleted = useCallback(() => {
    bumpTreeRefresh();
    const qs = new URLSearchParams({ name: parentName });
    router.replace(`/dashboard/folder-explorer/browse/${urlId}?${qs.toString()}`);
  }, [bumpTreeRefresh, parentName, router, urlId]);

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <EmbedMenuControls menuState={menuState} onChange={updateMenuState} />
      <div className="flex-1 min-h-[420px] rounded-xl border border-black/[0.06] shadow-card overflow-hidden bg-white flex flex-col">
        <SigmaEmbed
          key={`${urlId}:${bookmarkId ?? 'plain'}:${menuState.visible}:${menuState.position}:${menuState.assistant}`}
          urlId={urlId}
          label={name}
          onJwt={(mode, jwt, embedUrl) => setJwt(mode, jwt, embedUrl, name)}
          sessionLength={sessionLength}
          refreshKey={refreshKey}
          showModeToggle
          menuVisible={menuState.visible}
          menuPosition={menuState.position}
          assistantVisible={menuState.assistant}
          initialBookmarkId={bookmarkId}
          autoExplore={autoExplore}
          onBookmarkChange={handleBookmarkChange}
          onBookmarkDeleted={handleBookmarkDeleted}
        />
      </div>
    </div>
  );
}
