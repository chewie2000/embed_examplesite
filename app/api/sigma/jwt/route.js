import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';
import { resolveUrlParams } from '@/lib/embed-url-params';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/sigma/jwt?mode=<optional_mode>
 *
 * Reads the authenticated user's Clerk publicMetadata to build the Sigma JWT claims.
 * Set metadata per user in the Clerk dashboard → Users → [user] → Metadata → Public.
 *
 * Supported metadata fields:
 *   sigmaEmail     — email used as the Sigma JWT sub claim (defaults to login email)
 *   accountType    — Sigma account type: 'viewer' | 'creator' | 'admin'
 *   teams          — array of Sigma team names e.g. ["sales", "emea"]
 *   userAttributes — object passed to Sigma for RLS e.g. { "region": "EMEA" }
 */
export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();
  const loginEmail = user.emailAddresses[0]?.emailAddress;
  const meta = user.publicMetadata ?? {};

  const sigmaEmail = meta.sigmaEmail || loginEmail;
  const accountType = meta.accountType;
  const teams = meta.teams ?? [];
  const userAttributes = meta.userAttributes ?? {};

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || '';
  const sessionLengthParam = searchParams.get('sessionLength');
  const sessionLength = sessionLengthParam ? parseInt(sessionLengthParam) : undefined;

  try {
    const urlParams = resolveUrlParams(meta, mode);

    // Debug logging — visible in Vercel function logs
    console.log('[/api/sigma/jwt] mode:', mode);
    console.log('[/api/sigma/jwt] publicMetadata:', JSON.stringify(meta));
    console.log('[/api/sigma/jwt] resolved urlParams:', JSON.stringify(urlParams));

    const { embedUrl, jwt } = await generateSigmaEmbedUrl({
      email: sigmaEmail,
      accountType,
      teams,
      userAttributes,
      mode,
      sessionLength,
      urlParams,
    });

    return NextResponse.json({ embedUrl, jwt }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('[/api/sigma/jwt]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
