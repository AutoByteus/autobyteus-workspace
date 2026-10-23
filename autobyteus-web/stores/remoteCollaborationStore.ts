import { defineStore } from 'pinia'
import type { DocumentNode } from 'graphql'
import { getApolloClient } from '~/utils/apolloClient'
import {
  GetPeerAddressCandidates,
  GetRemoteCollaborationSettings,
  ResolvePeerAddress,
} from '~/graphql/queries/remoteCollaborationQueries'
import { AddPeerNode, ChangePeerAddress, RemovePeerNode, RenamePeerNode } from '~/graphql/mutations/remoteCollaborationMutations'
import { throwSettingsErrors } from '~/utils/nodeSettingsError'

/** A node registered on the bound node for remote collaboration. `baseUrl` is how the bound node reaches it. */
export interface PeerNode {
  nodeId: string
  name: string
  baseUrl: string
  addedAt: string
}

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

    /** How other nodes may reach this node (its own address candidates). */
    async addressCandidates(): Promise<string[]> {
      const data = await this.query<{ peerAddressCandidates?: string[] }>(GetPeerAddressCandidates, {})
      return data?.peerAddressCandidates ?? []
    },

    /** The first of `baseUrls` at which this node reaches the node `nodeId` (this node's switch must be on). */
    async resolveAddress(nodeId: string, baseUrls: string[]): Promise<string> {
      const data = await this.query<{ resolvePeerAddress?: string }>(ResolvePeerAddress, { nodeId, baseUrls })
      if (!data?.resolvePeerAddress) throw new Error('No address was returned.')
      return data.resolvePeerAddress
    },

    async add(input: { nodeId: string; name: string; baseUrl: string }): Promise<PeerNode> {
      const added = (await this.mutate<{ addPeerNode: PeerNode }>(AddPeerNode, { input })).addPeerNode
      this.peers = [...this.peers.filter((peer) => peer.nodeId !== added.nodeId), added]
      return added
    },

    async rename(nodeId: string, name: string): Promise<PeerNode> {
      return this.replace((await this.mutate<{ renamePeerNode: PeerNode }>(RenamePeerNode, { nodeId, name })).renamePeerNode)
    },

    async changeAddress(nodeId: string, baseUrl: string): Promise<PeerNode> {
      return this.replace((await this.mutate<{ changePeerAddress: PeerNode }>(ChangePeerAddress, { nodeId, baseUrl })).changePeerAddress)
    },

    async remove(nodeId: string): Promise<void> {
      await this.mutate(RemovePeerNode, { nodeId })
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
