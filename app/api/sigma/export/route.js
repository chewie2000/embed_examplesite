import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getBookmarkEntry } from '@/lib/bookmarks';
import { validateFormat } from '@/lib/export-schedules';
import { EXPORT_FORMATS, assertWorkbookAccess, startWorkbookExport } from '@/lib/sigma-exports';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/sigma/export  { workbookId, format, useBookmark? }
 *
 * Starts a one-off export of the whole workbook AS the signed-in user
 * (exportAs: their memberId), so their own permissions and row-level security
 * shape the file. Returns { queryId }; poll GET /api/sigma/export/:queryId.
 */
export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const email = user.publicMetadata?.sigmaEmail || user.emailAddresses[0]?.emailAddress;

  const body = await request.json().catch(() => ({}));
  try {
    const format = validateFormat(body.format, EXPORT_FORMATS);
    if (!body.workbookId) return NextResponse.json({ error: 'Pick a workbook.' }, { status: 400 });

    const { memberId, workbook } = await assertWorkbookAccess(email, body.workbookId);
    const bookmark = body.useBookmark && workbook.urlId ? getBookmarkEntry(user, workbook.urlId) : null;

    const queryId = await startWorkbookExport({
      workbookId: workbook.id, memberId, format, bookmarkId: bookmark?.id,
    });
    return NextResponse.json({ queryId }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[/api/sigma/export] POST', error.message);
    return NextResponse.json({ error: error.message }, { status: error.status || 502 });
  }
}
