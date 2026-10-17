import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFileExplorerStore } from '../fileExplorer';
import { TreeNode } from '~/utils/fileExplorer/TreeNode';

const mutateMock = vi.fn();
const queryMock = vi.fn();

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => ({
    mutate: mutateMock,
    query: queryMock,
  })),
}));

describe('fileExplorerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('search retains loaded tree object identity and creates relative lazy results in server order', async () => {
    const store = useFileExplorerStore();
    const id = 'search-workspace';
    const state = store._getOrCreateWorkspaceState(id);
    const loaded = new TreeNode('resume-notes.md', 'resume-notes.md', true, [], 'loaded', true);
    state.tree = new TreeNode('root', '', false, [loaded], 'root', true);
    queryMock.mockResolvedValue({ data: { searchFiles: ['nested/resume sample.pdf', 'resume-notes.md'] } });
    await store.searchFiles('resume', id);
    const results = store.getSearchResults(id);
    expect(results.map(node => node.path)).toEqual(['nested/resume sample.pdf', 'resume-notes.md']);
    expect(results[1]).toBe(state.tree.children[0]);
    expect(results[0].id).toBe('search-nested/resume sample.pdf');
    expect(results[0].is_file).toBe(true);
    expect(state.openFolders).toEqual({});
    expect(store.getSearchResults('different-workspace')).toEqual([]);
  });

  it('ignores superseded search completion during ordinary query changes', async () => {
    const store = useFileExplorerStore();
    const id = 'search-abort';
    let finishFirst!: (value: any) => void;
    queryMock.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }));
    const first = store.searchFiles('res', id);
    queryMock.mockResolvedValueOnce({ data: { searchFiles: ['resume-notes.md'] } });
    await store.searchFiles('resume', id);
    finishFirst({ data: { searchFiles: ['stale.pdf'] } });
    await first;
    expect(store.getSearchResults(id).map(node => node.path)).toEqual(['resume-notes.md']);
    expect(store.isSearchLoading(id)).toBe(false);
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
      relativeResourceContext: { kind: 'workspace', workspaceId },
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
        relativeResourceContext: { kind: 'workspace', workspaceId },
        isLoading: false,
        error: null,
      },
      {
        path: 'outside.md',
        type: 'Text',
        mode: 'edit',
        content: 'outside',
        url: null,
        relativeResourceContext: { kind: 'workspace', workspaceId },
        isLoading: false,
        error: null,
      },
      {
        path: 'docs/sub/deep.md',
        type: 'Text',
        mode: 'preview',
        content: 'deep',
        url: null,
        relativeResourceContext: { kind: 'workspace', workspaceId },
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

  it('loads folder children into the tree when the backend returns a valid folder payload', async () => {
    const store = useFileExplorerStore();
    const workspaceId = 'ws-folder-load';

    queryMock.mockResolvedValue({
      data: {
        folderChildren: JSON.stringify({
          id: 'root',
          name: 'Workspace',
          path: '',
          is_file: false,
          children: [
            { id: 'file-1', name: 'README.md', path: 'README.md', is_file: true, children: [] },
          ],
        }),
      },
      errors: [],
    });

    await store.fetchFolderChildren(workspaceId, '');

    const workspaceState = store._getWorkspaceState(workspaceId)!;
    expect(workspaceState.tree.name).toBe('Workspace');
    expect(workspaceState.tree.children.map((child) => child.path)).toEqual(['README.md']);
    expect(workspaceState.nodeIdToNode['file-1']).toBeDefined();
  });

  it('throws folder-children GraphQL errors instead of converting them to an empty tree', async () => {
    const store = useFileExplorerStore();

    queryMock.mockResolvedValue({
      data: {},
      errors: [{ message: 'Workspace root is unavailable' }],
    });

    await expect(store.fetchFolderChildren('ws-graphql-error', '')).rejects.toThrow(
      'Workspace root is unavailable',
    );
  });

  it('throws folder-children payload errors instead of converting them to an empty tree', async () => {
    const store = useFileExplorerStore();

    queryMock.mockResolvedValue({
      data: {
        folderChildren: JSON.stringify({ error: 'Workspace not found' }),
      },
      errors: [],
    });

    await expect(store.fetchFolderChildren('ws-payload-error', '')).rejects.toThrow(
      'Workspace not found',
    );
  });
});
