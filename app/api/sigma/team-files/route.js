import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listWorkbooksInWorkspace } from '@/lib/sigma-api';
import { getSwapTeam } from '@/lib/teams';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/sigma/team-files?team=<slug>
 *
 * Client-fetchable so components/TeamSwapSidebar.js can list a team's
 * workspace without the layout/page split — TeamSwapSidebar lives in
 * app/dashboard/team-swap/layout.js, a sibling of the page, not a child, so
 * it has no access to what page.js resolves server-side.
 */
export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const team = getSwapTeam(searchParams.get('team'));
  if (!team) {
    return NextResponse.json({ error: 'Unknown team' }, { status: 400 });
  }

  try {
    const files = await listWorkbooksInWorkspace(team.name);
    return NextResponse.json({ files }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
