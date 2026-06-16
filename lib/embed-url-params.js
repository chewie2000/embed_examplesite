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
export function resolveUrlParams(meta = {}, mode = '') {
  // example1 (default mode): always show the workbook menu bar.
  if (mode === '') {
    return {
      ':hide_menu': 'false',
      ':menu_position': 'top',
    };
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
