import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';
import { resolveUrlParams } from '@/lib/embed-url-params';
import { getBookmarkEntry } from '@/lib/bookmarks';

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

  const sigmaEmail = meta.sigmaEmail || loginEmail;
  const accountType = meta.accountType;
  const teams = meta.teams ?? [];
  const userAttributes = meta.userAttributes ?? {};

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || '';
  const urlId = searchParams.get('urlId') || undefined;
  const wantBookmark = searchParams.get('wantBookmark') === '1';
  const sessionLengthParam = searchParams.get('sessionLength');
  const sessionLength = sessionLengthParam ? parseInt(sessionLengthParam) : undefined;

  try {
    // Content-browser (urlId) embeds are ad hoc — they don't carry any
    // mode-specific URL params (those are keyed to the pre-configured
    // examples). Menu stays hidden by default; :menu_position=top only takes
    // visible effect once Explore is entered via the inbound mode:update
    // action, making it easy to add pages while exploring.
    const urlParams = urlId ? { ':hide_menu': 'true', ':menu_position': 'top' } : resolveUrlParams(meta, mode);

    // Look up the bookmark server-side (never trust a client-supplied id) —
    // only when the client explicitly asked for the bookmarked version
    // (opened via the tree's bookmark row). If none exists yet, bookmarkId
    // stays undefined and the workbook loads as normal (published version).
    const bookmarkId = urlId && wantBookmark ? getBookmarkEntry(user, urlId)?.id : undefined;

    // Debug logging — visible in Vercel function logs
    console.log('[/api/sigma/jwt] mode:', mode, '| urlId:', urlId || 'none', '| bookmarkId:', bookmarkId || 'none');
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
    });

    return NextResponse.json({ embedUrl, jwt }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('[/api/sigma/jwt]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
