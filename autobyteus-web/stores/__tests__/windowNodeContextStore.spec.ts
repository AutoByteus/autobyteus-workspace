import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { EMBEDDED_NODE_ID } from '~/types/node';
import { useWindowNodeContextStore } from '../windowNodeContextStore';

describe('windowNodeContextStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('defaults to embedded context', () => {
    const store = useWindowNodeContextStore();
    expect(store.nodeId).toBe(EMBEDDED_NODE_ID);
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
    expect(store.isEmbeddedWindow).toBe(false);
    expect(store.getBoundEndpoints().graphqlHttp).toBe('https://node.example.com/graphql');
    expect(store.getBoundEndpoints().teamWs).toBe('wss://node.example.com/ws/agent-team');
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
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/rest/health', { method: 'GET' });
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
});
