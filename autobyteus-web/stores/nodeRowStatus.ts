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
  serverInstanceId: string | null
  /** The desktop entries of this node, the first-created first (`[]` for a node only this node knows). */
  desktopIds: string[]
  /** Where this desktop opens the node (its first desktop entry). */
  windowAddress: string | null
  /** This node's registration of it, when it has one; `peer.baseUrl` is the address this node uses. */
  peer: PeerNode | null
  /** The peer name when it is a peer, the desktop label otherwise (DEC-705). */
  name: string
  isEmbedded: boolean
}

/** What this window learned about a row's node in its last ask (DS-001, DS-004). */
export interface RowFacts {
  /** The window's identity probe of the row's address; `null` while it runs. */
  probe: NodeIdentityProbeResult | null
  /** The other node's switch and peers, read by this window; `undefined` while reading, `null` when it cannot be read. */
  remote: { switchOn: boolean; peers: PeerNode[] } | null | undefined
  /** "It → this node": asked on the other node once "this node → it" works; `undefined` while asking. */
  availability: NodeAvailability | null | undefined
  checkedAt: string | null
}

export type DirState =
  | { state: 'working' | 'offHere' | 'offThere' | 'notRegisteredHere' | 'notRegisteredThere' | 'different' | 'checking' }
  | { state: 'unreachable'; cause?: NodeProbeCause; host?: string; fromOther?: boolean }

export type RowLineKind = 'unreachable' | 'different' | 'partial' | 'offThere' | 'notRegisteredThere' | 'notRegisteredHereInfo' | 'agentsOff'
export type RowFix = 'turnOnThere' | 'registerThere' | 'changeAddress' | 'checkAgain' | 'tryAgain' | 'turnOn'
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
const outOf = (row: RowRow, switchOn: boolean, offer: PeerOffer | undefined): DirState => {
  if (!switchOn) return { state: 'offHere' }
  if (!row.peer) return { state: 'notRegisteredHere' }
  if (!offer || offer.phase === 'checking') return { state: 'checking' }
  if (offer.phase === 'available') return { state: 'working' }
  switch (offer.code) {
    case 'REMOTE_COLLABORATION_OFF': return { state: 'offThere' }
    case 'PEER_NOT_REGISTERED': return { state: 'notRegisteredThere' }
    case 'PEER_IDENTITY_MISMATCH': return { state: 'different' }
    default: return { state: 'unreachable', cause: offer.reason ?? 'unreachable', host: hostOfAddress(row.peer.baseUrl) }
  }
}

/** "It → this node": what the other node has, and whether it admits this node now. */
const inOf = (row: RowRow, switchOn: boolean, facts: RowFacts, thisNodeId: string | null, out: DirState): DirState => {
  if (facts.remote === undefined) return { state: 'checking' }
  if (facts.remote === null) {
    return facts.probe && !facts.probe.ok
      ? { state: 'unreachable', cause: facts.probe.cause, host: hostOfAddress(row.windowAddress) }
      : { state: 'unreachable', cause: 'unreachable' }
  }
  if (!facts.remote.switchOn) return { state: 'offThere' }
  if (!facts.remote.peers.some((peer) => peer.nodeId === thisNodeId)) return { state: 'notRegisteredThere' }
  if (!switchOn) return { state: 'offHere' }
  if (!row.peer) return { state: 'notRegisteredHere' }
  if (out.state !== 'working') return out.state === 'checking' ? { state: 'checking' } : { state: 'unreachable', cause: 'unreachable' }
  const answer = facts.availability
  if (answer === undefined) return { state: 'checking' }
  if (answer === null) return { state: 'unreachable', cause: 'unreachable' }
  if (answer.available) return { state: 'working' }
  if (answer.code === 'REMOTE_COLLABORATION_OFF') return { state: 'offHere' }
  if (answer.code === 'PEER_NOT_REGISTERED') return { state: 'notRegisteredHere' }
  if (answer.code === 'PEER_IDENTITY_MISMATCH') return { state: 'different' }
  const viaIt = facts.remote.peers.find((peer) => peer.nodeId === thisNodeId)?.baseUrl
  return { state: 'unreachable', cause: answer.reason ?? 'unreachable', host: hostOfAddress(viaIt), fromOther: true }
}

