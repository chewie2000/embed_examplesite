import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';
import { resolveUrlParams } from '@/lib/embed-url-params';
import { getLegacyExample } from '@/lib/legacy-examples';
import LegacyExampleView from '@/components/LegacyExampleView';

export default async function LegacyExamplePage({ params }) {
  const { slug } = await params;
  const example = getLegacyExample(slug);
  if (!example) notFound();

  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const meta = user.publicMetadata ?? {};
  const sigmaEmail = meta.sigmaEmail || user.emailAddresses[0]?.emailAddress;

  let initialEmbedData = null;
  try {
    initialEmbedData = await generateSigmaEmbedUrl({
      email: sigmaEmail,
      accountType: meta.accountType,
      teams: meta.teams ?? [],
      userAttributes: meta.userAttributes ?? {},
      mode: example.mode,
      urlParams: resolveUrlParams(meta, example.mode),
    });
  } catch {
    // Falls back to client-side fetch in SigmaEmbed
  }

  return <LegacyExampleView example={example} initialEmbedData={initialEmbedData} />;
}
