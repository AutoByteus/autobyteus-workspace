import { describe, expect, it } from 'vitest'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { RunHistoryTransientExecutionRow, TeamTreeNode } from '~/stores/runHistoryTypes'
import type { RunListEntry } from '~/utils/runListProjection'
import { buildMobileRunTreeRows, openAgentRunIdOf, type MobileRunTreeSources } from '../mobileRunTreeProjection'

const agentRun = (runId: string, status = AgentStatus.Idle) => ({
  runId, summary: `[User Requirement]: ${runId} title`, lastActivityAt: '2026-11-06T10:00:00.000Z', currentStatus: status,
  lastKnownStatus: status, isActive: true, hasCollaboration: true, source: 'history' as const, isDraft: false,
})
const agentEntry = (runId: string): RunListEntry => ({
  kind: 'agent', key: `agent:${runId}`, runId, name: 'Project Task Manager', lastActivityAt: '2026-11-06T10:00:00.000Z',
  isActive: true, folderRootPath: '/ws', agentDefinitionId: 'ptm', avatarUrl: null, run: agentRun(runId) as never,
})
const task = (patch: Partial<RunHistoryTransientExecutionRow>): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution', transientKind: 'task_agent', rowKey: 'agent:x', teamRunId: 'host', memberAddress: '/x', agentRunId: 'x',
  teamRunIdForNode: null, memberKind: 'agent', displayName: 'x', currentStatus: AgentStatus.Running, delegatedBy: 'manager', depth: 0,
  hasChildren: false, ...patch,
})
const sources = (patch: Partial<MobileRunTreeSources>): MobileRunTreeSources => ({
  entries: [], taskRows: () => [], orgRows: () => [], remoteReachable: () => true, remoteTitle: () => null, taskSummary: () => null,
  isRunExpanded: () => true, isTeamExpanded: () => false, isTeamRowExpanded: () => false, isAgentOrgRunExpanded: () => true,
  isAgentOrgTeamExpanded: () => false, isTaskTeamExpanded: () => false, isAgentOrgTaskTeamExpanded: () => false, ...patch,
})

