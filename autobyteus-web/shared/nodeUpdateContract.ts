/**
 * The node in-place update contract C1 (frozen across versions), as the desktop reads it: the renderer's Nodes page
 * (`nodeServerUpdateStore`) and the main process's automatic node updates (`electron/nodeAutoUpdate`, autobyteus-356).
 * Fields a reader does not know are ignored.
 */

/** The last in-place update of a node (C1 `update`). */
export interface NodeUpdateState {
  state: 'idle' | 'running' | 'succeeded' | 'failed' | 'refused'
  targetVersion: string | null
  step: string | null
  code: string | null
  message: string | null
}

/** A node's answer to `GET /rest/node-update` (C1). */
export interface NodeServerStatus {
  inPlaceUpdate: 'available' | 'unavailable' | 'error'
  version: string | null
  target?: { version: string; relation: 'newer' | 'same' | 'older' }
  update?: NodeUpdateState
  message?: string
  updateBlocker?: { code: string; message: string }
}

/** The C1 route below a node's base URL. */
export const NODE_UPDATE_REST_PATH = '/rest/node-update'

export function isNodeServerStatus(value: unknown): value is NodeServerStatus {
  const inPlaceUpdate = (value as { inPlaceUpdate?: unknown } | null)?.inPlaceUpdate
  return inPlaceUpdate === 'available' || inPlaceUpdate === 'unavailable' || inPlaceUpdate === 'error'
}
