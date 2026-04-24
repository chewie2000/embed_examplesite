import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';
import DashboardShell from '@/components/DashboardShell';

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const email = user.emailAddresses[0]?.emailAddress;
  const name = user.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : email;

  const meta = user.publicMetadata ?? {};
  const sigmaEmail = meta.sigmaEmail || email;

  // Generate the default embed URL server-side so the iframe starts loading
  // immediately on page render — no client-side fetch round trip on first load.
  let initialEmbedData = null;
  try {
    initialEmbedData = await generateSigmaEmbedUrl({
      email: sigmaEmail,
      accountType: meta.accountType,
      teams: meta.teams ?? [],
      userAttributes: meta.userAttributes ?? {},
      mode: '',
    });
  } catch {
    // Falls back to client-side fetch in SigmaEmbed
  }

  return (
    <DashboardShell
      user={{ email, name, imageUrl: user.imageUrl }}
      initialEmbedData={initialEmbedData}
    />
  );
}
