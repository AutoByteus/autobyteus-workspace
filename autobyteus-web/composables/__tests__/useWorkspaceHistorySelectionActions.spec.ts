import { describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useWorkspaceHistorySelectionActions } from '../useWorkspaceHistorySelectionActions';
import type { TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';

const buildTeamMemberRow = (
  memberAddress: string,
  overrides: Partial<TeamMemberTreeRow> = {},
): TeamMemberTreeRow => ({
  teamRunId: 'team-1',
  kind: 'agent',
  memberAddress,
  displayName: memberAddress.split('/').filter(Boolean).at(-1) ?? memberAddress,
  agentRunId: `${memberAddress.replace(/\//g, '-')}-run`,
  workspaceRootPath: '/tmp/workspace',
  summary: '',
  lastActivityAt: '2026-05-17T00:00:00.000Z',
  currentStatus: AgentStatus.Offline,
  isActive: false,
  deleteLifecycle: 'READY',
  children: [],
  ...overrides,
});

const buildTeamNode = (focusedAgentRunId: string): TeamTreeNode => {
  const programManager = buildTeamMemberRow('/program_manager', { agentRunId: 'program-manager-run' });
  const buildReviewLead = buildTeamMemberRow('/BuildSquad/review_lead', { agentRunId: 'build-review-lead-run' });
  const auditReviewLead = buildTeamMemberRow('/AuditSquad/review_lead', { agentRunId: 'audit-review-lead-run' });
  const buildSquad = buildTeamMemberRow('/BuildSquad', {
    kind: 'agent_team',
    agentRunId: null,
    teamDefinitionId: 'build-squad',
    teamRunIdForNode: 'child-team-1',
    coordinatorAddress: buildReviewLead.memberAddress,
    children: [buildReviewLead],
  });
  const auditSquad = buildTeamMemberRow('/AuditSquad', {
    kind: 'agent_team',
    agentRunId: null,
    teamDefinitionId: 'audit-squad',
    teamRunIdForNode: 'child-team-2',
    coordinatorAddress: auditReviewLead.memberAddress,
    children: [auditReviewLead],
  });
  const rootTeam = buildTeamMemberRow('/', {
    kind: 'agent_team',
    agentRunId: null,
    displayName: 'Delivery Team',
    teamDefinitionId: 'delivery-team',
    teamRunIdForNode: 'team-1',
    coordinatorAddress: programManager.memberAddress,
    children: [programManager, buildSquad, auditSquad],
  });

  return {
    teamRunId: 'team-1',
    teamDefinitionId: 'delivery-team',
    teamDefinitionName: 'Delivery Team',
    workspaceRootPath: '/tmp/workspace',
    summary: '',
    lastActivityAt: '2026-05-17T00:00:00.000Z',
    isActive: false,
    deleteLifecycle: 'READY',
    focusedAgentRunId,
    rootTeam,
    members: [programManager, buildSquad, buildReviewLead, auditSquad, auditReviewLead],
    executionRows: [],
  };
};

const buildActions = (shell?: 'desktop' | 'mobile') => {
  const runHistoryStore = {
    selectTreeRun: vi.fn(async () => ({ disposition: 'committed' as const })),
  };
  const selectionStore = {
    beginSelectionIntent: () => ({ isCurrent: () => true }), selectedType: null, selectedRunId: null,
    selectRun: vi.fn(), selectRunWithoutShellNavigation: vi.fn(),
  };
  const presentTeamStreamRecoveryFeedback = vi.fn();
  const emitRunSelected = vi.fn();
  return {
    runHistoryStore,
    selectionStore,
    emitRunSelected,
    presentTeamStreamRecoveryFeedback,
    actions: useWorkspaceHistorySelectionActions({
      runHistoryStore,
      selectionStore,
      setTeamExpanded: vi.fn(),
      toggleTeam: vi.fn(),
      emitRunSelected,
      presentTeamStreamRecoveryFeedback,
      shell,
    }),
  };
};

describe('useWorkspaceHistorySelectionActions current AgentRun identity', () => {
  it('does not resolve focused Team history selection by a stale non-AgentRun selector', async () => {
    const { actions, runHistoryStore } = buildActions();
    await actions.onSelectTeam(buildTeamNode('review_lead'));
    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({ memberAddress: '/program_manager' }), expect.objectContaining({ selectionIntent: expect.any(Object) }),
    );
  });

  it('resolves focused Team history selection by its exact nested AgentRun id', async () => {
    const { actions, runHistoryStore } = buildActions();
    await actions.onSelectTeam(buildTeamNode('build-review-lead-run'));
    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({ memberAddress: '/BuildSquad/review_lead' }), expect.objectContaining({ selectionIntent: expect.any(Object) }),
    );
  });

  it.each([
    ['TEAM_STREAM_RECOVERY_WAIT: still working', 'wait'],
    ['TEAM_STREAM_RECOVERY_CHECKPOINT_CHANGED: changed', 'retry'],
    ['TEAM_STREAM_SNAPSHOT_BASE_MISMATCH: changed', 'retry'],
  ] as const)('presents %s as non-blocking recovery feedback', async (message, feedback) => {
    const { actions, runHistoryStore, presentTeamStreamRecoveryFeedback } = buildActions();
    runHistoryStore.selectTreeRun.mockRejectedValueOnce(new Error(message));

    await actions.onSelectTeamMember({
      teamRunId: 'team-1', memberAddress: '/program_manager', agentRunId: 'program-manager-run',
    });

    expect(presentTeamStreamRecoveryFeedback).toHaveBeenCalledWith(feedback);
  });

  // delegated-copy-task-locator REQ-012: a Task summary opens its Team run without collapsing it.
  it.each([
    ['onSelectTeam', true],
    ['onOpenTeamRun', false],
  ] as const)('%s on the already-selected Team run toggles=%s and navigates to it', async (action, toggles) => {
    const toggleTeam = vi.fn(), emitRunSelected = vi.fn(), selectTreeRun = vi.fn()
    const actions = useWorkspaceHistorySelectionActions({
      runHistoryStore: { selectTreeRun },
      selectionStore: { beginSelectionIntent: () => ({ isCurrent: () => true }), selectedType: 'team', selectedRunId: 'team-1', selectRun: vi.fn() },
      setTeamExpanded: vi.fn(), toggleTeam, emitRunSelected, presentTeamStreamRecoveryFeedback: vi.fn(),
    } as any)
    await actions[action](buildTeamNode('program-manager-run'))
    expect(toggleTeam).toHaveBeenCalledTimes(toggles ? 1 : 0)
    expect(selectTreeRun).not.toHaveBeenCalled()
    expect(emitRunSelected).toHaveBeenCalledWith({ type: 'team', runId: 'team-1' })
  })

  it('onOpenTeamRun opens a Team run that is not selected exactly like onSelectTeam', async () => {
    const { actions, runHistoryStore } = buildActions()
    await actions.onOpenTeamRun(buildTeamNode('build-review-lead-run'), 'workspace-1')
    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({ memberAddress: '/BuildSquad/review_lead' }), expect.objectContaining({ selectionIntent: expect.any(Object) }),
    )
  })

  // autobyteus-277: the phone opens through the same rules, selecting only; its route is its own.
  it('mobile shell: an agent run opens in the mobile selection mode', async () => {
    const { actions, runHistoryStore, emitRunSelected } = buildActions('mobile')
    const run = { runId: 'run-1' } as never
    await actions.onSelectRun(run)
    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(run, expect.objectContaining({ selectionMode: 'mobile' }))
    expect(emitRunSelected).toHaveBeenCalledWith({ type: 'agent', runId: 'run-1' })
  })

  it('mobile shell: a Team run opens its member in the mobile mode and selects the Team without shell navigation', async () => {
    const { actions, runHistoryStore, selectionStore } = buildActions('mobile')
    await actions.onOpenTeamRun(buildTeamNode('build-review-lead-run'))
    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({ memberAddress: '/BuildSquad/review_lead' }), expect.objectContaining({ selectionMode: 'mobile' }),
    )
    expect(selectionStore.selectRunWithoutShellNavigation).toHaveBeenCalledWith('team-1', 'team')
    expect(selectionStore.selectRun).not.toHaveBeenCalled()
  })

  it('mobile shell: a Team member opens in the mobile mode', async () => {
    const { actions, runHistoryStore } = buildActions('mobile')
    const member = { teamRunId: 'team-1', memberAddress: '/program_manager', agentRunId: 'program-manager-run' }
    await actions.onSelectTeamMember(member)
    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(member, expect.objectContaining({ selectionMode: 'mobile' }))
  })

  it('desktop shell (default): no selection mode is passed and the Team is selected with shell navigation', async () => {
    const { actions, runHistoryStore, selectionStore } = buildActions()
    await actions.onOpenTeamRun(buildTeamNode('build-review-lead-run'))
    expect((runHistoryStore.selectTreeRun.mock.calls[0] as unknown[])[1]).not.toHaveProperty('selectionMode')
    expect(selectionStore.selectRun).toHaveBeenCalledWith('team-1', 'team')
    expect(selectionStore.selectRunWithoutShellNavigation).not.toHaveBeenCalled()
  })

  it('onOpenAgentRun opens the run\'s own agent: its selected child is cleared, then the run opens', async () => {
    setActivePinia(createPinia())
    const collaboration = useAgentRunCollaborationStore()
    const selectChild = vi.spyOn(collaboration, 'selectChild')
    const { actions, runHistoryStore } = buildActions()
    const run = { runId: 'agent-run-1' } as never
    await actions.onOpenAgentRun(run)
    expect(selectChild).toHaveBeenCalledWith('agent-run-1', null)
    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(run, expect.any(Object))
    expect(selectChild.mock.invocationCallOrder[0]!).toBeLessThan(runHistoryStore.selectTreeRun.mock.invocationCallOrder[0]!)
  })
});
