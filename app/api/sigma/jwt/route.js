import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';
import { resolveUrlParams } from '@/lib/embed-url-params';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/sigma/jwt?mode=<optional_mode>
 * GET /api/sigma/jwt?urlId=<sigma_file_urlId>  (content-browser tree click)
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
  const urlId = searchParams.get('urlId') || undefined;
  const sessionLengthParam = searchParams.get('sessionLength');
  const sessionLength = sessionLengthParam ? parseInt(sessionLengthParam) : undefined;

  try {
    // Content-browser (urlId) embeds are ad hoc — they don't carry any
    // mode-specific URL params (those are keyed to the pre-configured examples).
    const urlParams = urlId ? {} : resolveUrlParams(meta, mode);

    // Debug logging — visible in Vercel function logs
    console.log('[/api/sigma/jwt] mode:', mode, '| urlId:', urlId || 'none');
    console.log('[/api/sigma/jwt] publicMetadata:', JSON.stringify(meta));
    console.log('[/api/sigma/jwt] resolved urlParams:', JSON.stringify(urlParams));

    const { embedUrl, jwt } = await generateSigmaEmbedUrl({
      email: sigmaEmail,
      accountType,
      teams,
      userAttributes,
      mode,
      urlId,
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
