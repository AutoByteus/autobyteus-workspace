import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RunCollaborationStatusesDto } from '@autobyteus/collaboration-stream-contracts'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { buildTestTeamContext, testAgentNode, testDelegation, testTaskTeamLayout } from '~/test-support/currentTeamTestFixtures'
import { buildRunHistoryTeamExecutionRows } from '~/stores/runHistoryTeamExecutionRows'
import { buildRunHistoryNavigationProjection } from '~/stores/runHistoryNavigationProjection'
import type { AgentOrgRunHistoryItem, TeamTreeNode } from '~/stores/runHistoryTypes'
import { projectAgentOrgHistoryRows } from '~/utils/agentOrgHistoryRows'
import { buildMobileRunTreeRows, type MobileRunTreeSources } from '~/utils/mobile/mobileRunTreeProjection'
import type { RunListEntry } from '~/utils/runListProjection'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'

const query = vi.hoisted(() => vi.fn())
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query }) }))

import { useListedRunChildrenStore } from '~/stores/listedRunChildrenStore'
import { readListedRunChildren } from '~/services/listedRuns/listedRunChildrenQuery'

/**
 * autobyteus-461 SR-055: a listed Team or Org run that is not open shows the runs it delegated to from the history
 * poll's answer, desktop and phone: a child's row appears within one poll under its delegating member with its live
 * status, leaves at the poll after its Task closes and returns on a reopen. The rows are the open view's rows for the
 * same children; an open run's rows keep coming from its view.
 */
type Answer = RunCollaborationStatusesDto[number]
type Child = Answer['children'][number]
const startedAt = '2026-09-01T00:00:01.000Z'
const agentChild = (agentRunId: string, address: string, delegator: [string, string | null], status: string): Child => ({
  row: { kind: 'agent', address, agentRunId, agentDefinitionId: 'd', delegatorAgentRunId: delegator[0], startedAt },
  delegatorAddress: delegator[1], statuses: [{ agentRunId, memberAddress: address, status }], node: null,
})
/** A child on a peer node (SR-057): its identity from its Task entry, its node, and no statuses. */
const peerChild = (agentRunId: string, address: string, delegator: [string, string | null]): Child => ({
  row: { kind: 'agent', address, agentRunId, agentDefinitionId: null, delegatorAgentRunId: delegator[0], startedAt: '2026-09-01T00:00:09.000Z' },
  delegatorAddress: delegator[1], statuses: [], node: { nodeId: 'node-b', nodeName: 'docker' },
})
const teamChild = (teamRunId: string, address: string, members: [string, string, string][], delegator: [string, string | null]): Child => ({
  row: { kind: 'agent_team', address, teamRunId, coordinatorAgentRunId: members[0]![1], delegatorAgentRunId: delegator[0], startedAt,
    members: members.map(([memberAddress, agentRunId]) => ({ address: memberAddress, agentRunId, agentDefinitionId: null })) },
  delegatorAddress: delegator[1],
  statuses: members.map(([memberAddress, agentRunId, status]) => ({ agentRunId, memberAddress, status })), node: null,
})

beforeEach(() => {
  setActivePinia(createPinia())
  query.mockReset()
})

/** One history poll: the server answers `answer` for the listed runs. */
const poll = async (runs: { kind: 'agent' | 'agent_team' | 'agent_org'; runId: string }[], answer: Answer[]) => {
  query.mockResolvedValueOnce({ data: { runCollaborationStatuses: answer } })
  return useListedRunChildrenStore().refresh(runs)
}

