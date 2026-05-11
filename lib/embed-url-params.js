/**
 * Builds the per-user URL filter params for an embed based on the user's
 * Clerk publicMetadata. These params are appended to the embed URL itself
 * (NOT to the JWT) — they drive workbook controls, filters, etc.
 *
 * Currently only the 'secured' mode applies these params. Rule:
 *   - If userAttributes.embed_region === 'All':
 *       use metadata.region (falls back to 'All' if not set)
 *   - Otherwise:
 *       use userAttributes.embed_region
 *   The resolved value is placed in the Store-Region URL param.
 */
export function resolveUrlParams(meta = {}, mode = '') {
  if (mode !== 'secured') return {};

  const userAttributes = meta.userAttributes ?? {};
  const embedRegion = userAttributes.embed_region;

  let storeRegion;
  if (embedRegion === 'All') {
    storeRegion = meta.region ?? embedRegion;
  } else {
    storeRegion = embedRegion;
  }

  if (storeRegion === undefined || storeRegion === null || storeRegion === '') {
    return {};
  }

  return { 'Store-Region': storeRegion };
}
