/**
 * Which "Review and move to vault" candidates the user has reviewed on this device (MDEC-006). It is the one owner of
 * that display preference; the banner, the review dialog and the form use it.
 *
 * - Stored in localStorage under `autobyteus.mcp.secretReview.<node key>` as a list of `"<serverId>|<field>"`.
 * - The node key is the window's node entry ID (`windowNodeContextStore.entryId`; the embedded node is
 *   `embedded-local`), which stays the same when the node's URL or port changes (AR-015).
 * - Absent or unreadable means nothing has been reviewed: the banner shows its candidates once more, which is harmless.
 * - A candidate counts as reviewed when the user unticks it in the dialog and confirms, chooses "Keep as they are", or
 *   unlocks a pre-locked row in the form and saves. Moved values stop being candidates by themselves.
 */
import { ref } from 'vue';

export const MCP_SECRET_REVIEW_STORAGE_PREFIX = 'autobyteus.mcp.secretReview.';

type FieldRef = { serverId: string; field: string };

/** Bumped on every write, so computed readers (the banner) read again. */
const writes = ref(0);

const storage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

const storageKey = (nodeKey: string): string => `${MCP_SECRET_REVIEW_STORAGE_PREFIX}${nodeKey}`;

export const reviewKeyOf = (field: FieldRef): string => `${field.serverId}|${field.field}`;

const readKeys = (nodeKey: string): string[] => {
  const raw = storage()?.getItem(storageKey(nodeKey));
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
};

export const mcpSecretReviewState = {
  /** The reviewed `"<serverId>|<field>"` keys on this node. Reactive: re-read after every `markReviewed`. */
  read(nodeKey: string): Set<string> {
    void writes.value;
    return new Set(readKeys(nodeKey));
  },

  /** Marks `fields` reviewed, and drops the fields of servers that no longer exist (`existingServerIds`). */
  markReviewed(nodeKey: string, fields: readonly FieldRef[], existingServerIds: Iterable<string>): void {
    const servers = [...existingServerIds];
    const keys = new Set([...readKeys(nodeKey), ...fields.map(reviewKeyOf)]);
    const kept = [...keys].filter(key => servers.some(serverId => key.startsWith(`${serverId}|`)));
    try {
      storage()?.setItem(storageKey(nodeKey), JSON.stringify(kept));
    } catch {
      // Storage may be unavailable (private mode); the banner then shows its candidates again, which is harmless.
    }
    writes.value += 1;
  },
};
