import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';

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
    const { embedUrl, jwt } = await generateSigmaEmbedUrl({
      email: sigmaEmail,
      accountType,
      teams,
      userAttributes,
      mode,
      sessionLength,
    });

    return NextResponse.json({ embedUrl, jwt });
  } catch (error) {
    console.error('[/api/sigma/jwt]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
