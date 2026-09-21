'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Shared state for everything under /dashboard that needs to cross the
 * layout/page boundary now that each use case is a real route rather than
 * client-state inside one component (DashboardShell used to own all of this
 * directly since it rendered everything itself).
 *
 * - jwts / pageTitle: written by whichever page is currently active, read by
 *   the persistent chrome (top nav breadcrumb, JWT inspector).
 * - treeRefreshSignal: bumped by a page after a bookmark change, read by the
 *   persistent Content Browser sidebar so it refetches.
 * - sessionLength / refreshKey: the JWT inspector's "override session length"
 *   demo control — deliberately NOT reset on navigation, matching the
 *   original DashboardShell behavior (only jwts/pageTitle reset per route).
 */
const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const pathname = usePathname();
  const [jwts, setJwts] = useState({});
  const [pageTitle, setPageTitle] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sessionLength, setSessionLength] = useState(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [treeRefreshSignal, setTreeRefreshSignal] = useState(0);

  // New route = new page = its own set of embeds. Clear stale JWTs from
  // whichever page we just left so the inspector doesn't show last page's
  // tokens under this page's title.
  useEffect(() => {
    setJwts({});
  }, [pathname]);

  const setJwt = useCallback((mode, jwt, embedUrl, label) => {
    setJwts((prev) => ({ ...prev, [mode]: { jwt, embedUrl, label: label ?? mode } }));
  }, []);

  const bumpTreeRefresh = useCallback(() => {
    setTreeRefreshSignal((k) => k + 1);
  }, []);

  const regenerate = useCallback((newLength) => {
    setSessionLength(newLength);
    setRefreshKey((k) => k + 1);
  }, []);

  const value = {
    jwts, setJwt,
    pageTitle, setPageTitle,
    inspectorOpen, setInspectorOpen,
    sessionLength, refreshKey, regenerate,
    treeRefreshSignal, bumpTreeRefresh,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardChrome() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboardChrome must be used within DashboardProvider');
  return ctx;
}
