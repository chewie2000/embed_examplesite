/**
 * Cards shown on the /dashboard use-case gallery — icon, title, one-line
 * summary, optional badge, linking to that use case's real route. New demo
 * pages get appended here.
 *
 * Content Browser isn't a card of its own — it's part of Legacy Examples
 * (its sidebar).
 */
export const USE_CASES = [
  {
    slug: 'legacy',
    href: '/dashboard/legacy/internal-user',
    title: 'Legacy Examples',
    summary: 'The original demo: an authenticated internal-user embed, a secured URL-filtered variant, and the Content Browser sidebar for browsing what the embed user can reach.',
    badge: { text: 'Sidebar demo', tone: 'info' },
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    slug: 'team-swap',
    href: '/dashboard/team-swap',
    title: 'Team Swapping via JWT',
    summary: "Swap which Sigma team the embed user is presented as belonging to, and watch their content access follow — the JWT's teams claim is what asserts membership per session.",
    badge: { text: 'Team claim', tone: 'info' },
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    slug: 'subaddress-swap',
    href: '/dashboard/subaddress-swap',
    title: 'Sub-Address Swapping via JWT',
    summary: "Same four teams and workspaces as Team Swapping, but the team follows WHICH LOGIN the embed user is signed in as, not a picker inside one session — no teams claim is even sent; Sigma applies that member's own real team assignment.",
    badge: { text: 'Identity claim', tone: 'info' },
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25" />
      </svg>
    ),
  },
  {
    slug: 'folder-explorer',
    href: '/dashboard/folder-explorer',
    title: 'Folder Explorer',
    summary: "Just the Content Browser: a live folder tree of the EMBED workspace, read via the Sigma REST API for the logged-in embed user, on the main org. Pick a workbook to embed it.",
    badge: { text: 'REST API discovery', tone: 'info' },
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
  },
];
