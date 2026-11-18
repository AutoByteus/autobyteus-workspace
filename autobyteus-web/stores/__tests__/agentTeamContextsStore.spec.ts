import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import {
  buildTestTeamContext,
  testAgentContext,
  testAgentNode,
} from '~/test-support/currentTeamTestFixtures';

const {
  primeRecentEventMonitorBaselineMock,
  resetRecentEventMonitorBaselineMock,
  refreshRunNavigationTopologyMock,
} = vi.hoisted(() => ({
  primeRecentEventMonitorBaselineMock: vi.fn(),
  resetRecentEventMonitorBaselineMock: vi.fn(),
  refreshRunNavigationTopologyMock: vi.fn(),
}));

vi.mock('~/services/eventMonitor/recentEventMonitorMutationCoordinator', () => ({
  primeRecentEventMonitorBaseline: primeRecentEventMonitorBaselineMock,
  resetRecentEventMonitorBaseline: resetRecentEventMonitorBaselineMock,
}));
vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({ refreshRunNavigationTopology: refreshRunNavigationTopologyMock }),
}));

describe('agentTeamContextsStore current Team execution view', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('indexes by exact root TeamRun identity and exposes current focused/member getters', () => {
    const store = useAgentTeamContextsStore();
    const selection = useAgentSelectionStore();
    const team = buildTestTeamContext({
      teamRunId: 'team-1', coordinatorAddress: '/coordinator',
      rootChildren: [
        testAgentNode('/coordinator', { displayName: 'Coordinator', agentRunId: 'coordinator-run' }),
        testAgentNode('/worker', { displayName: 'Worker', agentRunId: 'worker-run' }),
      ],
    });

    store.addTeamContext(team);
    selection.selectRunWithoutShellNavigation('team-1', 'team');

    expect(store.getTeamContextById('team-1')).toBe(team);
    expect(store.activeTeamContext).toBe(team);
    expect(store.activeExecutionFocusedMemberAddress).toBe('/coordinator');
    expect(store.focusedMemberContext?.state.runId).toBe('coordinator-run');
    expect(store.teamMembers.map((entry) => entry.memberAddress)).toEqual(['/coordinator', '/worker']);
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledTimes(2);
    expect(refreshRunNavigationTopologyMock).toHaveBeenCalledWith('team-context-add');
  });

  it('focuses exact AgentRun identity while preserving independent composer state', () => {
    const store = useAgentTeamContextsStore();
    const coordinatorContext = testAgentContext({ runId: 'coordinator-run', displayName: 'Coordinator' });
    coordinatorContext.requirement = 'keep this coordinator draft';
    const team = buildTestTeamContext({
      teamRunId: 'history-team-1', coordinatorAddress: '/coordinator',
      rootChildren: [
        testAgentNode('/coordinator', { agentRunId: 'coordinator-run' }),
        testAgentNode('/worker', { agentRunId: 'worker-run' }),
      ],
      contexts: [{ agentRunId: 'coordinator-run', context: coordinatorContext }],
    });
    store.addTeamContext(team);

    store.focusMember('history-team-1', 'worker-run');

    expect(team.view.getFocusedAgentRunId()).toBe('worker-run');
    expect(team.view.getAgentContext('coordinator-run')?.requirement).toBe('keep this coordinator draft');
    expect(team.view.getAgentContext('worker-run')?.requirement).toBe('');
  });

  it('fails closed for a foreign AgentRun focus and removes only the exact root context', () => {
    const store = useAgentTeamContextsStore();
    const team = buildTestTeamContext({
      teamRunId: 'team-1', coordinatorAddress: '/coordinator',
      rootChildren: [testAgentNode('/coordinator'), testAgentNode('/worker')],
    });
    store.addTeamContext(team);
    const initialFocus = team.view.getFocusedAgentRunId();

    store.focusMember('team-1', 'foreign-run');
    expect(team.view.getFocusedAgentRunId()).toBe(initialFocus);
    store.removeTeamContext('team-1');
    expect(store.getTeamContextById('team-1')).toBeUndefined();
    expect(resetRecentEventMonitorBaselineMock).toHaveBeenCalledTimes(2);
  });

  it('clears the selection instead of selecting another loaded team when the selected team is removed', () => {
    const store = useAgentTeamContextsStore();
    const selection = useAgentSelectionStore();
    store.addTeamContext(buildTestTeamContext({ teamRunId: 'team-other', rootChildren: [testAgentNode('/coordinator')] }));
    store.addTeamContext(buildTestTeamContext({ teamRunId: 'team-open', rootChildren: [testAgentNode('/coordinator')] }));
    selection.selectRun('team-open', 'team');

    store.removeTeamContext('team-open');

    expect(store.getTeamContextById('team-other')).toBeDefined();
    expect(selection.selectedRunId).toBeNull();
    expect(selection.selectedType).toBeNull();
  });

  it('keeps the selected team when a different team is removed', () => {
    const store = useAgentTeamContextsStore();
    const selection = useAgentSelectionStore();
    store.addTeamContext(buildTestTeamContext({ teamRunId: 'team-other', rootChildren: [testAgentNode('/coordinator')] }));
    store.addTeamContext(buildTestTeamContext({ teamRunId: 'team-open', rootChildren: [testAgentNode('/coordinator')] }));
    selection.selectRun('team-open', 'team');

    store.removeTeamContext('team-other');

    expect(selection.selectedRunId).toBe('team-open');
    expect(selection.selectedType).toBe('team');
  });
});
