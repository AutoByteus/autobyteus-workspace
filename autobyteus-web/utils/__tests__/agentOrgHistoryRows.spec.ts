import { describe, expect, it } from 'vitest'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import { projectAgentOrgHistoryRows, type AgentOrgHistoryDisplayRow } from '~/utils/agentOrgHistoryRows'

type OrgTree = AgentOrgRunHistoryItem['executionTree']

const runFor = (tree: OrgTree): AgentOrgRunHistoryItem => ({
  stableKey: 'agent_org_run:org-run', rootSubjectKind: 'agent_org', rootRunId: 'org-run',
  createdAt: tree.createdAt, archivedAt: null, isActive: false, summary: 'Delegating Org', executionTree: tree,
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
})
