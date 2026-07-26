import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getBookmarkEntry, setBookmarkEntry } from '@/lib/bookmarks';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/bookmarks?urlId=<sigma_file_urlId>
 * Returns { bookmark: { id, name } | null } for the current user + workbook.
 */
export async function GET(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const urlId = searchParams.get('urlId');
  if (!urlId) return NextResponse.json({ error: 'urlId is required' }, { status: 400 });

  const user = await currentUser();
  return NextResponse.json(
    { bookmark: getBookmarkEntry(user, urlId) },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

/**
 * POST /api/bookmarks  { urlId, bookmarkId, name }
 * Upserts the (user, workbook) -> bookmark mapping. Pass bookmarkId: null to
 * remove it (called after a confirmed delete).
 */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { urlId, bookmarkId, name } = body;
  if (!urlId) return NextResponse.json({ error: 'urlId is required' }, { status: 400 });

  const user = await currentUser();
  const entry = bookmarkId ? { id: bookmarkId, name: name ?? '' } : null;
  const bookmarks = await setBookmarkEntry(userId, user, urlId, entry);

  return NextResponse.json(
    { bookmark: bookmarks[urlId] ?? null },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
