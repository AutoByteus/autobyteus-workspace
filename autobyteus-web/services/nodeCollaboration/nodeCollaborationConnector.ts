import type { PeerNode } from '~/stores/remoteCollaborationStore'
import type { NodeCollaborationApi } from '~/services/nodeCollaboration/nodeCollaborationApi'
import {
  STOP_ON_FAILURE,
  type NodeChangePlan,
  type NodeChangePlanKind,
  type NodeChangeStep,
  type NodeChangeStepId,
  type NodeChangeTarget,
} from '~/services/nodeCollaboration/nodeChangePlan'
import { asSettingsFailure, NodeSettingsError } from '~/utils/nodeSettingsError'

/**
 * What the connector reads and writes. This node goes through its own stores (one-nodes-tab AR-005: its peers through
 * `remoteCollaborationStore`, its switch through the capability store), the desktop's list through `nodeStore`, and
 * the other node only through its `nodeCollaborationApi`.
 */
export interface NodeCollaborationConnectorDependencies {
  here: {
    switchOn(): boolean
    setSwitch(on: boolean): Promise<void>
    /** This node's peers, read again so a plan uses fresh facts. */
    loadPeers(): Promise<PeerNode[]>
    /** autobyteus-437: this node accepts the other node's invite (it finds the other node's address itself). */
    acceptInvite(inviteText: string, name: string, nameOnInviter: string): Promise<unknown>
    renamePeer(nodeId: string, name: string): Promise<unknown>
    removePeer(nodeId: string): Promise<void>
    changePeerAddress(nodeId: string, baseUrl: string): Promise<unknown>
  }
  list: {
    rename(entryId: string, name: string): Promise<void>
    remove(entryId: string): Promise<void>
  }
  there(windowAddress: string): NodeCollaborationApi
}

export type NodeChangeHere = NodeChangePlan['here']

const NAME_MAX = 64

/**
 * The naming rule (design § Naming Rule): an address's `http://` is dropped (the design's example
 * `http://localhost:8003` → `localhost-8003`), runs of characters a node name may not have become `-`, leading
 * characters that are not a letter or digit are dropped, the name is cut to 64 (`node` when nothing is left), then made
 * unique against `taken` (case-insensitive) with " 2", " 3", …
 */
export const registrationName = (wanted: string, taken: readonly string[]): string => {
  const valid = wanted.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/[^A-Za-z0-9 _.-]+/g, '-').replace(/^[^A-Za-z0-9]+/, '').slice(0, NAME_MAX).trimEnd() || 'node'
  const used = new Set(taken.map((name) => name.toLowerCase()))
  if (!used.has(valid.toLowerCase())) return valid
  for (let number = 2; ; number += 1) {
    const suffix = ` ${number}`
    const candidate = `${valid.slice(0, NAME_MAX - suffix.length).trimEnd()}${suffix}`
    if (!used.has(candidate.toLowerCase())) return candidate
  }
}

const step = (id: NodeChangeStepId, fields: Partial<NodeChangeStep> = {}): NodeChangeStep => ({ id, status: 'todo', ...fields })
const requireId = (nodeId: string | null, what: string): string => {
  if (!nodeId) throw new NodeSettingsError({ code: 'PEER_UNREACHABLE', message: `${what} has not been reached yet.` })
  return nodeId
}

/**
 * Collaboration between this node and another one, as one confirmed plan carried out on both nodes (one-nodes-tab
 * DS-003): `plan` gathers the facts and lists only the needed steps; `run` carries the steps out in order, by the plan
 * kind's run rule (design § Run Rules), and reports each step. Two nodes collaborate once paired (autobyteus-437,
 * node access model NA-9): the other node creates an invite and this node accepts it, so one step registers both and
 * gives them their shared secret; each node finds the other's address itself. Stateless between calls: the plan holds
 * everything.
 */
