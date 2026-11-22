import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFileExplorerStore } from '../fileExplorer';

// autobyteus-579 (REQ-001, REQ-002; AC-001, AC-002): the node answers a file it does not give as a GraphQL error, which the
// viewer shows as its error state; a readable file's text is kept exactly, even when it looks like an error answer.

const { apolloClientMock, determineFileTypeMock, windowNodeContextStoreMock } = vi.hoisted(() => ({
  apolloClientMock: { query: vi.fn(), mutate: vi.fn() },
  determineFileTypeMock: vi.fn(),
  windowNodeContextStoreMock: { isEmbeddedWindow: false, getBoundEndpoints: () => ({ rest: 'https://node.example/rest' }) },
}));

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => apolloClientMock) }));
vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({ handleFileSystemChange: vi.fn(), activeWorkspace: { workspaceId: 'ws-1' }, workspaces: { 'ws-1': { workspaceId: 'ws-1' } } }),
}));
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => windowNodeContextStoreMock }));
vi.mock('~/utils/fileExplorer/fileUtils', async () => ({
  ...await vi.importActual<any>('~/utils/fileExplorer/fileUtils'),
  determineFileType: determineFileTypeMock,
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('fileExplorerStore: a file the node does not give', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    determineFileTypeMock.mockResolvedValue('Text');
  });

  const open = async (path: string) => {
    const store = useFileExplorerStore();
    await store.openFile(path, 'ws-1').catch(() => undefined);
    await flush();
    return store._getOrCreateWorkspaceState('ws-1').openFiles.find((file: { path: string }) => file.path === path);
  };

  it.each([
    ['a missing file', 'File not found: notes.md', 'FILE_NOT_FOUND'],
    ['a file outside the workspace', 'Access denied: File is outside the workspace', 'WORKSPACE_ACCESS_REFUSED'],
    ['a semantic-memory link that is not opened', 'WORKSPACE_LINK_NOT_OPENED: secret-link.md is a symbolic link this workspace does not open.', 'WORKSPACE_LINK_NOT_OPENED'],
  ])('%s opens in the error state with the node\'s message, never as text (AC-001)', async (_label, message, code) => {
    apolloClientMock.query.mockResolvedValueOnce({ data: null, errors: [{ message, extensions: { code } }] });
    const file = await open('notes.md');
    expect(file).toMatchObject({ error: message, content: null, isLoading: false });
  });

  it('a file whose text is an error-shaped JSON shows as that text (AC-002)', async () => {
    apolloClientMock.query.mockResolvedValueOnce({ data: { fileContent: '{"error":"x"}' }, errors: [] });
    const file = await open('error.json');
    expect(file).toMatchObject({ content: '{"error":"x"}', error: null, isLoading: false });
  });
});
