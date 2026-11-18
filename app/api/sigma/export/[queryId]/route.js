import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { fetchExportFile } from '@/lib/sigma-exports';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Sigma queryIds are opaque tokens; reject anything else before it reaches a URL.
const QUERY_ID_RE = /^[A-Za-z0-9_-]{6,128}$/;

/**
 * GET /api/sigma/export/:queryId
 *
 * 202 { state: 'processing' } until the file is ready, then 200 with the file
 * as an attachment. The client polls this. Sigma's own queryId is unguessable
 * and expires after an hour, but it is NOT bound to a user here — see the
 * hardening note on beads issue embed_examplesite-09j.
 */
export async function GET(_request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { queryId } = await params;
  if (!QUERY_ID_RE.test(queryId)) return NextResponse.json({ error: 'Bad export id.' }, { status: 400 });

  try {
    const result = await fetchExportFile(queryId);
    if (result.state === 'processing') {
      return NextResponse.json({ state: 'processing' }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
    }
    if (result.state === 'error') {
      return NextResponse.json({ state: 'error', error: result.message }, { status: 502 });
    }
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename.replace(/"/g, '')}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[/api/sigma/export/:queryId] GET', error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
