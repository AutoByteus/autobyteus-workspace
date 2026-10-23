import type { NodeSettingsFailure } from '~/utils/nodeSettingsError'

/**
 * The changes a confirmation shows and `nodeCollaborationConnector` then carries out (one-nodes-tab DS-003). "Here"
 * is this node (the window's node), "there" the row's node, "in list" the desktop's list.
 */
export type NodeChangeStepId =
  | 'turnOnHere' | 'resolveHere' | 'registerHere'
  | 'turnOnThere' | 'resolveThere' | 'registerThere'
  | 'removeHere' | 'removeThere' | 'removeFromList'
  | 'renameHere' | 'renameInList'
  | 'changeAddressHere'

export type NodeChangeStepStatus = 'todo' | 'running' | 'done' | 'failed' | 'notRun'

export interface NodeChangeStep {
  id: NodeChangeStepId
  status: NodeChangeStepStatus
  /** Register and rename steps: the name written (the naming rule's result). */
  name?: string
  /** Register steps: the name asked for, when the naming rule changed it (shown as "gets a number"). */
  wanted?: string
  /** Resolve steps: the address found; `changeAddressHere`: the address to save. */
  address?: string
  /** Resolve steps: the side's switch is off, so it finds the address once it is on (design § Switch-Off Rule). */
  findsLater?: boolean
  /** Resolve steps: the address to try first ("Use this"). */
  firstAddress?: string
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
  desktopIds: string[]
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
  /** The addresses each side advertises for itself (resolution tries them after the window's address). */
  candidates: { here: string[]; there: string[] }
}

export const STOP_ON_FAILURE: Readonly<Record<NodeChangePlanKind, boolean>> = Object.freeze({
  connect: true, finish: true, rename: true, changeAddress: true, disconnect: false, remove: false,
})
