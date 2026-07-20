import { afterEach, describe, expect, it, vi } from 'vitest';

describe('electron preload', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('exposes locale and external-link methods through their main-process bridges', async () => {
    const invoke = vi.fn().mockImplementation((channel: string) => {
      if (channel === 'get-app-locale') return Promise.resolve('zh-CN');
      if (channel === 'open-external-link') return Promise.resolve({ success: true });
      return Promise.resolve(undefined);
    });
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

    await expect(electronApi.openExternalLink('https://example.com/diagram-docs')).resolves.toEqual({
      success: true,
    });
    expect(invoke).toHaveBeenCalledWith('open-external-link', 'https://example.com/diagram-docs');
  });
});
