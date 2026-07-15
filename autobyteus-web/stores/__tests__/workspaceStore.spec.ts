import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useWorkspaceStore } from '../workspace';
import { useFileExplorerStore } from '../fileExplorer';
import { TreeNode } from '~/utils/fileExplorer/TreeNode';

const mockMutate = vi.fn();
const mockQuery = vi.fn();
const mockWaitForBoundBackendReady = vi.fn().mockResolvedValue(true);
const mockStreamingInstances: Array<{ connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
const mockWindowNodeContextStore = {
  waitForBoundBackendReady: mockWaitForBoundBackendReady,
  getBoundEndpoints: () => ({
    fileExplorerWs: 'ws://mock',
  }),
  bindingRevision: 0,
};

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    mutate: mockMutate,
    query: mockQuery,
  }),
}));

vi.mock('~/graphql/mutations/workspace_mutations', () => ({
  CreateWorkspace: 'mock-mutation',
  RemoveWorkspace: 'mock-remove-workspace-mutation',
}));
vi.mock('~/graphql/queries/workspace_queries', () => ({
  GetAllWorkspaces: 'mock-query',
}));
vi.mock('~/graphql/queries/file_explorer_queries', () => ({
  GetFolderChildren: 'mock-query-children',
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => mockWindowNodeContextStore,
}));

vi.mock('~/services/fileExplorerStreaming/FileExplorerStreamingService', () => ({
  FileExplorerStreamingService: vi.fn(() => {
    const instance = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    mockStreamingInstances.push(instance);
    return instance;
  }),
}));

const createStore = () => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
  setActivePinia(pinia);
  return useWorkspaceStore();
};

