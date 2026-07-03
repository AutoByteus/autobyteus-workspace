import { describe, expect, it, vi } from 'vitest'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus'
import { useWorkspaceHistorySelectionActions } from '../useWorkspaceHistorySelectionActions'
import type { TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes'

const buildTeamMemberRow = (
  memberRouteKey: string,
  memberPath: string[],
  overrides: Partial<TeamMemberTreeRow> = {},
): TeamMemberTreeRow => ({
  teamRunId: 'team-1',
  memberKind: 'agent',
  memberRouteKey,
  memberPath,
  memberName: memberPath.at(-1) || memberRouteKey,
  displayName: memberPath.at(-1) || memberRouteKey,
  memberRunId: `${memberRouteKey.replace(/\//g, '-')}-run`,
  workspaceRootPath: '/tmp/workspace',
  summary: '',
  lastActivityAt: '2026-05-17T00:00:00.000Z',
  currentStatus: AgentStatus.Offline,
  lastKnownStatus: 'IDLE',
  isActive: false,
  deleteLifecycle: 'READY',
  children: [],
  ...overrides,
})

const buildTeamNode = (focusedMemberRouteKey: string): TeamTreeNode => {
  const programManager = buildTeamMemberRow('program_manager', ['program_manager'])
  const buildReviewLead = buildTeamMemberRow(
    'BuildSquad/review_lead',
    ['BuildSquad', 'review_lead'],
    { memberName: 'review_lead', displayName: 'review_lead' },
  )
  const auditReviewLead = buildTeamMemberRow(
    'AuditSquad/review_lead',
    ['AuditSquad', 'review_lead'],
    { memberName: 'review_lead', displayName: 'review_lead' },
  )
  const buildSquad = buildTeamMemberRow('BuildSquad', ['BuildSquad'], {
    memberKind: 'agent_team',
    memberRunId: 'build-squad-handle',
    teamDefinitionId: 'build-squad',
    teamRunIdForNode: 'child-team-1',
    coordinatorMemberRouteKey: 'review_lead',
    children: [buildReviewLead],
  })
  const auditSquad = buildTeamMemberRow('AuditSquad', ['AuditSquad'], {
    memberKind: 'agent_team',
    memberRunId: 'audit-squad-handle',
    teamDefinitionId: 'audit-squad',
    teamRunIdForNode: 'child-team-2',
    coordinatorMemberRouteKey: 'review_lead',
    children: [auditReviewLead],
  })

  return {
    teamRunId: 'team-1',
    teamDefinitionId: 'delivery-team',
    teamDefinitionName: 'Delivery Team',
    workspaceRootPath: '/tmp/workspace',
    summary: '',
    lastActivityAt: '2026-05-17T00:00:00.000Z',
    lastKnownStatus: 'IDLE',
    isActive: false,
    currentStatus: AgentTeamStatus.Offline,
    deleteLifecycle: 'READY',
    focusedMemberRouteKey,
    members: [],
    memberTree: [programManager, buildSquad, auditSquad],
  }
}

const buildActions = () => {
  const runHistoryStore = {
    selectTreeRun: vi.fn(async () => undefined),
    createDraftRun: vi.fn(async () => undefined),
  }
  const selectionStore = {
    selectedType: null,
    selectedRunId: null,
    selectRun: vi.fn(),
  }

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
  }
}

describe('useWorkspaceHistorySelectionActions', () => {
  it('does not resolve focused team history selection by duplicate bare member name', async () => {
    const { actions, runHistoryStore } = buildActions()

    await actions.onSelectTeam(buildTeamNode('review_lead'))

    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({ memberRouteKey: 'program_manager' }),
    )
  })

  it('resolves focused team history selection by exact nested member route key', async () => {
    const { actions, runHistoryStore } = buildActions()

    await actions.onSelectTeam(buildTeamNode('BuildSquad/review_lead'))

    expect(runHistoryStore.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({ memberRouteKey: 'BuildSquad/review_lead' }),
    )
  })
})
