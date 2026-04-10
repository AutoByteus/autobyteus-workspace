import { afterEach, describe, expect, it, vi } from 'vitest';

describe('electron preload', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('exposes getAppLocale and invokes the main-process locale bridge', async () => {
    const invoke = vi.fn().mockResolvedValue('zh-CN');
    const exposeInMainWorld = vi.fn();

    vi.doMock('electron', () => ({
      contextBridge: {
        exposeInMainWorld,
      },
      ipcRenderer: {
        invoke,
        on: vi.fn(),
        removeListener: vi.fn(),
        send: vi.fn(),
      },
      webUtils: {
        getPathForFile: vi.fn(),
      },
    }));

    await import('../preload');

    const electronApi = exposeInMainWorld.mock.calls.find(([name]) => name === 'electronAPI')?.[1];
    expect(electronApi).toBeDefined();

    await expect(electronApi.getAppLocale()).resolves.toBe('zh-CN');
    expect(invoke).toHaveBeenCalledWith('get-app-locale');
  });
});
