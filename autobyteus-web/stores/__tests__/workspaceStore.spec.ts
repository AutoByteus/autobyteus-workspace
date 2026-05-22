
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useWorkspaceStore } from '../workspace';
import { useFileExplorerStore } from '../fileExplorer';
import { TreeNode } from '~/utils/fileExplorer/TreeNode';

// Mock dependencies
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

// Mock GraphQL mutations/queries to avoid import errors in test environment if not transpiled
vi.mock('~/graphql/mutations/workspace_mutations', () => ({
    CreateWorkspace: 'mock-mutation'
}));
vi.mock('~/graphql/queries/workspace_queries', () => ({
    GetAllWorkspaces: 'mock-query'
}));
vi.mock('~/graphql/queries/file_explorer_queries', () => ({
    GetFolderChildren: 'mock-query-children'
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
    useWindowNodeContextStore: () => mockWindowNodeContextStore,
}));

// Mock FileExplorerStreamingService
vi.mock('~/services/fileExplorerStreaming/FileExplorerStreamingService', () => {
    return {
        FileExplorerStreamingService: vi.fn(() => {
            const instance = {
                connect: vi.fn(),
                disconnect: vi.fn(),
            };
            mockStreamingInstances.push(instance);
            return instance;
        }),
    }
});

describe('workspaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamingInstances.length = 0;
    mockWindowNodeContextStore.bindingRevision = 0;
  });

  describe('createWorkspace', () => {
    it('should create a workspace and add it to state', async () => {
      const pinia = createTestingPinia({
        createSpy: vi.fn,
        stubActions: false, // We want to test real actions
      });
      setActivePinia(pinia);
      const store = useWorkspaceStore();

      // Mock Apollo response
      mockMutate.mockResolvedValue({
        data: {
          createWorkspace: {
            workspaceId: 'ws-123',
            name: 'Test WS',
            fileExplorer: JSON.stringify({ name: 'root', path: 'root', is_file: false, id: 'root-id' }),
            absolutePath: '/tmp/test',
            config: {}
          }
        }
      });

      const wsId = await store.createWorkspace({ root_path: '/tmp/test' });

      expect(wsId).toBe('ws-123');
      expect(store.workspaces['ws-123']).toBeDefined();
      expect(store.workspaces['ws-123'].name).toBe('Test WS');
      expect(store.workspaces['ws-123'].fileExplorer).toBeInstanceOf(TreeNode);
      expect(mockStreamingInstances).toHaveLength(0);
    });

    it('should throw error if mutation fails', async () => {
        const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
        setActivePinia(pinia);
        const store = useWorkspaceStore();
  
        mockMutate.mockResolvedValue({
          errors: [{ message: 'GraphQL Error' }]
        });
  
        await expect(store.createWorkspace({ root_path: '/bad' })).rejects.toThrow('GraphQL Error');
        expect(store.error).toBeTruthy();
    });

    it('should replace stale workspace entries with the same root path', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
      setActivePinia(pinia);
      const store = useWorkspaceStore();

      const staleDisconnect = vi.fn();
      store.workspaces['stale-ws'] = {
        workspaceId: 'stale-ws',
        name: 'Stale',
        fileExplorer: new TreeNode('root', 'root', false, [], 'root-id'),
        nodeIdToNode: {},
        workspaceConfig: { root_path: '/tmp/test' },
        absolutePath: '/tmp/test',
      };
      store.fileSystemConnections.set('stale-ws', {
        connect: vi.fn(),
        disconnect: staleDisconnect,
      } as any);

      mockMutate.mockResolvedValue({
        data: {
          createWorkspace: {
            workspaceId: 'fresh-ws',
            name: 'Fresh',
            fileExplorer: JSON.stringify({ name: 'root', path: 'root', is_file: false, id: 'root-id' }),
            absolutePath: '/tmp/test',
            config: {},
          },
        },
      });

      const workspaceId = await store.createWorkspace({ root_path: '/tmp/test' });

      expect(workspaceId).toBe('fresh-ws');
      expect(store.workspaces['stale-ws']).toBeUndefined();
      expect(store.workspaces['fresh-ws']).toBeDefined();
      expect(staleDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchAllWorkspaces', () => {
      it('should populate workspaces from query', async () => {
        const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
        setActivePinia(pinia);
        const store = useWorkspaceStore();

        mockQuery.mockResolvedValue({
            data: {
                workspaces: [
                    {
                        workspaceId: 'ws-1', 
                        name: 'WS 1',
                        fileExplorer: JSON.stringify({ name: 'root1', path: 'root1', is_file: false, id: 'root1' }),
                        absolutePath: '/path/1',
                        config: {}
                    },
                    {
                        workspaceId: 'ws-2', 
                        name: 'WS 2',
                        fileExplorer: JSON.stringify({ name: 'root2', path: 'root2', is_file: false, id: 'root2' }),
                        absolutePath: '/path/2',
                        config: {}
                    }
                ]
            }
        });

        await store.fetchAllWorkspaces();

        expect(Object.keys(store.workspaces)).toHaveLength(2);
        expect(store.workspaces['ws-1']).toBeDefined();
        expect(store.workspaces['ws-2']).toBeDefined();
        expect(store.workspacesFetched).toBe(true);
        expect(mockStreamingInstances).toHaveLength(0);
      });

      it('should ignore stale query results when backend binding revision changes mid-flight', async () => {
        const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
        setActivePinia(pinia);
        const store = useWorkspaceStore();

        mockWindowNodeContextStore.bindingRevision = 1;
        mockQuery.mockImplementation(async () => {
          mockWindowNodeContextStore.bindingRevision = 2;
          return {
            data: {
              workspaces: [
                {
                  workspaceId: 'ws-stale',
                  name: 'Stale',
                  fileExplorer: JSON.stringify({ name: 'root', path: 'root', is_file: false, id: 'root-id' }),
                  absolutePath: '/path/stale',
                  config: {},
                },
              ],
            },
          };
        });

        await store.fetchAllWorkspaces(true, 1);

        expect(store.workspacesFetched).toBe(false);
        expect(Object.keys(store.workspaces)).toHaveLength(0);
        expect(store.fileSystemConnections.size).toBe(0);
      });
  });

  describe('handleFileSystemChange', () => {
    let store: any;
    let fileExplorerStore: any;

    beforeEach(async () => {
        const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
        setActivePinia(pinia);
        store = useWorkspaceStore();
        fileExplorerStore = useFileExplorerStore();

        // Setup a mock workspace
        const rootNode = new TreeNode('root', 'root', false, [], 'root-id');
        store.workspaces['ws-1'] = {
            workspaceId: 'ws-1',
            name: 'Test WS',
            fileExplorer: rootNode,
            nodeIdToNode: { 'root-id': rootNode },
            workspaceConfig: {},
            absolutePath: '/test'
        };
    });

    it('should handle ADD change', () => {
        const changeEvent = {
            changes: [{
                type: 'add',
                node: { name: 'new-file.txt', path: 'root/new-file.txt', is_file: true, id: 'file-1', children: [] },
                parent_id: 'root-id'
            }]
        };

        store.handleFileSystemChange('ws-1', changeEvent);

        const ws = store.workspaces['ws-1'];
        expect(ws.fileExplorer.children).toHaveLength(1);
        expect(ws.fileExplorer.children[0].name).toBe('new-file.txt');
        expect(ws.nodeIdToNode['file-1']).toBeDefined();
    });

    it('should handle DELETE change', () => {
        // Setup: Add a file first
        const ws = store.workspaces['ws-1'];
        const fileNode = new TreeNode('file.txt', 'root/file.txt', true, [], 'file-1');
        ws.fileExplorer.addChild(fileNode);
        ws.nodeIdToNode['file-1'] = fileNode;

        const changeEvent = {
            changes: [{
                type: 'delete',
                node_id: 'file-1',
                parent_id: 'root-id'
            }]
        };

        store.handleFileSystemChange('ws-1', changeEvent);

        expect(ws.fileExplorer.children).toHaveLength(0);
        expect(ws.nodeIdToNode['file-1']).toBeUndefined();
    });

    it('should handle MODIFY change by invalidating content', () => {
        // Setup: Add a file
        const ws = store.workspaces['ws-1'];
        const fileNode = new TreeNode('file.txt', 'root/file.txt', true, [], 'file-1');
        ws.fileExplorer.addChild(fileNode);
        ws.nodeIdToNode['file-1'] = fileNode;

        const changeEvent = {
            changes: [{
                type: 'modify',
                node_id: 'file-1',
                parent_id: 'root-id'
            }]
        };

        store.handleFileSystemChange('ws-1', changeEvent);

        expect(fileExplorerStore.invalidateFileContent).toHaveBeenCalledWith('root/file.txt', 'ws-1');
    });

    it('should NOT invalidate content on MODIFY if explicitly ignored', () => {
         // Setup: Add a file
         const ws = store.workspaces['ws-1'];
         const fileNode = new TreeNode('file.txt', 'root/file.txt', true, [], 'file-1');
         ws.fileExplorer.addChild(fileNode);
         ws.nodeIdToNode['file-1'] = fileNode;
 
         // Mock the ignore list in fileExplorerStore
         // Since we used stubActions: false, we can manipulate state manually or mock the getter
         // The store implementation accesses fileExplorerStore._getOrCreateWorkspaceState
         // We can mock that return value if we spy on it, but accessing private valid might be tricky.
         // A simpler way is to depend on the fact that fileExplorerStore is a mocked store from pinia-testing
         
         const workspaceState = { filesToIgnoreNextModify: new Set(['root/file.txt']) };
         vi.spyOn(fileExplorerStore, '_getOrCreateWorkspaceState').mockReturnValue(workspaceState);

         const changeEvent = {
             changes: [{
                 type: 'modify',
                 node_id: 'file-1',
                 parent_id: 'root-id'
             }]
         };
 
         store.handleFileSystemChange('ws-1', changeEvent);
 
         expect(fileExplorerStore.invalidateFileContent).not.toHaveBeenCalled();
         expect(workspaceState.filesToIgnoreNextModify.has('root/file.txt')).toBe(false); // Should be consumed
    });

    it('should ignore a streamed structural echo that was already applied by a mutation path', () => {
        const changeEvent = {
            changes: [{
                type: 'add',
                node: { name: 'new-file.txt', path: 'root/new-file.txt', is_file: true, id: 'file-1', children: [] },
                parent_id: 'root-id'
            }]
        };

        fileExplorerStore.recordRecentStructuralChangeEcho('ws-1', changeEvent);
        store.handleFileSystemChange('ws-1', changeEvent, 'stream');

        const ws = store.workspaces['ws-1'];
        expect(ws.fileExplorer.children).toHaveLength(0);
        expect(ws.nodeIdToNode['file-1']).toBeUndefined();
    });
  });

  describe('resetWorkspaceStateForBackendContextChange', () => {
    it('disconnects all streams and clears workspace state without reload', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
      setActivePinia(pinia);
      const store = useWorkspaceStore();

      store.workspaces = {
        'ws-1': {
          workspaceId: 'ws-1',
          name: 'One',
          fileExplorer: new TreeNode('root', 'root', false, [], 'root-id'),
          nodeIdToNode: {},
          workspaceConfig: {},
          absolutePath: '/tmp/one',
        },
      };
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
      expect(store.workspacesFetched).toBe(false);
    });
  });

  describe('file explorer live sessions', () => {
    it('opens one stream for multiple visible consumers and disconnects after final release', () => {
      const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
      setActivePinia(pinia);
      const store = useWorkspaceStore();
      store.workspaces['ws-1'] = {
        workspaceId: 'ws-1',
        name: 'One',
        fileExplorer: new TreeNode('root', '', false, [], 'root-id'),
        nodeIdToNode: {},
        workspaceConfig: {},
        absolutePath: '/tmp/one',
      };
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
    });

    it('returns an idempotent release function for duplicate consumer acquisition', () => {
      const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
      setActivePinia(pinia);
      const store = useWorkspaceStore();
      vi.spyOn(store, 'fetchFolderChildren').mockResolvedValue(undefined);

      const release = store.acquireFileExplorerLiveSession('ws-1', 'consumer-a');
      store.acquireFileExplorerLiveSession('ws-1', 'consumer-a');

      expect(mockStreamingInstances).toHaveLength(1);
      release();
      release();

      expect(mockStreamingInstances[0].disconnect).toHaveBeenCalledTimes(1);
    });

    it('refreshes already-open folders when a visible file explorer is reacquired', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
      setActivePinia(pinia);
      const store = useWorkspaceStore();
      const fileExplorerStore = useFileExplorerStore();
      const oldFile = new TreeNode('old.txt', 'src/old.txt', true, [], 'old-file');
      const srcFolder = new TreeNode('src', 'src', false, [oldFile], 'src-id', true);
      const root = new TreeNode('root', '', false, [srcFolder], 'root-id', true);
      store.workspaces['ws-1'] = {
        workspaceId: 'ws-1',
        name: 'One',
        fileExplorer: root,
        nodeIdToNode: { 'root-id': root, 'src-id': srcFolder, 'old-file': oldFile },
        workspaceConfig: {},
        absolutePath: '/tmp/one',
      };
      fileExplorerStore._getOrCreateWorkspaceState('ws-1').openFolders.src = true;
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
      const refreshedSrc = store.workspaces['ws-1'].nodeIdToNode['src-id'];
      expect(refreshedSrc.children.map((child: TreeNode) => child.path)).toEqual(['src/new.txt']);
      expect(store.workspaces['ws-1'].nodeIdToNode['old-file']).toBeUndefined();
      expect(store.workspaces['ws-1'].nodeIdToNode['new-file']).toBeDefined();
    });
  });
});
