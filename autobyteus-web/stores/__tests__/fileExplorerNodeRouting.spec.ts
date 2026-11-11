import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFileExplorerStore } from '../fileExplorer';

const { apolloClientMock, determineFileTypeMock, windowNodeContextStoreMock, transport } = vi.hoisted(() => ({
  transport: { fetch: vi.fn() },
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

vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ authorizedFetch: transport.fetch }));

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
    transport.fetch.mockReset();
    let objectUrl = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:node/${++objectUrl}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: {
        readLocalTextFile: vi.fn().mockResolvedValue({ success: true, content: 'local text' }),
      },
    });
  });

  it('opens an absolute media path in a node window as a node file: fetched once, shown from an object URL (autobyteus-471)', async () => {
    determineFileTypeMock.mockResolvedValue('Image');
    transport.fetch.mockResolvedValue(new Response(new Blob([new Uint8Array([0x3c, 0x73])]), { status: 200 }));
    const store = useFileExplorerStore();

    await store.openFilePreview('/tmp/diagram.SVG', 'ws-1', { accessIntent: { source: 'event-monitor', readOnly: true } });

    const wsState = store._getOrCreateWorkspaceState('ws-1');
    expect(transport.fetch).toHaveBeenCalledWith('https://node.example/rest/node-files/content?path=%2Ftmp%2Fdiagram.SVG');
    expect(wsState.openFiles).toHaveLength(1);
    expect(wsState.openFiles[0]).toMatchObject({ url: 'blob:node/1', isLoading: false, error: null, mode: 'preview' });
    expect(apolloClientMock.query).not.toHaveBeenCalled();
  });

  it.each([
    ['openFilePreview', (store: any) => store.openFilePreview('/srv/notes.md', 'ws-1')],
    ['openFile', (store: any) => store.openFile('/srv/notes.md', 'ws-1')],
  ])('a node file is read-only whoever opens it: %s with no intent (autobyteus-471 REQ-001, CR-003)', async (_name, open) => {
    determineFileTypeMock.mockResolvedValue('Text');
    transport.fetch.mockResolvedValue(new Response('node text', { status: 200 }));
    const store = useFileExplorerStore();

    await open(store);

    const file = store._getOrCreateWorkspaceState('ws-1').openFiles[0];
    expect(file).toMatchObject({ content: 'node text', mode: 'preview', accessIntent: { source: 'node-file', readOnly: true } });
    store.setFileMode('/srv/notes.md', 'edit', 'ws-1');
    expect(file.mode).toBe('preview');
    store.updateEditorDraft('ws-1', '/srv/notes.md', 'typed');
    expect(file.editorDraft).toBeUndefined();
    // Opened again by a caller without an intent: still read-only.
    await store.openFile('/srv/notes.md', 'ws-1');
    expect(file).toMatchObject({ mode: 'preview', accessIntent: { source: 'node-file', readOnly: true } });
  });

  it('a caller\'s own read-only intent is kept for a node file; a workspace file without one stays editable', async () => {
    determineFileTypeMock.mockResolvedValue('Text');
    transport.fetch.mockResolvedValue(new Response('node text', { status: 200 }));
    const store = useFileExplorerStore();

    await store.openFilePreview('/srv/notes.md', 'ws-1', { accessIntent: { source: 'event-monitor', readOnly: true } });
    await store.openFile('docs/plan.md', 'ws-1');

    const [nodeFile, workspaceFile] = store._getOrCreateWorkspaceState('ws-1').openFiles;
    expect(nodeFile.accessIntent).toEqual({ source: 'event-monitor', readOnly: true });
    expect(workspaceFile).toMatchObject({ mode: 'edit', accessIntent: null });
  });

  it('opens an absolute text path in a node window as a node file\'s content; a refusal is the plain reason', async () => {
    determineFileTypeMock.mockResolvedValue('Text');
    transport.fetch.mockResolvedValueOnce(new Response('# Contract', { status: 200 }));
    const store = useFileExplorerStore();
    await store.openFilePreview('/w/data-contract.md', 'ws-1', { accessIntent: { source: 'event-monitor', readOnly: true } });
    expect(store.getFileContent('/w/data-contract.md', 'ws-1')).toBe('# Contract');

    for (const [answer, error] of [
      [new Response(JSON.stringify({ code: 'NODE_FILE_NOT_FOUND' }), { status: 404 }), 'node-file-preview:not-found'],
      [new Response(JSON.stringify({ code: 'NODE_FILE_IS_FOLDER' }), { status: 400 }), 'node-file-preview:folder'],
      [new Response(JSON.stringify({ code: 'NODE_FILE_UNREADABLE' }), { status: 400 }), 'node-file-preview:failed'],
    ] as const) {
      transport.fetch.mockResolvedValueOnce(answer);
      const path = `/w/${error}.md`;
      await store.openFilePreview(path, 'ws-1', { accessIntent: { source: 'event-monitor', readOnly: true } });
      const file = store._getOrCreateWorkspaceState('ws-1').openFiles.find((entry) => entry.path === path);
      expect(file).toMatchObject({ error, content: null, isLoading: false });
    }
  });

  it('reads a node file again on an explicit open, and revokes its object URLs when read again and when closed', async () => {
    determineFileTypeMock.mockResolvedValue('Image');
    transport.fetch.mockImplementation(async () => new Response(new Blob([new Uint8Array([1])]), { status: 200 }));
    const store = useFileExplorerStore();
    await store.openFilePreview('/w/a.png', 'ws-1');
    await store.openFilePreview('/w/a.png', 'ws-1');
    await vi.waitFor(() => expect(store._getOrCreateWorkspaceState('ws-1').openFiles[0].url).toBe('blob:node/2'));
    expect(transport.fetch).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:node/1');
    store.closeFile('/w/a.png', 'ws-1');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:node/2');
  });

  it('keeps no object URL for a node file closed while it was read', async () => {
    determineFileTypeMock.mockResolvedValue('Image');
    let settle!: (response: Response) => void;
    transport.fetch.mockReturnValue(new Promise((resolve) => { settle = resolve; }));
    const store = useFileExplorerStore();
    const opening = store.openFilePreview('/w/b.png', 'ws-1');
    await vi.waitFor(() => expect(transport.fetch).toHaveBeenCalled());
    store.closeFile('/w/b.png', 'ws-1');
    settle(new Response(new Blob([new Uint8Array([1])]), { status: 200 }));
    await opening;
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('uses local-file protocol for embedded window local media paths', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    determineFileTypeMock.mockResolvedValue('Image');
    const store = useFileExplorerStore();

    await store.openFile('/tmp/diagram.svg', 'ws-1');

    const wsState = store._getOrCreateWorkspaceState('ws-1');
    expect(wsState.openFiles).toHaveLength(1);
    expect(wsState.openFiles[0].url).toBe('local-file://local/tmp/diagram.svg');
  });

  it('opens an absolute path as a node file in an embedded window without the desktop app (no local file capability)', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    determineFileTypeMock.mockResolvedValue('Text');
    transport.fetch.mockResolvedValue(new Response('node text', { status: 200 }));
    const store = useFileExplorerStore();

    await store.openFile('/tmp/notes.md', 'ws-1');

    expect(store.getFileContent('/tmp/notes.md', 'ws-1')).toBe('node text');
    const wsState = store._getOrCreateWorkspaceState('ws-1');
    expect(wsState.openFiles[0].relativeResourceContext).toBeNull();
    expect(apolloClientMock.query).not.toHaveBeenCalled();
    expect(transport.fetch).toHaveBeenCalledWith('https://node.example/rest/node-files/content?path=%2Ftmp%2Fnotes.md');
  });

  it('keeps a relative path a workspace file in a node window', async () => {
    determineFileTypeMock.mockResolvedValue('Image');
    const store = useFileExplorerStore();

    await store.openFile('docs/diagram.svg', 'ws-1');

    const wsState = store._getOrCreateWorkspaceState('ws-1');
    expect(wsState.openFiles[0].url).toBe('https://node.example/rest/workspaces/ws-1/content?path=docs%2Fdiagram.svg');
    expect(transport.fetch).not.toHaveBeenCalled();
  });

  it('does not read, construct a URL, or fetch workspace content for Unsupported files', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    determineFileTypeMock.mockResolvedValue('Unsupported');
    const store = useFileExplorerStore();

    await store.openFile('/tmp/archive.zip', 'ws-1');

    const wsState = store._getOrCreateWorkspaceState('ws-1');
    expect(wsState.openFiles[0].type).toBe('Unsupported');
    expect(wsState.openFiles[0].url).toBeNull();
    expect(window.electronAPI.readLocalTextFile).not.toHaveBeenCalled();
    expect(apolloClientMock.query).not.toHaveBeenCalled();
  });

  it('routes supported Lua code through the text reader instead of Unsupported', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    determineFileTypeMock.mockResolvedValue('Text');
    const store = useFileExplorerStore();

    await store.openFile('/tmp/script.lua', 'ws-1');

    const wsState = store._getOrCreateWorkspaceState('ws-1');
    expect(wsState.openFiles[0].type).toBe('Text');
    expect(window.electronAPI.readLocalTextFile).toHaveBeenCalledWith('/tmp/script.lua');
  });
});
