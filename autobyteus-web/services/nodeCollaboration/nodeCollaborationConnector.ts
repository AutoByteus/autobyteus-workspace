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
    candidates(): Promise<string[]>
    resolveAddress(nodeId: string, baseUrls: string[]): Promise<string>
    addPeer(input: { nodeId: string; name: string; baseUrl: string }): Promise<unknown>
    renamePeer(nodeId: string, name: string): Promise<unknown>
    removePeer(nodeId: string): Promise<void>
    changePeerAddress(nodeId: string, baseUrl: string): Promise<unknown>
  }
  list: {
    rename(desktopId: string, name: string): Promise<void>
    remove(desktopId: string): Promise<void>
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

const unique = (addresses: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>()
  return addresses.filter((address): address is string => {
    if (!address) return false
    const key = address.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const step = (id: NodeChangeStepId, fields: Partial<NodeChangeStep> = {}): NodeChangeStep => ({ id, status: 'todo', ...fields })
const requireId = (nodeId: string | null, what: string): string => {
  if (!nodeId) throw new NodeSettingsError({ code: 'PEER_UNREACHABLE', message: `${what} has not been reached yet.` })
  return nodeId
}

/**
 * Collaboration between this node and another one, as one confirmed plan carried out on both nodes (one-nodes-tab
 * DS-003): `plan` gathers the facts and lists only the needed steps; `resolveAhead` finds, before the confirmation,
 * the addresses of the sides whose switch is already on; `run` carries the steps out in order, by the plan kind's run
 * rule (design § Run Rules), and reports each step. Stateless between calls: the plan holds everything.
 */
export const createNodeCollaborationConnector = (deps: NodeCollaborationConnectorDependencies) => {
  const api = (plan: NodeChangePlan): NodeCollaborationApi =>
    deps.there(requireId(plan.target.windowAddress, plan.target.name))

  /** Connect and finish: every step still missing on both nodes, in order. */
  const planConnect = async (kind: 'connect' | 'finish', target: NodeChangeTarget, here: NodeChangeHere): Promise<NodeChangePlan> => {
    const nodeId = requireId(target.nodeId, target.name)
    const hereId = requireId(here.nodeId, here.name)
    const other = deps.there(requireId(target.windowAddress, target.name))
    const [herePeers, hereCandidates, thereOn, therePeers, thereCandidates] = await Promise.all([
      deps.here.loadPeers(), deps.here.candidates(), other.capability().then((state) => state.enabled), other.peers(), other.peerAddressCandidates(),
    ])
    const hereOn = deps.here.switchOn()
    const steps: NodeChangeStep[] = []
    if (!hereOn) steps.push(step('turnOnHere'))
    if (!herePeers.some((peer) => peer.nodeId === nodeId)) {
      steps.push(step('resolveHere', { findsLater: !hereOn }))
      steps.push(step('registerHere', { name: registrationName(target.name, herePeers.map((peer) => peer.name)), wanted: target.name }))
    }
    if (!thereOn) steps.push(step('turnOnThere'))
    if (!therePeers.some((peer) => peer.nodeId === hereId)) {
      steps.push(step('resolveThere', { findsLater: !thereOn }))
      steps.push(step('registerThere', { name: registrationName(here.name, therePeers.map((peer) => peer.name)), wanted: here.name }))
    }
    return { kind, target, here, steps, phase: 'confirm', candidates: { here: hereCandidates, there: thereCandidates } }
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
    if (kind === 'remove' && target.desktopIds.length) steps.push(step('removeFromList'))
    return { kind, target, here, steps, phase: 'confirm', candidates: { here: [], there: [] } }
  }

  const planRename = async (target: NodeChangeTarget, here: NodeChangeHere, name: string): Promise<NodeChangePlan> => {
    const herePeers = target.nodeId ? await deps.here.loadPeers() : []
    const steps: NodeChangeStep[] = []
    if (herePeers.some((peer) => peer.nodeId === target.nodeId)) steps.push(step('renameHere', { name }))
    if (target.desktopIds.length) steps.push(step('renameInList', { name }))
    return { kind: 'rename', target, here, steps, phase: 'confirm', candidates: { here: [], there: [] } }
  }

  /**
   * Change address (TR-711): this node checks the typed address alone, so the owner's choice is what is saved, and a
   * wrong or loopback address says so (AC-707: the Docker hint, VIS-026) instead of quietly keeping another address.
   */
  const planChangeAddress = async (target: NodeChangeTarget, here: NodeChangeHere, address: string): Promise<NodeChangePlan> => {
    requireId(target.nodeId, target.name)
    return {
      kind: 'changeAddress', target, here, phase: 'confirm', candidates: { here: [], there: [] },
      steps: [step('resolveHere', { firstAddress: address }), step('changeAddressHere')],
    }
  }

  const resolve = async (plan: NodeChangePlan, current: NodeChangeStep): Promise<void> => {
    if (current.id === 'resolveHere') {
      const first = plan.kind === 'changeAddress' ? [current.firstAddress] : [current.firstAddress, plan.target.windowAddress]
      current.address = await deps.here.resolveAddress(requireId(plan.target.nodeId, plan.target.name), unique([...first, ...plan.candidates.there]))
    } else {
      current.address = await api(plan).resolvePeerAddress(requireId(plan.here.nodeId, plan.here.name),
        unique([current.firstAddress, plan.here.windowAddress, ...plan.candidates.here]))
    }
  }

  const addressOf = (plan: NodeChangePlan, id: 'resolveHere' | 'resolveThere'): string => {
    const found = plan.steps.find((entry) => entry.id === id)?.address
    if (!found) throw new NodeSettingsError({ code: 'PEER_UNREACHABLE', message: 'No address was found.' })
    return found
  }

  const perform = async (plan: NodeChangePlan, current: NodeChangeStep): Promise<void> => {
    const nodeId = plan.target.nodeId
    switch (current.id) {
      case 'turnOnHere': return deps.here.setSwitch(true)
      case 'resolveHere': case 'resolveThere': return current.address ? undefined : resolve(plan, current)
      case 'registerHere':
        await deps.here.addPeer({ nodeId: requireId(nodeId, plan.target.name), name: current.name!, baseUrl: addressOf(plan, 'resolveHere') })
        return
      case 'turnOnThere': return api(plan).setEnabled(true)
      case 'registerThere':
        await api(plan).addPeer({ nodeId: requireId(plan.here.nodeId, plan.here.name), name: current.name!, baseUrl: addressOf(plan, 'resolveThere') })
        return
      case 'removeHere': return deps.here.removePeer(requireId(nodeId, plan.target.name))
      case 'removeThere': return api(plan).removePeer(requireId(plan.here.nodeId, plan.here.name))
      case 'removeFromList':
        for (const desktopId of plan.target.desktopIds) await deps.list.remove(desktopId)
        return
      case 'renameHere':
        await deps.here.renamePeer(requireId(nodeId, plan.target.name), current.name!)
        return
      case 'renameInList':
        for (const desktopId of plan.target.desktopIds) await deps.list.rename(desktopId, current.name!)
        return
      case 'changeAddressHere':
        await deps.here.changePeerAddress(requireId(nodeId, plan.target.name), addressOf(plan, 'resolveHere'))
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

    /**
     * Before the confirmation: each side whose switch is on finds the address it will use (design § Switch-Off Rule);
     * a failure is shown with the step and the run tries it again. Pass `only` to look again for one step ("Use this").
     */
    async resolveAhead(plan: NodeChangePlan, only?: NodeChangeStepId): Promise<void> {
      const pending = plan.steps.filter((entry) => (entry.id === 'resolveHere' || entry.id === 'resolveThere')
        && !entry.findsLater && !entry.address && (!only || entry.id === only))
      await Promise.all(pending.map(async (entry) => {
        entry.error = undefined
        entry.status = 'running'
        try { await resolve(plan, entry); entry.status = 'todo' } catch (error) { entry.status = 'failed'; entry.error = asSettingsFailure(error) }
      }))
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
