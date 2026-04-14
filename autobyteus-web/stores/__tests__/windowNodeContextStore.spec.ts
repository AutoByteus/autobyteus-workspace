import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { EMBEDDED_NODE_ID } from '~/types/node';
import { useWindowNodeContextStore } from '../windowNodeContextStore';

describe('windowNodeContextStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
    delete (window as typeof window & { electronAPI?: Window['electronAPI'] }).electronAPI;
  });

  it('defaults to embedded context', () => {
    const store = useWindowNodeContextStore();
    expect(store.nodeId).toBe(EMBEDDED_NODE_ID);
    expect(store.bindingRevision).toBe(0);
    expect(store.isEmbeddedWindow).toBe(true);
    expect(store.boundEndpoints.rest).toMatch(/^https?:\/\/.+\/rest$/);
    expect(store.boundEndpoints.health).toMatch(/^https?:\/\/.+\/rest\/health$/);
  });

  it('initializes from remote window context with explicit base url', () => {
    const store = useWindowNodeContextStore();
    store.initializeFromWindowContext(
      {
        windowId: 42,
        nodeId: 'remote-node-1',
      },
      'https://node.example.com',
    );

    expect(store.initialized).toBe(true);
    expect(store.windowId).toBe(42);
    expect(store.nodeId).toBe('remote-node-1');
    expect(store.bindingRevision).toBe(1);
    expect(store.isEmbeddedWindow).toBe(false);
    expect(store.getBoundEndpoints().graphqlHttp).toBe('https://node.example.com/graphql');
    expect(store.getBoundEndpoints().teamWs).toBe('wss://node.example.com/ws/agent-team');
  });

  it('increments bindingRevision only when the bound node context actually changes', () => {
    const store = useWindowNodeContextStore();
    store.initializeFromWindowContext(
      {
        windowId: 1,
        nodeId: 'remote-node-4',
      },
      'https://node-a.example.com',
    );

    expect(store.bindingRevision).toBe(1);

    store.initializeFromWindowContext(
      {
        windowId: 1,
        nodeId: 'remote-node-4',
      },
      'https://node-a.example.com',
    );

    expect(store.bindingRevision).toBe(1);

    store.bindNodeContext('remote-node-5', 'https://node-b.example.com');
    expect(store.bindingRevision).toBe(2);
  });

  it('waitForBoundBackendReady returns true when health endpoint is reachable', async () => {
    const store = useWindowNodeContextStore();
    store.initializeFromWindowContext(
      {
        windowId: 7,
        nodeId: 'remote-node-2',
      },
      'http://127.0.0.1:8000',
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await store.waitForBoundBackendReady({ timeoutMs: 50, pollMs: 1 });
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/rest/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('waitForBoundBackendReady returns false on timeout and captures the last error', async () => {
    const store = useWindowNodeContextStore();
    store.initializeFromWindowContext(
      {
        windowId: 8,
        nodeId: 'remote-node-3',
      },
      'http://127.0.0.1:8001',
    );

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));

    const result = await store.waitForBoundBackendReady({ timeoutMs: 5, pollMs: 1 });
    expect(result).toBe(false);
    expect(store.lastReadyError).toContain('connection refused');
  });

  it('uses the Electron health bridge when available', async () => {
    const store = useWindowNodeContextStore();
    const checkServerHealth = vi.fn().mockResolvedValue({
      status: 'ok',
      data: { status: 'ok' },
    });
    (window as typeof window & { electronAPI?: Window['electronAPI'] }).electronAPI = {
      checkServerHealth,
    } as Window['electronAPI'];

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await store.waitForBoundBackendReady({ timeoutMs: 50, pollMs: 1 });

    expect(result).toBe(true);
    expect(checkServerHealth).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enforces the caller timeout when the embedded Electron health bridge hangs', async () => {
    vi.useFakeTimers();

    const store = useWindowNodeContextStore();
    const checkServerHealth = vi.fn().mockImplementation(
      () => new Promise(() => undefined),
    );
    (window as typeof window & { electronAPI?: Window['electronAPI'] }).electronAPI = {
      checkServerHealth,
    } as Window['electronAPI'];

    const resultPromise = store.waitForBoundBackendReady({ timeoutMs: 5, pollMs: 1 });
    await vi.advanceTimersByTimeAsync(20);

    await expect(resultPromise).resolves.toBe(false);
    expect(checkServerHealth).toHaveBeenCalledOnce();
    expect(store.lastReadyError).toContain('health check timed out');

    vi.useRealTimers();
  });

  it('can recover with a fresh Electron health check after a timed-out bridge probe', async () => {
    vi.useFakeTimers();

    const store = useWindowNodeContextStore();
    const checkServerHealth = vi.fn()
      .mockImplementationOnce(() => new Promise(() => undefined))
      .mockResolvedValueOnce({
        status: 'ok',
        data: { status: 'ok' },
      });
    (window as typeof window & { electronAPI?: Window['electronAPI'] }).electronAPI = {
      checkServerHealth,
    } as Window['electronAPI'];

    const firstProbe = store.waitForBoundBackendReady({ timeoutMs: 5, pollMs: 1 });
    await vi.advanceTimersByTimeAsync(20);

    await expect(firstProbe).resolves.toBe(false);
    expect(store.lastReadyError).toContain('health check timed out');

    const secondProbe = store.waitForBoundBackendReady({ timeoutMs: 20, pollMs: 1 });
    await expect(secondProbe).resolves.toBe(true);
    expect(checkServerHealth).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('uses the bound node health endpoint for remote-node windows even in Electron', async () => {
    const store = useWindowNodeContextStore();
    store.initializeFromWindowContext(
      {
        windowId: 10,
        nodeId: 'remote-node-5',
      },
      'http://127.0.0.1:8010',
    );

    const checkServerHealth = vi.fn().mockResolvedValue({
      status: 'ok',
      data: { status: 'ok' },
    });
    (window as typeof window & { electronAPI?: Window['electronAPI'] }).electronAPI = {
      checkServerHealth,
    } as Window['electronAPI'];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await store.waitForBoundBackendReady({ timeoutMs: 50, pollMs: 1 });

    expect(result).toBe(true);
    expect(checkServerHealth).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8010/rest/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('times out hung fetch probes instead of waiting forever', async () => {
    vi.useFakeTimers();

    const store = useWindowNodeContextStore();
    store.initializeFromWindowContext(
      {
        windowId: 9,
        nodeId: 'remote-node-4',
      },
      'http://127.0.0.1:8002',
    );

    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = store.waitForBoundBackendReady({ timeoutMs: 5, pollMs: 1 });
    await vi.advanceTimersByTimeAsync(20);

    await expect(resultPromise).resolves.toBe(false);
    expect(store.lastReadyError).toContain('health check timed out');

    vi.useRealTimers();
  });
});
