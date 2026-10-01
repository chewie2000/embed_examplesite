/**
 * Sub-Address Swapping: builds four "sub-addressed login" candidates
 * (`+tag` email addressing) from whichever email the signed-in embed user
 * resolves to — no hardcoded base account. They're only usable if that
 * account's sub-addressed variants are real, team-assigned Sigma members;
 * see checkSubAddressSetup() in lib/sigma-api.js for the preflight that
 * verifies this, and resolveMemberTeamName() there for how team membership
 * is resolved (live from Sigma, never guessed here, never sent back as a
 * `teams` claim).
 */

// Fixed roster — not derived, same category of fact as lib/teams.js's slugs.
export const TAGS = ['northerntrust', 'southernltd', 'eastfordco', 'westlandinc'];

function splitEmail(email) {
  const at = (email || '').indexOf('@');
  if (at <= 0) return null;
  return { local: email.slice(0, at), domain: email.slice(at + 1) };
}

/**
 * Builds the four candidate sub-addressed identities from a base email.
 * Returns [] if baseEmail isn't a usable address (e.g. the current user has
 * no email at all) — fails closed rather than constructing malformed ones.
 */
export function buildSubAddressIdentities(baseEmail) {
  const parts = splitEmail(baseEmail);
  if (!parts) return [];
  return TAGS.map((slug) => ({ slug, email: `${parts.local}+${slug}@${parts.domain}` }));
}

export function getSubAddressIdentity(slug, baseEmail) {
  return buildSubAddressIdentities(baseEmail).find((i) => i.slug === slug) ?? null;
}
