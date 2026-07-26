import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { buildEmbedUserTree } from '@/lib/sigma-api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/sigma/tree
 *
 * Returns the EMBED-workspace folder/workbook structure that the currently
 * logged-in embed user can access, read via the Sigma REST API.
 *
 * The user identity mirrors /api/sigma/jwt: publicMetadata.sigmaEmail
 * (falling back to the Clerk login email) is the embed user's JWT `sub`,
 * which is also the Sigma member email we resolve here.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();
  const loginEmail = user.emailAddresses[0]?.emailAddress;
  const meta = user.publicMetadata ?? {};
  const sigmaEmail = meta.sigmaEmail || loginEmail;

  try {
    const result = await buildEmbedUserTree(sigmaEmail);

    console.log('[/api/sigma/tree] sigmaEmail:', sigmaEmail);
    console.log('[/api/sigma/tree] workspace:', result.workspace, '| member found:', !!result.member, '| files:', result.fileCount);

    return NextResponse.json(
      { sigmaEmail, ...result },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('[/api/sigma/tree]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
