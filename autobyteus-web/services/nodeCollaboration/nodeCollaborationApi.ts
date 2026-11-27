import type { ApolloClient } from '@apollo/client/core'
import type { DocumentNode } from 'graphql'
import { GetPeerNodeAvailability, GetRemoteCollaborationSettings } from '~/graphql/queries/remoteCollaborationQueries'
import { ChangePeerAddress, CreatePairingGrant, UnpairPeerNode } from '~/graphql/mutations/remoteCollaborationMutations'
import type { PeerNode } from '~/stores/remoteCollaborationStore'
import { directNodeApolloClient } from '~/services/nodeCollaboration/directNodeApolloClient'
import { windowFailureReason, type NodeTransportReason } from '~/utils/nodeIdentityProbe'
import { NodeSettingsError, throwSettingsErrors } from '~/utils/nodeSettingsError'

/** Whether the other node admits this node now ("it → this node"), or its refusal and reason. */
export type NodeAvailability = { available: true } | { available: false; code: string; reason?: NodeTransportReason }

/**
 * The remote-collaboration settings API of another node, at the address this window reaches it (one-nodes-tab:
 * `nodeCollaborationApi`). The same operations that node's own window uses; the other node decides. A thin typed
 * boundary that owns no policy. This node is never written through it (AR-005). A request this window could not
 * deliver is a `NodeSettingsError` `PEER_UNREACHABLE` with the window's reason and the node's address.
 */
export interface NodeCollaborationApi {
  peers(): Promise<PeerNode[]>
  /** autobyteus-661 contract §3: that node's one-time grant for one pair from a node this app controls (`own`). */
  createGrant(input: { nameForAsker: string }): Promise<{ grant: string; expiresAt: string }>
  /** Unpair on that node: it tells this node when it can reach it, and removes the pair there. */
  unpairPeer(nodeId: string): Promise<void>
  changePeerAddress(nodeId: string, address: string): Promise<PeerNode>
  peerNodeAvailability(nodeId: string): Promise<NodeAvailability>
}

export const createNodeCollaborationApi = (
  baseUrl: string,
  client: Pick<ApolloClient<unknown>, 'query' | 'mutate'> = directNodeApolloClient(baseUrl),
): NodeCollaborationApi => {
  const deliver = async <T>(send: () => Promise<{ data?: T | null; errors?: ReadonlyArray<{ message: string; extensions?: any }> }>): Promise<T> => {
    let answer: Awaited<ReturnType<typeof send>>
    try {
      answer = await send()
    } catch (error) {
      const graphQLErrors = (error as { graphQLErrors?: ReadonlyArray<{ message: string; extensions?: any }> } | null)?.graphQLErrors
      if (graphQLErrors?.length) throwSettingsErrors(graphQLErrors)
      throw new NodeSettingsError({ code: 'PEER_UNREACHABLE', message: `${baseUrl} could not be reached.`,
        reason: windowFailureReason((error as { networkError?: unknown })?.networkError ?? error, baseUrl), address: baseUrl })
    }
    throwSettingsErrors(answer.errors)
    if (!answer.data) throw new NodeSettingsError({ code: 'REMOTE_COLLABORATION_SETTINGS_FAILED', message: `${baseUrl} answered without a result.` })
    return answer.data
  }
  const query = <T>(document: DocumentNode, variables: Record<string, unknown> = {}) =>
    deliver<T>(() => client.query<T>({ query: document, variables, fetchPolicy: 'no-cache', errorPolicy: 'all', context: { queryDeduplication: false } }))
  const mutate = <T>(document: DocumentNode, variables: Record<string, unknown>) =>
    deliver<T>(() => client.mutate<T>({ mutation: document, variables, errorPolicy: 'all' }) as never)

  return {
    peers: async () => (await query<{ peerNodes: PeerNode[] }>(GetRemoteCollaborationSettings)).peerNodes,
    createGrant: async ({ nameForAsker }) => (await mutate<{ createPairingGrant: { grant: string; expiresAt: string } }>(CreatePairingGrant,
      { relation: 'own', forMachine: null, nameForAsker })).createPairingGrant,
    unpairPeer: async (nodeId) => { await mutate(UnpairPeerNode, { nodeId }) },
    changePeerAddress: async (nodeId, address) => (await mutate<{ changePeerAddress: PeerNode }>(ChangePeerAddress, { nodeId, address })).changePeerAddress,
    peerNodeAvailability: async (nodeId) => {
      const answer = (await query<{ peerNodeAvailability: { available: boolean; refusalCode: string | null; unreachableReason: string | null } }>(
        GetPeerNodeAvailability, { nodeId })).peerNodeAvailability
      if (answer.available) return { available: true }
      const reason = answer.unreachableReason
      return { available: false, code: answer.refusalCode ?? 'PEER_UNREACHABLE',
        ...(reason === 'refused' || reason === 'timeout' || reason === 'not_found' || reason === 'unreachable' ? { reason } : {}) }
    },
  }
}
