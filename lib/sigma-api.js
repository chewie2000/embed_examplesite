/**
 * Sigma REST API helper (server-side only).
 *
 * This is DIFFERENT from lib/sigma-embed.js:
 *   - sigma-embed.js  signs embed JWTs (browser gets a signed iframe URL)
 *   - sigma-api.js    calls the Sigma REST API with a server OAuth token
 *
 * The REST API needs its own OAuth client-credentials token exchanged at
 * POST /v2/auth/token. In many orgs the SAME Developer Access client is enabled
 * for both embedding and API, so we prefer dedicated SIGMA_API_CLIENT_ID/SECRET
 * but fall back to the embed SIGMA_CLIENT_ID/SECRET.
 *
 * Docs: https://help.sigmacomputing.com/reference/get-started-sigma-api
 *
 * Every low-level function here takes an optional `org` ('' | 'legacy'),
 * mirroring generateSigmaEmbedUrl's `org` param — '' (default) is the
 * current org everything else runs against; 'legacy' is the org this site
 * ran against before the 2026-09 switch (used only by the Content Browser,
 * embed_examplesite-0so.11 follow-up). A client_id/secret pair, and the
 * token it mints, are only valid for the org that issued them, so the two
 * are never mixed — no fallback from legacy to default credentials.
 */

// ── API base URL ──────────────────────────────────────────────────────────
// The REST API host is region/cloud-specific and is NOT the embed workbook URL.
// e.g. EU AWS = https://api.eu.aws.sigmacomputing.com, US AWS = https://aws-api.sigmacomputing.com
function getApiBase(org) {
  const raw = org === 'legacy' ? process.env.LEGACY_SIGMA_API_BASE_URL : process.env.SIGMA_API_BASE_URL;
  if (!raw) {
    throw new Error(
      org === 'legacy'
        ? 'LEGACY_SIGMA_API_BASE_URL is not configured (needed for the org="legacy" override).'
        : 'SIGMA_API_BASE_URL is not configured. Set it to your org\'s Sigma REST API host ' +
          '(e.g. https://api.eu.aws.sigmacomputing.com) in .env.local / Vercel.'
    );
  }
  return `${raw.replace(/\/+$/, '')}/v2`;
}

function getApiCredentials(org) {
  const clientId = org === 'legacy'
    ? (process.env.LEGACY_SIGMA_API_CLIENT_ID || process.env.LEGACY_SIGMA_CLIENT_ID)
    : (process.env.SIGMA_API_CLIENT_ID || process.env.SIGMA_CLIENT_ID);
  const secret = org === 'legacy'
    ? (process.env.LEGACY_SIGMA_API_SECRET || process.env.LEGACY_SIGMA_SECRET)
    : (process.env.SIGMA_API_SECRET || process.env.SIGMA_SECRET);
  if (!clientId) throw new Error(org === 'legacy' ? 'LEGACY_SIGMA_API_CLIENT_ID / LEGACY_SIGMA_CLIENT_ID is not configured.' : 'SIGMA_API_CLIENT_ID / SIGMA_CLIENT_ID is not configured.');
  if (!secret) throw new Error(org === 'legacy' ? 'LEGACY_SIGMA_API_SECRET / LEGACY_SIGMA_SECRET is not configured.' : 'SIGMA_API_SECRET / SIGMA_SECRET is not configured.');
  return { clientId, secret };
}

// ── Token cache (module-scoped; lives for the server process lifetime) ──────
// Keyed per org — a single shared slot would let one org's token clobber the
// other's when both are in use in the same process (Content Browser on
// 'legacy' alongside anything else on the default org).
const tokenCache = { '': { token: null, expiresAt: 0 }, legacy: { token: null, expiresAt: 0 } };

