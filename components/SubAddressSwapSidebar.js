'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import InfoButton from './InfoButton';

// Same icon as TeamSwapSidebar's teamIcon — this list is meant to look like
// that one (workspace/team names), even though what's actually selected is
// a sub-addressed login. The distinction shows up in the main content area,
// not here — see SubAddressSwapView.js.
const teamIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const fileIcon = (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const plusIcon = (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const CREATE_IDLE = { mode: 'idle' };

/**
 * Identity + file picker for the Sub-Address Swapping use case — sibling to
 * TeamSwapSidebar.js. Picking a login here is equivalent to picking a team
 * there, except the slug resolves to BOTH an email (sub) and a team
 * (teams), not just a team — see lib/subaddress-identities.js.
 *
 * `identities` is resolved server-side by the route's layout.js (a preflight
 * against Sigma — see checkSubAddressSetup in lib/sigma-api.js), NOT read
 * from a static list here: the four candidates are now built from whichever
 * account is actually signed in, so whether each one is usable has to be
 * checked live, not assumed. An identity that isn't ({ok: false} — not
 * provisioned in Sigma yet, or not on exactly one team) renders disabled
 * with its reason shown inline, rather than leading to a dead-end click.
 *
 * Both selections live in the URL (`?identity=<slug>&urlId=<workbook urlId>`)
 * for the same reasons as Team Swapping's: survives a refresh, linkable
 * mid-demo, gives the page a param to re-sign its JWT server-side from.
 */
export default function SubAddressSwapSidebar({ identities }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSlug = searchParams.get('identity');
  const activeUrlId = searchParams.get('urlId');

  const [state, setState] = useState({ status: 'idle' });
  const [create, setCreate] = useState(CREATE_IDLE);

  const load = useCallback(async (slug) => {
    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/sigma/team-files?identity=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load files.');
      setState({ status: 'ready', files: data.files ?? [] });
    } catch (err) {
      setState({ status: 'error', error: err.message });
    }
  }, []);

  useEffect(() => {
    if (activeSlug) load(activeSlug);
    else setState({ status: 'idle' });
    setCreate(CREATE_IDLE);
  }, [activeSlug, load]);

  const selectFile = (urlId) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set('urlId', urlId);
    router.push(`${pathname}?${qs.toString()}`);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    const name = (create.name || '').trim();
    if (!name || create.mode === 'submitting') return;
    setCreate({ mode: 'submitting', name });
    try {
      const res = await fetch('/api/sigma/team-workbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: activeSlug, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create workbook.');
      await load(activeSlug);
      setCreate(CREATE_IDLE);
      selectFile(data.urlId);
    } catch (err) {
      setCreate({ mode: 'open', name, error: err.message });
    }
  };

  return (
    <aside className="w-64 shrink-0 border-r border-black/[0.06] bg-white flex flex-col">
      <div className="p-3 gap-0.5 flex flex-col shrink-0">
        <div className="flex items-center gap-1.5 mb-2 px-2 pt-1">
          <p className="text-[10px] font-semibold text-ink-secondary uppercase tracking-widest">
            Workspaces
          </p>
          <InfoButton title="Sub-Address Swapping via JWT">
            Each of these is the SAME underlying signed-in embed account, using email
            sub-addressing (the <code className="text-brand-600">+tag</code> convention) to
            simulate four separate logins — built from this account&apos;s own address, not a fixed
            test account, so whichever account is signed in determines whether these four are
            actually usable (see below if any show as not set up). Picking one re-signs this
            embed&apos;s JWT with that exact email as <code className="text-brand-600">sub</code>{' '}
            — and sends NO <code className="text-brand-600">teams</code> claim at all. Each of
            these four is a real Sigma member that&apos;s already, persistently assigned to its
            matching team, so Sigma applies that access entirely on its own, the same as it would
            for an internal user signing in directly. Nothing about team membership is asserted by
            this app, the same as if a customer&apos;s SSO issued one address per business unit and
            team resolution just followed the login.
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
        </div>
        {identities.map((identity) => {
          const isActive = activeSlug === identity.slug;
          if (!identity.ok) {
            // No resolved team name to show for a broken one — its email is
            // the only identifying info available, so it's shown here (and
            // only here) as a fallback.
            return (
              <div
                key={identity.slug}
                aria-disabled="true"
                className="w-full flex flex-col gap-0.5 px-3 py-2 rounded-lg text-sm border border-transparent cursor-not-allowed"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-zinc-300">{teamIcon}</span>
                  <span className="truncate font-mono text-[12px] text-zinc-300 line-through decoration-zinc-300">
                    {identity.email}
                  </span>
                </div>
                <p className="text-[10px] text-amber-700 leading-snug pl-[26px]">
                  Not set up in Sigma yet — not provisioned, or not on exactly one team.
                </p>
              </div>
            );
          }
          return (
            <Link
              key={identity.slug}
              href={`${pathname}?identity=${identity.slug}`}
              className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 border border-brand-500/20'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-black/[0.03] border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-brand-500' : 'text-zinc-400'}>{teamIcon}</span>
              {identity.team}
            </Link>
          );
        })}
      </div>

      {activeSlug && (
        <div className="flex-1 min-h-0 flex flex-col border-t border-black/[0.06] pt-2">
          <div className="flex items-center justify-between px-3 mb-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-semibold text-ink-secondary uppercase tracking-widest">
                Files
              </p>
              <InfoButton title="Live file discovery via the Sigma REST API">
                This list isn&apos;t hardcoded — it&apos;s fetched live from Sigma&apos;s REST API
                (<code className="text-brand-600">GET /v2/workbooks</code>), scoped to the selected
                identity&apos;s team workspace. Same pattern as Team Swapping&apos;s file list — the
                identity only changes which slug resolves to which workspace.
                <a
                  href="https://help.sigmacomputing.com/reference/list-workbooks"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
                >
                  Sigma docs: List workbooks (API reference) ↗
                </a>
              </InfoButton>
            </div>
            <div className="flex items-center gap-1.5">
              <InfoButton title="Creating a workbook via workbook-as-code">
                Creating a workbook here uses Sigma&apos;s workbook-as-code API
                (<code className="text-brand-600">POST /v2/workbooks</code>), same as Team
                Swapping — but OWNED by the sub-addressed identity&apos;s email, not the real
                signed-in Clerk account. That email needs to have been embedded at least once
                already (Sigma provisions members lazily on first embed), otherwise this fails with
                a clear &quot;not provisioned yet&quot; error. Once created, the embed automatically
                swaps to show it live. Sigma documents this capability as a{' '}
                <span className="font-medium">public beta</span> feature.
                <a
                  href="https://help.sigmacomputing.com/docs/manage-workbooks-as-code"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
                >
                  Sigma docs: Manage workbooks as code ↗
                </a>
              </InfoButton>
              {create.mode === 'idle' && (
                <button
                  onClick={() => setCreate({ mode: 'open', name: '' })}
                  title="Create a new workbook in this workspace"
                  className="text-ink-secondary hover:text-brand-600 transition-colors"
                >
                  {plusIcon}
                </button>
              )}
            </div>
          </div>

          {create.mode !== 'idle' && (
            <form onSubmit={submitCreate} className="px-2 pb-2 space-y-1.5">
              <input
                autoFocus
                type="text"
                value={create.name}
                onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value, error: undefined }))}
                onKeyDown={(e) => { if (e.key === 'Escape') setCreate(CREATE_IDLE); }}
                disabled={create.mode === 'submitting'}
                placeholder="Workbook name"
                className="w-full text-sm px-2 py-1.5 rounded-lg border border-black/[0.1] focus:outline-none focus:border-brand-500/50 disabled:opacity-60"
              />
              {create.error && (
                <p className="text-[11px] text-red-600 leading-relaxed">{create.error}</p>
              )}
              <div className="flex items-center gap-1.5">
                <button
                  type="submit"
                  disabled={create.mode === 'submitting' || !create.name.trim()}
                  className="flex-1 text-xs font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  {create.mode === 'submitting' ? 'Creating…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreate(CREATE_IDLE)}
                  disabled={create.mode === 'submitting'}
                  className="text-xs text-ink-secondary hover:text-ink-primary px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-2">
            {state.status === 'loading' && (
              <div className="p-2 space-y-1.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-7 rounded-lg bg-black/[0.04] animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
                ))}
              </div>
            )}

            {state.status === 'error' && (
              <div className="flex flex-col items-center gap-2 text-center p-3">
                <p className="text-[11px] text-ink-secondary leading-relaxed">{state.error}</p>
                <button
                  onClick={() => load(activeSlug)}
                  className="text-[11px] text-ink-secondary hover:text-ink-primary border border-black/[0.08] hover:border-black/[0.18] px-2.5 py-1 rounded-lg transition-all"
                >
                  Retry
                </button>
              </div>
            )}

            {state.status === 'ready' && state.files.length === 0 && (
              <p className="text-[11px] text-ink-secondary leading-relaxed px-2 py-1">
                No files in this workspace yet.
              </p>
            )}

            {state.status === 'ready' && state.files.map((file) => {
              const isActive = activeUrlId === file.urlId;
              return (
                <button
                  key={file.urlId}
                  onClick={() => selectFile(file.urlId)}
                  className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-sm truncate transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-600 border border-brand-500/20'
                      : 'text-ink-secondary hover:text-ink-primary hover:bg-black/[0.03] border border-transparent'
                  }`}
                >
                  <span className={isActive ? 'text-brand-500' : 'text-zinc-400'}>{fileIcon}</span>
                  <span className="truncate">{file.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
