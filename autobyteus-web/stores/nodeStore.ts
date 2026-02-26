import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  EMBEDDED_NODE_ID,
  type NodeProfile,
  type NodeRegistryChange,
  type NodeRegistrySnapshot,
} from '~/types/node';
import { INTERNAL_SERVER_PORT } from '~/utils/serverConfig';
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints';
import { resolveRemoteNodeIdentity } from '~/utils/remoteNodeIdentityResolver';

function nowIsoString(): string {
  return new Date().toISOString();
}

function resolveDefaultEmbeddedBaseUrl(): string {
  const electronBaseUrl = `http://localhost:${INTERNAL_SERVER_PORT}`;
  if (typeof window !== 'undefined' && window.electronAPI) {
    return electronBaseUrl;
  }

  try {
    const config = useRuntimeConfig();
    const configuredBaseUrl = config.public.defaultNodeBaseUrl;
    if (typeof configuredBaseUrl === 'string' && configuredBaseUrl.trim()) {
      return normalizeNodeBaseUrl(configuredBaseUrl);
    }
  } catch {
    // Non-Nuxt contexts (unit tests) can fall back to the embedded default.
  }

  return electronBaseUrl;
}

function createEmbeddedNode(baseUrl: string): NodeProfile {
  const now = nowIsoString();
  return {
    id: EMBEDDED_NODE_ID,
    name: 'Embedded Node',
    baseUrl,
    nodeType: 'embedded',
    registrationSource: 'embedded',
    capabilities: {
      terminal: true,
      fileExplorerStreaming: true,
    },
    capabilityProbeState: 'ready',
    isSystem: true,
    createdAt: now,
    updatedAt: now,
  };
}

function createDefaultSnapshot(baseUrl: string): NodeRegistrySnapshot {
  return {
    version: 1,
    nodes: [createEmbeddedNode(baseUrl)],
  };
}

