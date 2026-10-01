import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { buildSubAddressIdentities } from '@/lib/subaddress-identities';
import { checkSubAddressSetup } from '@/lib/sigma-api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/sigma/subaddress-preflight
 *
 * Same preflight the use case's own layout.js runs, exposed separately so
 * the gallery card can show whether it's usable before clicking in.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();
  const meta = user.publicMetadata ?? {};
  const baseEmail = meta.sigmaEmail || user.emailAddresses[0]?.emailAddress;

  try {
    const identities = await checkSubAddressSetup(buildSubAddressIdentities(baseEmail));
    return NextResponse.json({ identities }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
