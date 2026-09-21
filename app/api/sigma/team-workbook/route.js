import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createTitleWorkbook, getWorkspaceUrlId } from '@/lib/sigma-api';
import { getSwapTeam } from '@/lib/teams';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/sigma/team-workbook  { team: <slug>, name: <string> }
 *
 * Creates a new workbook (title header only — see createTitleWorkbook's own
 * comment for why there's no logo) directly inside the given team's
 * workspace, via workbook-as-code (POST /v2/workbooks). The team slug is
 * resolved to a workspace name server-side, same reasoning as elsewhere in
 * this use case — never trust a client-supplied identifier for something
 * that picks a destination folder.
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

  try {
    const folderId = await getWorkspaceUrlId(team.name);
    if (!folderId) {
      return NextResponse.json({ error: `Could not resolve the "${team.name}" workspace.` }, { status: 500 });
    }
    const created = await createTitleWorkbook({ folderId, name });
    return NextResponse.json({ name: created.name, urlId: created.workbookUrlId }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    // Surfaced verbatim rather than a generic message — Sigma's own spec
    // validation errors are the real development loop here.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
