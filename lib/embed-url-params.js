/**
 * Per-user URL filter params for an embed, built from Clerk publicMetadata
 * and appended to the embed URL (not the JWT). Merged AFTER the global
 * env-var UI controls in sigma-embed.js, so they win.
 *
 * Default mode: forces the menu bar visible. 'secured' mode filters the
 * legacy org's EmbedProfitPlanner workbook by region
 * (userAttributes.embed_region, falling back to meta.region), keyed by the
 * control's `controlId` — "F_Region" — not its display name ("Region"); per
 * https://help.sigmacomputing.com/docs/workbook-control-values-in-the-url
 * control-value keys take no leading colon (that's reserved for Sigma's own
 * embed settings like :hide_menu).
 */

/**
 * Sigma's workbook menu bar, forced visible and pinned to the top. Shared by
 * the internal-user legacy example and the team-swap pages.
 */
export const MENU_BAR_TOP = {
  ':hide_menu': 'false',
  ':menu_position': 'top',
};

/**
 * Menu visibility/position for the team-swap and subaddress-swap pages'
 * interactive switches, parsed from plain strings so it works from both a
 * server `searchParams` object and a client `URLSearchParams`.
 *
 * Modeled as one tri-state param (`:menu_position`: `top` | `bottom` | `none`)
 * rather than layering `:hide_menu` on top, since that flag only matters
 * when a position is already set.
 */
export function resolveMenuState({ menu, pos } = {}) {
  return {
    visible: menu !== '0',
    position: pos === 'bottom' ? 'bottom' : 'top',
  };
}

export function menuStateUrlParams({ visible, position }) {
  return { ':menu_position': visible ? position : 'none' };
}

export function resolveUrlParams(meta = {}, mode = '') {
  // example1 (default mode): always show the workbook menu bar.
  if (mode === '') {
    return { ...MENU_BAR_TOP };
  }

  if (mode !== 'secured') return {};

  const userAttributes = meta.userAttributes ?? {};
  const region = userAttributes.embed_region ?? meta.region;

  if (region === undefined || region === null || region === '') {
    return {};
  }

  return {
    F_Region: region,
  };
}
