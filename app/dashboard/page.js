import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';
import { resolveUrlParams } from '@/lib/embed-url-params';
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
      // Apply the same per-mode URL params as the /api/sigma/jwt route so the
      // server-rendered first load matches client navigation (e.g. example1's
      // menu bar). Without this, the menu only appeared after navigating away
      // and back.
      urlParams: resolveUrlParams(meta, ''),
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
