import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTeamMemoryViewStore } from '~/stores/teamMemoryViewStore';
import { getApolloClient } from '~/utils/apolloClient';

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}));

describe('teamMemoryViewStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('setSelectedMember fetches team member memory view', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getTeamMemberRunMemoryView: {
          runId: 'member-1',
          workingContext: [],
          episodic: [],
          semantic: [],
          rawTraces: [],
        },
      },
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useTeamMemoryViewStore();
    await store.setSelectedMember({
      teamRunId: 'team-1',
      teamDefinitionName: 'Alpha Team',
      memberRouteKey: 'coordinator',
      memberName: 'Coordinator',
      memberRunId: 'member-1',
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(store.selectedTeamRunId).toBe('team-1');
    expect(store.selectedMemberRunId).toBe('member-1');
    expect(store.memoryView?.runId).toBe('member-1');
  });

  it('setIncludeRawTraces triggers fetch when enabled', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getTeamMemberRunMemoryView: {
          runId: 'member-2',
          workingContext: [],
          episodic: [],
          semantic: [],
          rawTraces: [],
        },
      },
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useTeamMemoryViewStore();
    store.selectedTeamRunId = 'team-2';
    store.selectedMemberRunId = 'member-2';

    await store.setIncludeRawTraces(true);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const variables = queryMock.mock.calls[0][0].variables;
    expect(variables.includeRawTraces).toBe(true);
  });

  it('clearSelection resets team selection and memory view', () => {
    const store = useTeamMemoryViewStore();
    store.selectedTeamRunId = 'team-1';
    store.selectedMemberRunId = 'member-1';
    store.memoryView = {
      runId: 'member-1',
      workingContext: [],
      episodic: [],
      semantic: [],
      rawTraces: [],
    };

    store.clearSelection();

    expect(store.selectedTeamRunId).toBeNull();
    expect(store.selectedMemberRunId).toBeNull();
    expect(store.memoryView).toBeNull();
  });
});
