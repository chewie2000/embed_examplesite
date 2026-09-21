'use client';

import { createContext, useContext, useState, useCallback } from 'react';

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
  const [jwts, setJwts] = useState({});
  const [pageTitle, setPageTitle] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sessionLength, setSessionLength] = useState(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [treeRefreshSignal, setTreeRefreshSignal] = useState(0);

  const setJwt = useCallback((mode, jwt, embedUrl, label) => {
    setJwts((prev) => ({ ...prev, [mode]: { jwt, embedUrl, label: label ?? mode } }));
  }, []);

  // Pages clear their own JWTs from an effect CLEANUP as they unmount or
  // switch embeds — deliberately not a [pathname] effect here. Such an effect
  // also fires on first mount, and since React runs effects child-first it
  // landed after the embed had already registered its server-rendered JWT,
  // wiping it and leaving the inspector empty until something forced a
  // (slower, async) client-side refetch.
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
