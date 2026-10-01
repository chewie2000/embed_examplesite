import { clerkClient } from '@clerk/nextjs/server';

/**
 * Per-user Sigma bookmark tracking — one bookmark per (user, workbook):
 * { [urlId]: { id: bookmarkId, name } }, persisted in Clerk
 * privateMetadata.bookmarks.
 *
 * Clerk deep-merges metadata updates — nested keys are merged, not
 * replaced, and the only way to remove one is `null` in the patch; sending
 * a recomputed whole map (e.g. `{}` after removing the last key) is a no-op.
 * setBookmarkEntry sends a single-key delta instead.
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
 * @param {object} user - current Backend User (from currentUser()), for computing the return value
 * @param {string} urlId
 * @param {{ id: string, name: string } | null} entry
 * @returns {Promise<object>} the logical updated bookmarks map (for the caller's response)
 */
export async function setBookmarkEntry(userId, user, urlId, entry) {
  const client = await clerkClient();
  // Delta patch for just this one key — null removes it via Clerk's deep
  // merge, rather than us recomputing and sending the whole map.
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { bookmarks: { [urlId]: entry ?? null } },
  });

  const bookmarks = { ...getBookmarksMap(user) };
  if (entry) {
    bookmarks[urlId] = entry;
  } else {
    delete bookmarks[urlId];
  }
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