async function getApiToken(org = '') {
  const cache = tokenCache[org] ?? (tokenCache[org] = { token: null, expiresAt: 0 });
  const now = Date.now();
  // 60s safety margin before the real expiry.
  if (cache.token && now < cache.expiresAt - 60_000) {
    return cache.token;
  }

  const { clientId, secret } = getApiCredentials(org);
  const res = await fetch(`${getApiBase(org)}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: secret,
    }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Sigma API token exchange failed (${res.status}): ${data.message || data.code || 'unknown error'}. ` +
      `Verify ${org === 'legacy' ? 'LEGACY_SIGMA_API_BASE_URL' : 'SIGMA_API_BASE_URL'} matches your org's cloud region and the client is API-enabled.`
    );
  }

  cache.token = data.access_token;
  cache.expiresAt = now + (data.expires_in ?? 3600) * 1000;
  return cache.token;
}

// ── Low-level GET with bearer token ─────────────────────────────────────────
async function apiGet(path, org = '') {
  const token = await getApiToken(org);
  const res = await fetch(`${getApiBase(org)}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Sigma API GET ${path} failed (${res.status}): ${data.message || data.code || 'unknown error'}`);
  }
  return data;
}

// ── Low-level POST with bearer token ────────────────────────────────────────
// Throws with Sigma's raw error body + requestId rather than a generic
// message — spec-shape errors are the actual development loop for anything
// posting a workbook spec, and hiding them makes that loop unworkable.
async function apiPost(path, body, org = '') {
  const token = await getApiToken(org);
  const res = await fetch(`${getApiBase(org)}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Sigma API POST ${path} failed (${res.status}): ${data.message || data.code || 'unknown error'}` +
      (data.requestId ? ` [requestId: ${data.requestId}]` : '')
    );
  }
  return data;
}

// Follow Sigma's `nextPage` cursor until exhausted.
async function apiGetAll(path, { limit = 500, cap = 20, org = '' } = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const entries = [];
  let page = null;
  for (let i = 0; i < cap; i++) {
    const pageQs = page ? `&page=${encodeURIComponent(page)}` : '';
    const data = await apiGet(`${path}${sep}limit=${limit}${pageQs}`, org);
    entries.push(...(data.entries ?? []));
    page = data.nextPage;
    if (!page) break;
  }
  return entries;
}

// ── Members ─────────────────────────────────────────────────────────────────
/**
 * Resolve a Sigma member (internal or embed) by email.
 * Returns null when no member exists yet — embed users are provisioned lazily,
 * so a brand-new embed user may not have a member record until they've embedded once.
 */
export async function resolveMemberByEmail(email, org = '') {
  if (!email) return null;
  // Sigma removed the `search` query parameter (it now 400s with
  // "The `search` query parameter is no longer supported. Use `email` instead.").
  // The exact-match filter below is kept regardless — it doesn't depend on how
  // strictly the API narrows results.
  const data = await apiGet(`/members?email=${encodeURIComponent(email)}`, org);
  const target = email.trim().toLowerCase();
  return (data.entries ?? []).find((m) => (m.email || '').toLowerCase() === target) ?? null;
}

// ── Workspaces ──────────────────────────────────────────────────────────────
/**
 * Resolves the Sigma team a member is REALLY, persistently assigned to —
 * used by Sub-Address Swapping (embed_examplesite-0so.10) to derive team
 * membership from Sigma's own live data rather than guessing it from the
 * email address's naming convention. Verified live: each of the four
 * sub-addressed test members is already assigned to exactly the matching
 * compass team via a real Sigma team grant (GET /v2/members/{id}/teams),
 * not something this app asserts.
 *
 * Returns null if the member doesn't exist yet (not provisioned — same
 * lazy-provisioning caveat as elsewhere) or isn't on exactly one team; this
 * app has no basis to pick among multiple, so it fails closed rather than
 * guessing.
 */
export async function resolveMemberTeamName(email) {
  const member = await resolveMemberByEmail(email);
  if (!member) return null;
  const teams = await apiGetAll(`/members/${member.memberId}/teams`);
  return teams.length === 1 ? teams[0].name : null;
}

/**
 * Preflight for Sub-Address Swapping. The four candidate identities
 * (lib/subaddress-identities.js's buildSubAddressIdentities) are now derived
 * from whichever email the CURRENT embed user resolves to, not a fixed
 * constant — which means they're only usable if THAT account's sub-addressed
 * variants happen to be real, team-assigned Sigma members. This checks that
 * live, once, before the sidebar offers any of them as options, rather than
 * letting a broken one surface only after it's clicked.
 *
 * @param {{slug: string, email: string}[]} identities
 * @returns {Promise<{slug: string, email: string, team: string|null, ok: boolean}[]>}
 */
