import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';

const mockAxiosCreate = vi.fn();

vi.mock('axios', () => {
  return {
    default: {
      create: mockAxiosCreate,
    },
    create: mockAxiosCreate,
  };
});

function setElectronApiMock(mock: Partial<Window['electronAPI']> | undefined): void {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    writable: true,
    value: mock,
  });
}

describe('apiService node routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setActivePinia(createPinia());
    setElectronApiMock(undefined);
  });

  it('routes requests through bound node REST endpoint after context bootstrap', async () => {
    const mockClient = {
      get: vi.fn().mockResolvedValue({ data: { ok: true } }),
      post: vi.fn().mockResolvedValue({ data: { ok: true } }),
      put: vi.fn().mockResolvedValue({ data: { ok: true } }),
      delete: vi.fn().mockResolvedValue({ data: { ok: true } }),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };
    mockAxiosCreate.mockReturnValue(mockClient);

    const windowNodeContextStore = useWindowNodeContextStore();
    windowNodeContextStore.initializeFromWindowContext(
      {
        windowId: 3,
        nodeId: 'remote-node-1',
      },
      'http://127.0.0.1:8000',
    );

    const { default: apiService } = await import('../api');
    await apiService.get('/workspaces');

    expect(mockAxiosCreate).toHaveBeenCalledWith({ baseURL: 'http://127.0.0.1:8000/rest' });
    expect(mockClient.get).toHaveBeenCalledWith('/workspaces', undefined);
  });

  it('throws explicit bootstrap error in electron when node context is not initialized', async () => {
    setElectronApiMock({});

    const mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };
    mockAxiosCreate.mockReturnValue(mockClient);

    const { default: apiService } = await import('../api');

    await expect(apiService.get('/health')).rejects.toThrow(
      'Window node context is not initialized yet. API call attempted before node bootstrap.',
    );
    expect(mockAxiosCreate).not.toHaveBeenCalled();
  });
});

