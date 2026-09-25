import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';
import { resolveUrlParams, resolveMenuState, menuStateUrlParams } from '@/lib/embed-url-params';
import { getBookmarkEntry } from '@/lib/bookmarks';
import { getSwapTeam } from '@/lib/teams';
import { getSubAddressIdentity } from '@/lib/subaddress-identities';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/sigma/jwt?mode=<optional_mode>
 * GET /api/sigma/jwt?urlId=<sigma_file_urlId>  (content-browser tree click)
 * GET /api/sigma/jwt?urlId=<...>&wantBookmark=1  (opened via the tree's bookmark row)
 *
 * Reads the authenticated user's Clerk publicMetadata to build the Sigma JWT claims.
 * Set metadata per user in the Clerk dashboard → Users → [user] → Metadata → Public.
 *
 * Supported metadata fields:
 *   sigmaEmail     — email used as the Sigma JWT sub claim (defaults to login email)
 *   accountType    — Sigma account type: 'viewer' | 'creator' | 'admin'
 *   teams          — array of Sigma team names e.g. ["sales", "emea"]
 *   userAttributes — object passed to Sigma for RLS e.g. { "region": "EMEA" }
 */
export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();
  const loginEmail = user.emailAddresses[0]?.emailAddress;
  const meta = user.publicMetadata ?? {};

  const accountType = meta.accountType;

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || '';
  // Selects which Sigma ORG this embed points at (currently only 'legacy' is
  // recognized — see the `org` param on generateSigmaEmbedUrl). Distinct from
  // `mode`, which only selects among pre-configured workbooks WITHIN the
  // default org. Trusted the same way `mode` already is: the value space is
  // fixed by this app's own env vars, so a client can only pick among
  // pre-configured targets, never assert a new one.
  const org = searchParams.get('org') || '';

  // Team Swapping use case: the client asks for one of the four known teams by
  // SLUG, and the team name is resolved here rather than accepted from the
  // request — a client that could name its own team could assert membership in
  // any team in the org. An unrecognized slug falls through to the Clerk value.
  const swapTeam = getSwapTeam(searchParams.get('teamSlug'));
  // Sub-Address Swapping use case: same trust model (resolved server-side
  // from a slug, never accepted raw). swapTeam and subAddress are mutually
  // exclusive in practice (each page only ever sends its own param). The
  // four candidates are built from THIS user's own resolved email (no
  // hardcoded base account) — see lib/subaddress-identities.js.
  const baseEmail = meta.sigmaEmail || loginEmail;
  const subAddress = getSubAddressIdentity(searchParams.get('subAddressSlug'), baseEmail);

  const sigmaEmail = subAddress ? subAddress.email : baseEmail;
  // Sub-Address Swapping deliberately sends NO teams claim at all — the JWT
  // asserts identity only (sub), and Sigma applies that member's real,
  // persistent team membership entirely on its own. That's the actual
  // mechanism this use case demonstrates: the team isn't asserted by this
  // app in any form, sourced-from-Sigma or otherwise — it comes from Sigma
  // at embed-load time, the same as it would for an internal user.
  const teams = subAddress
    ? []
    : (swapTeam ? [swapTeam.name] : (meta.teams ?? []));
  // Those workbooks don't use attribute-driven RLS. Kept in step with the
  // server-rendered JWT in app/dashboard/team-swap/page.js (and the
  // subaddress-swap equivalent) so a client refetch (retry, session-length
  // regenerate) doesn't quietly produce different claims than the page first
  // loaded with.
  const userAttributes = (subAddress || swapTeam) ? {} : (meta.userAttributes ?? {});
  const urlId = searchParams.get('urlId') || undefined;
  const wantBookmark = searchParams.get('wantBookmark') === '1';
  const sessionLengthParam = searchParams.get('sessionLength');
  const sessionLength = sessionLengthParam ? parseInt(sessionLengthParam) : undefined;

  try {
    // Content-browser (urlId) embeds are ad hoc — they don't carry any
    // mode-specific URL params (those are keyed to the pre-configured examples).
    // Team-swap embeds are urlId-based too, but do want the menu bar, and must
    // match what app/dashboard/team-swap/page.js signed so a client refetch
    // doesn't drop the menu mid-demo.
    const urlParams = (subAddress || swapTeam)
      ? menuStateUrlParams(resolveMenuState({ menu: searchParams.get('menu'), pos: searchParams.get('pos') }))
      : (urlId ? {} : resolveUrlParams(meta, mode));

    // Look up the bookmark server-side (never trust a client-supplied id) —
    // only when the client explicitly asked for the bookmarked version
    // (opened via the tree's bookmark row). If none exists yet, bookmarkId
    // stays undefined and the workbook loads as normal (published version).
    const bookmarkId = urlId && wantBookmark ? getBookmarkEntry(user, urlId)?.id : undefined;

    // Debug logging — visible in Vercel function logs
    console.log('[/api/sigma/jwt] mode:', mode, '| org:', org || 'default', '| subAddress:', subAddress?.slug || 'none', '| urlId:', urlId || 'none', '| bookmarkId:', bookmarkId || 'none');
    console.log('[/api/sigma/jwt] publicMetadata:', JSON.stringify(meta));
    console.log('[/api/sigma/jwt] resolved urlParams:', JSON.stringify(urlParams));

    const { embedUrl, jwt } = await generateSigmaEmbedUrl({
      email: sigmaEmail,
      accountType,
      teams,
      userAttributes,
      mode,
      urlId,
      bookmarkId,
      sessionLength,
      urlParams,
      org,
    });

    return NextResponse.json({ embedUrl, jwt }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('[/api/sigma/jwt]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
