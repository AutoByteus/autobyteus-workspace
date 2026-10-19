import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import {
  buildTestTeamContext,
  testAgentContext,
  testAgentNode,
  testTaskTeamLayout,
  testDelegation,
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

  it('preserves a delegated task Team topology and exact AgentRun lookup', () => {
    const store = useAgentTeamContextsStore();
    const buildSquad = testTaskTeamLayout('/BuildSquad', [
      testAgentNode('/BuildSquad/reviewer', { agentRunId: 'reviewer-run' }),
      testAgentNode('/BuildSquad/implementer', { agentRunId: 'implementer-run' }),
    ], { coordinatorAddress: '/BuildSquad/reviewer' });
    const team = buildTestTeamContext({
      teamRunId: 'delegating-team-1', coordinatorAddress: '/program_manager',
      rootChildren: [testAgentNode('/program_manager', { agentRunId: 'program-manager-run' })],
      delegations: [testDelegation({
        delegatorAgentRunId: 'program-manager-run', recipientAddress: '/BuildSquad',
        target: { teamRunId: 'build-squad-run', team: buildSquad },
      })],
    });
    store.addTeamContext(team);

    expect(team.view.getExecutionTree().root_team).toMatchObject({
      members: [{ kind: 'configured_agent', address: '/program_manager' }],
      task_executions: [{ kind: 'task_team', address: '/BuildSquad', team_run_id: 'build-squad-run', members: [
        { kind: 'task_team_agent', address: '/BuildSquad/reviewer', agent_run_id: 'build-squad-run:reviewer-run' },
        { kind: 'task_team_agent', address: '/BuildSquad/implementer', agent_run_id: 'build-squad-run:implementer-run' },
      ] }],
    });
    expect(team.view.getAgentContext('build-squad-run:reviewer-run')?.state.runId).toBe('build-squad-run:reviewer-run');
    expect(team.view.getMemberAddress('build-squad-run:implementer-run')).toBe('/BuildSquad/implementer');
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
      delegations: [testDelegation({ delegatorAgentRunId: 'coordinator-run', recipientAddress: '/worker', target: { agentRunId: 'task-agent-run-1' } })],
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
