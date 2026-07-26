import { clerkClient } from '@clerk/nextjs/server';

/**
 * Per-user Sigma bookmark tracking — one bookmark per (user, workbook), enforced
 * by this map's shape: { [urlId]: { id: bookmarkId, name } }.
 *
 * Persisted in Clerk privateMetadata.bookmarks. Clerk's updateUserMetadata does a
 * shallow merge at the top level of privateMetadata, so callers must read the
 * current map and write the whole thing back (setBookmarkEntry does this).
 */

export function getBookmarksMap(user) {
  return user?.privateMetadata?.bookmarks ?? {};
}

export function getBookmarkEntry(user, urlId) {
  return getBookmarksMap(user)[urlId] ?? null;
}

/**
 * Upserts (entry truthy) or removes (entry null) the mapping for one urlId.
 * @param {string} userId - Clerk user id
 * @param {object} user - current Backend User (from currentUser()), for the read side
 * @param {string} urlId
 * @param {{ id: string, name: string } | null} entry
 * @returns {Promise<object>} the updated bookmarks map
 */
export async function setBookmarkEntry(userId, user, urlId, entry) {
  const bookmarks = { ...getBookmarksMap(user) };
  if (entry) {
    bookmarks[urlId] = entry;
  } else {
    delete bookmarks[urlId];
  }
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, { privateMetadata: { bookmarks } });
  return bookmarks;
}

/**
 * Attaches each workbook node's bookmark (if any) as a synthetic child node of
 * type 'bookmark', mutating the tree in place. Called once per /api/sigma/tree
 * request on a freshly-built tree, so in-place mutation is safe.
 */
export function attachBookmarks(nodes, bookmarksMap) {
  if (!Array.isArray(nodes)) return nodes;
  for (const node of nodes) {
    if (node.type === 'workbook') {
      const entry = bookmarksMap[node.urlId];
      if (entry) {
        node.bookmarkId = entry.id;
        node.children = [
          {
            key: `${node.key}::bookmark`,
            name: entry.name || 'My saved exploration',
            type: 'bookmark',
            id: null,
            urlId: node.urlId,
            bookmarkId: entry.id,
            permission: node.permission,
            children: null,
            // Parent workbook's own name — used to relabel the view when
            // navigating back to it after a delete.
            parentName: node.name,
          },
        ];
      }
    } else if (Array.isArray(node.children)) {
      attachBookmarks(node.children, bookmarksMap);
    }
  }
  return nodes;
}
