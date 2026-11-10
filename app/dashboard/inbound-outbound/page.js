import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';
import { SAFE_CONTROL_VALUE } from '@/lib/inbound-outbound';
import InboundOutboundView from '@/components/InboundOutboundView';
import UseCaseMain from '@/components/UseCaseMain';

// A fresh JWT is signed per request, carrying whichever ?customer= was opened.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InboundOutboundPage({ searchParams }) {
  const { customer } = await searchParams;

  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const meta = user.publicMetadata ?? {};
  const sigmaEmail = meta.sigmaEmail || user.emailAddresses[0]?.emailAddress;

  // Inbound on load: ?customer=<value> sets the workbook's `customer-id`
  // control via the embed URL (a plain URL param, not a JWT claim). Convenience
  // filter only — never a security boundary, so it's just shape-checked.
  const initialCustomer = typeof customer === 'string' && SAFE_CONTROL_VALUE.test(customer) ? customer : null;

  let initialEmbedData = null;
  try {
    initialEmbedData = await generateSigmaEmbedUrl({
      email: sigmaEmail,
      accountType: meta.accountType,
      teams: meta.teams ?? [],
      userAttributes: meta.userAttributes ?? {},
      mode: 'inbound_outbound',
      urlParams: initialCustomer ? { 'customer-id': initialCustomer } : {},
    });
  } catch {
    // Falls back to client-side fetch in SigmaEmbed (which won't carry the
    // ?customer= param — the error state there shows what's misconfigured).
  }

  return (
    <UseCaseMain>
      <InboundOutboundView initialEmbedData={initialEmbedData} initialCustomer={initialCustomer} />
    </UseCaseMain>
  );
}