export async function checkSubAddressSetup(identities) {
  return Promise.all(
    identities.map(async (identity) => {
      const team = await resolveMemberTeamName(identity.email);
      return { ...identity, team, ok: Boolean(team) };
    })
  );
}

/**
 * List every workbook sitting directly inside a named workspace.
 *
 * Goes through /v2/workbooks with skipPermissionCheck=true (admin-only)
 * rather than /v2/files?parentId=<workspaceUrlId> — that route has NO such
 * override and is always scoped to what the calling member can actually
 * reach, regardless of account type, so it silently under-returns for a
 * service account that (correctly) has no standing grant on every workspace
 * in the org. /v2/workbooks with the flag returns the true org-wide set;
 * matched by exact `path`, since nested subfolders would also start with the
 * workspace name.
 */
export async function listWorkbooksInWorkspace(name) {
  if (!name) return [];
  const entries = await apiGetAll('/workbooks?skipPermissionCheck=true&excludeExplorations=true');
  const target = name.trim().toLowerCase();
  return entries
    .filter((w) => (w.path || '').trim().toLowerCase() === target)
    .map((w) => ({ name: w.name, urlId: w.workbookUrlId }));
}

/**
 * Resolve a workspace's `workspaceUrlId` by exact (case-insensitive) name.
 * That field — not the `workspaceId` UUID — is what `POST /v2/workbooks`
 * accepts as `folderId` to create directly inside a workspace.
 */
export async function getWorkspaceUrlId(name) {
  if (!name) return null;
  const entries = await apiGetAll('/workspaces');
  const target = name.trim().toLowerCase();
  const ws = entries.find((w) => (w.name || '').trim().toLowerCase() === target);
  return ws?.workspaceUrlId ?? null;
}

/**
 * Create a new workbook holding only a title header — no data content.
 *
 * Two things learned building this against the live API, not from docs:
 * - The REST API has no endpoint to upload an image, and an existing
 *   uploaded-image `key` from another workbook is NOT reusable here — a
 *   workbook create with an `image` element referencing one 400s with a
 *   masked "1 schema error in data model spec", while the identical spec
 *   minus that element succeeds. So this deliberately has no logo/image.
 * - `contents.layout` is required even though the OpenAPI marks it optional —
 *   omitting it, or nesting it under a page instead of as a sibling of
 *   `pages`, is either rejected or silently discarded (Sigma auto-arranges
 *   instead, with no error).
 * - `ownerId` genuinely re-attributes the create (readback shows createdBy
 *   as that member, not the calling service account) — but Sigma checks
 *   whether that member's OWN account type permits creating a workbook in
 *   the destination folder, same as if they'd called the API themselves.
 *   Verified live: a `build`-type member succeeded with no explicit grant
 *   at all on the destination workspace; a `view`-type member 403'd with
 *   "Workbook edit permission required to use workbook spec API" — `view`
 *   categorically can't own workbooks, regardless of folder access.
 */
export async function createTitleWorkbook({ folderId, name, ownerId }) {
  const titleId = 'title';
  const pageId = 'page1';
  const layout =
    '<?xml version="1.0" encoding="utf-8"?>' +
    `<Page type="grid" gridTemplateColumns="repeat(24, 1fr)" gridTemplateRows="auto" id="${pageId}">` +
    `<Element elementId="${titleId}" gridColumn="1 / 25" gridRow="1 / 5"/>` +
    '</Page>';

  return apiPost('/workbooks', {
    name,
    folderId,
    ...(ownerId && { ownerId }),
    contents: {
      schemaVersion: 1,
      kind: 'workbook',
      elements: [
        { id: titleId, kind: 'text', body: `# **${name}**` },
      ],
      pages: [{ id: pageId, name: 'Page 1' }],
      layout,
    },
  });
}

