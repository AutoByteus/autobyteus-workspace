import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFileExplorerStore } from '../fileExplorer';

// autobyteus-450 REQ-003 / AC-003, QR-002: an explicit open of an already-open file reads it again; a draft stays.

const { apolloClientMock, determineFileTypeMock, windowNodeContextStoreMock, readLocalTextFile } = vi.hoisted(() => ({
  apolloClientMock: { query: vi.fn(), mutate: vi.fn() },
  determineFileTypeMock: vi.fn(),
  windowNodeContextStoreMock: {
    isEmbeddedWindow: false,
    getBoundEndpoints: () => ({ rest: 'https://node.example/rest' }),
  },
  readLocalTextFile: vi.fn(),
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
const answer = (fileContent: string) => apolloClientMock.query.mockResolvedValueOnce({ data: { fileContent }, errors: [] });

describe('fileExplorerStore: an explicit open of an already-open file', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    Object.defineProperty(window, 'electronAPI', { configurable: true, writable: true, value: { readLocalTextFile } });
  });

  it('a first open reads the file once, at revision 0', async () => {
    determineFileTypeMock.mockResolvedValue('Text');
    answer('VERSION-ONE');
    const store = useFileExplorerStore();
    await store.openFile('posts/post.md', 'ws-1');
    await flush();
    const file = store._getOrCreateWorkspaceState('ws-1').openFiles[0];
    expect(file).toMatchObject({ content: 'VERSION-ONE', contentRevision: 0, isLoading: false });
    expect(apolloClientMock.query).toHaveBeenCalledTimes(1);
  });

  it('reads a text file again on every open (link, link again, Files tab), one read each', async () => {
    determineFileTypeMock.mockResolvedValue('Text');
    const store = useFileExplorerStore();
    answer('VERSION-ONE');
    await store.openFilePreview('posts/post.md', 'ws-1', { accessIntent: { source: 'event-monitor', readOnly: true } });
    await flush();
    const file = () => store._getOrCreateWorkspaceState('ws-1').openFiles[0];
    expect(file().content).toBe('VERSION-ONE');

    answer('VERSION-TWO');
    await store.openFilePreview('posts/post.md', 'ws-1', { accessIntent: { source: 'event-monitor', readOnly: true } });
    await flush();
    expect(file().content).toBe('VERSION-TWO');

    answer('VERSION-THREE');
    await store.openFile('posts/post.md', 'ws-1');
    await flush();
    expect(file()).toMatchObject({ content: 'VERSION-THREE', mode: 'edit', isLoading: false });
    expect(apolloClientMock.query).toHaveBeenCalledTimes(3);
    expect(store._getOrCreateWorkspaceState('ws-1').openFiles).toHaveLength(1);
  });

  it('keeps an unsaved edit: the committed content is read again, the draft stays', async () => {
    determineFileTypeMock.mockResolvedValue('Text');
    const store = useFileExplorerStore();
    answer('VERSION-ONE');
    await store.openFile('notes.txt', 'ws-1');
    await flush();
    store.updateEditorDraft('ws-1', 'notes.txt', 'my unsaved edit');

    answer('VERSION-TWO');
    await store.openFile('notes.txt', 'ws-1');
    await flush();
    const file = store._getOrCreateWorkspaceState('ws-1').openFiles[0];
    expect(file.content).toBe('VERSION-TWO');
    expect(file.editorDraft).toEqual({ content: 'my unsaved edit' });
  });

  it('bumps the revision of a media file (same URL) and reads nothing itself', async () => {
    determineFileTypeMock.mockResolvedValue('Image');
    const store = useFileExplorerStore();
    await store.openFile('images/chart.png', 'ws-1');
    const file = store._getOrCreateWorkspaceState('ws-1').openFiles[0];
    const url = file.url;
    expect(file.contentRevision).toBe(0);

    await store.openFile('images/chart.png', 'ws-1');
    await store.openFilePreview('images/chart.png', 'ws-1');
    expect(file.contentRevision).toBe(2);
    expect(file.url).toBe(url);
    expect(apolloClientMock.query).not.toHaveBeenCalled();
  });

  it('reads an embedded window\'s local text file again through the desktop app', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    determineFileTypeMock.mockResolvedValue('Text');
    readLocalTextFile.mockResolvedValueOnce({ success: true, content: 'LOCAL-ONE' }).mockResolvedValueOnce({ success: true, content: 'LOCAL-TWO' });
    const store = useFileExplorerStore();
    await store.openFilePreview('/Users/me/post.md', 'ws-1', { accessIntent: { source: 'event-monitor', readOnly: true } });
    await store.openFilePreview('/Users/me/post.md', 'ws-1', { accessIntent: { source: 'event-monitor', readOnly: true } });
    await flush();
    expect(store._getOrCreateWorkspaceState('ws-1').openFiles[0].content).toBe('LOCAL-TWO');
    expect(readLocalTextFile).toHaveBeenCalledTimes(2);
    expect(apolloClientMock.query).not.toHaveBeenCalled();
  });

  it('switching tabs (setActiveFile) reads nothing', async () => {
    determineFileTypeMock.mockResolvedValue('Text');
    const store = useFileExplorerStore();
    answer('A'); answer('B');
    await store.openFile('a.txt', 'ws-1');
    await store.openFile('b.txt', 'ws-1');
    await flush();
    store.setActiveFile('a.txt', 'ws-1');
    await flush();
    expect(apolloClientMock.query).toHaveBeenCalledTimes(2);
  });
});
