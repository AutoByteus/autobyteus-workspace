import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFileExplorerStore } from '../fileExplorer';
import { TreeNode } from '~/utils/fileExplorer/TreeNode';

const mutateMock = vi.fn();

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => ({
    mutate: mutateMock,
    query: vi.fn(),
  })),
}));

describe('fileExplorerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('deleteFileOrFolder removes file state and applies the file-explorer tree update', async () => {
    const store = useFileExplorerStore();
    const workspaceId = 'ws-1';
    const filePath = 'file.txt';

    const fileNode = new TreeNode('file.txt', filePath, true, [], 'uuid-1');
    const rootNode = new TreeNode('root', '', false, [fileNode], 'uuid-parent', true);
    const workspaceState = store._getOrCreateWorkspaceState(workspaceId);
    workspaceState.tree = rootNode;
    workspaceState.nodeIdToNode = {
      'uuid-parent': rootNode,
      'uuid-1': fileNode,
    };
    workspaceState.openFiles = [{
      path: filePath,
      type: 'Text',
      mode: 'edit',
      content: 'content',
      url: null,
      isLoading: false,
      error: null,
    }];
    workspaceState.activeFile = filePath;

    mutateMock.mockResolvedValue({
      data: {
        deleteFileOrFolder: JSON.stringify({
          changes: [{
            type: 'delete',
            node_id: 'uuid-1',
            parent_id: 'uuid-parent',
          }],
        }),
      },
      errors: [],
    });

    await store.deleteFileOrFolder(filePath, workspaceId);

    expect(workspaceState.openFiles).toHaveLength(0);
    expect(workspaceState.activeFile).toBeNull();
    expect(workspaceState.tree.children).toHaveLength(0);
    expect(workspaceState.nodeIdToNode['uuid-1']).toBeUndefined();
  });
});
