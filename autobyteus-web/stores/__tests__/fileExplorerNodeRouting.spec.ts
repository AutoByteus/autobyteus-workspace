import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFileExplorerStore } from '../fileExplorer';

const { apolloClientMock, determineFileTypeMock, windowNodeContextStoreMock } = vi.hoisted(() => ({
  apolloClientMock: {
    query: vi.fn().mockResolvedValue({ data: { fileContent: 'remote text' }, errors: [] }),
    mutate: vi.fn(),
  },
  determineFileTypeMock: vi.fn(),
  windowNodeContextStoreMock: {
    isEmbeddedWindow: false,
    getBoundEndpoints: () => ({
      rest: 'https://node.example/rest',
    }),
  },
}));

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => apolloClientMock),
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({
    handleFileSystemChange: vi.fn(),
    activeWorkspace: { workspaceId: 'ws-1' },
    workspaces: { 'ws-1': { workspaceId: 'ws-1' } },
  }),
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/utils/fileExplorer/fileUtils', async () => {
  const actual = await vi.importActual<any>('~/utils/fileExplorer/fileUtils');
  return {
    ...actual,
    determineFileType: determineFileTypeMock,
  };
});

describe('fileExplorerStore node routing behavior', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    windowNodeContextStoreMock.isEmbeddedWindow = false;

    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: {
        readLocalTextFile: vi.fn().mockResolvedValue({ success: true, content: 'local text' }),
      },
    });
  });

  it('uses bound REST URL for absolute local-looking media paths in remote windows', async () => {
    determineFileTypeMock.mockResolvedValue('Image');
    const store = useFileExplorerStore();

    await store.openFile('/tmp/screenshot.png', 'ws-1');

    const wsState = store._getOrCreateWorkspaceState('ws-1');
    expect(wsState.openFiles).toHaveLength(1);
    expect(wsState.openFiles[0].url).toBe(
      'https://node.example/rest/workspaces/ws-1/content?path=%2Ftmp%2Fscreenshot.png',
    );
    expect(wsState.openFiles[0].url?.startsWith('local-file://')).toBe(false);
  });

  it('uses local-file protocol for embedded window local media paths', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    determineFileTypeMock.mockResolvedValue('Image');
    const store = useFileExplorerStore();

    await store.openFile('/tmp/screenshot.png', 'ws-1');

    const wsState = store._getOrCreateWorkspaceState('ws-1');
    expect(wsState.openFiles).toHaveLength(1);
    expect(wsState.openFiles[0].url).toBe('local-file:///tmp/screenshot.png');
  });

  it('uses the bound workspace route for an embedded sentinel without Electron', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    determineFileTypeMock.mockResolvedValue('Text');
    const store = useFileExplorerStore();

    await store.openFile('/tmp/notes.md', 'ws-1');
    await vi.waitFor(() => expect(store.getFileContent('/tmp/notes.md', 'ws-1')).toBe('remote text'));

    const wsState = store._getOrCreateWorkspaceState('ws-1');
    expect(wsState.openFiles[0].relativeResourceContext).toEqual({ kind: 'workspace', workspaceId: 'ws-1' });
    expect(wsState.openFiles[0].url).toBeNull();
    expect(apolloClientMock.query).toHaveBeenCalledWith(expect.objectContaining({
      variables: { workspaceId: 'ws-1', filePath: '/tmp/notes.md' },
    }));
  });

  it('uses the bound workspace route for embedded-sentinel media without Electron', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    determineFileTypeMock.mockResolvedValue('Image');
    const store = useFileExplorerStore();

    await store.openFile('/tmp/screenshot.png', 'ws-1');

    const wsState = store._getOrCreateWorkspaceState('ws-1');
    expect(wsState.openFiles[0].url).toBe(
      'https://node.example/rest/workspaces/ws-1/content?path=%2Ftmp%2Fscreenshot.png',
    );
    expect(wsState.openFiles[0].url?.startsWith('local-file://')).toBe(false);
  });
});
