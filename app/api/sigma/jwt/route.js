import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';

/**
 * GET /api/sigma/jwt?mode=<optional_mode>
 *
 * Verifies the Clerk session, maps the user's login email to their Sigma
 * identity via SIGMA_EMAIL_MAP, then generates a signed Sigma embed URL.
 *
 * SIGMA_EMAIL_MAP is a JSON object in your environment variables:
 *   { "user@gmail.com": "user@company.com" }
 *
 * If no mapping exists the login email is used as-is for the sub claim.
 */
export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();
  const loginEmail = user.emailAddresses[0]?.emailAddress;

  // Map login email → Sigma sub claim email
  const emailMap = JSON.parse(process.env.SIGMA_EMAIL_MAP || '{}');
  const sigmaEmail = emailMap[loginEmail] || loginEmail;

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || '';

  try {
    const { embedUrl, jwt } = await generateSigmaEmbedUrl({
      email: sigmaEmail,
      mode,
    });

    return NextResponse.json({ embedUrl, jwt });
  } catch (error) {
    console.error('[/api/sigma/jwt]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
