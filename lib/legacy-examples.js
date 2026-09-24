/**
 * The two pre-existing demo pages, bundled under /dashboard/legacy/[slug] as
 * part of the use-case gallery redesign (embed_examplesite-0so.7). Content
 * and behavior are unchanged from the original DashboardShell NAV_ITEMS —
 * only where they live moved, from client-state switching in one component
 * to real, bookmarkable routes.
 *
 * org: 'legacy' (embed_examplesite-0so.11) points both pages at the Sigma
 * org this site ran against before the 2026-09 org switch, via
 * LEGACY_SIGMA_BASE_URL/CLIENT_ID/SECRET — see the `org` param on
 * generateSigmaEmbedUrl (lib/sigma-embed.js). The Content Browser in
 * LegacySidebar is ALSO repointed there (/api/sigma/tree always resolves
 * org: 'legacy' — see lib/sigma-api.js), since it's exclusively rendered
 * inside this use case.
 */
export const LEGACY_EXAMPLES = [
  {
    slug: 'internal-user',
    mode: '',
    org: 'legacy',
    title: 'Workbook - Internal User example',
    badge: { text: 'Authenticated embed', tone: 'info' },
    description:
      "A standard authenticated embed for a logged-in user. The JWT's sub claim carries this user's real identity, so Sigma applies whatever permissions, teams, and row-level security that user already has — nothing here is anonymous or shared.",
    docs: [
      { label: 'JWT claims reference', href: 'https://help.sigmacomputing.com/docs/json-web-token-claims-reference' },
    ],
  },
  {
    slug: 'secured',
    mode: 'secured',
    org: 'legacy',
    title: 'Workbook - Secured filtered URL',
    badge: { text: 'Filtered via URL params', tone: 'info' },
    description:
      'The same workbook as the example above, but this page also layers on a per-user region filter applied as a URL parameter sourced from Clerk publicMetadata — separate from, and in addition to, whatever access control the JWT itself already grants.',
    docs: [
      { label: 'Embed URL parameters', href: 'https://help.sigmacomputing.com/docs/special-characters-for-url-parameters' },
    ],
  },
];

export function getLegacyExample(slug) {
  return LEGACY_EXAMPLES.find((e) => e.slug === slug) ?? null;
}
