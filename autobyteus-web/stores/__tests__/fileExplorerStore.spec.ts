
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFileExplorerStore } from '../fileExplorer';
import { useWorkspaceStore } from '../workspace';

// Mocks
vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => ({
    mutate: vi.fn(),
    query: vi.fn(),
  })),
}));

vi.mock('../workspace', () => ({
  useWorkspaceStore: vi.fn(() => ({
    handleFileSystemChange: vi.fn(),
    activeWorkspace: { workspaceId: 'ws-1' }
  })),
}));

describe('fileExplorerStore', () => {
    let workspaceStoreMock: any;

    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        
        workspaceStoreMock = {
            handleFileSystemChange: vi.fn(),
            activeWorkspace: { workspaceId: 'ws-1' },
            workspaces: {
                'ws-1': {
                    workspaceId: 'ws-1'
                }
            }
        };
        // @ts-ignore
        useWorkspaceStore.mockReturnValue(workspaceStoreMock);
    });

    it('deleteFileOrFolder should remove file from open files and trigger workspace update', async () => {
        const store = useFileExplorerStore();
        const workspaceId = 'ws-1';
        const filePath = 'file.txt';

        // 1. Setup initial state with open file
        store._getOrCreateWorkspaceState(workspaceId).openFiles = [{
            path: filePath,
            type: 'Text',
            mode: 'edit',
            content: 'content',
            url: null,
            isLoading: false,
            error: null
        }];
        store._getOrCreateWorkspaceState(workspaceId).activeFile = filePath;

        // 2. Mock Apollo Client mutation response
        const { getApolloClient } = await import('~/utils/apolloClient');
        const mutateMock = vi.fn().mockResolvedValue({
            data: {
                deleteFileOrFolder: JSON.stringify({
                    changes: [{
                        type: 'delete',
                        node_id: 'uuid-1',
                        parent_id: 'uuid-parent'
                    }]
                })
            },
            errors: []
        });
        // @ts-ignore
        getApolloClient.mockReturnValue({ mutate: mutateMock });

        // 3. Execute delete
        await store.deleteFileOrFolder(filePath, workspaceId);

        // 4. Assertions
        // File should be closed (removed from openFiles)
        expect(store._getOrCreateWorkspaceState(workspaceId).openFiles).toHaveLength(0);
        expect(store._getOrCreateWorkspaceState(workspaceId).activeFile).toBeNull();

        // Workspace store handleFileSystemChange should be called
        expect(workspaceStoreMock.handleFileSystemChange).toHaveBeenCalledWith(workspaceId, expect.objectContaining({
            changes: expect.arrayContaining([
                expect.objectContaining({ type: 'delete' })
            ])
        }));
    });
});
