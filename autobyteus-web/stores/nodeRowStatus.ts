import type { PeerNode } from '~/stores/remoteCollaborationStore'
import type { PeerOffer, PeerOfferEntry } from '~/stores/remoteCollaborationOffersStore'
import type { NodeAvailability } from '~/services/nodeCollaboration/nodeCollaborationApi'
import type { NodeChangeStep } from '~/services/nodeCollaboration/nodeChangePlan'
import type { NodeIdentityProbeResult, NodeProbeCause } from '~/utils/nodeIdentityProbe'
import type { NodeSettingsFailure } from '~/utils/nodeSettingsError'

/** One node of the list (one-nodes-tab DS-001): the desktop's entries and this node's peer, joined by the node ID. */
export interface NodeRow {
  /** The node ID (`srv_…`) when known; `d:<desktop entry ID>` for a node this desktop has never reached. */
  key: string
  nodeId: string | null
  /** The desktop entries of this node, the first-created first (`[]` for a node only this node knows). */
  entryIds: string[]
  /** Where this desktop opens the node (its first desktop entry). */
  windowAddress: string | null
  /** This node's pair with it, when it has one; `peer.address` is the address this node uses. */
  peer: PeerNode | null
  /** The peer name when it is a peer, the desktop label otherwise (DEC-705). */
  name: string
  isEmbedded: boolean
}

/** What this window learned about a row's node in its last ask (DS-001, DS-004). */
export interface RowFacts {
  /** The window's identity probe of the row's address; `null` while it runs. */
  probe: NodeIdentityProbeResult | null
  /** The other node's peers, read by this window; `undefined` while reading, `null` when it cannot be read. */
  remote: { peers: PeerNode[] } | null | undefined
  /** "It → this node": asked on the other node once "this node → it" works; `undefined` while asking. */
  availability: NodeAvailability | null | undefined
  checkedAt: string | null
}

export type DirState =
  | { state: 'working' | 'notRegisteredHere' | 'notRegisteredThere' | 'notPaired' | 'different' | 'checking' }
  | { state: 'unreachable'; cause?: NodeProbeCause; host?: string; fromOther?: boolean }

export type RowLineKind = 'unreachable' | 'different' | 'partial' | 'notRegisteredThere' | 'notPaired' | 'notRegisteredHereInfo' | 'agentsOff'
/** `pairAgain`: pair the two nodes (again): one step stores both records, each with the other's node key (autobyteus-661). */
export type RowFix = 'pairAgain' | 'changeAddress' | 'checkAgain' | 'tryAgain' | 'turnOn'
export interface RowLine {
  kind: RowLineKind
  tone: 'warn' | 'error' | 'info'
  fix: RowFix
  cause?: NodeProbeCause
  host?: string
  error?: NodeSettingsFailure
  /** `partial`: the name the failed step wrote (a register step's name, for "already has a node named X"). */
  stepName?: string
}

export interface RowView {
  checking: boolean
  /** Reachable now: by this window, or for a node only this node knows, by this node. `null` when it is not known. */
  reachable: boolean | null
  different: boolean
  out: DirState
  in: DirState
  line: RowLine | null
  /** What it offers, once "this node → it" works. */
  offers: PeerOfferEntry[] | null
}

const hostOfAddress = (address: string | null | undefined): string => {
  if (!address) return ''
  try { return new URL(address).host } catch { return address }
}

/** "This node → it": this node's server asking the node (267's offer). */
const outOf = (row: RowRow, offer: PeerOffer | undefined): DirState => {
  if (!row.peer) return { state: 'notRegisteredHere' }
  // A pair made before node keys: this node holds no key of it and sends nothing (NAS-23, Pair again).
  if (!row.peer.paired) return { state: 'notPaired' }
  if (!offer || offer.phase === 'checking') return { state: 'checking' }
  if (offer.phase === 'available') return { state: 'working' }
  switch (offer.code) {
    case 'PEER_NOT_REGISTERED': return { state: 'notRegisteredThere' }
    // The other node holds no key of this one (it unpaired this node, or paired it before node keys).
    case 'PEER_NOT_PAIRED': return { state: 'notPaired' }
    case 'PEER_IDENTITY_MISMATCH': return { state: 'different' }
    default: return { state: 'unreachable', cause: offer.reason ?? 'unreachable', host: hostOfAddress(row.peer.address) }
  }
}

