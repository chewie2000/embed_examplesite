'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SigmaEmbed from './SigmaEmbed';
import ConceptDemoPage from './ConceptDemoPage';
import { useDashboardChrome } from '@/lib/dashboard-context';

const DOCS = [
  { label: 'JWT claims reference', href: 'https://help.sigmacomputing.com/docs/json-web-token-claims-reference' },
];

const DESCRIPTION =
  "Sigma resolves an embed user's content access from their team membership, and the JWT's teams claim is what asserts that membership for the session. Each team below owns a workspace holding its own copy of the same workbook. Pick a team and the JWT is re-signed with only that team — so the workbook you see is one this user can only reach through that team's grant.";

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

        {/* Menu switches — :menu_position accepts exactly top/bottom/none
            (verified against Sigma's embed URL parameters reference); modeled
            as one visibility toggle plus a position choice rather than a
            three-way selector, since "hidden" isn't a position. Only shown
            once a team is selected — nothing for them to act on before then. */}
        {team && (
          <div className="shrink-0 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ink-secondary">Menu</span>
              <button
                onClick={() => updateMenuState({ visible: !menuState.visible })}
                role="switch"
                aria-checked={menuState.visible}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  menuState.visible ? 'bg-brand-500' : 'bg-zinc-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    menuState.visible ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-ink-primary">{menuState.visible ? 'Visible' : 'Hidden'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-ink-secondary">Position</span>
              <div className="inline-flex rounded-lg border border-black/[0.08] p-0.5">
                {['top', 'bottom'].map((p) => (
                  <button
                    key={p}
                    onClick={() => updateMenuState({ visible: true, position: p })}
                    className={`px-2.5 py-1 rounded-md capitalize transition-all ${
                      menuState.visible && menuState.position === p
                        ? 'bg-brand-50 text-brand-600'
                        : 'text-ink-secondary hover:text-ink-primary'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 rounded-xl border border-black/[0.06] shadow-card overflow-hidden bg-white flex flex-col min-h-[420px]">
          {!team ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-ink-secondary">Pick a team from the left to begin.</p>
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
              // Keyed per team AND menu state so each change genuinely remounts
              // the iframe — SigmaEmbed seeds its embed URL on mount only, so
              // an in-place prop update would keep showing the previous
              // team's/menu setting's workbook.
              key={`${team.slug}:${menuState.visible}:${menuState.position}`}
              urlId={workbook.urlId}
              label={`${team.name} — ${workbook.name}`}
              teamSlug={team.slug}
              menuVisible={menuState.visible}
              menuPosition={menuState.position}
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