// ── Tree building ─────────────────────────────────────────────────────────────
// The legacy org's equivalent workspace is literally named "EMBED" (verified
// live) rather than the current org's "Embed Success" — a distinct default,
// not a fallback of the current org's setting, since they're different orgs
// with no relation to each other's naming.
const workspaceName = (org) =>
  org === 'legacy'
    ? (process.env.LEGACY_EMBED_WORKSPACE_NAME || 'EMBED')
    : (process.env.EMBED_WORKSPACE_NAME || 'EMBED');

// A file's `path` is its PARENT path, e.g. "EMBED/Company A". The first segment
// is the workspace name. We keep only files rooted in the target workspace.
function inTargetWorkspace(file, org) {
  const root = (file.path || '').split('/')[0];
  return root.toLowerCase() === workspaceName(org).toLowerCase();
}

/**
 * Turn a flat list of Sigma files into a nested tree, using each file's `path`
 * (parent location) plus its own name. The workspace-name root segment is
 * stripped so the tree begins at the workspace's top level.
 *
 * @returns {Array} root nodes: { key, name, type, id, urlId, permission, children }
 */
function buildTree(files) {
  const root = { children: new Map() };

  // Ensure a folder chain exists for a given array of segments, return the leaf node.
  const ensurePath = (segments) => {
    let node = root;
    let keyAcc = '';
    for (const seg of segments) {
      keyAcc = keyAcc ? `${keyAcc}/${seg}` : seg;
      if (!node.children.has(seg)) {
        node.children.set(seg, {
          key: keyAcc,
          name: seg,
          type: 'folder',
          id: null,
          urlId: null,
          permission: null,
          children: new Map(),
        });
      }
      node = node.children.get(seg);
    }
    return node;
  };

  for (const f of files) {
    // segments of the PARENT path, minus the leading workspace-name segment
    const parentSegments = (f.path || '').split('/').slice(1).filter(Boolean);
    const parent = ensurePath(parentSegments);

    if (f.type === 'folder') {
      // Folder node — merge with any placeholder created by a child's path.
      const existing = parent.children.get(f.name);
      const node = existing ?? { name: f.name, type: 'folder', children: new Map() };
      node.key = f.path ? `${f.path}/${f.name}` : f.name;
      node.type = 'folder';
      node.id = f.id;
      node.urlId = f.urlId;
      node.permission = f.permission ?? null;
      if (!node.children) node.children = new Map();
      parent.children.set(f.name, node);
    } else {
      // Leaf (workbook / data-model / report / dataset …)
      parent.children.set(`${f.type}:${f.name}`, {
        key: f.id,
        name: f.name,
        type: f.type,
        id: f.id,
        urlId: f.urlId,
        permission: f.permission ?? null,
        children: null, // null = not a container
      });
    }
  }

  // Convert Maps → sorted arrays (folders first, then alphabetical).
  const toArray = (node) => {
    if (!node.children) return null;
    return [...node.children.values()]
      .map((child) => ({ ...child, children: toArray(child) }))
      .sort((a, b) => {
        const af = a.type === 'folder' ? 0 : 1;
        const bf = b.type === 'folder' ? 0 : 1;
        return af - bf || a.name.localeCompare(b.name);
      });
  };

  return toArray(root) ?? [];
}

/**
 * Build the content tree for the target (EMBED) workspace, scoped to exactly
 * the files the given member can access.
 *
 * @param {string} email  The embed user's Sigma email (JWT `sub`).
 * @returns {Promise<{ workspace: string, member: object|null, fileCount: number, tree: Array }>}
 */
export async function buildEmbedUserTree(email, org = '') {
  const workspace = workspaceName(org);
  const member = await resolveMemberByEmail(email, org);

  // Member not provisioned yet → nothing to show, but not an error.
  if (!member) {
    return { workspace, member: null, fileCount: 0, tree: [] };
  }

  const allFiles = await apiGetAll(`/members/${member.memberId}/files`, { org });
  const scoped = allFiles.filter((f) => !f.isArchived && inTargetWorkspace(f, org));

  return {
    workspace,
    member: {
      memberId: member.memberId,
      email: member.email,
      memberType: member.memberType,
      userKind: member.userKind,
    },
    fileCount: scoped.length,
    tree: buildTree(scoped),
  };
}
