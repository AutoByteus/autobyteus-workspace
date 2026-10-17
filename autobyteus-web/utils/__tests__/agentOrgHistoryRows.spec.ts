import { describe, expect, it } from 'vitest'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import type { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { projectAgentOrgHistoryRows, type AgentOrgHistoryDisplayRow } from '~/utils/agentOrgHistoryRows'

type OrgTree = AgentOrgRunHistoryItem['executionTree']

const runFor = (tree: OrgTree): AgentOrgRunHistoryItem => ({
  stableKey: 'agent_org_run:org-run', rootSubjectKind: 'agent_org', rootRunId: 'org-run',
  createdAt: tree.createdAt, archivedAt: null, isActive: false, summary: 'Delegating Org', executionTree: tree, closedTaskExecutions: [],
})

const fixtureTree = () => structuredClone(taskBearingView().execution_tree) as OrgTree

/** The delegated '/team' execution itself delegates the mounted '/reviewers' Team. */
const nestedTree = (): OrgTree => {
  const tree = fixtureTree()
  const launch = tree.rootOrg.defaultLaunchConfiguration
  const reviewerAgent = (address: string, agentRunId: string) => ({
    address, agentDefinitionId: `definition-${agentRunId}`, role: null, description: null,
    agentRunId, platformAgentRunId: null, launchConfiguration: launch,
  })
  return {
    ...tree,
    rootOrg: {
      ...tree.rootOrg,
      members: [...tree.rootOrg.members, {
        address: '/reviewers', teamDefinitionId: 'reviewers-definition', role: null, description: null,
        teamRunId: 'reviewers-configured', coordinatorAddress: '/reviewers/chair', defaultLaunchConfiguration: launch,
        members: [reviewerAgent('/reviewers/chair', 'agent-chair-configured')], taskExecutions: [],
      }],
      taskExecutions: tree.rootOrg.taskExecutions.map((task) => 'teamRunId' in task ? {
        ...task,
        taskExecutions: [{
          address: '/reviewers', teamRunId: 'reviewers-task',
          members: [{ address: '/reviewers/chair', agentRunId: 'agent-chair-task', platformAgentRunId: null }],
          taskExecutions: [], delegatorAgentRunId: 'agent-task-lead', startedAt: '2026-09-01T00:00:03.000Z',
        }],
      } : task),
    },
  } as OrgTree
}

const project = (tree: OrgTree, isTaskTeamExpanded?: (teamRunId: string) => boolean) => projectAgentOrgHistoryRows({
  run: runFor(tree), context: null, isTeamExpanded: () => true, isTaskTeamExpanded,
})
const keys = (rows: AgentOrgHistoryDisplayRow[]) => rows.map((display) => display.row.key)
const find = (rows: AgentOrgHistoryDisplayRow[], key: string) => rows.find((display) => display.row.key === key)!

describe('projectAgentOrgHistoryRows delegated Team disclosure', () => {
  it('emits delegated Teams expanded with their members by default', () => {
    const rows = project(fixtureTree())
    expect(find(rows, 'task-team:team-task').row).toMatchObject({ kind: 'task_team', hasChildren: true, expanded: true })
    expect(keys(rows)).toEqual(expect.arrayContaining(['task-team-agent:agent-task-lead', 'task-team-agent:agent-task-worker']))
  })

  it('omits every descendant of a collapsed delegated Team but keeps its coordinator for the row click', () => {
    const rows = project(nestedTree(), (teamRunId) => teamRunId !== 'team-task')
    const teamRow = find(rows, 'task-team:team-task')
    expect(teamRow.row).toMatchObject({
      expanded: false, hasChildren: true, coordinatorAgentRunId: 'agent-task-lead', coordinatorAddress: '/team/lead',
    })
    expect(keys(rows).filter((key) => key.startsWith('task-team-agent:') || key === 'task-team:reviewers-task')).toEqual([])
    // The collapsed Team is the last root row, so no branch line continues past it.
    expect(keys(rows).at(-1)).toBe('task-team:team-task')
    expect(teamRow.hasFollowingSibling).toBe(false)
    expect(find(rows, 'task-agent:agent-worker-task').hasFollowingSibling).toBe(true)
  })

  it('collapses a nested delegated Team independently of its enclosing delegated Team', () => {
    const rows = project(nestedTree(), (teamRunId) => teamRunId !== 'reviewers-task')
    expect(find(rows, 'task-team:team-task').row).toMatchObject({ expanded: true })
    expect(find(rows, 'task-team:reviewers-task').row).toMatchObject({ expanded: false, hasChildren: true, depth: 1 })
    expect(keys(rows)).toContain('task-team-agent:agent-task-worker')
    expect(keys(rows)).not.toContain('task-team-agent:agent-chair-task')
    expect(find(rows, 'task-team-agent:agent-task-worker').hasFollowingSibling).toBe(true)
    expect(find(rows, 'task-team:reviewers-task').hasFollowingSibling).toBe(false)
  })

  /** API-TTRC-001 (REQ-003 / AC-003, E-005): the same Team delegated twice keeps one state per teamRunId. */
  it('collapses one of two delegations of the same Team without affecting the other or the mounted Team', () => {
    const tree = fixtureTree()
    const first = tree.rootOrg.taskExecutions.find((task) => 'teamRunId' in task)!
    tree.rootOrg.taskExecutions.push({
      ...structuredClone(first), teamRunId: 'team-task-2', startedAt: '2026-09-01T00:00:04.000Z',
      members: [
        { address: '/team/lead', agentRunId: 'agent-task-lead-2', platformAgentRunId: null },
        { address: '/team/worker', agentRunId: 'agent-task-worker-2', platformAgentRunId: null },
      ],
    } as typeof first)
    const rows = project(tree, (teamRunId) => teamRunId !== 'team-task')
    expect(find(rows, 'task-team:team-task').row).toMatchObject({ address: '/team', expanded: false })
    expect(find(rows, 'task-team:team-task-2').row).toMatchObject({
      address: '/team', expanded: true, coordinatorAgentRunId: 'agent-task-lead-2',
    })
    expect(keys(rows)).not.toContain('task-team-agent:agent-task-lead')
    expect(keys(rows)).toEqual(expect.arrayContaining(['task-team-agent:agent-task-lead-2', 'task-team-agent:agent-task-worker-2']))
    // The collapsed first delegation now has a following sibling (the second delegation).
    expect(find(rows, 'task-team:team-task').hasFollowingSibling).toBe(true)
    // The mounted '/team' Team keeps its members; its state is independent of task-Team state.
    expect(keys(rows)).toContain('agent:agent-lead-configured')

    const mountedCollapsed = projectAgentOrgHistoryRows({
      run: runFor(tree), context: null, isTeamExpanded: () => false, isTaskTeamExpanded: () => true,
    })
    expect(keys(mountedCollapsed)).not.toContain('agent:agent-lead-configured')
    expect(keys(mountedCollapsed)).toEqual(expect.arrayContaining([
      'task-team-agent:agent-task-lead', 'task-team-agent:agent-task-lead-2',
    ]))
  })
})

/** A live Org context as the projection reads it: its tree, closure facts and agent statuses. */
const liveContext = (
  tree: OrgTree,
  statuses: Readonly<Record<string, AgentStatus>>,
  closed: AgentOrgRunHistoryItem['closedTaskExecutions'] = [],
): AgentOrgExecutionContext => ({
  orgRunId: 'org-run', executionTree: tree, isActive: true, phase: 'live',
  view: { closed_task_executions: closed },
  getAgentContext: (agentRunId: string) => ({ state: { currentStatus: statuses[agentRunId] ?? AgentStatus.Offline } }),
}) as unknown as AgentOrgExecutionContext

const projectLive = (
  tree: OrgTree,
  statuses: Readonly<Record<string, AgentStatus>>,
  options: Readonly<{ closed?: AgentOrgRunHistoryItem['closedTaskExecutions']; isTaskTeamExpanded?: (teamRunId: string) => boolean }> = {},
) => projectAgentOrgHistoryRows({
  run: { ...runFor(tree), isActive: true },
  context: liveContext(tree, statuses, options.closed),
  isTeamExpanded: () => true,
  isTaskTeamExpanded: options.isTaskTeamExpanded,
})
const statusOf = (rows: AgentOrgHistoryDisplayRow[], key: string) => (find(rows, key).row as { status: string }).status

/** delegated-team-aggregate-status REQ-001..005, AC-001..007/009 (Org runs). */
describe('projectAgentOrgHistoryRows Team status', () => {
  it('gives delegated, nested delegated and Org-internal Teams the universal status, collapsed included', () => {
    const rows = projectLive(nestedTree(), {
      'agent-task-lead': AgentStatus.Idle,
      'agent-chair-task': AgentStatus.Running,
      'agent-lead-configured': AgentStatus.Idle,
      'agent-team-worker-configured': AgentStatus.Error,
      'agent-chair-configured': AgentStatus.Initializing,
    }, { isTaskTeamExpanded: (teamRunId) => teamRunId !== 'team-task' })
    expect(keys(rows)).not.toContain('task-team:reviewers-task')
    expect(statusOf(rows, 'task-team:team-task')).toBe(AgentStatus.Running)
    expect(statusOf(rows, 'team:team-configured')).toBe(AgentStatus.Error)
    // A starting member counts as busy on a Team row; the agent row keeps its own status.
    expect(statusOf(rows, 'team:reviewers-configured')).toBe(AgentStatus.Running)
    expect(statusOf(rows, 'agent:agent-chair-configured')).toBe(AgentStatus.Initializing)

    const expanded = projectLive(nestedTree(), { 'agent-chair-task': AgentStatus.Running, 'agent-task-lead': AgentStatus.Idle })
    expect(statusOf(expanded, 'task-team:reviewers-task')).toBe(AgentStatus.Running)
    expect(statusOf(expanded, 'task-team:team-task')).toBe(AgentStatus.Running)
  })

  it('reads idle with an idle coordinator and offline members, and offline when all are offline', () => {
    expect(statusOf(projectLive(fixtureTree(), { 'agent-task-lead': AgentStatus.Idle }), 'task-team:team-task')).toBe(AgentStatus.Idle)
    expect(statusOf(projectLive(fixtureTree(), {}), 'task-team:team-task')).toBe(AgentStatus.Offline)
  })

  it('does not count agents of closed work hidden from the tree', () => {
    const tree = nestedTree()
    const configured = tree.rootOrg.members.find((member) => 'teamRunId' in member && member.teamRunId === 'team-configured')!
    ;(configured as { taskExecutions: unknown[] }).taskExecutions = [{
      address: '/worker', agentRunId: 'agent-configured-helper', platformAgentRunId: null,
      delegatorAgentRunId: 'agent-lead-configured', startedAt: '2026-09-01T00:00:05.000Z',
    }]
    const statuses = {
      'agent-task-lead': AgentStatus.Idle, 'agent-chair-task': AgentStatus.Running,
      'agent-lead-configured': AgentStatus.Idle, 'agent-configured-helper': AgentStatus.Running,
    }
    const open = projectLive(tree, statuses)
    expect(statusOf(open, 'task-team:team-task')).toBe(AgentStatus.Running)
    expect(statusOf(open, 'team:team-configured')).toBe(AgentStatus.Running)

    const closed = projectLive(tree, statuses, { closed: [{ teamRunId: 'reviewers-task' }, { agentRunId: 'agent-configured-helper' }] })
    expect(statusOf(closed, 'task-team:team-task')).toBe(AgentStatus.Idle)
    expect(statusOf(closed, 'team:team-configured')).toBe(AgentStatus.Idle)
  })

  it('reads every Team gray when the Org run is not live', () => {
    const rows = project(nestedTree())
    for (const key of ['task-team:team-task', 'task-team:reviewers-task', 'team:team-configured', 'team:reviewers-configured']) {
      expect(statusOf(rows, key)).toBe(AgentStatus.Offline)
    }
  })
})
