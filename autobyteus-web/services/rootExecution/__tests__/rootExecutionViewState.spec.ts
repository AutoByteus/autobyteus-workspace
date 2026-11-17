import { computed, shallowReactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import type { AgentOrgExecutionEventDto } from '@autobyteus/collaboration-stream-contracts'
import { clearStoredParticipantMessages, storeParticipantMessages } from '~/test-support/participantMessagesStub'
import { useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages'

// A delegated row is its own run (autobyteus-461 rule 2); here every one is open.
vi.mock('~/stores/delegatedRunsStore', async () => {
  const fake = await import('~/test-support/delegatedRunsFake')
  fake.ownRuns.openAll = true
  return { useDelegatedRunsStore: fake.fakeDelegatedRunsStore }
})
vi.mock('~/services/collaborationMessages/participantMessagesQuery', async () => (await import('~/test-support/participantMessagesStub')).participantMessagesQueryStub)
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
beforeEach(() => { setActivePinia(createPinia()); clearStoredParticipantMessages() })

const launch = {
  runtimeKind: 'codex_app_server' as const,
  llmModelIdentifier: 'gpt-5.6-sol',
  llmConfig: null,
  autoExecuteTools: false,
  workspaceRootPath: null,
}
const view = (): AgentOrgExecutionViewDto => ({
  base_change_sequence: 4, live_sequence_id: 'live-1', last_message_change_sequence: 0,
  is_active: true,
  execution_tree: {
    subjectKind: 'agent_org',
    createdAt: '2026-09-01T00:00:00.000Z',
    archivedAt: null,
    applicationBinding: null,
    handoffs: [],
    rootOrg: {
      address: '/',
      orgDefinitionId: 'org-def',
      orgDefinitionName: 'Org',
      orgRunId: 'org-run',
      defaultLaunchConfiguration: launch,
      members: [
        {
          address: '/direct', agentDefinitionId: 'direct-def', role: null, description: null,
          agentRunId: 'agent-direct', platformAgentRunId: null, launchConfiguration: launch,
        },
        {
          address: '/team', teamDefinitionId: 'team-def', role: null, description: null,
          teamRunId: 'team-run', coordinatorAddress: '/team/coordinator',
          defaultLaunchConfiguration: launch,
          members: [
            {
              address: '/team/coordinator', agentDefinitionId: 'coordinator-def', role: null,
              description: null, agentRunId: 'agent-coordinator', platformAgentRunId: null,
              launchConfiguration: launch,
            },
            {
              address: '/team/member', agentDefinitionId: 'member-def', role: null,
              description: null, agentRunId: 'agent-member', platformAgentRunId: null,
              launchConfiguration: launch,
            },
          ],
        },
        {
          address: '/other', teamDefinitionId: 'other-team-def', role: null, description: null,
          teamRunId: 'other-team-run', coordinatorAddress: '/other/member',
          defaultLaunchConfiguration: launch,
          members: [
            {
              address: '/other/member', agentDefinitionId: 'other-member-def', role: null,
              description: null, agentRunId: 'agent-other-member', platformAgentRunId: null,
              launchConfiguration: launch,
            },
          ],
        },
      ],
    },
  },
  agent_input_states: [], agent_statuses: [
    { member_address: '/direct', agent_run_id: 'agent-direct', status: 'idle', background_tasks_running: 0, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
    { member_address: '/team/coordinator', agent_run_id: 'agent-coordinator', status: 'idle', background_tasks_running: 0, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
    { member_address: '/team/member', agent_run_id: 'agent-member', status: 'idle', background_tasks_running: 0, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
    { member_address: '/other/member', agent_run_id: 'agent-other-member', status: 'idle', background_tasks_running: 0, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
  ],
})
const agentContext = (runId: string, name: string) => new AgentContext({
  agentDefinitionId: `${name}-def`, agentDefinitionName: name,
  llmModelIdentifier: launch.llmModelIdentifier, runtimeKind: launch.runtimeKind,
  workspaceId: null, workspaceMetadata: null, autoExecuteTools: false,
  isLocked: true, llmConfig: null,
}, new AgentRunState(runId, {
  id: runId, messages: [], createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z', agentDefinitionId: `${name}-def`,
  agentName: name, llmModelIdentifier: launch.llmModelIdentifier,
}))
const build = (snapshot = view(), taskEntries: ConstructorParameters<typeof AgentOrgExecutionContext>[0]['entries'] = []) => {
  const context = new AgentOrgExecutionContext({
    orgRunId: 'org-run', view: snapshot,
    entries: [
      { agentRunId: 'agent-direct', memberAddress: parseAgentTeamAddress('/direct'), context: agentContext('agent-direct', 'Direct') },
      { agentRunId: 'agent-coordinator', memberAddress: parseAgentTeamAddress('/team/coordinator'), context: agentContext('agent-coordinator', 'Coordinator') },
      { agentRunId: 'agent-member', memberAddress: parseAgentTeamAddress('/team/member'), context: agentContext('agent-member', 'Member') },
      { agentRunId: 'agent-other-member', memberAddress: parseAgentTeamAddress('/other/member'), context: agentContext('agent-other-member', 'Other Member') },
      ...taskEntries,
    ],
  })
  return { context }
}

const communication = (senderAgentRunId = 'agent-direct', receiverAgentRunId = 'agent-member') => ({
  kind: 'communication' as const,
  message: {
    messageId: 'message-1', senderAgentRunId, receiverAgentRunId,
    content: 'hello', messageType: 'agent_message', referenceFiles: [],
    createdAt: '2026-09-01T00:00:01.000Z',
  },
})

describe('AgentOrgExecutionContext', () => {
  it('starts unfocused and resolves direct Team focus only to its exact coordinator', () => {
    const { context } = build()
    expect(context.selectedAddress).toBeNull()
    expect(context.selectedTarget()).toBeNull()
    context.select('/team')
    expect(context.selectedTarget()).toMatchObject({
      kind: 'agent_org_team_member', address: '/team/coordinator',
      context: { state: { runId: 'agent-coordinator' } },
    })
    context.select('/team/member')
    expect(context.selectedTarget()).toMatchObject({
      kind: 'agent_org_team_member', address: '/team/member',
      context: { state: { runId: 'agent-member' } },
    })
    context.select('/missing')
    expect(context.selectedTarget()).toBeNull()
  })

  it('projects strict Agent presentation and fails closed on a sequence gap', () => {
    const { context } = build()
    context.applyEvent(5, {
      kind: 'agent_presentation', member_address: '/direct', agent_run_id: 'agent-direct',
      message: { type: 'AGENT_STATUS', payload: {
        status: 'running', background_tasks_running: 0, trigger: 'user', tool_name: null,
        error_message: null, error_details: null, recoverableBlock: null,
      } },
    })
    expect(context.getAgentContext('agent-direct')?.state.currentStatus).toBe(AgentStatus.Running)
    expect(context.changeSequence).toBe(5)
    expect(() => context.applyEvent(7, {
      kind: 'communication',
      message: {
        messageId: 'message-1', senderAgentRunId: 'agent-direct', receiverAgentRunId: 'agent-member',
        content: 'hello', messageType: 'agent_message', referenceFiles: [],
        createdAt: '2026-09-01T00:00:01.000Z',
      },
    })).toThrow(/Expected change sequence 6, received 7/)
    expect(context.phase).toBe('reopen_required')
    context.select('/direct')
    expect(context.selectedTarget()).toMatchObject({
      kind: 'agent_org_direct_agent',
      address: '/direct',
      context: { state: { runId: 'agent-direct' } },
    })
  })

  it('projects one complete-Org configured-member Messages facet for direct and mounted Agents', async () => {
    const snapshot = view()
    // autobyteus-358: the view carries no messages; each Team tab loads its participant's stored messages.
    storeParticipantMessages('agent_org', 'org-run', [{
      messageId: 'message-cross-scope',
      senderAgentRunId: 'agent-direct',
      receiverAgentRunId: 'agent-member',
      content: 'Review the root result.',
      messageType: 'handoff',
      referenceFiles: ['/workspace/result.md'],
      createdAt: '2026-09-01T00:00:02.000Z',
    }, {
      messageId: 'message-mounted-team',
      senderAgentRunId: 'agent-coordinator',
      receiverAgentRunId: 'agent-member',
      content: 'Coordinate this Team task.',
      messageType: 'agent_message',
      referenceFiles: [],
      createdAt: '2026-09-01T00:00:03.000Z',
    }, {
      messageId: 'message-cross-team',
      senderAgentRunId: 'agent-member',
      receiverAgentRunId: 'agent-other-member',
      content: 'Cross-Team review.',
      messageType: 'agent_message',
      referenceFiles: [],
      createdAt: '2026-09-01T00:00:04.000Z',
    }])
    const { context } = build(snapshot)

    context.select('/direct')
    const directTarget = context.selectedTarget()
    if (!directTarget || !('collaborationMessages' in directTarget)) {
      throw new Error('Expected a configured AgentOrg target.')
    }
    const directMessages = directTarget.collaborationMessages
    expect(directMessages?.rootKind).toBe('agent_org')
    expect(directMessages?.memberIdentityByAgentRunId()).toMatchObject({
      'agent-direct': { address: '/direct', label: 'direct' },
      'agent-coordinator': { address: '/team/coordinator', label: 'coordinator' },
      'agent-member': { address: '/team/member', label: 'member' },
      'agent-other-member': { address: '/other/member', label: 'member' },
    })
    directMessages.loadMessages(); await settle()
    expect(directMessages?.listMessages()).toEqual([
      expect.objectContaining({
        messageId: 'message-cross-scope',
        direction: 'sent',
        counterpartAgentRunId: 'agent-member',
        counterpart: { kind: 'configured', address: '/team/member', label: 'member' },
        referenceFiles: [expect.objectContaining({ path: '/workspace/result.md' })],
      }),
    ])

    context.select('/team/member')
    const mountedTarget = context.selectedTarget()
    if (!mountedTarget || !('collaborationMessages' in mountedTarget)) {
      throw new Error('Expected a mounted AgentOrg target.')
    }
    mountedTarget.collaborationMessages.loadMessages(); await settle()
    expect(mountedTarget.collaborationMessages.listMessages()).toEqual([
      expect.objectContaining({
        messageId: 'message-cross-team', direction: 'sent',
        counterpart: { kind: 'configured', address: '/other/member', label: 'member' },
      }),
      expect.objectContaining({
        messageId: 'message-mounted-team', direction: 'received',
        counterpart: { kind: 'configured', address: '/team/coordinator', label: 'coordinator' },
      }),
      expect.objectContaining({
        messageId: 'message-cross-scope', direction: 'received',
        counterpart: { kind: 'configured', address: '/direct', label: 'direct' },
      }),
    ])

    context.select('/other/member')
    const otherTarget = context.selectedTarget()
    if (!otherTarget || !('collaborationMessages' in otherTarget)) {
      throw new Error('Expected the other mounted AgentOrg target.')
    }
    otherTarget.collaborationMessages.loadMessages(); await settle()
    expect(otherTarget.collaborationMessages.listMessages()).toEqual([
      expect.objectContaining({
        messageId: 'message-cross-team', direction: 'received',
        counterpart: { kind: 'configured', address: '/team/member', label: 'member' },
      }),
    ])
  })

  it('keeps one observable Messages facet current across live communication without refocus', async () => {
    const { context: rawContext } = build()
    const context = shallowReactive(rawContext)
    context.select('/team/member')
    const target = context.selectedTarget()
    if (!target || !('collaborationMessages' in target)) {
      throw new Error('Expected a mounted AgentOrg target.')
    }
    const messages = target.collaborationMessages
    const rows = computed(() => messages.listMessages())
    expect(rows.value).toEqual([])
    // The Team tab is shown: its (empty) stored list loads, then live messages join it (autobyteus-358).
    messages.loadMessages(); await settle()
    expect(messages.messagesStatus().state).toBe('loaded')

    context.applyEvent(5, communication())

    expect(rows.value).toEqual([
      expect.objectContaining({
        messageId: 'message-1',
        direction: 'received',
        counterpart: { kind: 'configured', address: '/direct', label: 'direct' },
      }),
    ])
    const currentTarget = context.selectedTarget()
    if (!currentTarget || !('collaborationMessages' in currentTarget)) throw new Error('Expected retained member target.')
    expect(currentTarget.collaborationMessages).toMatchObject({
      rootKind: 'agent_org', rootRunId: 'org-run', focusedAgentRunId: 'agent-member',
    })
    const second = communication('agent-coordinator', 'agent-member')
    second.message.messageId = 'message-2'
    context.applyEvent(6, second)
    expect(rows.value.map((row) => row.messageId)).toEqual(['message-1', 'message-2'])
    expect(currentTarget.collaborationMessages.listMessages()).toEqual(rows.value)
    expect(context.selectedAddress).toBe('/team/member')
    expect(context.changeSequence).toBe(6)
  })

  it('rejects a Team coordinator that is not that Team\'s direct Agent', () => {
    const snapshot = view()
    const team = snapshot.execution_tree.rootOrg.members[1]!
    if (!('teamRunId' in team)) throw new Error('Expected Team fixture.')
    team.coordinatorAddress = '/direct'

    expect(() => build(snapshot)).toThrow("Team 'team-run' has no unique exact coordinator.")
  })

  // A message may name a run the Org delegated (its own run, autobyteus-461 rule 2); only a message to itself is refused.
  it('fails closed before mutating a message an agent sent to itself', () => {
    const { context } = build()
    const committed = structuredClone(context.view)

    expect(() => context.applyEvent(5, communication('agent-direct', 'agent-direct'))).toThrow(/identity mismatch/)
    expect(context.phase).toBe('reopen_required')
    expect(context.changeSequence).toBe(4)
    expect(context.view).toEqual(committed)
  })
})
