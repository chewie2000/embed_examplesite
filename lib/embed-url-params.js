/**
 * Builds the per-user URL filter params for an embed based on the user's
 * Clerk publicMetadata. These params are appended to the embed URL itself
 * (NOT to the JWT) — they drive workbook controls, filters, etc.
 *
 * Currently only the 'secured' mode applies these params. Rule for both
 * Store-Region and Store-Region-Page params:
 *   - If userAttributes.embed_region is set → use it
 *   - Otherwise → use the top-level metadata.region field
 *   - If neither exists → no params appended
 */
export function resolveUrlParams(meta = {}, mode = '') {
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