describe('the poll\'s read', () => {
  it('asks at most 100 runs per read: 101 listed runs are two reads', async () => {
    query.mockImplementation(async ({ variables }) => ({ data: { runCollaborationStatuses: variables.runs.map((run: { kind: string; runId: string }) => ({ ...run, isActive: false, children: [] })) } }))
    const runs = Array.from({ length: 101 }, (_, index) => ({ kind: 'agent' as const, runId: `run-${index}` }))
    await expect(readListedRunChildren(runs)).resolves.toHaveLength(101)
    expect(query.mock.calls.map(([options]) => options.variables.runs.length)).toEqual([100, 1])
    expect(query.mock.calls[0]![0]).toMatchObject({ fetchPolicy: 'network-only' })
  })

  it('a failed read keeps the previous answers; an unchanged answer reports no change', async () => {
    const runs = [{ kind: 'agent_team' as const, runId: 'team-1' }]
    const answer = [{ kind: 'agent_team' as const, runId: 'team-1', isActive: true, children: [] }]
    await expect(poll(runs, answer)).resolves.toBe(true)
    await expect(poll(runs, answer)).resolves.toBe(false)
    query.mockRejectedValueOnce(new Error('offline'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await expect(useListedRunChildrenStore().refresh(runs)).resolves.toBe(false)
    expect(useListedRunChildrenStore().answerOf('agent_team', 'team-1')).toEqual(answer[0])
    // A malformed answer is a failed read too.
    query.mockResolvedValueOnce({ data: { runCollaborationStatuses: [{ kind: 'agent_team', runId: 'team-1' }] } })
    await expect(useListedRunChildrenStore().refresh(runs)).resolves.toBe(false)
  })
})

describe('a listed Team run that is not open', () => {
  const ROOT = 'team-1'
  const member = (memberAddress: string, agentRunId: string) => ({
    teamRunId: ROOT, kind: 'agent', memberAddress, displayName: memberAddress.slice(1), agentRunId, teamRunIdForNode: null,
    workspaceRootPath: '/ws', summary: '', lastActivityAt: '', currentStatus: AgentStatus.Idle, isActive: false, deleteLifecycle: 'READY', children: [],
  })
  const team = (): TeamTreeNode => ({
    teamRunId: ROOT, teamDefinitionId: 'team-def', teamDefinitionName: 'Team', workspaceRootPath: '/ws', summary: 'Ship it',
    lastActivityAt: '', isActive: false, deleteLifecycle: 'READY', focusedAgentRunId: 'manager-run',
    rootTeam: { ...member('/', ''), kind: 'agent_team', children: [] },
    members: [member('/manager', 'manager-run'), member('/reviewer', 'reviewer-run')], executionRows: [],
  }) as never
  const runs = [{ kind: 'agent_team' as const, runId: ROOT }]
  const childrenWith = (worker: string, lead: string, tester: string, memberIdPrefix = '') => [
    agentChild('worker-run', '/manager', ['manager-run', '/manager'], worker),
    teamChild('qa-run', '/qa_team', [['/qa_team/lead', `${memberIdPrefix}qa-lead-run`, lead], ['/qa_team/tester', `${memberIdPrefix}qa-tester-run`, tester]],
      ['manager-run', '/manager']),
  ]
  /** The open view of the same Team with the same children (the fixture names a child team's members `<team run>:<id>`). */
  const viewContext = () => buildTestTeamContext({ teamRunId: ROOT, coordinatorAddress: '/manager',
    rootChildren: [testAgentNode('/manager', { agentRunId: 'manager-run' }), testAgentNode('/reviewer', { agentRunId: 'reviewer-run' })],
    delegations: [
      testDelegation({ delegatorAgentRunId: 'manager-run', recipientAddress: '/manager', target: { agentRunId: 'worker-run' } }),
      testDelegation({ delegatorAgentRunId: 'manager-run', recipientAddress: '/qa_team', target: { teamRunId: 'qa-run',
        team: testTaskTeamLayout('/qa_team', [testAgentNode('/qa_team/lead', { agentRunId: 'qa-lead-run' }),
          testAgentNode('/qa_team/tester', { agentRunId: 'qa-tester-run' })], { coordinatorAddress: '/qa_team/lead' }) } }),
    ] })
  const children = childrenWith('running', 'idle', 'running')
  const rows = () => buildRunHistoryTeamExecutionRows(team(), null, useListedRunChildrenStore().answerOf('agent_team', ROOT))
  const shape = () => rows().map((row) => [row.rowKey, row.depth, row.hasChildren,
    row.kind === 'transient_execution' ? row.currentStatus : null, row.kind === 'transient_execution' ? row.delegatedBy : null])

  it('desktop: shows each child within one poll, placed as its view places it, with its live status; it leaves on close and returns on reopen', async () => {
    expect(shape()).toEqual([['agent:manager-run', 0, false, null, null], ['agent:reviewer-run', 0, false, null, null]])
    await poll(runs, [{ kind: 'agent_team', runId: ROOT, isActive: false, children }])
    expect(shape()).toEqual([
      ['agent:manager-run', 0, false, null, null],
      // A copy at a member's address follows that member at its level.
      ['agent:worker-run', 0, false, 'running', 'manager'],
      ['agent:reviewer-run', 0, false, null, null],
      // Any other child follows the members, its members below it.
      ['team:qa-run', 0, true, null, 'manager'],
      ['agent:qa-lead-run', 1, false, 'idle', null],
      ['agent:qa-tester-run', 1, false, 'running', null],
    ])
    // Its Task closes: the next poll's answer no longer has it.
    await poll(runs, [{ kind: 'agent_team', runId: ROOT, isActive: false, children: [children[1]!] }])
    expect(shape().map(([key]) => key)).toEqual(['agent:manager-run', 'agent:reviewer-run', 'team:qa-run', 'agent:qa-lead-run', 'agent:qa-tester-run'])
    // Reopened: it returns.
    await poll(runs, [{ kind: 'agent_team', runId: ROOT, isActive: false, children }])
    expect(shape().map(([key]) => key)).toContain('agent:worker-run')
  })

  it('desktop: a child on a peer node follows the members at the top level, marked with its node, with no status (SR-057)', async () => {
    await poll(runs, [{ kind: 'agent_team', runId: ROOT, isActive: false, children: [...children, peerChild('far-run', '/manager', ['manager-run', '/manager'])] }])
    const peer = rows().at(-1)!
    expect(rows().map((row) => row.rowKey).at(-1)).toBe('agent:far-run')
    expect(peer).toMatchObject({ depth: 0, remote: { runId: 'far-run', nodeName: 'docker' }, currentStatus: AgentStatus.Offline, delegatedBy: 'manager' })
  })

  it('desktop: the navigation projection draws a listed Team that is not open from its answer, an open one from its view', async () => {
    const context = viewContext()
    const rootTeam = { ...context.view.getExecutionTree().root_team, task_executions: [] }
    const historyRun = { teamRunId: ROOT, teamDefinitionId: 'team-def', teamDefinitionName: 'Team', coordinatorAddress: '/manager',
      workspaceRootPath: '/ws', summary: 'Ship it', createdAt: startedAt, lastActivityAt: startedAt, archivedAt: null, terminatedAt: null,
      isActive: false, rootTeam, members: rootTeam.members.map((member) => ({ memberAddress: member.address, displayName: member.address.slice(1),
        agentRunId: member.agent_run_id, status: 'offline', runtimeKind: 'autobyteus', workspaceRootPath: '/ws' })) }
    const build = (teamContexts: typeof context[]) => buildRunHistoryNavigationProjection({
      listedChildren: (kind, runId) => useListedRunChildrenStore().answerOf(kind, runId),
      workspaceGroups: [{ workspaceRootPath: '/ws', workspaceName: 'ws', agentDefinitions: [],
        teamDefinitions: [{ teamDefinitionId: 'team-def', teamDefinitionName: 'Team', runs: [historyRun] }] }] as never,
      agentAvatarByDefinitionId: {}, allWorkspaces: [{ workspaceId: '/ws', workspaceRootPath: '/ws', name: 'ws' }], workspacesById: {},
      agentContexts: new Map(), teamContexts, agentOrgHistory: [],
    }).teamNodes[0]!.executionRows.map((row) => row.rowKey)
    expect(build([])).toEqual(['agent:manager-run', 'agent:reviewer-run'])
    await poll(runs, [{ kind: 'agent_team', runId: ROOT, isActive: false, children }])
    expect(build([])).toEqual(['agent:manager-run', 'agent:worker-run', 'agent:reviewer-run', 'team:qa-run', 'agent:qa-lead-run', 'agent:qa-tester-run'])
    // Opened: its view's rows; the answer is not used.
    expect(build([context])).toEqual(['agent:manager-run', 'agent:worker-run', 'agent:reviewer-run', 'team:qa-run', 'agent:qa-run:qa-lead-run', 'agent:qa-run:qa-tester-run'])
  })

  it('matches the open view\'s rows for the same children, and an open Team keeps its view\'s rows', async () => {
    const context = viewContext()
    // The fixture's children are not loaded: the view shows them offline, as the answer does here.
    const viewRows = buildRunHistoryTeamExecutionRows(team(), context, null)
    await poll(runs, [{ kind: 'agent_team', runId: ROOT, isActive: false, children: childrenWith('offline', 'offline', 'offline', 'qa-run:') }])
    const comparable = (all: ReturnType<typeof rows>) => all.map((row) => ({ ...row, ...(row.kind === 'stable_member' ? { row: null } : {}) }))
    expect(comparable(rows())).toEqual(comparable(viewRows))
    // The open run: its view's rows, whatever the answer holds.
    await poll(runs, [{ kind: 'agent_team', runId: ROOT, isActive: false, children: [] }])
    expect(buildRunHistoryTeamExecutionRows(team(), context, useListedRunChildrenStore().answerOf('agent_team', ROOT))).toEqual(viewRows)
  })

  it('phone: the same rows unfold under the Team run and its members', async () => {
    await poll(runs, [{ kind: 'agent_team', runId: ROOT, isActive: false, children }])
    const node = { ...team(), executionRows: rows() }
    const entry: RunListEntry = { kind: 'team', key: `team:${ROOT}`, runId: ROOT, name: 'Team', lastActivityAt: '', isActive: false, folderRootPath: null, team: node }
    const phone = buildMobileRunTreeRows(phoneSources({ entries: [entry], isTeamExpanded: () => true, isTeamRowExpanded: () => true }))
    expect(phone.map((row) => [row.name, row.depth, row.status])).toEqual([
      ['Team', 0, AgentStatus.Offline],
      ['manager', 1, AgentStatus.Idle], ['manager', 1, 'running'], ['reviewer', 1, AgentStatus.Idle],
      // A Team row's status follows the Team run's on the phone (`teamBranchStatus`), as for the open view.
      ['qa team', 1, AgentStatus.Offline], ['lead', 2, 'idle'], ['tester', 2, 'running'],
    ])
    expect(phone[2]!.open).toEqual({ kind: 'teamMember', target: { teamRunId: ROOT, memberAddress: '/manager', agentRunId: 'worker-run' } })
  })
})

describe('a listed Org run that is not open', () => {
  const view = taskBearingView()
  const storedTree = () => ({ ...structuredClone(view.execution_tree), rootOrg: { ...structuredClone(view.execution_tree.rootOrg), taskExecutions: [] } })
  const run = (tree = storedTree()): AgentOrgRunHistoryItem => ({
    stableKey: 'agent_org_run:org-run', rootSubjectKind: 'agent_org', rootRunId: 'org-run', createdAt: tree.createdAt,
    lastActivityAt: tree.createdAt, archivedAt: null, isActive: false, summary: 'Org', executionTree: tree as never,
  })
  const runs = [{ kind: 'agent_org' as const, runId: 'org-run' }]
  // The fixture's two children, as the poll answers them: the director's copies of '/worker' and '/team'.
  const children = (status: string) => [
    agentChild('agent-worker-task', '/worker', ['agent-director', '/director'], status),
    teamChild('team-task', '/team', [['/team/lead', 'agent-task-lead', status], ['/team/worker', 'agent-task-worker', status]], ['agent-director', '/director']),
  ]
  const rows = () => projectAgentOrgHistoryRows({ run: run(), context: null, isTeamExpanded: () => false, isTaskTeamExpanded: () => true,
    listed: useListedRunChildrenStore().answerOf('agent_org', 'org-run') })
  const keys = () => rows().map((display) => display.row.key)

  it('desktop: shows each child within one poll with its own live status; it leaves on close and returns on reopen', async () => {
    expect(keys()).toEqual(['agent:agent-director', 'agent:agent-worker-configured', 'team:team-configured'])
    await poll(runs, [{ kind: 'agent_org', runId: 'org-run', isActive: false, children: children('running') }])
    expect(rows().slice(3).map(({ row }) => [row.key, row.depth, 'status' in row ? row.status : null,
      'delegatedBy' in row ? row.delegatedBy : null])).toEqual([
      ['task-agent:agent-worker-task', 0, 'running', { agentRunId: 'agent-director', address: '/director' }],
      ['task-team:team-task', 0, 'running', { agentRunId: 'agent-director', address: '/director' }],
      ['task-team-agent:agent-task-lead', 1, 'running', null],
      ['task-team-agent:agent-task-worker', 1, 'running', null],
    ])
    expect(rows().find(({ row }) => row.key === 'task-team:team-task')!.row).toMatchObject({ coordinatorAgentRunId: 'agent-task-lead', coordinatorAddress: '/team/lead' })
    await poll(runs, [{ kind: 'agent_org', runId: 'org-run', isActive: false, children: [children('running')[1]!] }])
    expect(keys()).not.toContain('task-agent:agent-worker-task')
    await poll(runs, [{ kind: 'agent_org', runId: 'org-run', isActive: false, children: children('running') }])
    expect(keys()).toContain('task-agent:agent-worker-task')
  })

  it('desktop and phone: a child on a peer node is the shared delegated row with its node, without a status (SR-057)', async () => {
    await poll(runs, [{ kind: 'agent_org', runId: 'org-run', isActive: false, children: [...children('running'), peerChild('far-run', '/far', ['agent-director', '/director'])] }])
    const remote = rows().find(({ row }) => row.key === 'agent:far-run')!.row
    expect(remote).toMatchObject({ kind: 'remote', openAgentRunId: 'far-run', openAddress: '/far',
      transient: { remote: { runId: 'far-run', nodeName: 'docker' }, currentStatus: AgentStatus.Offline, delegatedBy: 'director' } })
    const entry: RunListEntry = { kind: 'org', key: 'org:org-run', runId: 'org-run', name: 'Org', lastActivityAt: '', isActive: false,
      folderRootPath: null, orgRun: run() } as never
    const phone = buildMobileRunTreeRows(phoneSources({ entries: [entry], orgRows: () => rows(), isAgentOrgRunExpanded: () => true }))
    expect(phone.at(-1)).toMatchObject({ name: 'far', remote: { nodeName: 'docker', reachable: true }, open: { kind: 'orgExecution', agentRunId: 'far-run' } })
  })

  it('matches the view\'s rows for the same children', async () => {
    await poll(runs, [{ kind: 'agent_org', runId: 'org-run', isActive: false, children: children('offline') }])
    const viewRows = projectAgentOrgHistoryRows({ run: run(view.execution_tree as never), context: null, isTeamExpanded: () => false,
      isTaskTeamExpanded: () => true, listed: null })
    expect(rows()).toEqual(viewRows)
  })

  it('phone: the same rows unfold under the Org run', async () => {
    await poll(runs, [{ kind: 'agent_org', runId: 'org-run', isActive: false, children: children('running') }])
    const entry: RunListEntry = { kind: 'org', key: 'org:org-run', runId: 'org-run', name: 'Org', lastActivityAt: '', isActive: false,
      folderRootPath: null, orgRun: run() } as never
    const phone = buildMobileRunTreeRows(phoneSources({ entries: [entry], orgRows: () => rows(), isAgentOrgRunExpanded: () => true }))
    expect(phone.slice(4).map((row) => [row.name, row.depth, row.status, row.open?.kind])).toEqual([
      ['worker', 1, 'running', 'orgExecution'], ['team', 1, 'running', 'orgExecution'], ['lead', 2, 'running', 'orgExecution'], ['worker', 2, 'running', 'orgExecution'],
    ])
    expect(phone[5]!.open).toMatchObject({ agentRunId: 'agent-task-lead', address: '/team/lead' })
  })
})

const phoneSources = (patch: Partial<MobileRunTreeSources>): MobileRunTreeSources => ({
  entries: [], taskRows: () => [], orgRows: () => [], remoteReachable: () => true, remoteTitle: () => null, taskSummary: () => null,
  isRunExpanded: () => true, isTeamExpanded: () => false, isTeamRowExpanded: () => false, isAgentOrgRunExpanded: () => true,
  isAgentOrgTeamExpanded: () => false, isTaskTeamExpanded: () => true, isAgentOrgTaskTeamExpanded: () => true, ...patch,
})
