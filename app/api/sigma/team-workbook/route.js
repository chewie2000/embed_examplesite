import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createTitleWorkbook, getWorkspaceUrlId, resolveMemberByEmail } from '@/lib/sigma-api';
import { getSwapTeam } from '@/lib/teams';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/sigma/team-workbook  { team: <slug>, name: <string> }
 *
 * Creates a new workbook (title header only — see createTitleWorkbook's own
 * comment for why there's no logo) directly inside the given team's
 * workspace, via workbook-as-code (POST /v2/workbooks), OWNED by the
 * signed-in embed user rather than this app's own API service account.
 *
 * That means the create can fail with Sigma's own permission error even
 * though the app's credentials could create it as themselves — a `view`
 * account type can't own a workbook at all, regardless of folder access
 * (see createTitleWorkbook's comment). That's surfaced verbatim rather than
 * papered over, since it's a real, demo-relevant constraint: which embed
 * user you're signed in as determines whether this works, the same way it
 * determines which team's content that user can reach.
 */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const team = getSwapTeam(body.team);
  const name = (body.name || '').trim();

  if (!team) {
    return NextResponse.json({ error: 'Unknown team' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'A workbook name is required.' }, { status: 400 });
  }

  const user = await currentUser();
  const meta = user.publicMetadata ?? {};
  const sigmaEmail = meta.sigmaEmail || user.emailAddresses[0]?.emailAddress;

  try {
    const member = await resolveMemberByEmail(sigmaEmail);
    if (!member) {
      return NextResponse.json({
        error: `"${sigmaEmail}" isn't provisioned in Sigma yet — open any embed page as this user first, then try again.`,
      }, { status: 400 });
    }

    const folderId = await getWorkspaceUrlId(team.name);
    if (!folderId) {
      return NextResponse.json({ error: `Could not resolve the "${team.name}" workspace.` }, { status: 500 });
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
