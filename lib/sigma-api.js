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
 */

// ── API base URL ──────────────────────────────────────────────────────────
// The REST API host is region/cloud-specific and is NOT the embed workbook URL.
// e.g. EU AWS = https://api.eu.aws.sigmacomputing.com, US AWS = https://aws-api.sigmacomputing.com
function getApiBase() {
  const raw = process.env.SIGMA_API_BASE_URL;
  if (!raw) {
    throw new Error(
      'SIGMA_API_BASE_URL is not configured. Set it to your org\'s Sigma REST API host ' +
      '(e.g. https://api.eu.aws.sigmacomputing.com) in .env.local / Vercel.'
    );
  }
  return `${raw.replace(/\/+$/, '')}/v2`;
}

function getApiCredentials() {
  const clientId = process.env.SIGMA_API_CLIENT_ID || process.env.SIGMA_CLIENT_ID;
  const secret = process.env.SIGMA_API_SECRET || process.env.SIGMA_SECRET;
  if (!clientId) throw new Error('SIGMA_API_CLIENT_ID / SIGMA_CLIENT_ID is not configured.');
  if (!secret) throw new Error('SIGMA_API_SECRET / SIGMA_SECRET is not configured.');
  return { clientId, secret };
}

// ── Token cache (module-scoped; lives for the server process lifetime) ──────
let tokenCache = { token: null, expiresAt: 0 };

async function getApiToken() {
  const now = Date.now();
  // 60s safety margin before the real expiry.
  if (tokenCache.token && now < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const { clientId, secret } = getApiCredentials();
  const res = await fetch(`${getApiBase()}/auth/token`, {
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
      'Verify SIGMA_API_BASE_URL matches your org\'s cloud region and the client is API-enabled.'
    );
  }

  tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return tokenCache.token;
}

// ── Low-level GET with bearer token ─────────────────────────────────────────
async function apiGet(path) {
  const token = await getApiToken();
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Sigma API GET ${path} failed (${res.status}): ${data.message || data.code || 'unknown error'}`);
  }
  return data;
}

// Follow Sigma's `nextPage` cursor until exhausted.
async function apiGetAll(path, { limit = 500, cap = 20 } = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const entries = [];
  let page = null;
  for (let i = 0; i < cap; i++) {
    const pageQs = page ? `&page=${encodeURIComponent(page)}` : '';
    const data = await apiGet(`${path}${sep}limit=${limit}${pageQs}`);
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
export async function resolveMemberByEmail(email) {
  if (!email) return null;
  const data = await apiGet(`/members?search=${encodeURIComponent(email)}`);
  const target = email.trim().toLowerCase();
  return (data.entries ?? []).find((m) => (m.email || '').toLowerCase() === target) ?? null;
}

// ── Tree building ─────────────────────────────────────────────────────────────
const workspaceName = () => process.env.EMBED_WORKSPACE_NAME || 'EMBED';

// A file's `path` is its PARENT path, e.g. "EMBED/Company A". The first segment
// is the workspace name. We keep only files rooted in the target workspace.
function inTargetWorkspace(file) {
  const root = (file.path || '').split('/')[0];
  return root.toLowerCase() === workspaceName().toLowerCase();
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
export async function buildEmbedUserTree(email) {
  const workspace = workspaceName();
  const member = await resolveMemberByEmail(email);

  // Member not provisioned yet → nothing to show, but not an error.
  if (!member) {
    return { workspace, member: null, fileCount: 0, tree: [] };
  }

  const allFiles = await apiGetAll(`/members/${member.memberId}/files`);
  const scoped = allFiles.filter((f) => !f.isArchived && inTargetWorkspace(f));

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
