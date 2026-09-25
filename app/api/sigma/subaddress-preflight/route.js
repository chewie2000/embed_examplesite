import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { buildSubAddressIdentities } from '@/lib/subaddress-identities';
import { checkSubAddressSetup } from '@/lib/sigma-api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/sigma/subaddress-preflight
 *
 * Same preflight app/dashboard/subaddress-swap/layout.js already runs
 * (checkSubAddressSetup), exposed as its own endpoint so the use-case
 * GALLERY (app/dashboard/page.js) can show whether Sub-Address Swapping is
 * actually usable for the signed-in account BEFORE clicking into it —
 * rather than only surfacing that once inside the use case's own sidebar.
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
