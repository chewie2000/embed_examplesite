import Link from 'next/link';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';
import AnonymousEmbed from '@/components/AnonymousEmbed';
import ConceptDemoPage from '@/components/ConceptDemoPage';

// Always sign a fresh JWT on each render — never cache the signed URL.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public, no-sign-on demo page: /interested
 *
 * Demonstrates an anonymous secured embed. The Sigma JWT is signed
 * SERVER-SIDE here with a STATIC `sub`, so every anonymous visitor maps to the
 * same Sigma embed user and can view the content WITHOUT authenticating to the
 * host site. No JWT-minting endpoint is exposed — the signed URL is generated
 * during this server render and handed to the iframe.
 *
 * This route is intentionally NOT listed in middleware.js's protected matcher
 * (only /dashboard(.*) is protected), so it is reachable anonymously.
 */
export default async function InterestedPage() {
  const staticSub = process.env.ANONYMOUS_SIGMA_SUB || 'anonymous@embedsuccess.com';
  const accountType = process.env.ANONYMOUS_SIGMA_ACCOUNT_TYPE || 'anon';

  let embedData = null;
  let embedError = null;
  try {
    embedData = await generateSigmaEmbedUrl({
      email: staticSub,        // STATIC sub — shared by all anonymous visitors
      accountType,             // custom 'anon' account type
      teams: [],
      userAttributes: {},
      mode: 'interested',      // → INTERESTED_SIGMA_BASE_URL
    });
  } catch (err) {
    embedError = err.message;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-card">
              <span className="text-white text-lg font-bold tracking-tight">🎯</span>
            </div>
            <span className="text-sm font-semibold text-ink-primary">Embed Success</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 border border-mint-border/40 bg-mint-400/10 text-mint-ink text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-mint-500 animate-pulse" />
              No sign-in required
            </span>
            <Link
              href="/sign-in"
              className="text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition-colors shadow-card"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* ── Concept demo body ── */}
      <section className="px-6 py-10 flex-1">
        <div className="max-w-5xl mx-auto h-full flex flex-col">
          <ConceptDemoPage
            badge={{ text: 'Anonymous secured embed', tone: 'info' }}
            title="Interested in what we do?"
            description={
              <>
                The analytics below are live Sigma content, served to anonymous visitors with no login.
                Behind the scenes, the page signs a JWT with a{' '}
                <span className="text-ink-primary font-medium">
                  static <code className="text-brand-600">sub</code>
                </span>{' '}
                claim, so everyone shares the same read-only Sigma embed user — secure, but open to all.
              </>
            }
            docs={[
              { label: 'JWT claims reference', href: 'https://help.sigmacomputing.com/docs/json-web-token-claims-reference' },
              { label: 'Embed URL parameters', href: 'https://help.sigmacomputing.com/docs/special-characters-for-url-parameters' },
            ]}
          >
            <div className="h-[70vh] min-h-[480px] glass shadow-card rounded-2xl overflow-hidden">
              {embedError ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-ink-primary text-sm mb-1">Anonymous embed not configured</p>
                    <p className="text-xs text-ink-secondary max-w-xs leading-relaxed">{embedError}</p>
                  </div>
                  <div className="bg-black/[0.03] rounded-xl border border-black/[0.06] p-3 text-left text-[10px] font-[family-name:var(--font-mono)] text-ink-secondary max-w-xs w-full space-y-1">
                    <p className="font-[family-name:var(--font-sans)] font-medium text-ink-primary mb-1.5">Required in .env.local</p>
                    <p>SIGMA_CLIENT_ID=your_client_id</p>
                    <p>SIGMA_SECRET=your_secret</p>
                    <p>INTERESTED_SIGMA_BASE_URL=...</p>
                    <p>ANONYMOUS_SIGMA_SUB=...</p>
                  </div>
                </div>
              ) : (
                <AnonymousEmbed embedUrl={embedData.embedUrl} label="Interested — Anonymous Embed" />
              )}
            </div>
          </ConceptDemoPage>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-black/[0.06] text-center text-xs text-ink-secondary">
        © {new Date().getFullYear()} Embed Success · Built with{' '}
        <span className="text-brand-600">Sigma Computing</span>
      </footer>
    </div>
  );
}
