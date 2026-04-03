import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';

/**
 * GET /api/sigma/jwt?mode=<optional_mode>
 *
 * Verifies the user's session cookie, then generates a signed Sigma embed URL.
 * The mode param allows different Sigma workbooks per section of the app
 * (e.g. ?mode=dashboard maps to DASHBOARD_SIGMA_BASE_URL in .env.local).
 *
 * Returns: { embedUrl: string, jwt: string }
 */
export async function GET(request) {
  // 1. Verify session
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let session;
  try {
    session = await verifySession(sessionToken);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
  }

  // 2. Read optional mode from query string
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || '';

  // 3. Generate the signed Sigma embed URL
  try {
    const { embedUrl, jwt } = await generateSigmaEmbedUrl({
      email: session.email,
      accountType: session.accountType,
      teams: session.teams,
      mode,
    });

    return NextResponse.json({ embedUrl, jwt });
  } catch (error) {
    console.error('[/api/sigma/jwt]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