// The design's reproduction (autobyteus-277 Guidance): the phone's list had no delegated rows at all.
describe('buildMobileRunTreeRows', () => {
  const display = (row: RunHistoryTransientExecutionRow, teamStatus: AgentStatus | null) => ({ row, teamStatus: teamStatus as never, continuingAncestorDepths: [], hasFollowingSibling: false })
  const hostRows = [
    display(task({ rowKey: 'agent:writer', agentRunId: 'writer', displayName: 'Agent Package Creator' }), null),
    display(task({ rowKey: 'team:se', transientKind: 'task_team', agentRunId: null, teamRunIdForNode: 'se-team', memberKind: 'agent_team', displayName: 'Software Engineering Team', currentStatus: null, hasChildren: true }), AgentStatus.Running),
    display(task({ rowKey: 'agent:designer', transientKind: 'task_team_child', agentRunId: 'designer', displayName: 'solution_designer', depth: 1 }), null),
    display(task({ rowKey: 'team:remote', transientKind: 'task_team', agentRunId: null, teamRunIdForNode: 'marketing', memberKind: 'agent_team', displayName: 'Marketing Team', currentStatus: null, hasChildren: true, remote: { runId: 'marketing', nodeName: 'docker' } }), AgentStatus.Idle),
  ]

  it('nests a standalone run\'s task agent, task team with its member, and remote task team under it: depths 0/1/1/2/1', () => {
    const rows = buildMobileRunTreeRows(sources({ entries: [agentEntry('host')], taskRows: () => hostRows, isTaskTeamExpanded: () => true }))
    expect(rows.map((row) => [row.name, row.depth])).toEqual([
      ['Project Task Manager', 0], ['Agent Package Creator', 1], ['Software Engineering Team', 1], ['solution_designer', 2], ['Marketing Team', 1],
    ])
    expect(rows[0]).toMatchObject({ avatar: 'agent', title: 'host title', hasChildren: true, expanded: true, fold: { kind: 'run', runId: 'host' }, lastActivityAt: '2026-11-06T10:00:00.000Z' })
    expect(rows[2]).toMatchObject({ avatar: 'team', status: AgentStatus.Running, hasChildren: true, expanded: true, fold: { kind: 'taskTeam', hostRunId: 'host', teamRunId: 'se-team' } })
    expect(rows[3]!.remote).toBeNull()
    expect(rows[4]!.remote).toEqual({ nodeName: 'docker', reachable: true })
    expect(rows.slice(1).every((row) => row.lastActivityAt === null)).toBe(true)
  })

  it('a folded run shows no delegated rows; folding keeps the chevron', () => {
    const rows = buildMobileRunTreeRows(sources({ entries: [agentEntry('host')], taskRows: () => hostRows, isRunExpanded: () => false }))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ hasChildren: true, expanded: false })
  })

  it('a run on a node that does not answer is marked not reachable, its title from its node', () => {
    const rows = buildMobileRunTreeRows(sources({ entries: [agentEntry('host')], taskRows: () => [hostRows[3]!], remoteReachable: () => false, remoteTitle: () => 'Plan the launch' }))
    expect(rows[1]).toMatchObject({ remote: { nodeName: 'docker', reachable: false }, title: 'Plan the launch' })
  })

  it('each row opens through its kind; the open-row check uses the agent the row opens', () => {
    const rows = buildMobileRunTreeRows(sources({ entries: [agentEntry('host')], taskRows: () => hostRows, isTaskTeamExpanded: () => true }))
    expect(rows.map((row) => row.open?.kind)).toEqual(['agentRun', 'taskRow', 'taskRow', 'taskRow', 'taskRow'])
    expect(rows.map(openAgentRunIdOf)).toEqual(['host', 'writer', null, 'designer', null])
  })

  it('a Team run unfolds into its members; a folded member hides its delegated work', () => {
    const team = {
      teamRunId: 'team-1', teamDefinitionName: 'Software Team', summary: 'Ship it', isActive: true, focusedAgentRunId: 'lead',
      executionRows: [
        { kind: 'stable_member', rowKey: 'm:lead', teamRunId: 'team-1', memberAddress: '/lead', agentRunId: 'lead', teamRunIdForNode: null, memberKind: 'agent', displayName: 'lead', depth: 0, hasChildren: true, row: { currentStatus: AgentStatus.Running } },
        task({ rowKey: 't:sub', teamRunId: 'team-1', agentRunId: 'sub', displayName: 'sub', depth: 1 }),
        { kind: 'stable_member', rowKey: 'm:dev', teamRunId: 'team-1', memberAddress: '/dev', agentRunId: 'dev', teamRunIdForNode: null, memberKind: 'agent', displayName: 'dev', depth: 0, hasChildren: false, row: { currentStatus: AgentStatus.Idle } },
      ],
    } as unknown as TeamTreeNode
    const entry: RunListEntry = { kind: 'team', key: 'team:team-1', runId: 'team-1', name: 'Software Team', lastActivityAt: '2026-11-06T09:00:00.000Z', isActive: true, folderRootPath: null, team }
    expect(buildMobileRunTreeRows(sources({ entries: [entry] })).map((row) => row.name)).toEqual(['Software Team'])
    const rows = buildMobileRunTreeRows(sources({ entries: [entry], isTeamExpanded: () => true }))
    expect(rows.map((row) => [row.name, row.depth])).toEqual([['Software Team', 0], ['lead', 1], ['dev', 1]])
    expect(rows[1]).toMatchObject({ hasChildren: true, expanded: false, fold: { kind: 'teamRow', teamRunId: 'team-1', rowKey: 'm:lead' } })
    expect(rows[2]!.open).toEqual({ kind: 'teamMember', target: { teamRunId: 'team-1', memberAddress: '/dev', agentRunId: 'dev' } })
    expect(buildMobileRunTreeRows(sources({ entries: [entry], isTeamExpanded: () => true, isTeamRowExpanded: () => true })).map((row) => row.name))
      .toEqual(['Software Team', 'lead', 'sub', 'dev'])
  })

  it('an Org run lists its members under it, unfolded by the phone\'s default; a Team member opens by address', () => {
    const orgRun = { rootRunId: 'org-1', summary: 'Prepare the launch', isActive: true, executionTree: { rootOrg: { members: [{ address: '/lead', agentRunId: 'lead' }] } } }
    const entry = { kind: 'org', key: 'org:org-1', runId: 'org-1', name: 'Product Launch Org', lastActivityAt: '2026-11-06T08:00:00.000Z', isActive: true, folderRootPath: null, definitionId: 'org-def', orgRun } as unknown as RunListEntry
    const rows = buildMobileRunTreeRows(sources({
      entries: [entry],
      orgRows: () => [
        { row: { key: 'agent:lead', kind: 'agent', address: '/launch_lead', agentRunId: 'lead', status: AgentStatus.Running, depth: 0 }, continuingAncestorDepths: [], hasFollowingSibling: true },
        { row: { key: 'team:t', kind: 'team', address: '/content_team', teamRunId: 't', status: AgentStatus.Idle, depth: 0 }, continuingAncestorDepths: [], hasFollowingSibling: false },
      ],
    }))
    expect(rows.map((row) => [row.name, row.depth, row.avatar])).toEqual([['Product Launch Org', 0, 'org'], ['launch lead', 1, 'agent'], ['content team', 1, 'team']])
    expect(rows[0]).toMatchObject({ status: AgentStatus.Running, title: 'Prepare the launch', expanded: true, open: { kind: 'orgRun' } })
    expect(rows[2]).toMatchObject({ open: { kind: 'orgMember', address: '/content_team', agentRunId: null }, fold: { kind: 'orgTeam', rootRunId: 'org-1', address: '/content_team' } })
    expect(openAgentRunIdOf(rows[1]!)).toBe('lead')
    expect(openAgentRunIdOf(rows[2]!)).toBeNull()
  })

  // REQ-002a, DEC-010 (SR-005): the second line where the data has one, and one line otherwise.
  it('a Task worker row shows its Task\'s summary; a remote run without a Task its title; a member one line', () => {
    const rows = buildMobileRunTreeRows(sources({
      entries: [agentEntry('host')], taskRows: () => hostRows, isTaskTeamExpanded: () => true,
      taskSummary: (row) => (row.agentRunId === 'writer' ? 'Package the release-notes agent' : row.teamRunIdForNode === 'se-team' ? 'Image context files don\'t reach the model' : null),
      remoteTitle: (runId) => (runId === 'marketing' ? 'Plan the 1.6 launch campaign' : null),
    }))
    expect(rows.map((row) => [row.name, row.title])).toEqual([
      ['Project Task Manager', 'host title'],
      ['Agent Package Creator', 'Package the release-notes agent'],
      ['Software Engineering Team', 'Image context files don\'t reach the model'],
      ['solution_designer', ''],
      ['Marketing Team', 'Plan the 1.6 launch campaign'],
    ])
  })

  it('an Org run with no member has nothing to open', () => {
    const orgRun = { rootRunId: 'org-0', summary: '', isActive: false, executionTree: { rootOrg: { members: [] } } }
    const entry = { kind: 'org', key: 'org:org-0', runId: 'org-0', name: 'Empty Org', lastActivityAt: '2026-11-06T08:00:00.000Z', isActive: false, folderRootPath: null, definitionId: 'd', orgRun } as unknown as RunListEntry
    expect(buildMobileRunTreeRows(sources({ entries: [entry] }))[0]).toMatchObject({ open: null, hasChildren: false })
  })
})
