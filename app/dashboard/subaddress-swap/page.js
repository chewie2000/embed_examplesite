import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';
import { resolveMenuState, menuStateUrlParams } from '@/lib/embed-url-params';
import { listWorkbooksInWorkspace, resolveMemberByEmail, resolveMemberTeamName } from '@/lib/sigma-api';
import { getSubAddressIdentity } from '@/lib/subaddress-identities';
import SubAddressSwapView from '@/components/SubAddressSwapView';

// A fresh JWT is signed per request, carrying whichever identity is selected.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Sibling to app/dashboard/team-swap/page.js — same shape, but there's no
 * teams claim sent at all. The picked IDENTITY sets the JWT's `sub`; Sigma's
 * real, persistent team membership for that member (looked up here only to
 * know which workspace to list/embed from, via resolveMemberTeamName) is
 * what Sigma itself applies at embed-load time — never asserted in the JWT.
 * Team Swapping, by contrast, only ever overrides `teams` directly via the
 * JWT, keeping `sub` fixed as the real signed-in user's own email.
 */
export default async function SubAddressSwapPage({ searchParams }) {
  const { identity: slug, urlId, menu, pos } = await searchParams;
  const menuState = resolveMenuState({ menu, pos });

  const user = await currentUser();
  if (!user) redirect('/sign-in');

  // Same base-email resolution as the layout's preflight (and everywhere
  // else in this app) — recomputed here rather than shared, since a layout
  // and its page render independently and don't share server-side state.
  const meta = user.publicMetadata ?? {};
  const baseEmail = meta.sigmaEmail || user.emailAddresses[0]?.emailAddress;
  const identity = getSubAddressIdentity(slug, baseEmail);

  if (!identity) {
    return <SubAddressSwapView identity={null} menuState={menuState} />;
  }

  let team = null;
  let files = null;
  let member = null;
  let error = null;

  try {
    // team is resolved from Sigma's real, persistent team membership for
    // this identity's email, not configured here — see
    // resolveMemberTeamName's own comment. member is resolved separately
    // (redundant one extra lookup, kept for clarity) purely to show its
    // memberType; before this identity's first real embed load, Sigma
    // hasn't provisioned a member for it yet, and that's shown as-is, not
    // an error.
    [team, member] = await Promise.all([
      resolveMemberTeamName(identity.email),
      resolveMemberByEmail(identity.email),
    ]);
    if (team) {
      files = await listWorkbooksInWorkspace(team);
    }
  } catch (err) {
    error = err.message;
  }

  // No team resolved — either not provisioned yet, or provisioned but not
  // on any single team in Sigma. Distinct from "no file selected yet" below.
  if (!team && !error) {
    error = member
      ? `"${identity.email}" isn't assigned to exactly one Sigma team yet.`
      : `"${identity.email}" isn't provisioned in Sigma yet — open this login once to provision it, then assign it to a team.`;
  }

  // Identity picked, no file yet — show the picker state, no embed. Normal
  // resting state after switching identities, not an error.
  if (!urlId && !error) {
    return (
      <SubAddressSwapView
        identity={{ ...identity, team }}
        memberType={member?.memberType ?? null}
        menuState={menuState}
      />
    );
  }

  const found = urlId ? files?.find((f) => f.urlId === urlId) ?? null : null;
  const workbook = found ? { ...found, workspace: team } : null;
  if (urlId && !workbook && !error) {
    error = `"${urlId}" isn't a file in the "${team}" workspace.`;
  }

  let embedData = null;
  if (workbook && !error) {
    try {
      embedData = await generateSigmaEmbedUrl({
        // The identity's email IS the sub claim here — the whole point of
        // this use case vs. Team Swapping, which keeps sub fixed.
        // Deliberately NO teams claim: `team` above is only used to find
        // the right workspace to list/embed from, never sent to Sigma —
        // Sigma applies this member's real, persistent team membership on
        // its own, from sub alone.
        email: identity.email,
        // No user attributes: same reasoning as Team Swapping — these
        // workbooks don't do attribute-driven RLS.
        userAttributes: {},
        urlId: workbook.urlId,
        urlParams: menuStateUrlParams(menuState),
      });
    } catch (err) {
      error = err.message;
    }
  }

  return (
    <SubAddressSwapView
      identity={{ ...identity, team }}
      workbook={workbook}
      embedData={embedData}
      memberType={member?.memberType ?? null}
      error={error}
      menuState={menuState}
    />
  );
}
