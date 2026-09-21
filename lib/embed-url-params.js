/**
 * Builds the per-user URL filter params for an embed based on the user's
 * Clerk publicMetadata. These params are appended to the embed URL itself
 * (NOT to the JWT) — they drive workbook controls, filters, etc.
 *
 * These are merged AFTER the global env-var UI controls in sigma-embed.js,
 * so they override those defaults on a per-mode basis.
 *
 * Default mode ('' — "Workbook - Internal User example", aka example1):
 *   - Force the Sigma workbook menu bar to show, even if hide_menu is set
 *     globally via env vars.
 *
 * 'secured' mode applies the per-user region filter. Rule for both
 * Store-Region and Store-Region-Page params:
 *   - If userAttributes.embed_region is set → use it
 *   - Otherwise → use the top-level metadata.region field
 *   - If neither exists → no params appended
 */
/**
 * Sigma's workbook menu bar, forced visible and pinned to the top.
 *
 * Exported because more than one use case wants this presentation (the
 * internal-user legacy example and the team-swap pages), and because the
 * global env-var UI controls in sigma-embed.js would otherwise hide the menu —
 * these are merged after those, so they win.
 */
export const MENU_BAR_TOP = {
  ':hide_menu': 'false',
  ':menu_position': 'top',
};

/**
 * Menu visibility/position state for the Team Swapping use case's interactive
 * switches, parsed from plain string params so the same logic works from a
 * server component's `searchParams` object and a client `URLSearchParams`.
 *
 * `:menu_position` accepts exactly `top` | `bottom` | `none` (default `none`)
 * — verified against https://help.sigmacomputing.com/docs/embed-url-parameters
 * directly, not inferred. Modeled as one tri-state param rather than layering
 * `:hide_menu` on top: that flag only has any effect when position is already
 * `top`/`bottom`, so it adds a combination (position set but menu hidden
 * anyway) this UI has no case for.
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
    'Store-Region': region,
    'Store-Region-Page': region,
  };
}