export const createNodeCollaborationConnector = (deps: NodeCollaborationConnectorDependencies) => {
  const api = (plan: NodeChangePlan): NodeCollaborationApi =>
    deps.there(requireId(plan.target.windowAddress, plan.target.name))

  /**
   * Connect and finish: every step still missing on both nodes, in order. A pair that is paired on one side only (the
   * other side removed it) is removed there first, since a node pairs again with a peer only after it was removed.
   */
  const planConnect = async (kind: 'connect' | 'finish', target: NodeChangeTarget, here: NodeChangeHere): Promise<NodeChangePlan> => {
    const nodeId = requireId(target.nodeId, target.name)
    const hereId = requireId(here.nodeId, here.name)
    const other = deps.there(requireId(target.windowAddress, target.name))
    const [herePeers, thereOn, therePeers] = await Promise.all([
      deps.here.loadPeers(), other.capability().then((state) => state.enabled), other.peers(),
    ])
    const hereOn = deps.here.switchOn()
    const herePeer = herePeers.find((peer) => peer.nodeId === nodeId)
    const therePeer = therePeers.find((peer) => peer.nodeId === hereId)
    const steps: NodeChangeStep[] = []
    if (!hereOn) steps.push(step('turnOnHere'))
    if (!thereOn) steps.push(step('turnOnThere'))
    if (!herePeer?.paired || !therePeer?.paired) {
      if (herePeer?.paired) steps.push(step('removeHere'))
      if (therePeer?.paired) steps.push(step('removeThere'))
      const name = herePeer?.name ?? registrationName(target.name, herePeers.map((peer) => peer.name))
      const nameThere = therePeer?.name ?? registrationName(here.name, therePeers.map((peer) => peer.name))
      steps.push(step('pair', { name, nameThere, ...(herePeer ? {} : { wanted: target.name }) }))
    }
    return { kind, target, here, steps, phase: 'confirm' }
  }

  /** Disconnect and remove: this node's registration there is removed when it is there, or when that cannot be read now. */
  const planRemoval = async (kind: 'disconnect' | 'remove', target: NodeChangeTarget, here: NodeChangeHere): Promise<NodeChangePlan> => {
    const herePeers = target.nodeId ? await deps.here.loadPeers() : []
    const registeredHere = herePeers.some((peer) => peer.nodeId === target.nodeId)
    let registeredThere = false
    if (target.nodeId && target.windowAddress && here.nodeId) {
      registeredThere = await deps.there(target.windowAddress).peers()
        .then((peers) => peers.some((peer) => peer.nodeId === here.nodeId), () => registeredHere)
    } else {
      registeredThere = registeredHere && Boolean(here.nodeId)
    }
    const steps: NodeChangeStep[] = []
    if (registeredHere) steps.push(step('removeHere'))
    if (registeredThere) steps.push(step('removeThere'))
    if (kind === 'remove' && target.entryIds.length) steps.push(step('removeFromList'))
    return { kind, target, here, steps, phase: 'confirm' }
  }

  const planRename = async (target: NodeChangeTarget, here: NodeChangeHere, name: string): Promise<NodeChangePlan> => {
    const herePeers = target.nodeId ? await deps.here.loadPeers() : []
    const steps: NodeChangeStep[] = []
    if (herePeers.some((peer) => peer.nodeId === target.nodeId)) steps.push(step('renameHere', { name }))
    if (target.entryIds.length) steps.push(step('renameInList', { name }))
    return { kind: 'rename', target, here, steps, phase: 'confirm' }
  }

  /**
   * Change address (TR-711): one step. This node's server checks that the pinned node answers at the typed address
   * alone and saves it, so the owner's choice is what is saved; a wrong node or an unreachable (loopback) address
   * comes back with its details (AC-707: the Docker hint, VIS-026) instead of another address being kept quietly.
   */
  const planChangeAddress = async (target: NodeChangeTarget, here: NodeChangeHere, address: string): Promise<NodeChangePlan> => {
    requireId(target.nodeId, target.name)
    return {
      kind: 'changeAddress', target, here, phase: 'confirm',
      steps: [step('changeAddressHere', { address })],
    }
  }

  const perform = async (plan: NodeChangePlan, current: NodeChangeStep): Promise<void> => {
    const nodeId = plan.target.nodeId
    switch (current.id) {
      case 'turnOnHere': return deps.here.setSwitch(true)
      case 'turnOnThere': return api(plan).setEnabled(true)
      case 'pair': {
        const invite = await api(plan).createInvite()
        await deps.here.acceptInvite(invite.inviteText, current.name!, current.nameThere!)
        return
      }
      case 'removeHere': return deps.here.removePeer(requireId(nodeId, plan.target.name))
      case 'removeThere': return api(plan).removePeer(requireId(plan.here.nodeId, plan.here.name))
      case 'removeFromList':
        for (const entryId of plan.target.entryIds) await deps.list.remove(entryId)
        return
      case 'renameHere':
        await deps.here.renamePeer(requireId(nodeId, plan.target.name), current.name!)
        return
      case 'renameInList':
        for (const entryId of plan.target.entryIds) await deps.list.rename(entryId, current.name!)
        return
      case 'changeAddressHere':
        await deps.here.changePeerAddress(requireId(nodeId, plan.target.name), current.address!)
    }
  }

  return {
    registrationName,

    plan(kind: NodeChangePlanKind, target: NodeChangeTarget, here: NodeChangeHere, input: { name?: string; address?: string } = {}): Promise<NodeChangePlan> {
      switch (kind) {
        case 'connect': case 'finish': return planConnect(kind, target, here)
        case 'disconnect': case 'remove': return planRemoval(kind, target, here)
        case 'rename': return planRename(target, here, input.name ?? target.name)
        case 'changeAddress': return planChangeAddress(target, here, input.address ?? '')
      }
    },

    /** Carries out what is not done yet; a failed or not-run step from an earlier run is tried again (Try again). */
    async run(plan: NodeChangePlan): Promise<void> {
      plan.phase = 'running'
      for (const entry of plan.steps) {
        if (entry.status !== 'done') { entry.status = 'todo'; entry.error = undefined }
      }
      let stopped = false
      for (const entry of plan.steps) {
        if (entry.status === 'done') continue
        if (stopped) { entry.status = 'notRun'; continue }
        entry.status = 'running'
        try {
          await perform(plan, entry)
          entry.status = 'done'
        } catch (error) {
          entry.status = 'failed'
          entry.error = asSettingsFailure(error)
          if (STOP_ON_FAILURE[plan.kind]) stopped = true
        }
      }
      plan.phase = plan.steps.some((entry) => entry.status === 'failed') ? 'failed' : 'done'
    },
  }
}

export type NodeCollaborationConnector = ReturnType<typeof createNodeCollaborationConnector>
