import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { EMBEDDED_NODE_ID, type NodeRegistrySnapshot } from '~/types/node';
import { useNodeStore } from '../nodeStore';

function setElectronApiMock(mock: Partial<Window['electronAPI']> | null): void {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    writable: true,
    value: mock,
  });
}

function createStorageMock() {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key(index: number): string | null {
      return Array.from(data.keys())[index] ?? null;
    },
    getItem(key: string): string | null {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      data.set(key, String(value));
    },
    removeItem(key: string): void {
      data.delete(key);
    },
    clear(): void {
      data.clear();
    },
  };
}

function clearLocalStorage(): void {
  const storage = window.localStorage as unknown as {
    clear?: () => void;
    key?: (index: number) => string | null;
    length?: number;
    removeItem?: (key: string) => void;
  };

  if (!storage) {
    return;
  }

  if (typeof storage.clear === 'function') {
    storage.clear();
    return;
  }

  if (typeof storage.key === 'function' && typeof storage.removeItem === 'function') {
    const keys: string[] = [];
    const length = storage.length ?? 0;
    for (let index = 0; index < length; index += 1) {
      const key = storage.key(index);
      if (key) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      storage.removeItem(key);
    }
  }
}

describe('nodeStore', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: createStorageMock(),
    });
    setActivePinia(createPinia());
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(async (input: string | URL) => {
        const url = String(input);
        const baseUrl = url.replace('/rest/node-discovery/self', '');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            nodeId: `node-${baseUrl.replace(/[^a-zA-Z0-9]/g, '_')}`,
            nodeName: 'Resolved Remote Node',
            baseUrl,
          }),
        };
      }),
    });
    setElectronApiMock(null);
    clearLocalStorage();
  });

  it('initializes with embedded node when electron bridge is unavailable', async () => {
    const store = useNodeStore();
    await store.initializeRegistry();

    expect(store.initialized).toBe(true);
    expect(store.nodes).toHaveLength(1);
    expect(store.nodes[0].id).toBe(EMBEDDED_NODE_ID);
    expect(store.nodes[0].nodeType).toBe('embedded');
  });

  it('ignores localStorage snapshot in browser fallback mode', async () => {
    const snapshot: NodeRegistrySnapshot = {
      version: 3,
      nodes: [
        {
          id: EMBEDDED_NODE_ID,
          name: 'Embedded Node',
          baseUrl: 'http://localhost:29695',
          nodeType: 'embedded',
          isSystem: true,
          createdAt: '2026-02-08T00:00:00.000Z',
          updatedAt: '2026-02-08T00:00:00.000Z',
          capabilityProbeState: 'ready',
          capabilities: { terminal: true, fileExplorerStreaming: true },
        },
        {
          id: 'remote-1',
          name: 'Remote One',
          baseUrl: 'http://localhost:8001',
          nodeType: 'remote',
          isSystem: false,
          createdAt: '2026-02-08T00:00:00.000Z',
          updatedAt: '2026-02-08T00:00:00.000Z',
          capabilityProbeState: 'ready',
          capabilities: { terminal: true, fileExplorerStreaming: true },
        },
      ],
    };
    window.localStorage.setItem('autobyteus.node_registry.v1', JSON.stringify(snapshot));

    const store = useNodeStore();
    await store.initializeRegistry();

    expect(store.registryVersion).toBe(1);
    expect(store.nodes).toHaveLength(1);
    expect(store.getNodeById('remote-1')).toBeNull();
  });

  it('applies only newer registry snapshots', async () => {
    const store = useNodeStore();

    const freshSnapshot: NodeRegistrySnapshot = {
      version: 5,
      nodes: [
        {
          id: EMBEDDED_NODE_ID,
          name: 'Embedded Node',
          baseUrl: 'http://localhost:29695',
          nodeType: 'embedded',
          isSystem: true,
          createdAt: '2026-02-08T00:00:00.000Z',
          updatedAt: '2026-02-08T00:00:00.000Z',
          capabilityProbeState: 'ready',
          capabilities: { terminal: true, fileExplorerStreaming: true },
        },
      ],
    };

    const appliedFresh = store.applyRegistrySnapshot(freshSnapshot);
    const appliedStale = store.applyRegistrySnapshot({ ...freshSnapshot, version: 4 });

    expect(appliedFresh).toBe(true);
    expect(appliedStale).toBe(false);
    expect(store.registryVersion).toBe(5);
  });

  it('initializes from electron snapshot and subscribes to updates', async () => {
    const onRegistryUpdated = vi.fn().mockImplementation((callback: (snapshot: NodeRegistrySnapshot) => void) => {
      callback({
        version: 9,
        nodes: [
          {
            id: EMBEDDED_NODE_ID,
            name: 'Embedded Node',
            baseUrl: 'http://localhost:29695',
            nodeType: 'embedded',
            isSystem: true,
            createdAt: '2026-02-08T00:00:00.000Z',
            updatedAt: '2026-02-08T00:00:00.000Z',
            capabilityProbeState: 'ready',
            capabilities: { terminal: true, fileExplorerStreaming: true },
          },
        ],
      });
      return vi.fn();
    });

    setElectronApiMock({
      getNodeRegistrySnapshot: vi.fn().mockResolvedValue({
        version: 3,
        nodes: [
          {
            id: EMBEDDED_NODE_ID,
            name: 'Embedded Node',
            baseUrl: 'http://localhost:29695',
            nodeType: 'embedded',
            isSystem: true,
            createdAt: '2026-02-08T00:00:00.000Z',
            updatedAt: '2026-02-08T00:00:00.000Z',
            capabilityProbeState: 'ready',
            capabilities: { terminal: true, fileExplorerStreaming: true },
          },
        ],
      }),
      onNodeRegistryUpdated: onRegistryUpdated,
    });

    const store = useNodeStore();
    await store.initializeRegistry();

    expect(store.registryVersion).toBe(9);
    expect(onRegistryUpdated).toHaveBeenCalledTimes(1);
  });

  it('adds remote node through electron upsert and opens node window', async () => {
    const upsertNodeRegistry = vi.fn().mockImplementation(async (change) => {
      return {
        version: 2,
        nodes: [
          {
            id: EMBEDDED_NODE_ID,
            name: 'Embedded Node',
            baseUrl: 'http://localhost:29695',
            nodeType: 'embedded',
            isSystem: true,
            createdAt: '2026-02-08T00:00:00.000Z',
            updatedAt: '2026-02-08T00:00:00.000Z',
            capabilityProbeState: 'ready',
            capabilities: { terminal: true, fileExplorerStreaming: true },
          },
          change.node,
        ],
      } satisfies NodeRegistrySnapshot;
    });
    const openNodeWindow = vi.fn().mockResolvedValue({ windowId: 101, created: true });

    setElectronApiMock({
      getNodeRegistrySnapshot: vi.fn().mockResolvedValue({
        version: 1,
        nodes: [
          {
            id: EMBEDDED_NODE_ID,
            name: 'Embedded Node',
            baseUrl: 'http://localhost:29695',
            nodeType: 'embedded',
            isSystem: true,
            createdAt: '2026-02-08T00:00:00.000Z',
            updatedAt: '2026-02-08T00:00:00.000Z',
            capabilityProbeState: 'ready',
            capabilities: { terminal: true, fileExplorerStreaming: true },
          },
        ],
      }),
      onNodeRegistryUpdated: vi.fn().mockReturnValue(vi.fn()),
      upsertNodeRegistry,
      openNodeWindow,
    });

    const store = useNodeStore();
    await store.initializeRegistry();

    const added = await store.addRemoteNode({
      name: 'Docker Node',
      baseUrl: 'http://localhost:8000',
      capabilities: {
        terminal: false,
        fileExplorerStreaming: false,
      },
      capabilityProbeState: 'degraded',
    });

    expect(added.nodeType).toBe('remote');
    expect(added.capabilities).toEqual({
      terminal: false,
      fileExplorerStreaming: false,
    });
    expect(added.capabilityProbeState).toBe('degraded');
    expect(upsertNodeRegistry).toHaveBeenCalledTimes(1);
    expect(openNodeWindow).toHaveBeenCalledWith(added.id);
  });

  it('upserts discovered peer via electron registry path for existing node ids', async () => {
    const upsertNodeRegistry = vi.fn().mockResolvedValue({
      version: 2,
      nodes: [
        {
          id: EMBEDDED_NODE_ID,
          name: 'Embedded Node',
          baseUrl: 'http://localhost:29695',
          nodeType: 'embedded',
          registrationSource: 'embedded',
          isSystem: true,
          createdAt: '2026-02-08T00:00:00.000Z',
          updatedAt: '2026-02-08T00:00:00.000Z',
          capabilityProbeState: 'ready',
          capabilities: { terminal: true, fileExplorerStreaming: true },
        },
        {
          id: 'remote-manual',
          name: 'Manual Node',
          baseUrl: 'http://localhost:8000',
          nodeType: 'remote',
          registrationSource: 'manual',
          isSystem: false,
          createdAt: '2026-02-08T00:00:00.000Z',
          updatedAt: '2026-02-08T00:00:00.000Z',
          capabilityProbeState: 'degraded',
          capabilities: { terminal: true, fileExplorerStreaming: true },
        },
      ],
    } satisfies NodeRegistrySnapshot);

    setElectronApiMock({
      getNodeRegistrySnapshot: vi.fn().mockResolvedValue({
        version: 1,
        nodes: [
          {
            id: EMBEDDED_NODE_ID,
            name: 'Embedded Node',
            baseUrl: 'http://localhost:29695',
            nodeType: 'embedded',
            registrationSource: 'embedded',
            isSystem: true,
            createdAt: '2026-02-08T00:00:00.000Z',
            updatedAt: '2026-02-08T00:00:00.000Z',
            capabilityProbeState: 'ready',
            capabilities: { terminal: true, fileExplorerStreaming: true },
          },
          {
            id: 'remote-manual',
            name: 'Manual Node',
            baseUrl: 'http://localhost:8000',
            nodeType: 'remote',
            registrationSource: 'manual',
            isSystem: false,
            createdAt: '2026-02-08T00:00:00.000Z',
            updatedAt: '2026-02-08T00:00:00.000Z',
            capabilityProbeState: 'ready',
            capabilities: { terminal: true, fileExplorerStreaming: true },
          },
        ],
      }),
      onNodeRegistryUpdated: vi.fn().mockReturnValue(vi.fn()),
      upsertNodeRegistry,
    });

    const store = useNodeStore();
    await store.initializeRegistry();

    const changed = await store.upsertDiscoveredNode({
      nodeId: 'remote-manual',
      nodeName: 'Discovered Name Should Not Override Manual',
      baseUrl: 'http://localhost:8000',
      status: 'degraded',
      capabilities: {
        terminal: true,
        fileExplorerStreaming: true,
      },
    });

    expect(changed).toBe(true);
    expect(upsertNodeRegistry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'upsert_discovered',
      }),
    );
    expect(store.getNodeById('remote-manual')?.name).toBe('Manual Node');
    expect(store.getNodeById('remote-manual')?.capabilityProbeState).toBe('degraded');
  });

  it('rejects discovered baseUrl collisions with different node ids', async () => {
    const store = useNodeStore();
    await store.initializeRegistry();

    await store.addRemoteNode({
      name: 'Manual Node',
      baseUrl: 'http://localhost:8011',
    });

    await expect(
      store.upsertDiscoveredNode({
        nodeId: 'discovered-other-id',
        nodeName: 'Discovered Other',
        baseUrl: 'http://localhost:8011',
        status: 'ready',
      }),
    ).rejects.toThrow('REMOTE_IDENTITY_CONFLICT: discovered peer base URL maps to a different node ID');
  });

  it('rejects removing embedded node', async () => {
    const store = useNodeStore();
    await store.initializeRegistry();

    await expect(store.removeRemoteNode(EMBEDDED_NODE_ID)).rejects.toThrow(
      'Embedded node cannot be removed',
    );
  });

  it('keeps non-electron node changes in memory during session', async () => {
    const store = useNodeStore();
    await store.initializeRegistry();

    const added = await store.addRemoteNode({
      name: 'Docker Node',
      baseUrl: 'http://localhost:8010',
    });
    await store.renameNode(added.id, 'Docker Node Renamed');

    expect(store.getNodeById(added.id)?.name).toBe('Docker Node Renamed');

    await store.removeRemoteNode(added.id);
    expect(store.getNodeById(added.id)).toBeNull();
  });

  it('ensures node window is ready in electron runtime', async () => {
    const openNodeWindow = vi.fn().mockResolvedValue({ windowId: 77, created: false });
    setElectronApiMock({
      getNodeRegistrySnapshot: vi.fn().mockResolvedValue({
        version: 1,
        nodes: [
          {
            id: EMBEDDED_NODE_ID,
            name: 'Embedded Node',
            baseUrl: 'http://localhost:29695',
            nodeType: 'embedded',
            isSystem: true,
            createdAt: '2026-02-08T00:00:00.000Z',
            updatedAt: '2026-02-08T00:00:00.000Z',
            capabilityProbeState: 'ready',
            capabilities: { terminal: true, fileExplorerStreaming: true },
          },
        ],
      }),
      onNodeRegistryUpdated: vi.fn().mockReturnValue(vi.fn()),
      openNodeWindow,
    });

    const store = useNodeStore();
    await store.initializeRegistry();
    const result = await store.ensureNodeWindowReady(EMBEDDED_NODE_ID);

    expect(result).toEqual({ windowId: 77, created: false });
    expect(openNodeWindow).toHaveBeenCalledWith(EMBEDDED_NODE_ID);
  });

  it('rejects ensureNodeWindowReady outside electron runtime', async () => {
    const store = useNodeStore();
    await store.initializeRegistry();

    await expect(store.ensureNodeWindowReady(EMBEDDED_NODE_ID)).rejects.toThrow(
      'Node window control is only supported in Electron runtime.',
    );
  });
});
