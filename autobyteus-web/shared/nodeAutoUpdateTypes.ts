/**
 * Automatic node updates (autobyteus-356): the desktop updates each remote node whose switch is on to the desktop's
 * version, and keeps one entry per node in `<userData>/node-auto-updates.json`.
 */

/** `PENDING`: the node accepted the request (C1 202) and has not ended the update; then its outcome. */
export type NodeAutoUpdateOutcome = 'PENDING' | 'AUTO_UPDATED' | 'AUTO_FAILED'

/** The last automatic attempt at one node (by entry ID). */
export interface NodeAutoUpdateEntry {
  version: string
  requestedAt: string
  outcome: NodeAutoUpdateOutcome
  /** The node's reason when `outcome` is `AUTO_FAILED`; null otherwise. */
  reason: string | null
  read: boolean
}

export type NodeAutoUpdateEntries = Record<string, NodeAutoUpdateEntry>

export const NODE_AUTO_UPDATE_IPC_GET_STATE = 'node-auto-update:get-state'
export const NODE_AUTO_UPDATE_IPC_MARK_READ = 'node-auto-update:mark-read'
export const NODE_AUTO_UPDATE_CHANGED_CHANNEL = 'node-auto-update:changed'
