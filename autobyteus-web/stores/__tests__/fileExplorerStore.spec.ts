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

  it('deleteFileOrFolder removes a containing folder from open files and falls back activeFile to a remaining file', async () => {
    const store = useFileExplorerStore();
    const workspaceId = 'ws-folder-delete';
    const folderPath = 'docs';

    const nestedFile = new TreeNode('guide.md', 'docs/guide.md', true, [], 'guide-id');
    const nestedDeepFile = new TreeNode('deep.md', 'docs/sub/deep.md', true, [], 'deep-id');
    const folderNode = new TreeNode('docs', folderPath, false, [nestedFile, nestedDeepFile], 'docs-id', true);
    const outsideFile = new TreeNode('outside.md', 'outside.md', true, [], 'outside-id');
    const rootNode = new TreeNode('root', '', false, [folderNode, outsideFile], 'root-id', true);
    const workspaceState = store._getOrCreateWorkspaceState(workspaceId);
    workspaceState.tree = rootNode;
    workspaceState.nodeIdToNode = {
      'root-id': rootNode,
      'docs-id': folderNode,
      'guide-id': nestedFile,
      'deep-id': nestedDeepFile,
      'outside-id': outsideFile,
    };
    workspaceState.openFiles = [
      {
        path: 'docs/guide.md',
        type: 'Text',
        mode: 'edit',
        content: 'guide',
        url: null,
        isLoading: false,
        error: null,
      },
      {
        path: 'outside.md',
        type: 'Text',
        mode: 'edit',
        content: 'outside',
        url: null,
        isLoading: false,
        error: null,
      },
      {
        path: 'docs/sub/deep.md',
        type: 'Text',
        mode: 'preview',
        content: 'deep',
        url: null,
        isLoading: false,
        error: null,
      },
    ];
    workspaceState.activeFile = 'docs/sub/deep.md';

    mutateMock.mockResolvedValue({
      data: {
        deleteFileOrFolder: JSON.stringify({
          changes: [{
            type: 'delete',
            node_id: 'docs-id',
            parent_id: 'root-id',
          }],
        }),
      },
      errors: [],
    });

    await store.deleteFileOrFolder(folderPath, workspaceId);

    expect(workspaceState.openFiles.map((file) => file.path)).toEqual(['outside.md']);
    expect(workspaceState.activeFile).toBe('outside.md');
    expect(workspaceState.tree.children.map((child) => child.path)).toEqual(['outside.md']);
  });
});
