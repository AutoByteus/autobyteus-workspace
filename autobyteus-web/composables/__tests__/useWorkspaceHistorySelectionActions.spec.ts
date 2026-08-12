import { describe, expect, it, vi } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
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

const buildTeamNode = (focusedMemberAddress: string): TeamTreeNode => {
  const programManager = buildTeamMemberRow('/program_manager');
  const buildReviewLead = buildTeamMemberRow('/BuildSquad/review_lead');
  const auditReviewLead = buildTeamMemberRow('/AuditSquad/review_lead');
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
    focusedExecutionAddress: createTeamExecutionAddress({
      rootTeamRunId: 'team-1',
      memberAddress: focusedMemberAddress,
    }),
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
  return {
    runHistoryStore,
    actions: useWorkspaceHistorySelectionActions({
      runHistoryStore,
      selectionStore,
      setTeamExpanded: vi.fn(),
      toggleTeam: vi.fn(),
      emitRunSelected: vi.fn(),
      emitRunCreated: vi.fn(),
    }),
  };
};

describe('useWorkspaceHistorySelectionActions current rooted addresses', () => {
  it('does not resolve focused Team history selection by a duplicate bare member name', async () => {
    const { actions, runHistoryStore } = buildActions();
    await actions.onSelectTeam(buildTeamNode('/review_lead'));
    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({ memberAddress: '/program_manager' }),
    );
  });

  it('resolves focused Team history selection by its exact nested member address', async () => {
    const { actions, runHistoryStore } = buildActions();
    await actions.onSelectTeam(buildTeamNode('/BuildSquad/review_lead'));
    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({ memberAddress: '/BuildSquad/review_lead' }),
    );
  });
});
