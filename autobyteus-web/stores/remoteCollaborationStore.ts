import { defineStore } from 'pinia'
import type { DocumentNode } from 'graphql'
import { getApolloClient } from '~/utils/apolloClient'
import { GetRemoteCollaborationSettings } from '~/graphql/queries/remoteCollaborationQueries'
import { ChangePeerAddress, PairWithNode, RenamePeerNode, UnpairPeerNode } from '~/graphql/mutations/remoteCollaborationMutations'
import { throwSettingsErrors } from '~/utils/nodeSettingsError'

/**
 * A node paired with the bound node (autobyteus-661 contract §1). `address` is where the bound node reaches it;
 * `machine` and `account` its private-network machine and the account that added it (null by plain address);
 * `relation` whose node it is (null for a pair made before node keys); `paired`: the bound node holds its node key
 * (a pair made before node keys shows "Pair again").
 */
export interface PeerNode {
  nodeId: string
  name: string
  address: string
  machine: string | null
  account: string | null
  relation: 'own' | 'teammate' | null
  /** A sandbox the bound node created (autobyteus-581), labelled on the Nodes page. */
  sandbox: boolean
  addedAt: string
  paired: boolean
}

/** What Pair did: paired at once (with a grant), or waiting for the other owner (its request ID). */
export type PairOutcome = { state: 'paired'; peer: PeerNode } | { state: 'waiting'; requestId: string }

/**
 * The bound node's peers (one-nodes-tab AR-005: the one write path for this node's peers). Every change goes through
 * the server, which checks it; a refused change throws a `NodeSettingsError` with the server's code and details and
 * changes nothing here. The Nodes page reads `peers` to join them with the desktop's list.
 */
export const useRemoteCollaborationStore = defineStore('remoteCollaborationStore', {
  state: () => ({
    peers: [] as PeerNode[],
  }),

  actions: {
    /** Reads the peers again; a failure throws and leaves the last list as it was. */
    async load(): Promise<void> {
      this.peers = await this.query<{ peerNodes?: PeerNode[] }>(GetRemoteCollaborationSettings, {}).then((data) => data?.peerNodes ?? [])
    },

    /**
     * Pairs this node with the node at `address` (autobyteus-661 contract §3): with that node's `grant` at once (own
     * nodes, one click), otherwise a request its owner accepts. `name` is this node's name for it; `nodeId` the node
     * expected there.
     */
    async pair(input: { address: string; addresses?: string[] | null; grant?: string | null; nodeId?: string | null; name?: string | null }): Promise<PairOutcome> {
      const outcome = (await this.mutate<{ pairWithNode: { state: string; requestId: string | null; peer: PeerNode | null } }>(PairWithNode, {
        address: input.address, addresses: input.addresses ?? null, grant: input.grant ?? null, nodeId: input.nodeId ?? null, name: input.name ?? null,
      })).pairWithNode
      if (outcome.state === 'paired' && outcome.peer) {
        const paired = outcome.peer
        this.peers = [...this.peers.filter((peer) => peer.nodeId !== paired.nodeId), paired]
        return { state: 'paired', peer: paired }
      }
      return { state: 'waiting', requestId: outcome.requestId ?? '' }
    },

    async rename(nodeId: string, name: string): Promise<PeerNode> {
      return this.replace((await this.mutate<{ renamePeerNode: PeerNode }>(RenamePeerNode, { nodeId, name })).renamePeerNode)
    },

    async changeAddress(nodeId: string, address: string): Promise<PeerNode> {
      return this.replace((await this.mutate<{ changePeerAddress: PeerNode }>(ChangePeerAddress, { nodeId, address })).changePeerAddress)
    },

    /** Unpair: the other node is told when it can be reached; the pair is removed here. */
    async unpair(nodeId: string): Promise<void> {
      await this.mutate(UnpairPeerNode, { nodeId })
      this.peers = this.peers.filter((peer) => peer.nodeId !== nodeId)
    },

    replace(changed: PeerNode): PeerNode {
      this.peers = this.peers.map((peer) => (peer.nodeId === changed.nodeId ? changed : peer))
      return changed
    },

    async query<T>(query: DocumentNode, variables: Record<string, unknown>): Promise<T | undefined> {
      const { data, errors } = await getApolloClient().query<T>({
        query, variables, fetchPolicy: 'network-only', errorPolicy: 'all', context: { queryDeduplication: false },
      })
      throwSettingsErrors(errors)
      return data ?? undefined
    },

    async mutate<T>(mutation: DocumentNode, variables: Record<string, unknown>): Promise<T> {
      const { data, errors } = await getApolloClient().mutate<T>({ mutation, variables, errorPolicy: 'all' })
      throwSettingsErrors(errors)
      if (!data) throw new Error('The change was not confirmed.')
      return data
    },
  },
})