export const useNodeStore = defineStore('nodeStore', () => {
  const registryVersion = ref<number>(0);
  const nodes = ref<NodeProfile[]>([]);
  const listenerCleanup = ref<(() => void) | null>(null);
  const initialized = ref(false);
  const lastError = ref<string | null>(null);

  const nodeMap = computed(() => {
    const map = new Map<string, NodeProfile>();
    for (const node of nodes.value) {
      map.set(node.id, node);
    }
    return map;
  });

  const remoteNodes = computed(() => nodes.value.filter((node) => node.nodeType === 'remote'));

  function resolveProbeStateFromDiscoveryStatus(status: string): NodeProfile['capabilityProbeState'] {
    return status === 'ready' ? 'ready' : 'degraded';
  }

  function replaceSnapshot(snapshot: NodeRegistrySnapshot): void {
    registryVersion.value = snapshot.version;
    nodes.value = snapshot.nodes;
  }

  function applyRegistrySnapshot(snapshot: NodeRegistrySnapshot): boolean {
    if (!initialized.value) {
      replaceSnapshot(snapshot);
      initialized.value = true;
      return true;
    }

    if (snapshot.version <= registryVersion.value) {
      return false;
    }

    replaceSnapshot(snapshot);
    return true;
  }

  function ensureEmbeddedNodePresent(): void {
    if (!nodes.value.some((node) => node.id === EMBEDDED_NODE_ID)) {
      const embedded = createEmbeddedNode(resolveDefaultEmbeddedBaseUrl());
      nodes.value = [embedded, ...nodes.value];
      registryVersion.value += 1;
    }
  }

  async function initializeRegistry(): Promise<void> {
    if (initialized.value) {
      return;
    }

    lastError.value = null;

    if (!window.electronAPI?.getNodeRegistrySnapshot) {
      replaceSnapshot(createDefaultSnapshot(resolveDefaultEmbeddedBaseUrl()));
      ensureEmbeddedNodePresent();
      initialized.value = true;
      return;
    }

    try {
      const snapshot = await window.electronAPI.getNodeRegistrySnapshot();
      replaceSnapshot(snapshot);
      ensureEmbeddedNodePresent();
      initialized.value = true;

      if (window.electronAPI.onNodeRegistryUpdated && !listenerCleanup.value) {
        listenerCleanup.value = window.electronAPI.onNodeRegistryUpdated((nextSnapshot) => {
          applyRegistrySnapshot(nextSnapshot);
        });
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
      replaceSnapshot(createDefaultSnapshot(resolveDefaultEmbeddedBaseUrl()));
      initialized.value = true;
    }
  }

  function getNodeById(nodeId: string): NodeProfile | null {
    return nodeMap.value.get(nodeId) || null;
  }

  function getNodeBaseUrl(nodeId: string): string | null {
    return getNodeById(nodeId)?.baseUrl || null;
  }

  async function ensureNodeWindowReady(nodeId: string): Promise<{ windowId: number; created: boolean }> {
    const node = getNodeById(nodeId);
    if (!node) {
      throw new Error(`Node '${nodeId}' is not configured.`);
    }
    if (!window.electronAPI?.openNodeWindow) {
      throw new Error('Node window control is only supported in Electron runtime.');
    }
    return await window.electronAPI.openNodeWindow(nodeId);
  }

  async function upsertRegistry(change: NodeRegistryChange): Promise<NodeRegistrySnapshot> {
    if (!window.electronAPI?.upsertNodeRegistry) {
      throw new Error('Node registry update is only supported in Electron runtime.');
    }
    const snapshot = await window.electronAPI.upsertNodeRegistry(change);
    applyRegistrySnapshot(snapshot);
    return snapshot;
  }

  async function addRemoteNode(input: {
    name: string;
    baseUrl: string;
    capabilities?: NodeProfile['capabilities'];
    capabilityProbeState?: NodeProfile['capabilityProbeState'];
  }): Promise<NodeProfile> {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error('Node name is required');
    }

    const normalizedBaseUrl = normalizeNodeBaseUrl(input.baseUrl);
    const resolvedIdentity = await resolveRemoteNodeIdentity(normalizedBaseUrl);

    const existingById = getNodeById(resolvedIdentity.nodeId);
    if (existingById) {
      if (normalizeNodeBaseUrl(existingById.baseUrl).toLowerCase() !== normalizedBaseUrl.toLowerCase()) {
        throw new Error('REMOTE_IDENTITY_CONFLICT: canonical node ID maps to a different base URL');
      }
      throw new Error('Node is already configured');
    }

    if (nodes.value.some((node) => normalizeNodeBaseUrl(node.baseUrl).toLowerCase() === normalizedBaseUrl.toLowerCase())) {
      throw new Error('Node with the same base URL already exists');
    }

    const now = nowIsoString();
    const node: NodeProfile = {
      id: resolvedIdentity.nodeId,
      name: trimmedName,
      baseUrl: normalizedBaseUrl,
      nodeType: 'remote',
      registrationSource: 'manual',
      isSystem: false,
      createdAt: now,
      updatedAt: now,
      capabilityProbeState: input.capabilityProbeState ?? 'unknown',
      capabilities: input.capabilities,
    };

    if (window.electronAPI) {
      await upsertRegistry({ type: 'add', node });
      await window.electronAPI.openNodeWindow?.(node.id);
      return getNodeById(node.id) || node;
    }

    nodes.value = [...nodes.value, node];
    registryVersion.value += 1;
    return node;
  }

  async function upsertDiscoveredNode(peer: {
    nodeId: string;
    nodeName: string;
    baseUrl: string;
    status: string;
    capabilities?: {
      terminal?: boolean | null;
      fileExplorerStreaming?: boolean | null;
    } | null;
  }): Promise<boolean> {
    if (!peer.nodeId || peer.nodeId === EMBEDDED_NODE_ID) {
      return false;
    }

    const normalizedBaseUrl = normalizeNodeBaseUrl(peer.baseUrl);
    const nextCapabilityProbeState = resolveProbeStateFromDiscoveryStatus(peer.status);
    const nextCapabilities =
      peer.capabilities && typeof peer.capabilities === 'object'
        ? {
          terminal: peer.capabilities.terminal !== false,
          fileExplorerStreaming: peer.capabilities.fileExplorerStreaming !== false,
        }
        : undefined;

    const existingById = getNodeById(peer.nodeId);
    if (existingById) {
      if (normalizeNodeBaseUrl(existingById.baseUrl).toLowerCase() !== normalizedBaseUrl.toLowerCase()) {
        throw new Error('REMOTE_IDENTITY_CONFLICT: discovered peer id maps to a different base URL');
      }

      if (window.electronAPI?.getNodeRegistrySnapshot) {
        await upsertRegistry({
          type: 'upsert_discovered',
          node: {
            ...existingById,
            name: peer.nodeName || existingById.name,
            baseUrl: normalizedBaseUrl,
            nodeType: 'remote',
            registrationSource: existingById.registrationSource ?? 'discovered',
            isSystem: false,
            updatedAt: nowIsoString(),
            capabilityProbeState: nextCapabilityProbeState,
            capabilities: nextCapabilities ?? existingById.capabilities,
          },
        });
        return true;
      } else {
        let changed = false;
        const nextNodes = nodes.value.map((node) => {
          if (node.id !== peer.nodeId) {
            return node;
          }
          if (node.registrationSource === 'manual') {
            if (node.capabilityProbeState === nextCapabilityProbeState) {
              return node;
            }
            changed = true;
            return {
              ...node,
              capabilityProbeState: nextCapabilityProbeState,
              updatedAt: nowIsoString(),
            };
          }

          const nextName = peer.nodeName || node.name;
          const nextRegistrationSource = node.registrationSource ?? 'discovered';
          const hasChanged =
            node.name !== nextName ||
            node.capabilityProbeState !== nextCapabilityProbeState ||
            node.registrationSource !== nextRegistrationSource;
          if (!hasChanged) {
            return node;
          }
          changed = true;
          return {
            ...node,
            name: nextName,
            capabilityProbeState: nextCapabilityProbeState,
            registrationSource: nextRegistrationSource,
            updatedAt: nowIsoString(),
          };
        });
        if (changed) {
          nodes.value = nextNodes;
          registryVersion.value += 1;
        }
        return changed;
      }
    }

    const existingByBase = nodes.value.find(
      (node) => normalizeNodeBaseUrl(node.baseUrl).toLowerCase() === normalizedBaseUrl.toLowerCase(),
    );
    if (existingByBase) {
      throw new Error('REMOTE_IDENTITY_CONFLICT: discovered peer base URL maps to a different node ID');
    }

    const now = nowIsoString();
    const discoveredNode: NodeProfile = {
      id: peer.nodeId,
      name: peer.nodeName || peer.nodeId,
      baseUrl: normalizedBaseUrl,
      nodeType: 'remote',
      registrationSource: 'discovered',
      isSystem: false,
      createdAt: now,
      updatedAt: now,
      capabilityProbeState: nextCapabilityProbeState,
      capabilities: nextCapabilities,
    };

    if (window.electronAPI) {
      await upsertRegistry({ type: 'upsert_discovered', node: discoveredNode });
      return true;
    }

    nodes.value = [...nodes.value, discoveredNode];
    registryVersion.value += 1;
    return true;
  }

  async function pruneDiscoveredNodes(nodeIds: string[]): Promise<number> {
    let removedCount = 0;

    for (const nodeId of nodeIds) {
      const node = getNodeById(nodeId);
      if (!node || node.nodeType !== 'remote' || node.registrationSource !== 'discovered') {
        continue;
      }

      if (window.electronAPI) {
        try {
          await upsertRegistry({
            type: 'remove',
            nodeId,
          });
          removedCount += 1;
        } catch {
          // Ignore stale/remove races.
        }
        continue;
      }

      nodes.value = nodes.value.filter((entry) => entry.id !== nodeId);
      removedCount += 1;
    }

    if (!window.electronAPI && removedCount > 0) {
      registryVersion.value += 1;
    }

    return removedCount;
  }

  async function removeRemoteNode(nodeId: string): Promise<void> {
    if (nodeId === EMBEDDED_NODE_ID) {
      throw new Error('Embedded node cannot be removed');
    }

    if (window.electronAPI) {
      await upsertRegistry({
        type: 'remove',
        nodeId,
      });
      return;
    }

    nodes.value = nodes.value.filter((node) => node.id !== nodeId);
    registryVersion.value += 1;
  }

  async function renameNode(nodeId: string, nextName: string): Promise<void> {
    const trimmedName = nextName.trim();
    if (!trimmedName) {
      throw new Error('Node name is required');
    }

    if (window.electronAPI) {
      await upsertRegistry({
        type: 'rename',
        nodeId,
        name: trimmedName,
      });
      return;
    }

    nodes.value = nodes.value.map((node) => {
      if (node.id !== nodeId) {
        return node;
      }
      return {
        ...node,
        name: trimmedName,
        updatedAt: nowIsoString(),
      };
    });
    registryVersion.value += 1;
  }

  function teardownRegistryListener(): void {
    listenerCleanup.value?.();
    listenerCleanup.value = null;
  }

  return {
    registryVersion,
    nodes,
    initialized,
    lastError,
    remoteNodes,
    applyRegistrySnapshot,
    initializeRegistry,
    getNodeById,
    getNodeBaseUrl,
    ensureNodeWindowReady,
    addRemoteNode,
    upsertDiscoveredNode,
    pruneDiscoveredNodes,
    removeRemoteNode,
    renameNode,
    teardownRegistryListener,
  };
});
