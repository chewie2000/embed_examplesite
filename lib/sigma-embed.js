import { SignJWT } from 'jose';

/**
 * Generates a signed Sigma embed URL using JWT authentication.
 *
 * The JWT is signed server-side with your Sigma CLIENT_ID and SECRET.
 * It encodes the user's identity, account type, teams, and any user attributes
 * so Sigma can enforce access control on the embedded content.
 *
 * @param {object} options
 * @param {string} options.email        - Email of the embedding user (maps to Sigma sub claim)
 * @param {string} [options.accountType] - Sigma account type ('admin', 'creator', 'viewer', etc.)
 * @param {string[]} [options.teams]    - Sigma team memberships
 * @param {object} [options.userAttributes] - Key/value pairs passed as Sigma user attributes
 * @param {string} [options.mode]       - Optional mode prefix for per-QuickStart env var overrides
 * @param {string} [options.urlId]      - Optional Sigma file urlId (from the REST API) to embed
 *                                        directly, discovered via the content-browser tree rather
 *                                        than a pre-configured {MODE}_SIGMA_BASE_URL env var.
 *                                        Takes precedence over `mode` when set.
 * @param {string} [options.bookmarkId] - Optional bookmark id to load the workbook directly into,
 *                                        via the :bookmark URL param — avoids the postMessage
 *                                        select-after-load race entirely. Only meaningful with urlId.
 *
 * @returns {Promise<{ embedUrl: string, jwt: string }>}
 */
export async function generateSigmaEmbedUrl({
  email,
  accountType,
  teams = [],
  userAttributes = {},
  mode = '',
  urlId,
  bookmarkId,
  sessionLength: sessionLengthOverride,
  urlParams = {},
}) {
  let baseUrl;

  if (urlId) {
    // Build a workbook URL directly from its urlId, using the same org
    // origin/slug as SIGMA_BASE_URL. Sigma routes on the trailing urlId only —
    // the name-slug prefix is cosmetic — so no separate env var is needed.
    const defaultBaseUrl = process.env.SIGMA_BASE_URL;
    if (!defaultBaseUrl) {
      throw new Error('SIGMA_BASE_URL is not configured (needed to derive the org URL for content-browser embeds).');
    }
    const orgUrl = new URL(defaultBaseUrl);
    const orgSlug = orgUrl.pathname.split('/').filter(Boolean)[0];
    baseUrl = `${orgUrl.origin}/${orgSlug}/workbook/${urlId}`;
  } else {
    const modePrefix = mode ? `${mode.toUpperCase()}_` : '';
    // Support mode-specific BASE_URL overrides (e.g. DASHBOARD_SIGMA_BASE_URL)
    baseUrl = process.env[`${modePrefix}SIGMA_BASE_URL`] || process.env.SIGMA_BASE_URL;
  }

  if (!baseUrl) {
    throw new Error(
      `SIGMA_BASE_URL is not configured. Add it to your .env.local file.`
    );
  }

  const clientId = process.env.SIGMA_CLIENT_ID;
  if (!clientId) throw new Error('SIGMA_CLIENT_ID is not configured.');

  const secret = process.env.SIGMA_SECRET;
  if (!secret) throw new Error('SIGMA_SECRET is not configured.');

  const encodedSecret = new TextEncoder().encode(secret);
  const now = Math.floor(Date.now() / 1000);
  const requestedLength = sessionLengthOverride ?? (parseInt(process.env.SESSION_LENGTH) || 3600);
  const sessionLength = Math.min(
    Math.max(parseInt(requestedLength) || 3600, 30), // min 30s for demo purposes
    2592000 // Sigma max: 30 days
  );

  // Build the Sigma JWT payload per the JWT Claims Reference:
  // https://help.sigmacomputing.com/docs/json-web-token-claims-reference
  const payload = {
    sub: email,
    iss: clientId,
    jti: crypto.randomUUID(),
    ...(accountType && { account_type: accountType }),
    ...(teams.length > 0 && { teams }),
    ...(Object.keys(userAttributes).length > 0 && { user_attributes: userAttributes }),
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({
      alg: 'HS256',
      kid: clientId,       // Required: embed client ID in the header
    })
    .setIssuedAt(now)
    .setExpirationTime(now + sessionLength)
    .sign(encodedSecret);

  // Base embed URL with required params
  const embedParams = new URLSearchParams();
  embedParams.set(':embed', 'true');
  embedParams.set(':jwt', token);
  if (bookmarkId) {
    embedParams.set(':bookmark', bookmarkId);
  }

  // Optional Sigma UI controls — sourced from env vars
  const uiControls = [
    'hide_menu',
    'hide_folder_navigation',
    'disable_mobile_view',
    'hide_tooltip',
    'responsive_height',
    'theme',
    'lng',
    'menu_position',
  ];

  uiControls.forEach((key) => {
    const val = process.env[key];
    if (val !== undefined && val !== '') {
      embedParams.set(`:${key}`, val);
    }
  });

  // Per-user URL filter params (e.g. workbook controls, column filters).
  // These come from Clerk publicMetadata and are NOT part of the JWT — they
  // are appended directly to the embed URL.
  Object.entries(urlParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      embedParams.set(key, value);
    }
  });

  const embedUrl = `${baseUrl}?${embedParams.toString()}`;

  console.log('[sigma-embed] Mode:', urlId ? `content-browser (urlId=${urlId}${bookmarkId ? `, bookmarkId=${bookmarkId}` : ''})` : mode || 'default');
  console.log('[sigma-embed] Client ID:', clientId);
  console.log('[sigma-embed] Account type:', accountType);
  console.log('[sigma-embed] Teams:', teams);
  console.log('[sigma-embed] Embed URL:', embedUrl);

  return { embedUrl, jwt: token };
}
