import type { NodeServerStatus } from '../../shared/nodeUpdateContract';
import type { NodeAutoUpdateEntry } from '../../shared/nodeAutoUpdateTypes';

/** A pending attempt that has not reached the version this long after the request, with no update running, failed. */
export const NODE_AUTO_UPDATE_PENDING_TIMEOUT_MS = 30 * 60_000;

export const NODE_DID_NOT_FINISH_REASON = 'The node did not finish the update.';

/**
 * DS-003 step 2: what a node's answer means for its pending attempt at `version`. Returns the entry's new value, or
 * null when nothing changes (no pending attempt for `version`, or the update is still under way).
 */
export function reconcileNodeAutoUpdate(
  entry: NodeAutoUpdateEntry | null,
  status: NodeServerStatus,
  version: string,
  nowMs: number,
): NodeAutoUpdateEntry | null {
  if (!entry || entry.outcome !== 'PENDING' || entry.version !== version) return null;
  const update = status.update;
  const forVersion = update?.targetVersion === version;
  // A node in its trial already runs `version` while its update is `running`; the trial can still roll back.
  if ((status.version === version && update?.state !== 'running') || (update?.state === 'succeeded' && forVersion)) {
    return { ...entry, outcome: 'AUTO_UPDATED', reason: null, read: false };
  }
  if ((update?.state === 'failed' || update?.state === 'refused') && forVersion) {
    return { ...entry, outcome: 'AUTO_FAILED', reason: update.message || update.code || 'The node update failed.', read: false };
  }
  const requestedAtMs = Date.parse(entry.requestedAt);
  if (update?.state !== 'running' && (!Number.isFinite(requestedAtMs) || nowMs - requestedAtMs >= NODE_AUTO_UPDATE_PENDING_TIMEOUT_MS)) {
    return { ...entry, outcome: 'AUTO_FAILED', reason: NODE_DID_NOT_FINISH_REASON, read: false };
  }
  return null;
}

/**
 * DS-003 step 3: request the update to `version` only when the node can update in place, is older than `version`,
 * is not updating or blocked, and has had no attempt at `version` that is pending or failed (one attempt per version
 * per node, REQ-004). Never a same or older version (no downgrade).
 */
export function decideNodeAutoUpdate(
  status: NodeServerStatus,
  version: string,
  entry: NodeAutoUpdateEntry | null,
): 'request' | 'skip' {
  if (status.inPlaceUpdate !== 'available') return 'skip';
  if (status.target?.version !== version || status.target.relation !== 'newer') return 'skip';
  if (status.update?.state === 'running') return 'skip';
  if (status.updateBlocker) return 'skip';
  if (entry && entry.version === version && (entry.outcome === 'PENDING' || entry.outcome === 'AUTO_FAILED')) return 'skip';
  return 'request';
}
