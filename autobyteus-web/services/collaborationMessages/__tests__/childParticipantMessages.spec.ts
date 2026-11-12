import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { buildTestTeamContext, testAgentNode, testDelegation, testTaskTeamLayout } from '~/test-support/currentTeamTestFixtures'
import { teamCollaborationMessagesView } from '~/services/teamExecution/teamCollaborationMessagesView'
import { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import { AgentOrgExecutionViewIndex } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { buildChildRunsContext } from '~/services/agentCollaboration/__tests__/agentRootChildRunsFixture'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView'

/**
 * autobyteus-461 CR-461-020: the Team tab of a delegated child shows the child's own messages, read from the log of the
 * child's own run by its own identity (an agent child as its run, a team child's member through that team run), never
 * from the log of the view's run, which refuses it. The view's own agents read the view's log as before.
 */
const io = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('~/services/collaborationMessages/participantMessagesQuery', () => ({ fetchParticipantMessages: io.fetch }))
beforeEach(() => {
  setActivePinia(createPinia())
  io.fetch.mockReset()
  io.fetch.mockResolvedValue({ pastParticipants: [], messages: [] })
})

const loadsOf = (view: CollaborationMessagesContextView) => {
  view.loadMessages()
  return io.fetch.mock.calls.at(-1)?.[0]
}

describe('a Team view', () => {
  const team = () => buildTestTeamContext({
    teamRunId: 'team-1', coordinatorAddress: '/manager',
    rootChildren: [testAgentNode('/manager', { agentRunId: 'manager-run' })],
    delegations: [
      testDelegation({ delegatorAgentRunId: 'manager-run', recipientAddress: '/manager', target: { agentRunId: 'worker-run' } }),
      testDelegation({ delegatorAgentRunId: 'manager-run', recipientAddress: '/reviewers', target: { teamRunId: 'team-child',
        team: testTaskTeamLayout('/reviewers', [testAgentNode('/reviewers/lead', { agentRunId: 'lead' })]) } }),
    ],
  })

  it('reads its own member from the team run, an agent child and a team child\'s member from their own runs', () => {
    const t = team()
    expect(loadsOf(teamCollaborationMessagesView(t))).toEqual({ rootKind: 'agent_team', rootRunId: 'team-1', agentRunId: 'manager-run' })
    t.view.focusAgentForInspection('worker-run')
    const child = teamCollaborationMessagesView(t)
    expect(loadsOf(child)).toEqual({ rootKind: 'agent', rootRunId: 'worker-run', agentRunId: 'worker-run' })
    expect(child.referenceContentPath('m-1', 'r-1')).toBe('agent-collaborations/worker-run/communication/messages/m-1/references/r-1/content')
    t.view.focusAgentForInspection('team-child:lead')
    expect(loadsOf(teamCollaborationMessagesView(t))).toEqual({ rootKind: 'agent_team', rootRunId: 'team-child', agentRunId: 'team-child:lead' })
    expect(io.fetch.mock.calls.some(([key]) => key.rootRunId === 'team-1' && key.agentRunId !== 'manager-run')).toBe(false)
  })
})

describe('an Org view', () => {
  const org = () => {
    const view = taskBearingView()
    const entries = [...new AgentOrgExecutionViewIndex(view).agents.values()].map((agent) => ({
      agentRunId: agent.agentRunId, memberAddress: agent.address,
      context: new AgentContext({ agentDefinitionId: 'x', agentDefinitionName: agent.address } as never,
        new AgentRunState(agent.agentRunId, { id: agent.agentRunId, messages: [], createdAt: 't', updatedAt: 't', agentDefinitionId: 'x', agentName: agent.address })),
    }))
    return new AgentOrgExecutionContext({ orgRunId: 'org-run', view, entries })
  }
  const messagesOf = (context: AgentOrgExecutionContext) => {
    const target = context.selectedTarget()
    if (!target || !('collaborationMessages' in target) || !target.collaborationMessages) throw new Error('expected a selected agent with messages')
    return target.collaborationMessages
  }

  it('reads its own agent from the Org run, an agent child and a team child\'s member from their own runs', () => {
    const context = org()
    context.select('/director')
    expect(loadsOf(messagesOf(context))).toEqual({ rootKind: 'agent_org', rootRunId: 'org-run', agentRunId: 'agent-director' })
    context.select({ kind: 'agent_execution', agentRunId: 'agent-worker-task' })
    const child = messagesOf(context)
    expect(loadsOf(child)).toEqual({ rootKind: 'agent', rootRunId: 'agent-worker-task', agentRunId: 'agent-worker-task' })
    expect(child.referenceContentPath('m-1', 'r-1')).toBe('agent-collaborations/agent-worker-task/communication/messages/m-1/references/r-1/content')
    context.select({ kind: 'agent_execution', agentRunId: 'agent-task-lead' })
    expect(loadsOf(messagesOf(context))).toEqual({ rootKind: 'agent_team', rootRunId: 'team-task', agentRunId: 'agent-task-lead' })
  })
})

describe('an agent-run view', () => {
  it('reads its own agent from its run, an agent child and a team child\'s member from their own runs', () => {
    const context = buildChildRunsContext()
    expect(loadsOf(context.messagesView('host-run'))).toEqual({ rootKind: 'agent', rootRunId: 'host-run', agentRunId: 'host-run' })
    const child = context.messagesView('cua-run')
    expect(loadsOf(child)).toEqual({ rootKind: 'agent', rootRunId: 'cua-run', agentRunId: 'cua-run' })
    expect(child.referenceContentPath('m-1', 'r-1')).toBe('agent-collaborations/cua-run/communication/messages/m-1/references/r-1/content')
    expect(loadsOf(context.messagesView('pp-run'))).toEqual({ rootKind: 'agent_team', rootRunId: 'team-run', agentRunId: 'pp-run' })
  })
})
