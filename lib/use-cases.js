/**
 * Cards shown on the /dashboard use-case gallery (embed_examplesite-0so.6).
 * Each entry is a compact preview — icon, title, one-line summary, optional
 * badge — linking to that use case's real route. As new demo pages get
 * built (embed_examplesite-31t, -d99, -9ip, -ret, -0i2, -zbu, ...) they get
 * appended here, not folded into a bigger rewrite.
 *
 * Content Browser is not a card of its own — it's part of the Legacy
 * Examples use case (its sidebar), since browsing the tree was one of the
 * things that demo was showing off.
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
];
