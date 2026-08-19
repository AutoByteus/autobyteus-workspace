import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import {
  buildTestTeamContext,
  testAgentContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
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

  it('preserves rooted nested topology and exact AgentRun lookup', () => {
    const store = useAgentTeamContextsStore();
    const team = buildTestTeamContext({
      teamRunId: 'nested-team-1', coordinatorAddress: '/program_manager',
      rootChildren: [
        testAgentNode('/program_manager', { agentRunId: 'program-manager-run' }),
        testSubTeamNode('/BuildSquad', [
          testAgentNode('/BuildSquad/reviewer', { agentRunId: 'reviewer-run' }),
          testAgentNode('/BuildSquad/implementer', { agentRunId: 'implementer-run' }),
        ], { teamRunId: 'build-squad-run', coordinatorAddress: '/BuildSquad/reviewer' }),
      ],
    });
    store.addTeamContext(team);

    expect(team.view.getExecutionTree().root_team.members).toMatchObject([
      { kind: 'configured_agent', address: '/program_manager' },
      { kind: 'configured_team', address: '/BuildSquad', members: [
        { kind: 'configured_agent', address: '/BuildSquad/reviewer' },
        { kind: 'configured_agent', address: '/BuildSquad/implementer' },
      ] },
    ]);
    expect(team.view.getAgentContext('reviewer-run')?.state.runId).toBe('reviewer-run');
    expect(team.view.getMemberAddress('implementer-run')).toBe('/BuildSquad/implementer');
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

  it('focuses a concrete task Agent without substituting its configured placement', () => {
    const store = useAgentTeamContextsStore();
    const team = buildTestTeamContext({
      teamRunId: 'task-team-1', coordinatorAddress: '/coordinator',
      rootChildren: [
        testAgentNode('/coordinator', { agentRunId: 'coordinator-run' }),
        testAgentNode('/worker', { agentRunId: 'worker-run' }),
      ],
      tasks: [testTaskRecord({
        taskId: 'task-1', delegatorAgentRunId: 'coordinator-run',
        recipientAddress: '/worker', target: { agentRunId: 'task-agent-run-1' },
      })],
    });
    store.addTeamContext(team);

    store.focusMember('task-team-1', 'task-agent-run-1');

    expect(team.view.getFocusedAgentRunId()).toBe('task-agent-run-1');
    expect(team.view.getAgentContext('task-agent-run-1')?.state.runId).toBe('task-agent-run-1');
    expect(team.view.getAgentContext('worker-run')?.state.runId).toBe('worker-run');
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
});
