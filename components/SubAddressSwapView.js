'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SigmaEmbed from './SigmaEmbed';
import ConceptDemoPage from './ConceptDemoPage';
import InfoButton from './InfoButton';
import { useDashboardChrome } from '@/lib/dashboard-context';

const DOCS = [
  { label: 'JWT claims reference', href: 'https://help.sigmacomputing.com/docs/json-web-token-claims-reference' },
  { label: 'Embed URL parameters', href: 'https://help.sigmacomputing.com/docs/embed-url-parameters' },
];

const DESCRIPTION =
  "A sibling to Team Swapping via JWT — same four teams and workspaces, different mechanism. There, you stay signed in as one user and a menu sets the teams claim directly. Here, there's no teams claim at all: picking one of these four sub-addressed logins only sets the JWT's sub claim, and Sigma applies that member's own real, persistent team membership entirely on its own — the same way a customer's SSO might issue one address per business unit, with team resolution following the login rather than anything asserted in the token.";

export default function SubAddressSwapView({ identity, workbook, embedData, memberType, error, menuState }) {
  const { setJwt, clearJwts, setPageTitle, sessionLength, refreshKey } = useDashboardChrome();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setPageTitle(identity ? identity.email : 'Sub-Address Swapping via JWT');
  }, [identity, setPageTitle]);

  // Clear on identity change/unmount rather than on mount — see the note in
  // lib/dashboard-context.js about why a mount-time wipe loses the JWT.
  useEffect(() => clearJwts, [clearJwts, identity?.slug]);

  const isAdmin = memberType === 'admin';

  // Menu switches — held in the URL alongside ?identity=, same reasoning as
  // Team Swapping's equivalent.
  const updateMenuState = useCallback((patch) => {
    const qs = new URLSearchParams(searchParams.toString());
    const next = { ...menuState, ...patch };
    qs.set('menu', next.visible ? '1' : '0');
    qs.set('pos', next.position);
    router.push(`/dashboard/subaddress-swap?${qs.toString()}`);
  }, [menuState, router, searchParams]);

  return (
    <ConceptDemoPage
      badge={{ text: 'Identity claim', tone: 'info' }}
      title="Sub-Address Swapping via JWT"
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
              <code className="bg-amber-100 px-1 rounded">{identity?.email}</code> can reach every
              workspace regardless of team, so swapping identities here doesn&apos;t prove scoping.
              Demo with a non-admin embed user to show access actually following the claim.
            </p>
          </div>
        )}

        {identity && (
          <div className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-ink-secondary">
            <span className="flex items-center gap-1.5">
              Claim sent: <code className="text-brand-600">sub: &quot;{identity.email}&quot;</code>{' '}
              <span className="text-ink-secondary">
                (no <code className="text-brand-600">teams</code> claim)
              </span>
              <InfoButton title="No team claim at all — Sigma applies it on its own">
                Team Swapping picks a team directly: the signed-in user stays the same, and a menu
                sets the <code className="text-brand-600">teams</code> claim. Here there&apos;s no
                team claim in the JWT at all — only <code className="text-brand-600">sub</code>{' '}
                is asserted. Sigma resolves this member&apos;s access from its own real, persistent
                team membership (<code className="text-brand-600">GET /v2/members/&#123;id&#125;/teams</code>
                {' '}shows the same team below, purely for this page&apos;s own transparency — it
                is NOT sent to Sigma), the same way it would for an internal user who signed in
                directly. Sigma resolves this as a genuinely different identity, not the same user
                claiming a different team; if a sub-addressed email were ever removed from its team
                (or not provisioned at all — Sigma provisions members lazily, on first real embed
                load), Sigma itself would apply that, not this app.
                <a
                  href="https://help.sigmacomputing.com/reference/list-member-teams"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
                >
                  Sigma docs: List teams for a member (API reference) ↗
                </a>
                <a
                  href="https://help.sigmacomputing.com/docs/json-web-token-claims-reference"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
                >
                  Sigma docs: JWT claims reference ↗
                </a>
              </InfoButton>
            </span>
            <span>
              Sigma&apos;s real team for this member:{' '}
              <span className="text-ink-primary">{identity.team ?? '—'}</span>
            </span>
            {workbook && (
              <span>
                Workbook: <span className="text-ink-primary">{workbook.name}</span> in{' '}
                <span className="text-ink-primary">{workbook.workspace}</span>
              </span>
            )}
            <span>
              Embed user: <span className="text-ink-primary">{identity.email}</span>
              {memberType ? ` (${memberType})` : ' (not provisioned yet)'}
            </span>
          </div>
        )}

        {/* Menu switches — identical mechanism to Team Swapping's, see that
            InfoButton's copy for the full explanation of why this is one
            visibility toggle plus a position choice. */}
        {workbook && (
          <div className="shrink-0 flex items-center gap-4 text-xs">
            <InfoButton title="Showing and positioning the embed menu">
              Both switches drive one URL parameter,{' '}
              <code className="text-brand-600">:menu_position</code>, which accepts exactly{' '}
              <code className="text-brand-600">top</code>, <code className="text-brand-600">bottom</code>,
              or <code className="text-brand-600">none</code> (its default when unset). Hidden isn&apos;t
              a position — it&apos;s <code className="text-brand-600">none</code> regardless of which
              position was last selected, which is why the two controls here are a visibility toggle
              plus a position choice rather than a three-way switch.
              <a
                href="https://help.sigmacomputing.com/docs/embed-url-parameters"
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
              >
                Sigma docs: Embed URL parameters ↗
              </a>
            </InfoButton>
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
          {!identity ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-ink-secondary">Pick a login from the left to begin.</p>
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
                <p className="font-medium text-ink-primary text-sm mb-1">Couldn&apos;t load {identity.email}</p>
                <p className="text-xs text-ink-secondary max-w-md leading-relaxed">{error}</p>
              </div>
            </div>
          ) : (
            <SigmaEmbed
              // Keyed per identity, FILE, and menu state — same reasoning as
              // Team Swapping's equivalent key (see its comment for the bug
              // this guards against).
              key={`${identity.slug}:${workbook.urlId}:${menuState.visible}:${menuState.position}`}
              urlId={workbook.urlId}
              label={`${identity.email} — ${workbook.name}`}
              subAddressSlug={identity.slug}
              menuVisible={menuState.visible}
              menuPosition={menuState.position}
              onJwt={(mode, jwt, embedUrl) => setJwt(mode, jwt, embedUrl, `${identity.email} — ${workbook.name}`)}
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
