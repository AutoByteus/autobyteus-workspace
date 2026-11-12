import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTestTeamContext, testAgentNode, testDelegation, testTaskTeamLayout } from '~/test-support/currentTeamTestFixtures'
import { AgentOrgExecutionViewIndex } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { agentRunAgentReadSubject, orgAgentReadSubject, participantMessagesKeyOf, readsOf, teamAgentReadSubject } from '../agentReads'
import { AgentRunCollaborationIndex } from '~/services/agentCollaboration/agentRunCollaborationIndex'
import { childRunsView } from '~/services/agentCollaboration/__tests__/agentRootChildRunsFixture'

/**
 * autobyteus-461 CR-461-010, CR-461-015, CR-461-022: the one owner per view kind of "which subject reads agent X". A run the view's
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

describe('agentRunAgentReadSubject (an agent run\'s view, CR-461-022)', () => {
  const view = childRunsView()
  view.remote_task_executions = [{ kind: 'agent', address: '/publisher', agent_run_id: 'publisher-run', node_id: 'srv_docker', node_name: 'docker',
    delegator_agent_run_id: 'host-run', started_at: '2026-09-30T00:00:01.000Z' }] as never
  const index = new AgentRunCollaborationIndex(view.execution_tree, view.remote_task_executions)

  it('reads its own agent as its run, an agent child as its own run, a team child\'s member through that team run, a peer child through the run', () => {
    expect(agentRunAgentReadSubject('host-run', index, 'host-run')).toEqual({ kind: 'run', runId: 'host-run' })
    expect(agentRunAgentReadSubject('host-run', index, 'cua-run')).toEqual({ kind: 'run', runId: 'cua-run' })
    expect(agentRunAgentReadSubject('host-run', index, 'pp-run'))
      .toEqual({ kind: 'teamMember', teamRunId: 'team-run', memberAddress: '/product_team/prototyper', agentRunId: 'pp-run' })
    expect(agentRunAgentReadSubject('host-run', index, 'publisher-run'))
      .toEqual({ kind: 'standaloneMember', hostRunId: 'host-run', memberAddress: '/publisher', agentRunId: 'publisher-run' })
    // A peer child's messages are in the log of the run that delegated to it.
    expect(participantMessagesKeyOf(agentRunAgentReadSubject('host-run', index, 'publisher-run')))
      .toEqual({ rootKind: 'agent', rootRunId: 'host-run', agentRunId: 'publisher-run' })
  })

  it('refuses an agent the view does not hold', () => {
    expect(() => agentRunAgentReadSubject('host-run', index, 'nobody')).toThrow("AgentRun 'nobody' is not an agent of Agent run 'host-run'.")
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
      if (name === 'GetAgentRunCollaborationMemberProjection') {
        return { data: { agentRunCollaborationMemberProjection: { ...state, agentRunId: variables.agentRunId, memberAddress: variables.memberAddress } } }
      }
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
    // A peer child: its stored state through the run that delegated to it; its files stay on its node (none asked).
    await expect(read({ kind: 'standaloneMember', hostRunId: 'host-run', memberAddress: '/publisher', agentRunId: 'publisher-run' }))
      .resolves.toEqual([{ ...state, agentRunId: 'publisher-run' }, []])
    expect(io.query.mock.calls.map(([options]) => [options.query.definitions[0].name.value, options.variables])).toEqual([
      ['GetRunProjection', { runId: 'agent-child' }], ['GetRunFileChanges', { runId: 'agent-child' }],
      ['GetTeamMemberRunProjection', { teamRunId: 'team-child', agentRunId: 'team-child:child-lead' }],
      ['GetTeamMemberFileChanges', { teamRunId: 'team-child', agentRunId: 'team-child:child-lead' }],
      ['GetAgentOrgMemberRunProjection', { orgRunId: 'org-run', memberAddress: '/director', agentRunId: 'agent-director' }],
      ['GetAgentOrgMemberFileChanges', { orgRunId: 'org-run', memberAddress: '/director', agentRunId: 'agent-director' }],
      ['GetAgentRunCollaborationMemberProjection', { hostRunId: 'host-run', memberAddress: '/publisher', agentRunId: 'publisher-run' }],
    ])
  })
})
