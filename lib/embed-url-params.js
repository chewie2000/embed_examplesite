/**
 * Builds the per-user URL filter params for an embed based on the user's
 * Clerk publicMetadata. These params are appended to the embed URL itself
 * (NOT to the JWT) — they drive workbook controls, filters, etc.
 *
 * Currently only the 'secured' mode applies these params. Rule:
 *   - If userAttributes.embed_region is set → use it as Store-Region
 *   - Otherwise → use the top-level metadata.region field as Store-Region
 *   - If neither exists → no Store-Region param appended
 */
export function resolveUrlParams(meta = {}, mode = '') {
  if (mode !== 'secured') return {};

  const userAttributes = meta.userAttributes ?? {};
  const storeRegion = userAttributes.embed_region ?? meta.region;

  if (storeRegion === undefined || storeRegion === null || storeRegion === '') {
    return {};
  }

  return { 'Store-Region': storeRegion };
}
