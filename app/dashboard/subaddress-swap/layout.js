import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildSubAddressIdentities } from '@/lib/subaddress-identities';
import { checkSubAddressSetup } from '@/lib/sigma-api';
import SubAddressSwapSidebar from '@/components/SubAddressSwapSidebar';
import UseCaseMain from '@/components/UseCaseMain';

// Runs the preflight fresh on every entry to this use case rather than
// caching it — the whole point is catching a Sigma-side setup drift (a
// sub-addressed member losing its team assignment, say) before it's clicked
// into, not once at build/deploy time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SubAddressSwapLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const meta = user.publicMetadata ?? {};
  const baseEmail = meta.sigmaEmail || user.emailAddresses[0]?.emailAddress;

  // Checked once here (layout persists across identity/file selections
  // within this route — only searchParams change, not the segment) rather
  // than per click, per the "preflight before anything else" ask.
  const identities = await checkSubAddressSetup(buildSubAddressIdentities(baseEmail));

  return (
    <>
      <SubAddressSwapSidebar identities={identities} />
      <UseCaseMain>{children}</UseCaseMain>
    </>
  );
}
