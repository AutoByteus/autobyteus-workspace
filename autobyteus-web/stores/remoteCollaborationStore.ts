import { defineStore } from 'pinia'
import type { DocumentNode } from 'graphql'
import { getApolloClient } from '~/utils/apolloClient'
import { GetRemoteCollaborationSettings } from '~/graphql/queries/remoteCollaborationQueries'
import { AddPeerNode, RemovePeerNode, RenamePeerNode } from '~/graphql/mutations/remoteCollaborationMutations'

/** A node registered on the bound node for remote collaboration. */
export interface PeerNode {
  nodeId: string
  name: string
  baseUrl: string
  addedAt: string
}

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback

const throwGraphqlErrors = (errors: ReadonlyArray<{ message: string }> | undefined): void => {
  if (errors?.length) throw new Error(errors.map((entry) => entry.message).join(', '))
}

/**
 * The bound node's peers (Nodes → Remote Collaboration). Every change goes through the
 * server, which checks it; a refused change keeps the lists unchanged and its reason in `error`.
 */
export const useRemoteCollaborationStore = defineStore('remoteCollaborationStore', {
  state: () => ({
    peers: [] as PeerNode[],
    loading: false,
    saving: false,
    error: null as string | null,
    /** Where the last error belongs, so the tab shows it next to the action that failed. */
    errorScope: null as 'load' | 'peers' | null,
  }),

  actions: {
    async load() {
      this.loading = true
      this.error = null
      this.errorScope = null
      try {
        const { data, errors } = await getApolloClient().query<{ peerNodes?: PeerNode[] }>({
          query: GetRemoteCollaborationSettings,
          fetchPolicy: 'network-only',
        })
        throwGraphqlErrors(errors)
        this.peers = data?.peerNodes ?? []
      } catch (error) {
        this.error = messageOf(error, 'Failed to load remote collaboration settings.')
        this.errorScope = 'load'
      } finally {
        this.loading = false
      }
    },

    async addPeer(input: { baseUrl: string; name: string }): Promise<boolean> {
      return this.change('peers', AddPeerNode, { input }, async () => { await this.load() })
    },

    async renamePeer(nodeId: string, name: string): Promise<boolean> {
      return this.change('peers', RenamePeerNode, { nodeId, name }, async (data) => {
        const renamed = data?.renamePeerNode as PeerNode | undefined
        if (renamed) this.peers = this.peers.map((peer) => (peer.nodeId === nodeId ? renamed : peer))
      })
    },

    async removePeer(nodeId: string): Promise<boolean> {
      return this.change('peers', RemovePeerNode, { nodeId }, async () => {
        this.peers = this.peers.filter((peer) => peer.nodeId !== nodeId)
      })
    },

    /** One server change; `true` when it was accepted. A refusal is shown as `error` and changes nothing here. */
    async change(scope: 'peers', mutation: DocumentNode, variables: Record<string, unknown>,
      apply: (data: any) => Promise<void>): Promise<boolean> {
      this.saving = true
      this.error = null
      this.errorScope = null
      try {
        const { data, errors } = await getApolloClient().mutate<any>({ mutation, variables })
        throwGraphqlErrors(errors)
        await apply(data)
        return true
      } catch (error) {
        this.error = messageOf(error, 'The change was not saved.')
        this.errorScope = scope
        return false
      } finally {
        this.saving = false
      }
    },
  },
})
