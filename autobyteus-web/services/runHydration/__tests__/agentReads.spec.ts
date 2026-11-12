import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTestTeamContext, testAgentNode, testDelegation, testTaskTeamLayout } from '~/test-support/currentTeamTestFixtures'
import { AgentOrgExecutionViewIndex } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { orgAgentReadSubject, readsOf, teamAgentReadSubject } from '../agentReads'

/**
 * autobyteus-461 CR-461-010, CR-461-015: the one owner per view kind of "which subject reads agent X". A run the view's
 * run delegated to is read by its own identity; the view's own agents through the view. `readsOf` reads any subject.
 */
const io = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query }) }))
beforeEach(() => { io.query.mockReset() })

describe('teamAgentReadSubject (a Team view)', () => {
  const team = buildTestTeamContext({
    teamRunId: 'team-1', coordinatorAddress: '/manager',
    rootChildren: [testAgentNode('/manager', { agentRunId: 'manager-run' })],
    delegations: [
      testDelegation({ delegatorAgentRunId: 'manager-run', recipientAddress: '/manager', target: { agentRunId: 'agent-child' } }),
      testDelegation({ delegatorAgentRunId: 'manager-run', recipientAddress: '/reviewers', target: { teamRunId: 'team-child',
        team: testTaskTeamLayout('/reviewers', [testAgentNode('/reviewers/lead', { agentRunId: 'child-lead' })]) } }),
    ],
  })
  const view = (memberAddress: string) => ({ teamRunId: 'team-1', tree: team.view.getExecutionTree(), memberAddress })

  it('reads its own member through the team, an agent child as its own run, a team child\'s member through that team run', () => {
    expect(teamAgentReadSubject(view('/manager'), 'manager-run'))
      .toEqual({ kind: 'teamMember', teamRunId: 'team-1', memberAddress: '/manager', agentRunId: 'manager-run' })
    expect(teamAgentReadSubject(view('/manager'), 'agent-child')).toEqual({ kind: 'run', runId: 'agent-child' })
    const childTeam = team.view.getExecutionTree().root_team.task_executions.find((task) => task.kind === 'task_team')!
    const lead = childTeam.kind === 'task_team' ? childTeam.members.find((member) => member.agent_run_id === 'team-child:child-lead')! : null
    // The child team's member address is used as the server sent it.
    expect(teamAgentReadSubject(view('/reviewers/lead'), 'team-child:child-lead'))
      .toEqual({ kind: 'teamMember', teamRunId: 'team-child', memberAddress: lead!.address, agentRunId: 'team-child:child-lead' })
  })
})

describe('orgAgentReadSubject (an Org view)', () => {
  const index = new AgentOrgExecutionViewIndex(taskBearingView())

  it('reads its own agents through the Org, an agent child as its own run, a team child\'s member through that team run', () => {
    expect(orgAgentReadSubject('org-run', index, 'agent-director'))
      .toEqual({ kind: 'agentOrgMember', orgRunId: 'org-run', memberAddress: '/director', agentRunId: 'agent-director' })
    expect(orgAgentReadSubject('org-run', index, 'agent-lead-configured'))
      .toMatchObject({ kind: 'agentOrgMember', orgRunId: 'org-run', agentRunId: 'agent-lead-configured' })
    expect(orgAgentReadSubject('org-run', index, 'agent-worker-task')).toEqual({ kind: 'run', runId: 'agent-worker-task' })
    expect(orgAgentReadSubject('org-run', index, 'agent-task-lead'))
      .toEqual({ kind: 'teamMember', teamRunId: 'team-task', memberAddress: index.requireAgent('agent-task-lead').address, agentRunId: 'agent-task-lead' })
  })

  it('refuses an agent the Org view does not index (CR-461-016)', () => {
    expect(() => orgAgentReadSubject('org-run', index, 'unknown-run')).toThrow("AgentRun 'unknown-run' is not an agent of AgentOrg run 'org-run'.")
  })
})

describe('readsOf', () => {
  const state = { conversation: [], activities: [], hasEarlierActiveTraceEvents: false }
  it('reads each subject through its own queries', async () => {
    io.query.mockImplementation(async ({ query, variables }) => {
      const name = query.definitions[0].name.value as string
      if (name.endsWith('FileChanges')) return { data: { getRunFileChanges: [], getTeamMemberFileChanges: [], getAgentOrgMemberFileChanges: [] } }
      if (name === 'GetRunProjection') return { data: { getRunProjection: { ...state, runId: variables.runId } } }
      if (name === 'GetTeamMemberRunProjection') return { data: { getTeamMemberRunProjection: { ...state, agentRunId: variables.agentRunId } } }
      return { data: { getAgentOrgMemberRunProjection: { ...state, agentRunId: variables.agentRunId, memberAddress: variables.memberAddress } } }
    })
    const read = async (subject: Parameters<typeof readsOf>[0]) => {
      const reads = readsOf(subject)
      return [await reads.fetchProjection(), await reads.fetchFileChanges()]
    }
    await expect(read({ kind: 'run', runId: 'agent-child' })).resolves.toEqual([{ ...state, agentRunId: 'agent-child' }, []])
    await expect(read({ kind: 'teamMember', teamRunId: 'team-child', memberAddress: '/lead', agentRunId: 'team-child:child-lead' }))
      .resolves.toEqual([{ ...state, agentRunId: 'team-child:child-lead' }, []])
    await expect(read({ kind: 'agentOrgMember', orgRunId: 'org-run', memberAddress: '/director', agentRunId: 'agent-director' }))
      .resolves.toEqual([{ ...state, agentRunId: 'agent-director' }, []])
    expect(io.query.mock.calls.map(([options]) => [options.query.definitions[0].name.value, options.variables])).toEqual([
      ['GetRunProjection', { runId: 'agent-child' }], ['GetRunFileChanges', { runId: 'agent-child' }],
      ['GetTeamMemberRunProjection', { teamRunId: 'team-child', agentRunId: 'team-child:child-lead' }],
      ['GetTeamMemberFileChanges', { teamRunId: 'team-child', agentRunId: 'team-child:child-lead' }],
      ['GetAgentOrgMemberRunProjection', { orgRunId: 'org-run', memberAddress: '/director', agentRunId: 'agent-director' }],
      ['GetAgentOrgMemberFileChanges', { orgRunId: 'org-run', memberAddress: '/director', agentRunId: 'agent-director' }],
    ])
  })
})
