import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listWorkbooksInWorkspace, resolveMemberTeamName } from '@/lib/sigma-api';
import { getSwapTeam } from '@/lib/teams';
import { getSubAddressIdentity } from '@/lib/subaddress-identities';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/sigma/team-files?team=<slug>
 * GET /api/sigma/team-files?identity=<slug>
 *
 * Client-fetchable so components/TeamSwapSidebar.js / SubAddressSwapSidebar.js
 * can list a team's workspace without the layout/page split — both sidebars
 * live in their route's layout.js, a sibling of the page, not a child, so
 * neither has access to what page.js resolves server-side.
 *
 * Shared between Team Swapping (?team=) and Sub-Address Swapping (?identity=)
 * because listing a workspace's workbooks is the same operation either way —
 * only which slug namespace resolves to the target team name differs.
 */
export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const team = getSwapTeam(searchParams.get('team'));

  let identity = null;
  if (searchParams.get('identity')) {
    // Same base-email resolution as everywhere else — the four candidates
    // are built from THIS user's own email, not a hardcoded account.
    const user = await currentUser();
    const meta = user.publicMetadata ?? {};
    const baseEmail = meta.sigmaEmail || user.emailAddresses[0]?.emailAddress;
    identity = getSubAddressIdentity(searchParams.get('identity'), baseEmail);
  }
  if (!team && !identity) {
    return NextResponse.json({ error: 'Unknown team' }, { status: 400 });
  }
  // For an identity, the team is looked up live from Sigma's own data
  // (resolveMemberTeamName) rather than stored anywhere in this app — see
  // its comment in lib/sigma-api.js.
  const teamName = team?.name || (identity ? await resolveMemberTeamName(identity.email) : null);
  if (!teamName) {
    return NextResponse.json({ error: `"${identity.email}" isn't assigned to exactly one Sigma team yet.` }, { status: 400 });
  }

  try {
    const files = await listWorkbooksInWorkspace(teamName);
    return NextResponse.json({ files }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
