import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildSubAddressIdentities } from '@/lib/subaddress-identities';
import { checkSubAddressSetup } from '@/lib/sigma-api';
import SubAddressSwapSidebar from '@/components/SubAddressSwapSidebar';
import UseCaseMain from '@/components/UseCaseMain';

// Runs the preflight fresh on every entry rather than caching it, to catch
// Sigma-side setup drift before it's clicked into.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SubAddressSwapLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const meta = user.publicMetadata ?? {};
  const baseEmail = meta.sigmaEmail || user.emailAddresses[0]?.emailAddress;

  // Checked once here — the layout persists across identity/file selections
  // within this route (only searchParams change).
  const identities = await checkSubAddressSetup(buildSubAddressIdentities(baseEmail));

  return (
    <>
      <SubAddressSwapSidebar identities={identities} />
      <UseCaseMain>{children}</UseCaseMain>
    </>
  );
}
