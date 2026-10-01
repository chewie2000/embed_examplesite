import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listWorkbooksInWorkspace, resolveMemberTeamName } from '@/lib/sigma-api';
import { getSwapTeam } from '@/lib/teams';
import { getSubAddressIdentity } from '@/lib/subaddress-identities';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/sigma/team-files?team=<slug> | ?identity=<slug>
 *
 * Client-fetchable so the sidebar can list a workspace's files independently
 * of what page.js resolves server-side (layout.js and page.js don't share
 * render state). Shared between Team Swapping and Sub-Address Swapping —
 * same operation either way, only which slug resolves the target differs.
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
    const user = await currentUser();
    const meta = user.publicMetadata ?? {};
    const baseEmail = meta.sigmaEmail || user.emailAddresses[0]?.emailAddress;
    identity = getSubAddressIdentity(searchParams.get('identity'), baseEmail);
  }
  if (!team && !identity) {
    return NextResponse.json({ error: 'Unknown team' }, { status: 400 });
  }
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
