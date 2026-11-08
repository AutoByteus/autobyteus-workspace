/**
 * The desktop's credentials for its nodes (node access model NA-5, NA-8; autobyteus-437 design DS-002, DS-003). The
 * main process holds them; the windows get only each node entry's state and ask for connect/disconnect.
 */

/** `connected`: this desktop holds the node's owner credential (the embedded node: its launch credential). */
export type NodeAccessState = 'connected' | 'needs_connecting'

export type NodeAccessStates = Record<string, NodeAccessState>

/** The result of a connect or disconnect request; `code` is the node's refusal code when it refused. */
export type NodeAccessActionResult =
  | { ok: true; states: NodeAccessStates }
  | { ok: false; code: string; message: string }

export const NODE_ACCESS_IPC_STATES = 'node-access:states'
export const NODE_ACCESS_IPC_CONNECT = 'node-access:connect'
export const NODE_ACCESS_IPC_DISCONNECT = 'node-access:disconnect'
export const NODE_ACCESS_CHANGED_CHANNEL = 'node-access:changed'
