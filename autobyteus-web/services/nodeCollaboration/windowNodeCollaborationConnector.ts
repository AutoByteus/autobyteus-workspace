import { useNodeStore } from '~/stores/nodeStore'
import { useRemoteCollaborationStore } from '~/stores/remoteCollaborationStore'
import { useRemoteCollaborationCapabilityStore } from '~/stores/remoteCollaborationCapabilityStore'
import { useRemoteCollaborationOffersStore } from '~/stores/remoteCollaborationOffersStore'
import { createNodeCollaborationApi } from '~/services/nodeCollaboration/nodeCollaborationApi'
import {
  createNodeCollaborationConnector,
  type NodeCollaborationConnector,
} from '~/services/nodeCollaboration/nodeCollaborationConnector'

let connector: NodeCollaborationConnector | null = null

/**
 * This window's connector (one-nodes-tab DS-003), wired to the stores that own each state (AR-005): this node's peers
 * through `remoteCollaborationStore`, its switch through the capability store, the desktop's list through `nodeStore`,
 * and the other node through its own settings API. Stateless: every plan holds its own facts.
 */
export const useNodeCollaborationConnector = (): NodeCollaborationConnector => {
  connector ??= createNodeCollaborationConnector({
    here: {
      switchOn: () => useRemoteCollaborationCapabilityStore().isEnabled,
      setSwitch: async (on) => { await useRemoteCollaborationCapabilityStore().setEnabled(on) },
      loadPeers: async () => { const store = useRemoteCollaborationStore(); await store.load(); return store.peers },
      candidates: () => useRemoteCollaborationStore().addressCandidates(),
      resolveAddress: (nodeId, baseUrls) => useRemoteCollaborationStore().resolveAddress(nodeId, baseUrls),
      addPeer: (input) => useRemoteCollaborationStore().add(input),
      renamePeer: (nodeId, name) => useRemoteCollaborationStore().rename(nodeId, name),
      removePeer: async (nodeId) => { await useRemoteCollaborationStore().remove(nodeId); useRemoteCollaborationOffersStore().forget(nodeId) },
      changePeerAddress: (nodeId, baseUrl) => useRemoteCollaborationStore().changeAddress(nodeId, baseUrl),
    },
    list: {
      rename: (entryId, name) => useNodeStore().renameNode(entryId, name),
      remove: (entryId) => useNodeStore().removeRemoteNode(entryId),
    },
    there: (windowAddress) => createNodeCollaborationApi(windowAddress),
  })
  return connector
}
