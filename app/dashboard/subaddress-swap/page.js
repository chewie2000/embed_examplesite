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
 * Sibling to app/dashboard/team-swap/page.js, but no teams claim is sent.
 * The picked identity sets the JWT's `sub`; its real Sigma team (resolved
 * here only to know which workspace to list/embed from) is what Sigma
 * applies on its own at embed-load time. Team Swapping, by contrast,
 * overrides `teams` directly while keeping `sub` fixed.
 */
export default async function SubAddressSwapPage({ searchParams }) {
  const { identity: slug, urlId, menu, pos } = await searchParams;
  const menuState = resolveMenuState({ menu, pos });

  const user = await currentUser();
  if (!user) redirect('/sign-in');

  // Recomputed rather than shared with the layout's preflight — a layout
  // and its page render independently.
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
    // member is a redundant second lookup (resolveMemberTeamName does its
    // own), kept to show memberType — null before first embed, shown as-is.
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
        // No teams claim: `team` above only finds the right workspace,
        // never sent to Sigma. No user attributes: this workbook doesn't
        // do attribute-driven RLS.
        email: identity.email,
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