type RowRow = Pick<NodeRow, 'peer' | 'windowAddress' | 'desktopIds' | 'serverInstanceId'>

/**
 * A row's dot, directions and its one line (UI/UX spec § State Behavior, by priority): a step not finished; not
 * reachable; a different node; not collaborating (registered only by the other node, or not yet); and, with this
 * node's switch on, off there or not registered there. With this node's switch off, rows show no warnings.
 */
export const rowViewOf = (input: {
  row: RowRow
  switchOn: boolean
  thisNodeId: string | null
  facts: RowFacts | undefined
  offer: PeerOffer | undefined
  /** The failed step of the last connect or finish run, while it is still not finished. */
  unfinishedStep: NodeChangeStep | null
}): RowView => {
  const { row, switchOn, facts, offer } = input
  const peerOnly = !row.desktopIds.length
  const out = outOf(row, switchOn, offer)
  const factsOf: RowFacts = facts ?? { probe: null, remote: undefined, availability: undefined, checkedAt: null }
  const inState = inOf(row, switchOn, factsOf, input.thisNodeId, out)
  const probeChecking = !peerOnly && factsOf.probe === null
  const remoteChecking = factsOf.probe?.ok === true && factsOf.remote === undefined
  const checking = !facts || probeChecking || remoteChecking || (Boolean(row.peer) && out.state === 'checking')
  const reachable = peerOnly
    ? (switchOn && out.state !== 'checking' ? out.state !== 'unreachable' : null)
    : factsOf.probe ? factsOf.probe.ok : null
  const different = out.state === 'different'
  const view: RowView = { checking, reachable, different, out, in: inState, line: null, offers: out.state === 'working' && offer?.phase === 'available' ? offer.entries : null }
  if (checking) return view
  const finished = out.state === 'working' && inState.state === 'working'
  view.line = lineOf(row, switchOn, factsOf, out, reachable, finished ? null : input.unfinishedStep, input.thisNodeId)
  return view
}

const lineOf = (
  row: RowRow, switchOn: boolean, facts: RowFacts, out: DirState, reachable: boolean | null, unfinished: NodeChangeStep | null, thisNodeId: string | null,
): RowLine | null => {
  // A step that did not finish is a row state of its own, with the button that finishes it.
  if (row.peer && switchOn && unfinished?.error) {
    return { kind: 'partial', tone: 'warn', fix: 'tryAgain', error: unfinished.error, ...(unfinished.name ? { stepName: unfinished.name } : {}) }
  }
  if (reachable === false) {
    const cause = row.desktopIds.length && facts.probe && !facts.probe.ok
      ? { cause: facts.probe.cause, host: hostOfAddress(row.windowAddress) }
      : out.state === 'unreachable' ? { cause: out.cause, host: out.host } : {}
    return { kind: 'unreachable', tone: 'info', fix: 'checkAgain', ...cause }
  }
  if (out.state === 'different') return { kind: 'different', tone: 'error', fix: 'changeAddress' }
  if (!row.peer) {
    if (!row.serverInstanceId) return null
    // The other node has registered this node, but this node has not registered it.
    if (facts.remote?.switchOn && facts.remote.peers.some((peer) => peer.nodeId === thisNodeId)) return { kind: 'notRegisteredHereInfo', tone: 'info', fix: 'turnOn' }
    return { kind: 'agentsOff', tone: 'info', fix: 'turnOn' }
  }
  if (!switchOn) return null
  if (out.state === 'unreachable') return { kind: 'unreachable', tone: 'info', fix: 'checkAgain', cause: out.cause, host: out.host }
  if (out.state === 'offThere') return { kind: 'offThere', tone: 'warn', fix: 'turnOnThere' }
  if (out.state === 'notRegisteredThere') return { kind: 'notRegisteredThere', tone: 'warn', fix: 'registerThere' }
  return null
}
