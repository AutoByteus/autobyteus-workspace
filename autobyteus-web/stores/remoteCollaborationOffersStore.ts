import { defineStore } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import { GetPeerNodeOffer } from '~/graphql/queries/remoteCollaborationQueries'
import type { NodeTransportReason } from '~/utils/nodeIdentityProbe'

/** One Agent or Agent Team a peer offers, as the page shows it: a description only when it has one. */
export interface PeerOfferEntry {
  name: string
  kind: 'agent' | 'agent_team'
  description?: string
}

/** The four refusals the page words (UI/UX spec ST-03 … ST-06); any other refusal reads as not reachable. */
export const PEER_REFUSAL_CODES = ['REMOTE_COLLABORATION_OFF', 'PEER_NOT_REGISTERED', 'PEER_UNREACHABLE', 'PEER_IDENTITY_MISMATCH'] as const
export type PeerRefusalCode = (typeof PEER_REFUSAL_CODES)[number]

export type PeerOffer =
  | { phase: 'checking' }
  | { phase: 'available'; entries: PeerOfferEntry[]; checkedAt: string }
  /** `reason`: why an unreachable peer did not answer, when the transport said (one-nodes-tab REQ-707). */
  | { phase: 'unavailable'; code: PeerRefusalCode; reason?: NodeTransportReason }

type OfferAnswer = {
  peerNodeOffer?: {
    entries?: Array<{ name: string; kind: string; description?: string | null }> | null
    refusalCode?: string | null
    unreachableReason?: string | null
  } | null
}

const REASONS: readonly string[] = ['refused', 'timeout', 'not_found', 'unreachable']
const reasonOf = (reason: string | null | undefined): { reason?: NodeTransportReason } =>
  reason && REASONS.includes(reason) ? { reason: reason as NodeTransportReason } : {}

const KIND_ORDER: Record<PeerOfferEntry['kind'], number> = { agent: 0, agent_team: 1 }

/** The answer's entries: only the two kinds, only fields with a value, sorted by name within each kind. */
const entriesOf = (entries: NonNullable<NonNullable<OfferAnswer['peerNodeOffer']>['entries']>): PeerOfferEntry[] => entries
  .filter((entry): entry is { name: string; kind: PeerOfferEntry['kind']; description?: string | null } =>
    entry.kind === 'agent' || entry.kind === 'agent_team')
  .map((entry) => ({ name: entry.name, kind: entry.kind, ...(entry.description ? { description: entry.description } : {}) }))
  .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name))

const codeOf = (code: string | null | undefined): PeerRefusalCode =>
  (PEER_REFUSAL_CODES as readonly string[]).includes(code ?? '') ? code as PeerRefusalCode : 'PEER_UNREACHABLE'

let nextToken = 1

/**
 * What the Nodes page knows about each peer's offer now (autobyteus-267 DS-002; one-nodes-tab DS-004: "this node → it"). One state per peer:
 * checking, available (entries and the window's time the answer arrived) or unavailable (the refusal code). The node's
 * server asks the peer; the window never contacts it. Nothing is cached and nothing polls: peers are asked when the
 * tab opens, when the switch turns on, when one is added, and on Refresh. Each ask takes a token per peer; an answer
 * whose token is no longer current (the peer was removed or asked again, the switch turned off, the tab left) is ignored.
 */
export const useRemoteCollaborationOffersStore = defineStore('remoteCollaborationOffers', {
  state: () => ({
    peers: {} as Record<string, PeerOffer>,
    /** The current ask of each peer; an answer with another token is stale. */
    tokens: {} as Record<string, number>,
  }),

  actions: {
    /** Every peer at once, each with its own waiting state (the tab opened with the switch on, or the switch turned on). */
    askAll(peers: ReadonlyArray<{ nodeId: string }>) {
      this.clear()
      peers.forEach((peer) => { void this.ask(peer.nodeId) })
    },

    /** One peer (Refresh, or a peer just added): its previous answer is dropped while it is asked again. */
    async ask(nodeId: string): Promise<void> {
      const token = nextToken++
      this.tokens[nodeId] = token
      this.peers[nodeId] = { phase: 'checking' }
      let offer: PeerOffer
      try {
        const { data, errors } = await getApolloClient().query<OfferAnswer>({
          query: GetPeerNodeOffer,
          variables: { nodeId },
          fetchPolicy: 'network-only',
          // A new ask of a peer whose earlier ask is still open must send its own request (Apollo dedupes identical in-flight queries).
          context: { queryDeduplication: false },
        })
        const answer = data?.peerNodeOffer
        offer = errors?.length || !answer ? { phase: 'unavailable', code: 'PEER_UNREACHABLE' }
          : answer.entries ? { phase: 'available', entries: entriesOf(answer.entries), checkedAt: new Date().toISOString() }
            : { phase: 'unavailable', code: codeOf(answer.refusalCode), ...reasonOf(answer.unreachableReason) }
      } catch {
        // The query itself failed (this node's server, or the network): nothing retries.
        offer = { phase: 'unavailable', code: 'PEER_UNREACHABLE' }
      }
      if (this.tokens[nodeId] !== token) return
      this.peers[nodeId] = offer
    },

    /** A removed peer: its state is dropped, and an answer still on its way is ignored. */
    forget(nodeId: string) {
      delete this.peers[nodeId]
      delete this.tokens[nodeId]
    },

    /** The switch turned off, or the tab was left: no states, and every answer on its way is ignored. */
    clear() {
      this.peers = {}
      this.tokens = {}
    },
  },
})
