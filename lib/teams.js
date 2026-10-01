/**
 * The four Sigma teams for Team Swapping via JWT, each paired 1:1 with an
 * identically-named workspace. `name` must match the Sigma team name
 * exactly — the JWT `teams` claim asserts membership by name, and a
 * mismatch fails silently.
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
