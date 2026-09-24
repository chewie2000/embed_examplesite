'use client';

import { useEffect } from 'react';
import SigmaEmbed from './SigmaEmbed';
import ConceptDemoPage from './ConceptDemoPage';
import { useDashboardChrome } from '@/lib/dashboard-context';

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
      <div className="rounded-xl border border-black/[0.06] shadow-card overflow-hidden bg-white h-full min-h-[420px] flex flex-col">
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
    </ConceptDemoPage>
  );
}
