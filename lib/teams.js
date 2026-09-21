/**
 * The four Sigma teams used by the "Team Swapping via JWT" use case. Each is
 * paired 1:1 with an identically-named workspace in the org, granted to that
 * team at `edit`.
 *
 * `name` must match the Sigma team name EXACTLY — the JWT `teams` claim
 * asserts membership by name, and a mismatch fails silently (no error, the
 * user simply doesn't get the access).
 */
export const SWAP_TEAMS = [
  { slug: 'northern-trust', name: 'Northern Trust' },
  { slug: 'southern-ltd', name: 'Southern Ltd' },
  { slug: 'eastford-co', name: 'Eastford Co' },
  { slug: 'westland-inc', name: 'Westland Inc' },
];

export function getSwapTeam(slug) {
  return SWAP_TEAMS.find((t) => t.slug === slug) ?? null;
}
