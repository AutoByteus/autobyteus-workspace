import type { NodeSettingsFailure } from '~/utils/nodeSettingsError'

/**
 * The changes a confirmation shows and `nodeCollaborationConnector` then carries out (one-nodes-tab DS-003). "Here"
 * is this node (the window's node), "there" the row's node, "in list" the desktop's list.
 */
export type NodeChangeStepId =
  | 'turnOnHere' | 'turnOnThere'
  /** autobyteus-437: the other node creates an invite, this node accepts it; both then hold the peer secret. */
  | 'pair'
  | 'removeHere' | 'removeThere' | 'removeFromList'
  | 'renameHere' | 'renameInList'
  | 'changeAddressHere'

export type NodeChangeStepStatus = 'todo' | 'running' | 'done' | 'failed' | 'notRun'

export interface NodeChangeStep {
  id: NodeChangeStepId
  status: NodeChangeStepStatus
  /** `pair`: this node's name for the other node; rename steps: the name written (the naming rule's result). */
  name?: string
  /** `pair`: the name asked for, when the naming rule changed it (shown as "gets a number"). */
  wanted?: string
  /** `pair`: the other node's name for this node. */
  nameThere?: string
  /** `changeAddressHere`: the address to save. */
  address?: string
  error?: NodeSettingsFailure
}

/**
 * `connect`: turn collaboration on for a node; `finish`: the steps still missing (fixing buttons, Try again);
 * `disconnect`: turn it off; `remove`; `rename`; `changeAddress`. Each has its run rule (design § Run Rules).
 */
export type NodeChangePlanKind = 'connect' | 'finish' | 'disconnect' | 'remove' | 'rename' | 'changeAddress'

/** The row's node, as the plan needs it. */
export interface NodeChangeTarget {
  rowKey: string
  name: string
  /** The node ID (`srv_…`); every plan but `remove` and `rename` of a never-reached node needs it. */
  nodeId: string | null
  /** The desktop entries of this node (several when the old form listed it twice); `[]` for a node only this node knows. */
  entryIds: string[]
  /** Where this window reaches the node, when it does. */
  windowAddress: string | null
}

export interface NodeChangePlan {
  kind: NodeChangePlanKind
  target: NodeChangeTarget
  /** This node's name and node ID, and where this window reaches it. */
  here: { name: string; nodeId: string | null; windowAddress: string }
  steps: NodeChangeStep[]
  phase: 'confirm' | 'running' | 'done' | 'failed'
}

export const STOP_ON_FAILURE: Readonly<Record<NodeChangePlanKind, boolean>> = Object.freeze({
  connect: true, finish: true, rename: true, changeAddress: true, disconnect: false, remove: false,
})
