import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createTitleWorkbook, getWorkspaceUrlId, resolveMemberByEmail, resolveMemberTeamName } from '@/lib/sigma-api';
import { getSwapTeam } from '@/lib/teams';
import { getSubAddressIdentity } from '@/lib/subaddress-identities';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/sigma/team-workbook  { team: <slug>, name: <string> }
 * POST /api/sigma/team-workbook  { identity: <slug>, name: <string> }
 *
 * Creates a new workbook (title header only — see createTitleWorkbook's own
 * comment for why there's no logo) directly inside the target team's
 * workspace, via workbook-as-code (POST /v2/workbooks).
 *
 * Ownership differs by which use case is calling this:
 *   - Team Swapping (`team`): owned by the real signed-in embed user's own
 *     sigmaEmail — the picker only changes which team's workspace it lands
 *     in, not who "you" are.
 *   - Sub-Address Swapping (`identity`): owned by the SUB-ADDRESSED
 *     identity's email instead — that use case's whole premise is that the
 *     login itself is a different identity, so the workbook it creates
 *     should belong to that identity, not the real underlying Clerk account.
 *
 * Either way, the create can fail with Sigma's own permission error even
 * though the app's credentials could create it as themselves — a `view`
 * account type can't own a workbook at all, regardless of folder access
 * (see createTitleWorkbook's comment), and for the identity path, Sigma
 * lazily provisions members per `sub` on first EMBED load, not on this
 * create call — so creating before that identity has ever been embedded
 * hits the same "not provisioned yet" error, correctly. Both are surfaced
 * verbatim rather than papered over, since they're real, demo-relevant
 * constraints: which embed user you're signed in as determines whether this
 * works, the same way it determines which team's content that user can reach.
 */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const team = getSwapTeam(body.team);
  const name = (body.name || '').trim();

  // Fetched unconditionally: the team path needs it for ownerEmail, the
  // identity path needs it to build the sub-addressed candidates (no
  // hardcoded base account — see lib/subaddress-identities.js).
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

  // For an identity, the team is looked up live from Sigma's own data
  // (resolveMemberTeamName) rather than stored anywhere in this app — see
  // its comment in lib/sigma-api.js.
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
