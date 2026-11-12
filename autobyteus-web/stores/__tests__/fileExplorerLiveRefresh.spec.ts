import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFileExplorerStore } from '../fileExplorer';
import type { OpenFileState } from '../fileExplorerState';

// autobyteus-452 REQ-001/REQ-002, AC-002..AC-004: a `modify` from the node's stream, matched by path,
// re-reads an open file whether or not its folder was expanded; a file that is not open is never read.

const { apolloClientMock, windowNodeContextStoreMock } = vi.hoisted(() => ({
  apolloClientMock: { query: vi.fn(), mutate: vi.fn() },
  windowNodeContextStoreMock: {
    isEmbeddedWindow: false,
    getBoundEndpoints: () => ({ rest: 'https://node.example/rest' }),
  },
}));

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => apolloClientMock) }));
vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({ handleFileSystemChange: vi.fn(), activeWorkspace: { workspaceId: 'ws-1' }, workspaces: { 'ws-1': { workspaceId: 'ws-1' } } }),
}));
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => windowNodeContextStoreMock }));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const setup = () => {
  const store = useFileExplorerStore();
  const state = store._getOrCreateWorkspaceState('ws-1');
  const open = (path: string, type: OpenFileState['type'], extra: Partial<OpenFileState> = {}): OpenFileState => {
    state.openFiles.push({
      path, type, mode: 'preview', content: type === 'Text' ? 'VERSION-1' : null,
      url: type === 'Text' ? null : `https://node.example/rest/workspaces/ws-1/content?path=${path}`,
      contentRevision: 0, relativeResourceContext: { kind: 'workspace', workspaceId: 'ws-1' },
      isLoading: false, error: null, ...extra,
    });
    return state.openFiles.at(-1)!;
  };
  const modify = (path: string) => store.handleFileSystemChange('ws-1', { changes: [{ type: 'modify', path }] });
  return { store, state, open, modify };
};

describe('fileExplorerStore: live refresh of an open file from a path-based modify', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('reads an open text file in a folder the tree never loaded', async () => {
    const { state, open, modify } = setup();
    const file = open('deep/inner/a.md', 'Text');
    expect(state.tree.children).toHaveLength(0);
    apolloClientMock.query.mockResolvedValueOnce({ data: { fileContent: 'VERSION-2' }, errors: [] });

    modify('deep/inner/a.md');
    await flush();

    expect(apolloClientMock.query).toHaveBeenCalledTimes(1);
    expect(apolloClientMock.query).toHaveBeenCalledWith(expect.objectContaining({
      variables: { workspaceId: 'ws-1', filePath: 'deep/inner/a.md' }, fetchPolicy: 'network-only',
    }));
    expect(file.content).toBe('VERSION-2');
  });

  it.each(['Image', 'PDF'] as const)('makes an open %s viewer load again without a text read', (type) => {
    const { open, modify } = setup();
    const file = open(type === 'Image' ? 'pics/c.png' : 'docs/d.pdf', type);

    modify(file.path);

    expect(file.contentRevision).toBe(1);
    expect(apolloClientMock.query).not.toHaveBeenCalled();
  });

  it('reads nothing for a change to a file that is not open', async () => {
    const { open, modify } = setup();
    const other = open('pics/c.png', 'Image');

    for (let i = 0; i < 20; i += 1) modify(`burst/file-${i}.md`);
    await flush();

    expect(apolloClientMock.query).not.toHaveBeenCalled();
    expect(other.contentRevision).toBe(0);
  });

  it('keeps an unsaved draft when the open file changes on disk', async () => {
    const { open, modify } = setup();
    const file = open('deep/inner/a.md', 'Text', { mode: 'edit', editorDraft: { content: 'my unsaved edit' } });
    apolloClientMock.query.mockResolvedValueOnce({ data: { fileContent: 'VERSION-2' }, errors: [] });

    modify('deep/inner/a.md');
    await flush();

    expect(file.content).toBe('VERSION-2');
    expect(file.editorDraft).toEqual({ content: 'my unsaved edit' });
  });

  it("does not read back the window's own save, and reads the next outside change", async () => {
    const { store, state, open, modify } = setup();
    const file = open('deep/inner/a.md', 'Text', { mode: 'edit' });
    apolloClientMock.mutate.mockResolvedValueOnce({
      data: { writeFileContent: JSON.stringify({ changes: [{ type: 'modify', path: 'deep/inner/a.md' }] }) },
    });

    await store._writeFileCore('ws-1', 'deep/inner/a.md', 'SAVED');

    expect(apolloClientMock.mutate).toHaveBeenCalledTimes(1);
    expect(apolloClientMock.query).not.toHaveBeenCalled();
    expect(file.content).toBe('SAVED');
    expect(state.filesToIgnoreNextModify.has('deep/inner/a.md')).toBe(false);

    apolloClientMock.query.mockResolvedValueOnce({ data: { fileContent: 'AGENT-VERSION' }, errors: [] });
    modify('deep/inner/a.md');
    await flush();
    expect(apolloClientMock.query).toHaveBeenCalledTimes(1);
    expect(file.content).toBe('AGENT-VERSION');
  });
});
