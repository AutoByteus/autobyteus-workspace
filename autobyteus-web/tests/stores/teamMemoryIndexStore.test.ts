import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTeamMemoryIndexStore } from '~/stores/teamMemoryIndexStore';
import { getApolloClient } from '~/utils/apolloClient';

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}));

describe('teamMemoryIndexStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetchIndex populates team entries from API', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        listTeamRunMemorySnapshots: {
          entries: [
            {
              teamRunId: 'team-1',
              teamDefinitionId: 'team-def-1',
              teamDefinitionName: 'Alpha Team',
              lastUpdatedAt: '2026-03-07T00:00:00Z',
              members: [
                {
                  memberRouteKey: 'coordinator',
                  memberName: 'Coordinator',
                  memberRunId: 'member-1',
                  lastUpdatedAt: '2026-03-07T00:00:00Z',
                  hasWorkingContext: true,
                  hasEpisodic: false,
                  hasSemantic: true,
                  hasRawTraces: true,
                  hasRawArchive: false,
                },
              ],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
      },
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useTeamMemoryIndexStore();
    await store.fetchIndex();

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].teamRunId).toBe('team-1');
  });

  it('setSearch resets page and triggers fetch', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        listTeamRunMemorySnapshots: {
          entries: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
      },
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useTeamMemoryIndexStore();
    store.page = 3;

    await store.setSearch('alpha');

    expect(store.search).toBe('alpha');
    expect(store.page).toBe(1);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('toggleExpandedTeam toggles expansion state', () => {
    const store = useTeamMemoryIndexStore();
    expect(store.isTeamExpanded('team-1')).toBe(false);
    store.toggleExpandedTeam('team-1');
    expect(store.isTeamExpanded('team-1')).toBe(true);
    store.toggleExpandedTeam('team-1');
    expect(store.isTeamExpanded('team-1')).toBe(false);
  });
});
