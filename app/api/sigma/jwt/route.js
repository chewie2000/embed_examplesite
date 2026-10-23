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
  // Which Sigma org this embed points at ('legacy' or default) — orthogonal
  // to `mode`, which only picks a workbook within the default org. Trusted
  // like `mode`: the value space is fixed by this app's env vars.
  const org = searchParams.get('org') || '';

  // Team/identity slugs are resolved server-side, never accepted raw — a
  // client that could name its own team/email could assert arbitrary
  // membership. Mutually exclusive in practice (each page sends only its
  // own param).
  const swapTeam = getSwapTeam(searchParams.get('teamSlug'));
  const baseEmail = meta.sigmaEmail || loginEmail;
  const subAddress = getSubAddressIdentity(searchParams.get('subAddressSlug'), baseEmail);

  const sigmaEmail = subAddress ? subAddress.email : baseEmail;
  // Sub-Address Swapping sends no teams claim at all — Sigma applies that
  // member's real, persistent team membership on its own.
  const teams = subAddress
    ? []
    : (swapTeam ? [swapTeam.name] : (meta.teams ?? []));
  // These workbooks don't use attribute-driven RLS; kept in step with the
  // server-rendered JWT so a client refetch can't drop the claims it first
  // loaded with.
  const userAttributes = (subAddress || swapTeam) ? {} : (meta.userAttributes ?? {});
  const urlId = searchParams.get('urlId') || undefined;
  const wantBookmark = searchParams.get('wantBookmark') === '1';
  const sessionLengthParam = searchParams.get('sessionLength');
  const sessionLength = sessionLengthParam ? parseInt(sessionLengthParam) : undefined;

  try {
    // Menu/Assistant switches (Team/Sub-Address Swapping, Folder Explorer)
    // always send these params; legacy callers send none.
    const hasMenuParams = ['menu', 'pos', 'assistant'].some((k) => searchParams.has(k));
    const urlParams = (subAddress || swapTeam || hasMenuParams)
      ? menuStateUrlParams(resolveMenuState({ menu: searchParams.get('menu'), pos: searchParams.get('pos'), assistant: searchParams.get('assistant') }))
      : (urlId ? {} : resolveUrlParams(meta, mode));

    // Never trust a client-supplied bookmark id — look it up server-side.
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
