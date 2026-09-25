/**
 * The four "sub-addressed logins" used by the "JWT Swap via Sub-Addressed
 * Logins" use case (embed_examplesite-0so.10) — a sibling to Team Swapping
 * via JWT (lib/teams.js), reusing the SAME four compass teams/workspaces,
 * but demonstrating a different mechanism: here, team context follows WHICH
 * LOGIN the embed user is signed in as, not a picker inside an already-
 * authenticated session.
 *
 * There is NO hardcoded base account here. The four sub-addressed emails are
 * built from whichever email the CURRENTLY SIGNED-IN embed user resolves to
 * (the same meta.sigmaEmail || login-email pattern used everywhere else in
 * this app), using email sub-addressing (the +tag convention). That's what
 * makes this generic rather than tied to one specific test account — but it
 * also means the four derived candidates are only USABLE if that same
 * account's sub-addressed variants happen to be real, provisioned Sigma
 * members with real team assignments. This file has no way to know that on
 * its own — see checkSubAddressSetup() in lib/sigma-api.js, which is the
 * preflight that actually verifies it, run once in
 * app/dashboard/subaddress-swap/layout.js before the sidebar offers any of
 * these as options.
 *
 * This file does NOT know, guess, or declare which team any of these four
 * belongs to — that's looked up live from Sigma via resolveMemberTeamName()
 * (lib/sigma-api.js), because each is expected to be a real Sigma member
 * that's already, persistently assigned to its matching compass team.
 */

// The one place the four known tags are declared. Unlike the base email,
// these aren't derived from anything — they're this demo's fixed roster,
// the same category of fact as the slugs in lib/teams.js.
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
