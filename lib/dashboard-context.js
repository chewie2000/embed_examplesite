'use client';

import { createContext, useContext, useState, useCallback } from 'react';

/**
 * Shared state for everything under /dashboard that crosses the
 * layout/page boundary (each use case is its own route, not client-state in
 * one component).
 *
 * - jwts / pageTitle: written by the active page, read by the persistent
 *   chrome (breadcrumb, JWT inspector).
 * - treeRefreshSignal: bumped after a bookmark change, read by the Content
 *   Browser sidebar so it refetches.
 * - sessionLength / refreshKey: the JWT inspector's session-length override —
 *   deliberately not reset on navigation, unlike jwts/pageTitle.
 */
const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const [jwts, setJwts] = useState({});
  const [pageTitle, setPageTitle] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sessionLength, setSessionLength] = useState(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [treeRefreshSignal, setTreeRefreshSignal] = useState(0);

  const setJwt = useCallback((mode, jwt, embedUrl, label) => {
    setJwts((prev) => ({ ...prev, [mode]: { jwt, embedUrl, label: label ?? mode } }));
  }, []);

  // Pages clear JWTs via effect CLEANUP on unmount/switch, not a [pathname]
  // effect — that also fires on mount, and (React runs effects child-first)
  // would wipe the JWT right after the embed registers it.
  const clearJwts = useCallback(() => {
    setJwts({});
  }, []);

  const bumpTreeRefresh = useCallback(() => {
    setTreeRefreshSignal((k) => k + 1);
  }, []);

  const regenerate = useCallback((newLength) => {
    setSessionLength(newLength);
    setRefreshKey((k) => k + 1);
  }, []);

  const value = {
    jwts, setJwt, clearJwts,
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
