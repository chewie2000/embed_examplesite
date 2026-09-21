'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ConceptDemoPage from '@/components/ConceptDemoPage';
import { useDashboardChrome } from '@/lib/dashboard-context';
import { getSwapTeam } from '@/lib/teams';

export default function TeamSwapPage() {
  const { setPageTitle } = useDashboardChrome();
  const team = getSwapTeam(useSearchParams().get('team'));

  useEffect(() => {
    setPageTitle('Team Swapping via JWT');
  }, [setPageTitle]);

  return (
    <ConceptDemoPage
      badge={{ text: 'Team claim', tone: 'info' }}
      title="Team Swapping via JWT"
      description="Sigma resolves an embed user's content access from their team membership, and the JWT's teams claim is what asserts that membership per session. Pick a team on the left to swap which team this embed user is presented as belonging to."
      docs={[
        { label: 'JWT claims reference', href: 'https://help.sigmacomputing.com/docs/json-web-token-claims-reference' },
      ]}
    >
      <div className="rounded-xl border border-black/[0.06] shadow-card bg-white h-full min-h-[420px] flex items-center justify-center p-8">
        {team ? (
          <div className="text-center">
            <p className="text-[11px] font-semibold text-ink-secondary uppercase tracking-widest mb-2">
              Selected team
            </p>
            <p className="font-[family-name:var(--font-display)] text-2xl text-ink-primary mb-3">
              {team.name}
            </p>
            <p className="text-xs text-ink-secondary max-w-sm leading-relaxed">
              Nothing is signed with this team yet — the embed and the JWT wiring come next.
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-secondary">Pick a team from the left to begin.</p>
        )}
      </div>
    </ConceptDemoPage>
  );
}
