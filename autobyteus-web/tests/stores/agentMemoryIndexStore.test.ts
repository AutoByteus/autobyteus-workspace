import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentMemoryIndexStore } from '~/stores/agentMemoryIndexStore';
import { getApolloClient } from '~/utils/apolloClient';

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}));

describe('agentMemoryIndexStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetchIndex populates entries from the API', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        listRunMemorySnapshots: {
          entries: [
            {
              runId: 'agent-1',
              lastUpdatedAt: '2026-02-05T00:00:00Z',
              hasWorkingContext: true,
              hasEpisodic: false,
              hasSemantic: true,
              hasRawTraces: true,
              hasRawArchive: false,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        },
      },
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useAgentMemoryIndexStore();
    await store.fetchIndex();

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].runId).toBe('agent-1');
    expect(store.total).toBe(1);
  });

  it('fetchIndex preserves entries on error', async () => {
    const queryMock = vi.fn().mockRejectedValue(new Error('boom'));
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useAgentMemoryIndexStore();
    store.entries = [
      {
        runId: 'agent-keep',
        lastUpdatedAt: null,
        hasWorkingContext: false,
        hasEpisodic: false,
        hasSemantic: false,
        hasRawTraces: false,
        hasRawArchive: false,
      },
    ];

    await store.fetchIndex();

    expect(store.error).toBe('boom');
    expect(store.entries[0].runId).toBe('agent-keep');
  });

  it('setSearch resets page and triggers fetch', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        listRunMemorySnapshots: {
          entries: [],
          total: 0,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        },
      },
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useAgentMemoryIndexStore();
    store.page = 3;

    await store.setSearch('agent');

    expect(store.search).toBe('agent');
    expect(store.page).toBe(1);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('nextPage moves forward when possible', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        listRunMemorySnapshots: {
          entries: [],
          total: 2,
          page: 2,
          pageSize: 1,
          totalPages: 2,
        },
      },
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useAgentMemoryIndexStore();
    store.page = 1;
    store.totalPages = 2;

    await store.nextPage();

    expect(store.page).toBe(2);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });
});