describe('workspaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamingInstances.length = 0;
    mockWindowNodeContextStore.bindingRevision = 0;
  });

  describe('createWorkspace', () => {
    it('registers workspace metadata without creating file-explorer tree state', async () => {
      const store = createStore();
      const fileExplorerStore = useFileExplorerStore();
      mockMutate.mockResolvedValue({
        data: {
          createWorkspace: {
            workspaceId: 'ws-123',
            name: 'Test WS',
            displayName: 'Test WS',
            workspaceRootPath: '/tmp/test',
            absolutePath: '/tmp/test',
            kind: 'filesystem',
            isTemp: false,
            config: { rootPath: '/tmp/test' },
          },
        },
      });

      const wsId = await store.createWorkspace({ root_path: '/tmp/test' });

      expect(wsId).toBe('ws-123');
      expect(store.workspaces['ws-123']).toMatchObject({
        workspaceId: 'ws-123',
        name: 'Test WS',
        absolutePath: '/tmp/test',
      });
      expect(store.workspaceMetadataById['ws-123']).toMatchObject({
        workspaceId: 'ws-123',
        workspaceRootPath: '/tmp/test',
        displayName: 'Test WS',
      });
      expect(fileExplorerStore.fileExplorerStateByWorkspace.has('ws-123')).toBe(false);
      expect(mockStreamingInstances).toHaveLength(0);
    });

    it('throws error if mutation fails', async () => {
      const store = createStore();
      mockMutate.mockResolvedValue({ errors: [{ message: 'GraphQL Error' }] });

      await expect(store.createWorkspace({ root_path: '/bad' })).rejects.toThrow('GraphQL Error');
      expect(store.error).toBeTruthy();
    });

    it('replaces stale metadata entries with the same root path and clears file-explorer state', async () => {
      const store = createStore();
      const fileExplorerStore = useFileExplorerStore();
      const staleDisconnect = vi.fn();
      store.workspaces['stale-ws'] = {
        workspaceId: 'stale-ws',
        name: 'Stale',
        workspaceConfig: { root_path: '/tmp/test' },
        absolutePath: '/tmp/test',
      };
      fileExplorerStore._getOrCreateWorkspaceState('stale-ws');
      store.fileSystemConnections.set('stale-ws', {
        connect: vi.fn(),
        disconnect: staleDisconnect,
      } as any);
      mockMutate.mockResolvedValue({
        data: {
          createWorkspace: {
            workspaceId: 'fresh-ws',
            name: 'Fresh',
            displayName: 'Fresh',
            workspaceRootPath: '/tmp/test',
            absolutePath: '/tmp/test',
            kind: 'filesystem',
            isTemp: false,
            config: {},
          },
        },
      });

      const workspaceId = await store.createWorkspace({ root_path: '/tmp/test' });

      expect(workspaceId).toBe('fresh-ws');
      expect(store.workspaces['stale-ws']).toBeUndefined();
      expect(fileExplorerStore.fileExplorerStateByWorkspace.has('stale-ws')).toBe(false);
      expect(store.workspaces['fresh-ws']).toBeDefined();
      expect(staleDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchAllWorkspaces', () => {
    it('populates metadata from query without file-explorer tree payloads', async () => {
      const store = createStore();
      mockQuery.mockResolvedValue({
        data: {
          workspaces: [
            { workspaceId: 'ws-1', name: 'WS 1', displayName: 'WS 1', workspaceRootPath: '/path/1', absolutePath: '/path/1', kind: 'filesystem', isTemp: false, config: {} },
            { workspaceId: 'ws-2', name: 'WS 2', displayName: 'WS 2', workspaceRootPath: '/path/2', absolutePath: '/path/2', kind: 'filesystem', isTemp: false, config: {} },
          ],
        },
      });

      await store.fetchAllWorkspaces();

      expect(Object.keys(store.workspaces)).toHaveLength(2);
      expect(store.workspaceMetadataById['ws-1'].workspaceRootPath).toBe('/path/1');
      expect(store.workspacesFetched).toBe(true);
      expect(mockStreamingInstances).toHaveLength(0);
    });

    it('ignores stale query results when backend binding revision changes mid-flight', async () => {
      const store = createStore();
      mockWindowNodeContextStore.bindingRevision = 1;
      mockQuery.mockImplementation(async () => {
        mockWindowNodeContextStore.bindingRevision = 2;
        return {
          data: {
            workspaces: [{ workspaceId: 'ws-stale', name: 'Stale', workspaceRootPath: '/path/stale', absolutePath: '/path/stale', config: {} }],
          },
        };
      });

      await store.fetchAllWorkspaces(true, 1);

      expect(store.workspacesFetched).toBe(false);
      expect(Object.keys(store.workspaces)).toHaveLength(0);
      expect(store.fileSystemConnections.size).toBe(0);
    });
  });

  describe('removeWorkspace', () => {
    it('removes workspace metadata and clears file explorer live state after backend success', async () => {
      const store = createStore();
      const fileExplorerStore = useFileExplorerStore();
      const disconnect = vi.fn();
      store.workspaces['ws-remove'] = {
        workspaceId: 'ws-remove',
        name: 'Remove Me',
        displayName: 'Remove Me',
        workspaceConfig: { root_path: '/tmp/remove-me' },
        absolutePath: '/tmp/remove-me',
        workspaceRootPath: '/tmp/remove-me',
        kind: 'filesystem',
        isTemp: false,
      };
      store.registerWorkspaceInfoMetadata(store.workspaces['ws-remove']);
      fileExplorerStore._getOrCreateWorkspaceState('ws-remove');
      store.fileSystemConnections.set('ws-remove', {
        connect: vi.fn(),
        disconnect,
      } as any);
      store.fileExplorerLiveConsumers.set('ws-remove', new Set(['left-panel']));
      store.fileExplorerSnapshotRefreshes.set('ws-remove', Promise.resolve());
      mockMutate.mockResolvedValue({
        data: {
          removeWorkspace: {
            success: true,
            message: 'Workspace removed from Workspaces.',
            workspaceId: 'ws-remove',
            workspaceRootPath: '/tmp/remove-me',
          },
        },
      });

      const result = await store.removeWorkspace('ws-remove');

      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
        mutation: 'mock-remove-workspace-mutation',
        variables: { input: { workspaceId: 'ws-remove' } },
      }));
      expect(result).toEqual({
        workspaceRootPath: '/tmp/remove-me',
        message: 'Workspace removed from Workspaces.',
      });
      expect(store.workspaces['ws-remove']).toBeUndefined();
      expect(store.workspaceMetadataById['ws-remove']).toBeUndefined();
      expect(store.workspaceMetadataIdsByRootPath['/tmp/remove-me']).toBeUndefined();
      expect(fileExplorerStore.fileExplorerStateByWorkspace.has('ws-remove')).toBe(false);
      expect(store.fileSystemConnections.has('ws-remove')).toBe(false);
      expect(store.fileExplorerLiveConsumers.has('ws-remove')).toBe(false);
      expect(store.fileExplorerSnapshotRefreshes.has('ws-remove')).toBe(false);
      expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it('keeps workspace and file explorer state when backend removal fails', async () => {
      const store = createStore();
      const fileExplorerStore = useFileExplorerStore();
      const disconnect = vi.fn();
      store.workspaces['ws-active'] = {
        workspaceId: 'ws-active',
        name: 'Active',
        displayName: 'Active',
        workspaceConfig: { root_path: '/tmp/active' },
        absolutePath: '/tmp/active',
        workspaceRootPath: '/tmp/active',
        kind: 'filesystem',
        isTemp: false,
      };
      store.registerWorkspaceInfoMetadata(store.workspaces['ws-active']);
      fileExplorerStore._getOrCreateWorkspaceState('ws-active');
      store.fileSystemConnections.set('ws-active', {
        connect: vi.fn(),
        disconnect,
      } as any);
      mockMutate.mockResolvedValue({
        data: {
          removeWorkspace: {
            success: false,
            message: 'Stop active runs before removing this workspace.',
            workspaceId: 'ws-active',
            workspaceRootPath: '/tmp/active',
          },
        },
      });

      await expect(store.removeWorkspace('ws-active')).rejects.toThrow(
        'Stop active runs before removing this workspace.',
      );

      expect(store.workspaces['ws-active']).toBeDefined();
      expect(store.workspaceMetadataById['ws-active']).toBeDefined();
      expect(fileExplorerStore.fileExplorerStateByWorkspace.has('ws-active')).toBe(true);
      expect(store.fileSystemConnections.has('ws-active')).toBe(true);
      expect(disconnect).not.toHaveBeenCalled();
    });
  });

  describe('file explorer delegation', () => {
    it('delegates structural changes to fileExplorerStore-owned tree state', () => {
      const store = createStore();
      const fileExplorerStore = useFileExplorerStore();
      store.workspaces['ws-1'] = {
        workspaceId: 'ws-1',
        name: 'Test WS',
        workspaceConfig: {},
        absolutePath: '/test',
      };
      const rootNode = new TreeNode('root', 'root', false, [], 'root-id');
      const explorerState = fileExplorerStore._getOrCreateWorkspaceState('ws-1');
      explorerState.tree = rootNode;
      explorerState.nodeIdToNode = { 'root-id': rootNode };

      store.handleFileSystemChange('ws-1', {
        changes: [{
          type: 'add',
          node: { name: 'new-file.txt', path: 'root/new-file.txt', is_file: true, id: 'file-1', children: [] },
          parent_id: 'root-id',
        }],
      } as any);

      expect(explorerState.tree.children).toHaveLength(1);
      expect(explorerState.nodeIdToNode['file-1']).toBeDefined();
    });

    it('ignores a streamed structural echo that was already applied by a mutation path', () => {
      const store = createStore();
      const fileExplorerStore = useFileExplorerStore();
      const rootNode = new TreeNode('root', 'root', false, [], 'root-id');
      const explorerState = fileExplorerStore._getOrCreateWorkspaceState('ws-1');
      explorerState.tree = rootNode;
      explorerState.nodeIdToNode = { 'root-id': rootNode };
      const changeEvent = {
        changes: [{
          type: 'add',
          node: { name: 'new-file.txt', path: 'root/new-file.txt', is_file: true, id: 'file-1', children: [] },
          parent_id: 'root-id',
        }],
      } as any;

      fileExplorerStore.recordRecentStructuralChangeEcho('ws-1', changeEvent);
      store.handleFileSystemChange('ws-1', changeEvent, 'stream');

      expect(explorerState.tree.children).toHaveLength(0);
      expect(explorerState.nodeIdToNode['file-1']).toBeUndefined();
    });
  });

  describe('resetWorkspaceStateForBackendContextChange', () => {
    it('disconnects all streams and clears metadata/file-explorer state without reload', async () => {
      const store = createStore();
      const fileExplorerStore = useFileExplorerStore();
      store.workspaces = {
        'ws-1': {
          workspaceId: 'ws-1',
          name: 'One',
          workspaceConfig: {},
          absolutePath: '/tmp/one',
        },
      };
      fileExplorerStore._getOrCreateWorkspaceState('ws-1');
      store.workspacesFetched = true;
      const disconnect = vi.fn();
      store.fileSystemConnections.set('ws-1', {
        connect: vi.fn(),
        disconnect,
      } as any);

      await store.resetWorkspaceStateForBackendContextChange({ reload: false });

      expect(disconnect).toHaveBeenCalledTimes(1);
      expect(store.fileSystemConnections.size).toBe(0);
      expect(Object.keys(store.workspaces)).toHaveLength(0);
      expect(fileExplorerStore.fileExplorerStateByWorkspace.size).toBe(0);
      expect(store.workspacesFetched).toBe(false);
    });
  });

  describe('file explorer live sessions', () => {
    it('opens one stream for multiple visible consumers and disconnects after final release', () => {
      const store = createStore();
      const fileExplorerStore = useFileExplorerStore();
      const abortSearch = vi.spyOn(fileExplorerStore, 'abortSearch');
      const invalidateGeneration = vi.spyOn(fileExplorerStore, 'invalidateFolderChildrenGeneration');
      vi.spyOn(store, 'fetchFolderChildren').mockResolvedValue(undefined);

      const releaseA = store.acquireFileExplorerLiveSession('ws-1', 'consumer-a');
      const releaseB = store.acquireFileExplorerLiveSession('ws-1', 'consumer-b');

      expect(mockStreamingInstances).toHaveLength(1);
      expect(mockStreamingInstances[0].connect).toHaveBeenCalledWith('ws-1');

      releaseA();
      expect(mockStreamingInstances[0].disconnect).not.toHaveBeenCalled();

      releaseB();
      expect(mockStreamingInstances[0].disconnect).toHaveBeenCalledTimes(1);
      expect(store.fileSystemConnections.size).toBe(0);
      expect(abortSearch).toHaveBeenCalledWith('ws-1');
      expect(invalidateGeneration).toHaveBeenCalledWith('ws-1');
    });

    it('returns an idempotent release function for duplicate consumer acquisition', () => {
      const store = createStore();
      vi.spyOn(store, 'fetchFolderChildren').mockResolvedValue(undefined);

      const release = store.acquireFileExplorerLiveSession('ws-1', 'consumer-a');
      store.acquireFileExplorerLiveSession('ws-1', 'consumer-a');

      expect(mockStreamingInstances).toHaveLength(1);
      release();
      release();

      expect(mockStreamingInstances[0].disconnect).toHaveBeenCalledTimes(1);
    });

    it('refreshes already-open folders in fileExplorerStore when a visible file explorer is reacquired', async () => {
      const store = createStore();
      const fileExplorerStore = useFileExplorerStore();
      const oldFile = new TreeNode('old.txt', 'src/old.txt', true, [], 'old-file');
      const srcFolder = new TreeNode('src', 'src', false, [oldFile], 'src-id', true);
      const root = new TreeNode('root', '', false, [srcFolder], 'root-id', true);
      const explorerState = fileExplorerStore._getOrCreateWorkspaceState('ws-1');
      explorerState.tree = root;
      explorerState.nodeIdToNode = { 'root-id': root, 'src-id': srcFolder, 'old-file': oldFile };
      explorerState.openFolders.src = true;
      mockQuery.mockImplementation(async ({ variables }: any) => {
        const folderPath = variables.folderPath;
        return {
          data: {
            folderChildren: JSON.stringify(folderPath === ''
              ? {
                  id: 'root-id',
                  name: 'root',
                  path: '',
                  is_file: false,
                  children: [{ id: 'src-id', name: 'src', path: 'src', is_file: false, children: [] }],
                }
              : {
                  id: 'src-id',
                  name: 'src',
                  path: 'src',
                  is_file: false,
                  children: [{ id: 'new-file', name: 'new.txt', path: 'src/new.txt', is_file: true, children: [] }],
                }),
          },
        };
      });

      store.acquireFileExplorerLiveSession('ws-1', 'consumer-a');
      const refreshTask = store.fileExplorerSnapshotRefreshes.get('ws-1');
      expect(refreshTask).toBeDefined();
      await refreshTask;

      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.objectContaining({
        variables: { workspaceId: 'ws-1', folderPath: '' },
      }));
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.objectContaining({
        variables: { workspaceId: 'ws-1', folderPath: 'src' },
      }));
      const refreshedSrc = explorerState.nodeIdToNode['src-id'];
      expect(refreshedSrc.children.map((child: TreeNode) => child.path)).toEqual(['src/new.txt']);
      expect(explorerState.nodeIdToNode['old-file']).toBeUndefined();
      expect(explorerState.nodeIdToNode['new-file']).toBeDefined();
    });

    it('aborts snapshot refresh generation and ignores late folder responses after final release', async () => {
      const store = createStore();
      const fileExplorerStore = useFileExplorerStore();
      const explorerState = fileExplorerStore._getOrCreateWorkspaceState('ws-1');
      let capturedSignal: AbortSignal | undefined;
      let resolveQuery: ((value: any) => void) | null = null;
      mockQuery.mockImplementation(({ context }: any) => {
        capturedSignal = context?.fetchOptions?.signal;
        return new Promise((resolve) => {
          resolveQuery = resolve;
        });
      });

      const release = store.acquireFileExplorerLiveSession('ws-1', 'consumer-a');
      const refreshTask = store.fileExplorerSnapshotRefreshes.get('ws-1');
      expect(refreshTask).toBeDefined();
      expect(capturedSignal?.aborted).toBe(false);

      release();
      expect(capturedSignal?.aborted).toBe(true);
      expect(store.fileExplorerSnapshotRefreshes.has('ws-1')).toBe(false);
      resolveQuery?.({
        data: {
          folderChildren: JSON.stringify({
            id: 'root',
            name: 'root',
            path: '',
            is_file: false,
            children: [{ id: 'late-file', name: 'late.txt', path: 'late.txt', is_file: true, children: [] }],
          }),
        },
      });
      await refreshTask;

      expect(explorerState.tree.children).toHaveLength(0);
      expect(explorerState.nodeIdToNode['late-file']).toBeUndefined();
      expect(mockStreamingInstances[0].disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
