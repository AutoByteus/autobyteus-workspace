import { describe, expect, it, vi } from 'vitest';
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

const buildActions = () => {
  const runHistoryStore = {
    selectTreeRun: vi.fn(async () => undefined),
    createDraftRun: vi.fn(async () => undefined),
  };
  const selectionStore = { selectedType: null, selectedRunId: null, selectRun: vi.fn() };
  const presentTeamStreamRecoveryFeedback = vi.fn();
  return {
    runHistoryStore,
    presentTeamStreamRecoveryFeedback,
    actions: useWorkspaceHistorySelectionActions({
      runHistoryStore,
      selectionStore,
      setTeamExpanded: vi.fn(),
      toggleTeam: vi.fn(),
      emitRunSelected: vi.fn(),
      emitRunCreated: vi.fn(),
      presentTeamStreamRecoveryFeedback,
    }),
  };
};

describe('useWorkspaceHistorySelectionActions current AgentRun identity', () => {
  it('does not resolve focused Team history selection by a stale non-AgentRun selector', async () => {
    const { actions, runHistoryStore } = buildActions();
    await actions.onSelectTeam(buildTeamNode('review_lead'));
    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({ memberAddress: '/program_manager' }),
    );
  });

  it('resolves focused Team history selection by its exact nested AgentRun id', async () => {
    const { actions, runHistoryStore } = buildActions();
    await actions.onSelectTeam(buildTeamNode('build-review-lead-run'));
    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({ memberAddress: '/BuildSquad/review_lead' }),
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
});
