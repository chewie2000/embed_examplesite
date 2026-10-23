'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SigmaEmbed from './SigmaEmbed';
import ConceptDemoPage from './ConceptDemoPage';
import EmbedMenuControls from './EmbedMenuControls';
import { useDashboardChrome } from '@/lib/dashboard-context';

const DOCS = [
  { label: 'JWT claims reference', href: 'https://help.sigmacomputing.com/docs/json-web-token-claims-reference' },
  { label: 'Embed URL parameters', href: 'https://help.sigmacomputing.com/docs/embed-url-parameters' },
];

const DESCRIPTION =
  "Sigma resolves an embed user's content access from their team membership, and the JWT's teams claim is what asserts that membership for the session. Each team below owns its own workspace. Pick a team, then pick a file from that workspace — the JWT is re-signed with only that team, so anything you can open is something this user can only reach through that team's grant.";

export default function TeamSwapView({ team, workbook, embedData, sigmaEmail, memberType, error, menuState }) {
  const { setJwt, clearJwts, setPageTitle, sessionLength, refreshKey } = useDashboardChrome();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setPageTitle(team ? team.name : 'Team Swapping via JWT');
  }, [team, setPageTitle]);

  // Clear on team change/unmount rather than on mount — see the note in
  // lib/dashboard-context.js about why a mount-time wipe loses the JWT.
  useEffect(() => clearJwts, [clearJwts, team?.slug]);

  const isAdmin = memberType === 'admin';

  // Menu switches — held in the URL alongside ?team=, same reasoning as the
  // team selection itself: survives a refresh, is linkable mid-demo, and
  // gives the server component a param to re-sign the JWT's urlParams from.
  const updateMenuState = useCallback((patch) => {
    const qs = new URLSearchParams(searchParams.toString());
    const next = { ...menuState, ...patch };
    qs.set('menu', next.visible ? '1' : '0');
    qs.set('pos', next.position);
    qs.set('assistant', next.assistant ? '1' : '0');
    router.push(`/dashboard/team-swap?${qs.toString()}`);
  }, [menuState, router, searchParams]);

  return (
    <ConceptDemoPage
      badge={{ text: 'Team claim', tone: 'info' }}
      title="Team Swapping via JWT"
      description={DESCRIPTION}
      docs={DOCS}
    >
      <div className="flex flex-col gap-3 h-full min-h-0">
        {/* An admin member can reach every workspace regardless of team, so the
            swap would appear to work while proving nothing. Worth saying out
            loud rather than letting a demo quietly mislead. */}
        {isAdmin && (
          <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <span className="font-semibold">This embed user is a Sigma admin.</span>{' '}
              <code className="bg-amber-100 px-1 rounded">{sigmaEmail}</code> can reach every workspace
              regardless of team, so swapping teams here doesn&apos;t prove scoping. Demo with a
              non-admin embed user to show access actually following the claim.
            </p>
          </div>
        )}

        {team && (
          <div className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-ink-secondary">
            <span>
              Claim sent: <code className="text-brand-600">teams: [&quot;{team.name}&quot;]</code>
            </span>
            {workbook && (
              <span>
                Workbook: <span className="text-ink-primary">{workbook.name}</span> in{' '}
                <span className="text-ink-primary">{workbook.workspace}</span>
              </span>
            )}
            <span>
              Embed user: <span className="text-ink-primary">{sigmaEmail}</span>
              {memberType ? ` (${memberType})` : ' (not provisioned yet)'}
            </span>
          </div>
        )}

        {/* Menu / Assistant switches — only once a file is loaded; nothing for them to act on before then. */}
        {workbook && <EmbedMenuControls menuState={menuState} onChange={updateMenuState} />}

        <div className="flex-1 min-h-0 rounded-xl border border-black/[0.06] shadow-card overflow-hidden bg-white flex flex-col min-h-[420px]">
          {!team ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-ink-secondary">Pick a team from the left to begin.</p>
            </div>
          ) : !error && !workbook ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-ink-secondary">Select a file from the left to load it.</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-ink-primary text-sm mb-1">Couldn&apos;t load {team.name}</p>
                <p className="text-xs text-ink-secondary max-w-md leading-relaxed">{error}</p>
              </div>
            </div>
          ) : (
            <SigmaEmbed
              // Must include workbook.urlId — SigmaEmbed seeds its URL on
              // mount only, so switching files without a key change would
              // keep showing the previous one.
              key={`${team.slug}:${workbook.urlId}:${menuState.visible}:${menuState.position}:${menuState.assistant}`}
              urlId={workbook.urlId}
              label={`${team.name} — ${workbook.name}`}
              teamSlug={team.slug}
              menuVisible={menuState.visible}
              menuPosition={menuState.position}
              assistantVisible={menuState.assistant}
              onJwt={(mode, jwt, embedUrl) => setJwt(mode, jwt, embedUrl, `${team.name} — ${workbook.name}`)}
              initialEmbedUrl={embedData?.embedUrl}
              initialJwt={embedData?.jwt}
              sessionLength={sessionLength}
              refreshKey={refreshKey}
            />
          )}
        </div>
      </div>
    </ConceptDemoPage>
  );
}
