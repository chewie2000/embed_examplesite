/**
 * Browser-side chat history for the Agent Chat use case.
 *
 * Stored in localStorage, keyed by the signed-in Sigma identity, so it is per
 * browser and per user — it does not follow a user to another device. This is
 * the only module that touches storage; swapping it for a server store (e.g.
 * Redis) means reimplementing these four functions.
 *
 * A conversation is:
 *   { id, workbookId, agentId, agentName, workbookName, updatedAt,
 *     messages: [{ role: 'user' | 'assistant', text }],   // what the UI shows
 *     history:  [...] }                                    // replayable run items sent back to Sigma
 */
const MAX_CONVERSATIONS = 30;

const keyFor = (email) => `agentchat:v1:${String(email).trim().toLowerCase()}`;

export function loadConversations(email) {
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(email)) || '[]');
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

function write(email, conversations) {
  // Tool results can be large; if the quota is hit, drop the oldest and retry.
  let list = conversations.slice(0, MAX_CONVERSATIONS);
  while (list.length) {
    try {
      localStorage.setItem(keyFor(email), JSON.stringify(list));
      return list;
    } catch {
      list = list.slice(0, -1);
    }
  }
  try { localStorage.removeItem(keyFor(email)); } catch { /* storage unavailable */ }
  return [];
}

/** Insert or replace a conversation; returns the new sorted list. */
export function saveConversation(email, conversation) {
  const others = loadConversations(email).filter((c) => c.id !== conversation.id);
  return write(email, [{ ...conversation, updatedAt: Date.now() }, ...others]);
}

export function deleteConversation(email, id) {
  return write(email, loadConversations(email).filter((c) => c.id !== id));
}
