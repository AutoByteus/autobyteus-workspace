import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useWorkspaceStore } from '../workspace';

const mockStreamingInstances: Array<{
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  options: any;
}> = [];

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    getBoundEndpoints: () => ({ fileExplorerWs: 'ws://mock' }),
  }),
}));

vi.mock('~/services/fileExplorerStreaming/FileExplorerStreamingService', () => ({
  FileExplorerStreamingService: vi.fn((_endpoint: string, options: any) => {
    const instance = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      options,
    };
    mockStreamingInstances.push(instance);
    return instance;
  }),
}));

const createStore = () => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
  setActivePinia(pinia);
  return useWorkspaceStore();
};

describe('validation: File Explorer reconnect resync after stream fail-close', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamingInstances.length = 0;
  });

  it('refreshes the File Explorer snapshot when the live stream reconnects after an abnormal close', async () => {
    const store = createStore();
    const fetchFolderChildren = vi.spyOn(store, 'fetchFolderChildren').mockResolvedValue(undefined);

    store.acquireFileExplorerLiveSession('ws-1', 'consumer-a');
    const initialRefresh = store.fileExplorerSnapshotRefreshes.get('ws-1');
    expect(initialRefresh).toBeDefined();
    await initialRefresh;
    fetchFolderChildren.mockClear();

    mockStreamingInstances[0].options.onDisconnect?.('File Explorer event queue overflow; reconnect required');
    mockStreamingInstances[0].options.onConnect?.('reconnected-session');
    await Promise.resolve();

    expect(fetchFolderChildren).toHaveBeenCalledWith(
      'ws-1',
      '',
      expect.objectContaining({ generation: expect.any(Number) }),
    );
  });
});
