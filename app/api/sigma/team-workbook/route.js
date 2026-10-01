import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createTitleWorkbook, getWorkspaceUrlId, resolveMemberByEmail, resolveMemberTeamName } from '@/lib/sigma-api';
import { getSwapTeam } from '@/lib/teams';
import { getSubAddressIdentity } from '@/lib/subaddress-identities';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/sigma/team-workbook  { team: <slug>, name } | { identity: <slug>, name }
 *
 * Creates a workbook via workbook-as-code (POST /v2/workbooks) in the
 * target team's workspace. Owned by the real signed-in user for `team`, or
 * by the sub-addressed identity itself for `identity` — that use case's
 * premise is that the login is a different identity, so what it creates
 * should belong to that identity, not the underlying Clerk account.
 */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const team = getSwapTeam(body.team);
  const name = (body.name || '').trim();

  // Needed either way: ownerEmail for `team`, sub-addressed candidates for `identity`.
  const user = await currentUser();
  const meta = user.publicMetadata ?? {};
  const baseEmail = meta.sigmaEmail || user.emailAddresses[0]?.emailAddress;
  const identity = getSubAddressIdentity(body.identity, baseEmail);

  if (!team && !identity) {
    return NextResponse.json({ error: 'Unknown team' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'A workbook name is required.' }, { status: 400 });
  }

  const ownerEmail = identity ? identity.email : baseEmail;

  const teamName = team?.name || (identity ? await resolveMemberTeamName(identity.email) : null);
  if (!teamName) {
    return NextResponse.json({ error: `"${ownerEmail}" isn't assigned to exactly one Sigma team yet.` }, { status: 400 });
  }

  try {
    const member = await resolveMemberByEmail(ownerEmail);
    if (!member) {
      return NextResponse.json({
        error: `"${ownerEmail}" isn't provisioned in Sigma yet — open any embed page as this user first, then try again.`,
      }, { status: 400 });
    }

    const folderId = await getWorkspaceUrlId(teamName);
    if (!folderId) {
      return NextResponse.json({ error: `Could not resolve the "${teamName}" workspace.` }, { status: 500 });
    }

    const created = await createTitleWorkbook({ folderId, name, ownerId: member.memberId });
    return NextResponse.json({ name: created.name, urlId: created.workbookUrlId }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    // Surfaced verbatim rather than a generic message — Sigma's own spec
    // and permission errors are the real development (and demo) loop here.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
