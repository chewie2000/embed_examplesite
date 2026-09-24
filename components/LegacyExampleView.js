'use client';

import { useEffect } from 'react';
import SigmaEmbed from './SigmaEmbed';
import ConceptDemoPage from './ConceptDemoPage';
import InfoButton from './InfoButton';
import { useDashboardChrome } from '@/lib/dashboard-context';

// Enablement commentary per example — same pattern as Team Swapping
// (components/TeamSwapView.js / TeamSwapSidebar.js): a short "how this is
// actually achieved" popover plus a link to the relevant Sigma help page,
// aimed at whoever's demoing this, not just describing what's on screen
// (that's what ConceptDemoPage's description text already does).
const INFO = {
  'internal-user': {
    title: 'Authenticated embed via the JWT sub claim',
    body: (
      <>
        The <code className="text-brand-600">sub</code> claim in this embed&apos;s JWT carries the
        logged-in user&apos;s real Sigma identity — Sigma resolves that member&apos;s actual
        permissions, team memberships, and any row-level security from its own side, exactly as if
        they&apos;d signed in directly. Nothing about access control is decided by this app; it only
        asserts who the user is.
        <a
          href="https://help.sigmacomputing.com/docs/json-web-token-claims-reference"
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
        >
          Sigma docs: JWT claims reference ↗
        </a>
      </>
    ),
  },
  secured: {
    title: 'Layering a URL-param filter on top of the JWT',
    body: (
      <>
        This is the same workbook and the same JWT-based access as the example above, with one
        addition: a region filter appended directly to the embed URL as a{' '}
        <code className="text-brand-600">:parameter</code>, sourced from this user&apos;s Clerk{' '}
        <code className="text-brand-600">publicMetadata</code>. It&apos;s enforced independently of
        the JWT — a way to narrow a workbook per-embed (e.g. a saved view or a page-specific filter)
        without touching what the JWT itself grants.
        <a
          href="https://help.sigmacomputing.com/docs/special-characters-for-url-parameters"
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
        >
          Sigma docs: Embed URL parameters ↗
        </a>
      </>
    ),
  },
};

/**
 * Renders one of the LEGACY_EXAMPLES (lib/legacy-examples.js) at its own
 * route. Content and behavior match the original DashboardShell NAV_ITEMS
 * exactly — this just gives each one a real URL instead of client-state.
 */
export default function LegacyExampleView({ example, initialEmbedData }) {
  const { setJwt, clearJwts, setPageTitle, sessionLength, refreshKey } = useDashboardChrome();

  useEffect(() => {
    setPageTitle(example.title);
  }, [example.title, setPageTitle]);

  // Drop this page's JWT from the inspector as we leave, rather than having
  // the provider wipe on navigation — a wipe there races the embed's own
  // registration on mount and wins, leaving the inspector empty.
  useEffect(() => clearJwts, [clearJwts]);

  return (
    <ConceptDemoPage
      badge={example.badge}
      title={example.title}
      description={example.description}
      docs={example.docs}
    >
      <div className="flex flex-col gap-3 h-full min-h-0">
        {INFO[example.slug] && (
          <div className="shrink-0 flex items-center gap-1.5">
            <InfoButton title={INFO[example.slug].title}>{INFO[example.slug].body}</InfoButton>
            <span className="text-[11px] text-ink-secondary">How this is achieved</span>
          </div>
        )}
        <div className="flex-1 min-h-0 rounded-xl border border-black/[0.06] shadow-card overflow-hidden bg-white flex flex-col min-h-[420px]">
          <SigmaEmbed
            mode={example.mode}
            org={example.org}
            label={example.title}
            onJwt={(mode, jwt, embedUrl) => setJwt(mode, jwt, embedUrl, example.title)}
            initialEmbedUrl={initialEmbedData?.embedUrl}
            initialJwt={initialEmbedData?.jwt}
            sessionLength={sessionLength}
            refreshKey={refreshKey}
          />
        </div>
      </div>
    </ConceptDemoPage>
  );
}