/** "It → this node": what the other node has, and whether it admits this node now. */
const inOf = (row: RowRow, facts: RowFacts, thisNodeId: string | null, out: DirState): DirState => {
  if (facts.remote === undefined) return { state: 'checking' }
  if (facts.remote === null) {
    return facts.probe && !facts.probe.ok
      ? { state: 'unreachable', cause: facts.probe.cause, host: hostOfAddress(row.windowAddress) }
      : { state: 'unreachable', cause: 'unreachable' }
  }
  if (!facts.remote.peers.some((peer) => peer.nodeId === thisNodeId)) return { state: 'notRegisteredThere' }
  if (!row.peer) return { state: 'notRegisteredHere' }
  if (out.state === 'notPaired') return out
  if (out.state !== 'working') return out.state === 'checking' ? { state: 'checking' } : { state: 'unreachable', cause: 'unreachable' }
  const answer = facts.availability
  if (answer === undefined) return { state: 'checking' }
  if (answer === null) return { state: 'unreachable', cause: 'unreachable' }
  if (answer.available) return { state: 'working' }
  if (answer.code === 'PEER_NOT_REGISTERED') return { state: 'notRegisteredHere' }
  if (answer.code === 'PEER_NOT_PAIRED') return { state: 'notPaired' }
  if (answer.code === 'PEER_IDENTITY_MISMATCH') return { state: 'different' }
  const viaIt = facts.remote.peers.find((peer) => peer.nodeId === thisNodeId)?.address
  return { state: 'unreachable', cause: answer.reason ?? 'unreachable', host: hostOfAddress(viaIt), fromOther: true }
}

type RowRow = Pick<NodeRow, 'peer' | 'windowAddress' | 'entryIds' | 'nodeId'>

/**
 * A row's dot, directions and its one line (UI/UX spec § State Behavior, by priority): a step not finished; not
 * reachable; a different node; not collaborating (paired only by the other node, or not yet); not paired there, or a
 * pair made before node keys (Pair again). There is no switch (autobyteus-661 D-4).
 */
export const rowViewOf = (input: {
  row: RowRow
  thisNodeId: string | null
  facts: RowFacts | undefined
  offer: PeerOffer | undefined
  /** The failed step of the last connect or finish run, while it is still not finished. */
  unfinishedStep: NodeChangeStep | null
}): RowView => {
  const { row, facts, offer } = input
  const peerOnly = !row.entryIds.length
  const out = outOf(row, offer)
  const factsOf: RowFacts = facts ?? { probe: null, remote: undefined, availability: undefined, checkedAt: null }
  const inState = inOf(row, factsOf, input.thisNodeId, out)
  const probeChecking = !peerOnly && factsOf.probe === null
  const remoteChecking = factsOf.probe?.ok === true && factsOf.remote === undefined
  const checking = !facts || probeChecking || remoteChecking || (Boolean(row.peer) && out.state === 'checking')
  const reachable = peerOnly
    ? (out.state !== 'checking' ? out.state !== 'unreachable' : null)
    : factsOf.probe ? factsOf.probe.ok : null
  const different = out.state === 'different'
  const view: RowView = { checking, reachable, different, out, in: inState, line: null, offers: out.state === 'working' && offer?.phase === 'available' ? offer.entries : null }
  if (checking) return view
  const finished = out.state === 'working' && inState.state === 'working'
  view.line = lineOf(row, factsOf, out, reachable, finished ? null : input.unfinishedStep, input.thisNodeId)
  return view
}

const lineOf = (
  row: RowRow, facts: RowFacts, out: DirState, reachable: boolean | null, unfinished: NodeChangeStep | null, thisNodeId: string | null,
): RowLine | null => {
  // A step that did not finish is a row state of its own, with the button that finishes it.
  if (row.peer && unfinished?.error) {
    return { kind: 'partial', tone: 'warn', fix: 'tryAgain', error: unfinished.error, ...(unfinished.name ? { stepName: unfinished.name } : {}) }
  }
  if (reachable === false) {
    const cause = row.entryIds.length && facts.probe && !facts.probe.ok
      ? { cause: facts.probe.cause, host: hostOfAddress(row.windowAddress) }
      : out.state === 'unreachable' ? { cause: out.cause, host: out.host } : {}
    return { kind: 'unreachable', tone: 'info', fix: 'checkAgain', ...cause }
  }
  if (out.state === 'different') return { kind: 'different', tone: 'error', fix: 'changeAddress' }
  if (!row.peer) {
    if (!row.nodeId) return null
    // The other node has registered this node, but this node has not registered it.
    if (facts.remote?.peers.some((peer) => peer.nodeId === thisNodeId)) return { kind: 'notRegisteredHereInfo', tone: 'info', fix: 'turnOn' }
    return { kind: 'agentsOff', tone: 'info', fix: 'turnOn' }
  }
  if (out.state === 'unreachable') return { kind: 'unreachable', tone: 'info', fix: 'checkAgain', cause: out.cause, host: out.host }
  if (out.state === 'notRegisteredThere') return { kind: 'notRegisteredThere', tone: 'warn', fix: 'pairAgain' }
  if (out.state === 'notPaired') return { kind: 'notPaired', tone: 'warn', fix: 'pairAgain' }
  return null
}
