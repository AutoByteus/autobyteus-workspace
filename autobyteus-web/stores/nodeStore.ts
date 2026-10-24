import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  EMBEDDED_ENTRY_ID,
  NODE_REGISTRY_STORAGE_KEY,
  isNodeId,
  type NodeEntry,
  type NodeRegistryChange,
  type NodeRegistrySnapshot,
} from '~/types/node';
import { getBrowserServerBaseUrl } from '~/utils/browserServerConfig';
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints';

function nowIsoString(): string {
  return new Date().toISOString();
}

function createEmbeddedEntry(baseUrl: string): NodeEntry {
  const now = nowIsoString();
  return {
    id: EMBEDDED_ENTRY_ID,
    name: 'Embedded Node',
    baseUrl,
    nodeType: 'embedded',
    createdAt: now,
    updatedAt: now,
  };
}

function createDefaultSnapshot(baseUrl: string): NodeRegistrySnapshot {
  return {
    version: 1,
    nodes: [createEmbeddedEntry(baseUrl)],
  };
}

function generateRemoteEntryId(): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId ? `remote-${randomId}` : `remote-${Date.now()}`;
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readLocalRegistrySnapshot(): NodeRegistrySnapshot | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(NODE_REGISTRY_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as NodeRegistrySnapshot;
    if (!Array.isArray(parsed?.nodes) || typeof parsed?.version !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const useNodeStore = defineStore('nodeStore', () => {
  const registryVersion = ref<number>(0);
  const nodes = ref<NodeEntry[]>([]);
  const listenerCleanup = ref<(() => void) | null>(null);
  const initialized = ref(false);
  const lastError = ref<string | null>(null);

  const entryMap = computed(() => {
    const map = new Map<string, NodeEntry>();
    for (const node of nodes.value) {
      map.set(node.id, node);
    }
    return map;
  });

  const remoteNodes = computed(() => nodes.value.filter((node) => node.nodeType === 'remote'));

  function replaceSnapshot(snapshot: NodeRegistrySnapshot): void {
    registryVersion.value = snapshot.version;
    nodes.value = snapshot.nodes;
  }

  function persistSnapshotToLocalStorage(snapshot: NodeRegistrySnapshot): void {
    if (!canUseLocalStorage()) {
      return;
    }
    try {
      window.localStorage.setItem(NODE_REGISTRY_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Best-effort persistence only.
    }
  }

  function persistCurrentSnapshotToLocalStorage(): void {
    persistSnapshotToLocalStorage({
      version: registryVersion.value,
      nodes: nodes.value,
    });
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

  function ensureBrowserEmbeddedNodePresent(): void {
    const desiredBaseUrl = getBrowserServerBaseUrl();
    const existingEmbeddedIndex = nodes.value.findIndex((node) => node.id === EMBEDDED_ENTRY_ID);

    if (existingEmbeddedIndex === -1) {
      const embedded = createEmbeddedEntry(desiredBaseUrl);
      nodes.value = [embedded, ...nodes.value];
      registryVersion.value += 1;
      if (!window.electronAPI?.getNodeRegistrySnapshot) {
        persistCurrentSnapshotToLocalStorage();
      }
      return;
    }

    const existingEmbedded = nodes.value[existingEmbeddedIndex];
    if (normalizeNodeBaseUrl(existingEmbedded.baseUrl) !== desiredBaseUrl) {
      const updatedEmbedded: NodeEntry = {
        ...existingEmbedded,
        baseUrl: desiredBaseUrl,
        updatedAt: nowIsoString(),
      };
      nodes.value = nodes.value.map((node, index) =>
        index === existingEmbeddedIndex ? updatedEmbedded : node,
      );
      registryVersion.value += 1;
      if (!window.electronAPI?.getNodeRegistrySnapshot) {
        persistCurrentSnapshotToLocalStorage();
      }
    }
  }

  async function initializeRegistry(): Promise<void> {
    if (initialized.value) {
      return;
    }

    lastError.value = null;

    if (!window.electronAPI?.getNodeRegistrySnapshot) {
      const fallbackSnapshot = readLocalRegistrySnapshot() ?? createDefaultSnapshot(getBrowserServerBaseUrl());
      replaceSnapshot(fallbackSnapshot);
      ensureBrowserEmbeddedNodePresent();
      persistCurrentSnapshotToLocalStorage();
      initialized.value = true;
      return;
    }

    try {
      const snapshot = await window.electronAPI.getNodeRegistrySnapshot();
      replaceSnapshot(snapshot);
      const embeddedNode = entryMap.value.get(EMBEDDED_ENTRY_ID);
      if (!embeddedNode?.baseUrl?.trim()) {
        throw new Error('Electron node registry did not provide an embedded client base URL.');
      }
      initialized.value = true;

      if (window.electronAPI.onNodeRegistryUpdated && !listenerCleanup.value) {
        listenerCleanup.value = window.electronAPI.onNodeRegistryUpdated((nextSnapshot) => {
          applyRegistrySnapshot(nextSnapshot);
        });
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  function getEntryById(entryId: string): NodeEntry | null {
    return entryMap.value.get(entryId) || null;
  }

  function getEntryBaseUrl(entryId: string): string | null {
    return getEntryById(entryId)?.baseUrl || null;
  }

  async function upsertRegistry(change: NodeRegistryChange): Promise<NodeRegistrySnapshot> {
    if (!window.electronAPI?.upsertNodeRegistry) {
      throw new Error('Node registry update is only supported in Electron runtime.');
    }
    const snapshot = await window.electronAPI.upsertNodeRegistry(change);
    applyRegistrySnapshot(snapshot);
    return snapshot;
  }

  /**
   * Adds a node to this desktop's list, with its node ID when this window has reached it. Adding does not open the
   * node's window (one-nodes-tab SR-006); Open does.
   */
  async function addRemoteNode(input: {
    name: string;
    baseUrl: string;
    nodeId?: string;
  }): Promise<NodeEntry> {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error('Node name is required');
    }

    const normalizedBaseUrl = normalizeNodeBaseUrl(input.baseUrl);
    if (
      nodes.value.some(
        (node) => normalizeNodeBaseUrl(node.baseUrl).toLowerCase() === normalizedBaseUrl.toLowerCase(),
      )
    ) {
      throw new Error('Node with the same base URL already exists');
    }

    const now = nowIsoString();
    const node: NodeEntry = {
      id: generateRemoteEntryId(),
      name: trimmedName,
      baseUrl: normalizedBaseUrl,
      nodeType: 'remote',
      createdAt: now,
      updatedAt: now,
      ...(isNodeId(input.nodeId) ? { nodeId: input.nodeId } : {}),
    };

    if (window.electronAPI) {
      await upsertRegistry({ type: 'add', node });
      return getEntryById(node.id) || node;
    }

    nodes.value = [...nodes.value, node];
    registryVersion.value += 1;
    persistCurrentSnapshotToLocalStorage();
    return node;
  }

  async function removeRemoteNode(entryId: string): Promise<void> {
    if (entryId === EMBEDDED_ENTRY_ID) {
      throw new Error('Embedded node cannot be removed');
    }

    if (window.electronAPI) {
      await upsertRegistry({
        type: 'remove',
        entryId,
      });
      return;
    }

    nodes.value = nodes.value.filter((node) => node.id !== entryId);
    registryVersion.value += 1;
    persistCurrentSnapshotToLocalStorage();
  }

  async function renameNode(entryId: string, nextName: string): Promise<void> {
    const trimmedName = nextName.trim();
    if (!trimmedName) {
      throw new Error('Node name is required');
    }

    if (window.electronAPI) {
      await upsertRegistry({
        type: 'rename',
        entryId,
        name: trimmedName,
      });
      return;
    }

    nodes.value = nodes.value.map((node) => {
      if (node.id !== entryId) {
        return node;
      }
      return {
        ...node,
        name: trimmedName,
        updatedAt: nowIsoString(),
      };
    });
    registryVersion.value += 1;
    persistCurrentSnapshotToLocalStorage();
  }

  /**
   * Stores the node ID that the entry's own address answered (one-nodes-tab AR-003): set, or replaced when it
   * differs; nothing is written when it is the same.
   */
  async function identifyNode(entryId: string, nodeId: string): Promise<void> {
    const entry = getEntryById(entryId);
    if (!entry || entry.nodeId === nodeId || !isNodeId(nodeId)) {
      return;
    }

    if (window.electronAPI) {
      await upsertRegistry({ type: 'identify', entryId, nodeId });
      return;
    }

    nodes.value = nodes.value.map((candidate) => (
      candidate.id === entryId ? { ...candidate, nodeId, updatedAt: nowIsoString() } : candidate
    ));
    registryVersion.value += 1;
    persistCurrentSnapshotToLocalStorage();
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
    getEntryById,
    getEntryBaseUrl,
    addRemoteNode,
    removeRemoteNode,
    renameNode,
    identifyNode,
    teardownRegistryListener,
  };
});
