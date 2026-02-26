import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { DiscoveredNodeCatalogQuery } from '~/graphql/queries/nodeDiscoveryQueries'
import { useFederatedCatalogStore } from '~/stores/federatedCatalogStore'
import { useNodeStore } from '~/stores/nodeStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

export interface DiscoveredNodePeer {
  nodeId: string;
  nodeName: string;
  baseUrl: string;
  advertisedBaseUrl?: string | null;
  status: 'ready' | 'degraded' | 'unreachable';
  lastSeenAtIso: string;
  trustMode?: string | null;
  capabilities?: {
    terminal?: boolean | null;
    fileExplorerStreaming?: boolean | null;
  } | null;
}

type DiscoveredNodeCatalogQueryResult = {
  discoveredNodeCatalog: DiscoveredNodePeer[];
}

export const useNodeDiscoveryStore = defineStore('nodeDiscovery', () => {
  const nodeStore = useNodeStore()
  const windowNodeContextStore = useWindowNodeContextStore()
  const federatedCatalogStore = useFederatedCatalogStore()

  const running = ref(false)
  const lastError = ref<string | null>(null)
  const discoveredNodeIds = ref<string[]>([])
  const syncInFlight = ref(false)
  const syncIntervalMs = ref(8_000)
  let syncTimer: ReturnType<typeof setInterval> | null = null

  async function syncOnce(): Promise<void> {
    if (syncInFlight.value) {
      return
    }

    syncInFlight.value = true
    try {
      if (!nodeStore.initialized) {
        await nodeStore.initializeRegistry()
      }

      const isReady = await windowNodeContextStore.waitForBoundBackendReady({
        timeoutMs: 2_500,
        pollMs: 300,
      })
      if (!isReady) {
        throw new Error(windowNodeContextStore.lastReadyError ?? 'Bound backend is not ready')
      }

      const client = getApolloClient()
      const response = await client.query<DiscoveredNodeCatalogQueryResult>({
        query: DiscoveredNodeCatalogQuery,
        fetchPolicy: 'network-only',
      })

      const peers = Array.isArray(response.data?.discoveredNodeCatalog)
        ? response.data.discoveredNodeCatalog
        : []

      const previousIds = new Set(
        nodeStore.nodes
          .filter((node) => node.nodeType === 'remote' && node.registrationSource === 'discovered')
          .map((node) => node.id),
      )
      const currentIds = new Set<string>()
      let changed = false

      for (const peer of peers) {
        currentIds.add(peer.nodeId)
        const didChange = await nodeStore.upsertDiscoveredNode(peer)
        if (didChange) {
          changed = true
        }
      }

      const staleNodeIds: string[] = []
      for (const previousId of previousIds) {
        if (!currentIds.has(previousId)) {
          staleNodeIds.push(previousId)
        }
      }

      if (staleNodeIds.length > 0) {
        const pruned = await nodeStore.pruneDiscoveredNodes(staleNodeIds)
        if (pruned > 0) {
          changed = true
        }
      }

      discoveredNodeIds.value = Array.from(currentIds)

      if (changed) {
        await federatedCatalogStore.reloadCatalog()
      }

      lastError.value = null
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
    } finally {
      syncInFlight.value = false
    }
  }

  async function startAutoRegistration(options?: {
    intervalMs?: number;
  }): Promise<void> {
    if (running.value) {
      return
    }

    if (options?.intervalMs && options.intervalMs > 0) {
      syncIntervalMs.value = Math.floor(options.intervalMs)
    }

    running.value = true
    await syncOnce()

    syncTimer = setInterval(() => {
      void syncOnce()
    }, syncIntervalMs.value)
  }

  function stopAutoRegistration(): void {
    if (syncTimer) {
      clearInterval(syncTimer)
      syncTimer = null
    }
    running.value = false
  }

  return {
    running,
    lastError,
    discoveredNodeIds,
    syncInFlight,
    syncIntervalMs,
    startAutoRegistration,
    stopAutoRegistration,
    syncOnce,
  }
})
