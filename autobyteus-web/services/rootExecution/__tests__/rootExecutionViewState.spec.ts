import { computed, shallowReactive } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import type {
  AgentOrgExecutionEventDto,
  AgentOrgTaskRecordDto,
} from '@autobyteus/collaboration-stream-contracts'

const launch = {
  runtimeKind: 'codex_app_server' as const,
  llmModelIdentifier: 'gpt-5.6-sol',
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  workspaceRootPath: null,
}
const view = (): AgentOrgExecutionViewDto => ({
  base_change_sequence: 4,
  is_active: true,
  execution_tree: {
    schemaVersion: 1,
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
      taskExecutions: [],
      members: [
        {
          address: '/direct', agentDefinitionId: 'direct-def', role: null, description: null,
          agentRunId: 'agent-direct', platformAgentRunId: null, launchConfiguration: launch,
        },
        {
          address: '/team', teamDefinitionId: 'team-def', role: null, description: null,
          teamRunId: 'team-run', coordinatorAddress: '/team/coordinator',
          defaultLaunchConfiguration: launch, taskExecutions: [],
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
          defaultLaunchConfiguration: launch, taskExecutions: [],
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
  task_records: { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org-run', records: [] },
  communication_messages: { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org-run', messages: [] },
  agent_statuses: [
    { member_address: '/direct', agent_run_id: 'agent-direct', status: 'idle', trigger: null, tool_name: null, error_message: null, error_details: null },
    { member_address: '/team/coordinator', agent_run_id: 'agent-coordinator', status: 'idle', trigger: null, tool_name: null, error_message: null, error_details: null },
    { member_address: '/team/member', agent_run_id: 'agent-member', status: 'idle', trigger: null, tool_name: null, error_message: null, error_details: null },
    { member_address: '/other/member', agent_run_id: 'agent-other-member', status: 'idle', trigger: null, tool_name: null, error_message: null, error_details: null },
  ],
})
const agentContext = (runId: string, name: string) => new AgentContext({
  agentDefinitionId: `${name}-def`, agentDefinitionName: name,
  llmModelIdentifier: launch.llmModelIdentifier, runtimeKind: launch.runtimeKind,
  workspaceId: null, workspaceMetadata: null, autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY', isLocked: true, llmConfig: null,
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

const task = (overrides: Partial<AgentOrgTaskRecordDto> = {}): AgentOrgTaskRecordDto => ({
  taskId: 'task-1', delegatorAgentRunId: 'agent-coordinator',
  recipientAddress: '/team/member', taskExecution: { agentRunId: 'agent-task-fresh' },
  description: 'Verify the bounded result.', referenceFiles: [], status: 'active', updates: [],
  createdAt: '2026-09-01T00:00:01.000Z',
  ...overrides,
})

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
        status: 'running', trigger: 'user', tool_name: null,
        error_message: null, error_details: null,
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

  it('projects one complete-Org configured-member Messages facet for direct and mounted Agents', () => {
    const snapshot = view()
    snapshot.communication_messages.messages.push({
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
    })
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
    expect(otherTarget.collaborationMessages.listMessages()).toEqual([
      expect.objectContaining({
        messageId: 'message-cross-team', direction: 'received',
        counterpart: { kind: 'configured', address: '/team/member', label: 'member' },
      }),
    ])
  })

  it('keeps one observable Messages facet current across live communication without refocus', () => {
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

  it('includes exact task participants without leaking to their configured source and rejects uncorrelated identities', () => {
    const snapshot = view()
    snapshot.execution_tree.rootOrg.taskExecutions.push({
      address: '/team/member', agentRunId: 'agent-task-fresh', platformAgentRunId: null,
      startedAt: '2026-09-01T00:00:01.000Z', settledAt: null,
    }, {
      address: '/team', teamRunId: 'task-team-fresh',
      members: [{
        address: '/team/member', agentRunId: 'agent-task-team-member', platformAgentRunId: null,
      }, {
        address: '/team/coordinator', agentRunId: 'agent-task-team-coordinator', platformAgentRunId: null,
      }],
      taskExecutions: [], startedAt: '2026-09-01T00:00:01.500Z', settledAt: null,
    })
    snapshot.task_records.records.push(task(), task({
      taskId: 'task-team', recipientAddress: '/team', taskExecution: { teamRunId: 'task-team-fresh' },
    }))
    snapshot.agent_statuses.push({
      member_address: '/team/member', agent_run_id: 'agent-task-fresh', status: 'idle',
      trigger: null, tool_name: null, error_message: null, error_details: null,
    }, {
      member_address: '/team/member', agent_run_id: 'agent-task-team-member', status: 'idle',
      trigger: null, tool_name: null, error_message: null, error_details: null,
    }, {
      member_address: '/team/coordinator', agent_run_id: 'agent-task-team-coordinator', status: 'idle',
      trigger: null, tool_name: null, error_message: null, error_details: null,
    })
    snapshot.communication_messages.messages.push({
      messageId: 'message-to-task', senderAgentRunId: 'agent-direct', receiverAgentRunId: 'agent-task-fresh',
      content: 'Task update', messageType: 'agent_message', referenceFiles: [],
      createdAt: '2026-09-01T00:00:02.000Z',
    }, {
      messageId: 'message-from-task', senderAgentRunId: 'agent-task-fresh', receiverAgentRunId: 'agent-direct',
      content: 'Task response', messageType: 'agent_message', referenceFiles: [],
      createdAt: '2026-09-01T00:00:03.000Z',
    }, {
      messageId: 'message-to-task-team-member', senderAgentRunId: 'agent-direct', receiverAgentRunId: 'agent-task-team-member',
      content: 'Task Team update', messageType: 'agent_message', referenceFiles: [],
      createdAt: '2026-09-01T00:00:03.500Z',
    }, {
      messageId: 'message-from-task-team-member', senderAgentRunId: 'agent-task-team-member', receiverAgentRunId: 'agent-direct',
      content: 'Task Team response', messageType: 'agent_message', referenceFiles: [],
      createdAt: '2026-09-01T00:00:03.750Z',
    })
    const taskEntry = {
      agentRunId: 'agent-task-fresh', memberAddress: parseAgentTeamAddress('/team/member'),
      context: agentContext('agent-task-fresh', 'Task Member'),
    }
    const taskTeamEntry = {
      agentRunId: 'agent-task-team-member', memberAddress: parseAgentTeamAddress('/team/member'),
      context: agentContext('agent-task-team-member', 'Task Team Member'),
    }
    const entries = [taskEntry, taskTeamEntry, {
      agentRunId: 'agent-task-team-coordinator', memberAddress: parseAgentTeamAddress('/team/coordinator'),
      context: agentContext('agent-task-team-coordinator', 'Task Team Coordinator'),
    }]
    const { context } = build(snapshot, entries)
    context.select('/direct')
    const target = context.selectedTarget()
    if (!target || !('collaborationMessages' in target)) {
      throw new Error('Expected a configured AgentOrg target.')
    }
    const taskIdentity = {
      kind: 'task', address: '/team/member', label: 'member',
      taskId: 'task-1', hostRunId: 'org-run', executionRunId: 'agent-task-fresh',
    }
    const taskTeamIdentity = {
      kind: 'task', address: '/team/member', label: 'member',
      taskId: 'task-team', hostRunId: 'task-team-fresh', executionRunId: 'task-team-fresh',
    }
    expect(target.collaborationMessages.listMessages()).toEqual([
      expect.objectContaining({ messageId: 'message-from-task-team-member', direction: 'received',
        counterpartAgentRunId: 'agent-task-team-member', counterpart: taskTeamIdentity }),
      expect.objectContaining({ messageId: 'message-to-task-team-member', direction: 'sent',
        counterpartAgentRunId: 'agent-task-team-member', counterpart: taskTeamIdentity }),
      expect.objectContaining({ messageId: 'message-from-task', direction: 'received',
        counterpartAgentRunId: 'agent-task-fresh', counterpart: taskIdentity }),
      expect.objectContaining({ messageId: 'message-to-task', direction: 'sent',
        counterpartAgentRunId: 'agent-task-fresh', counterpart: taskIdentity }),
    ])
    context.select({ kind: 'agent_execution', agentRunId: 'agent-task-fresh' })
    const taskTarget = context.selectedTarget()
    if (!taskTarget || !('collaborationMessages' in taskTarget)) throw new Error('Expected exact task target.')
    expect(taskTarget.context.state.runId).toBe('agent-task-fresh')
    expect(taskTarget.collaborationMessages.listMessages()).toEqual([
      expect.objectContaining({ messageId: 'message-from-task', direction: 'sent', counterpartAgentRunId: 'agent-direct' }),
      expect.objectContaining({ messageId: 'message-to-task', direction: 'received', counterpartAgentRunId: 'agent-direct' }),
    ])
    context.select('/team/member')
    const configuredSource = context.selectedTarget()
    if (!configuredSource || !('collaborationMessages' in configuredSource)) throw new Error('Expected configured source.')
    expect(configuredSource.context.state.runId).toBe('agent-member')
    expect(configuredSource.collaborationMessages.listMessages()).toEqual([])

    const corrupt = structuredClone(snapshot)
    corrupt.communication_messages.messages.push({
      messageId: 'message-unknown', senderAgentRunId: 'missing-run', receiverAgentRunId: 'agent-direct',
      content: 'Unknown', messageType: 'agent_message', referenceFiles: [],
      createdAt: '2026-09-01T00:00:04.000Z',
    })
    expect(() => build(corrupt, entries)).toThrow("AgentRun 'missing-run' is not a retained Org execution.")
    const missingRecord = structuredClone(snapshot)
    missingRecord.task_records.records = []
    expect(() => build(missingRecord, entries)).toThrow("Task execution 'agent-task-fresh' has no exact record.")
  })

  it('rejects a Team coordinator that is not that Team\'s direct Agent', () => {
    const snapshot = view()
    const team = snapshot.execution_tree.rootOrg.members[1]!
    if (!('teamRunId' in team)) throw new Error('Expected Team fixture.')
    team.coordinatorAddress = '/direct'

    expect(() => build(snapshot)).toThrow("Team 'team-run' has no unique exact coordinator.")
  })

  it('accepts correlated task and communication events without changing their valid path', () => {
    const snapshot = view()
    snapshot.execution_tree.rootOrg.taskExecutions.push({
      address: '/team/member', agentRunId: 'agent-task-fresh', platformAgentRunId: null,
      startedAt: '2026-09-01T00:00:01.000Z', settledAt: null,
    })
    snapshot.task_records.records.push(task())
    snapshot.agent_statuses.push({
      member_address: '/team/member', agent_run_id: 'agent-task-fresh', status: 'idle',
      trigger: null, tool_name: null, error_message: null, error_details: null,
    })
    const { context } = build(snapshot, [{
      agentRunId: 'agent-task-fresh', memberAddress: parseAgentTeamAddress('/team/member'),
      context: agentContext('agent-task-fresh', 'Task Member'),
    }])
    const submission = {
      submissionId: 'submission-1', message: 'verified', referenceFiles: [],
      createdAt: '2026-09-01T00:00:02.000Z',
    }
    context.applyEvent(5, communication())
    context.applyEvent(6, {
      kind: 'task',
      event: {
        kind: 'submitted', submission,
        task: { ...task(), status: 'awaiting_review', updates: [submission] },
      },
    })

    expect(context.changeSequence).toBe(6)
    expect(context.view.communication_messages.messages).toHaveLength(1)
    expect(context.view.task_records.records[0]).toMatchObject({
      taskId: 'task-1', status: 'awaiting_review',
    })
  })

  it('routes a fresh task Agent or Team activation to checkpoint hydration without partial mutation', () => {
    const { context } = build()
    const committed = structuredClone(context.view)

    expect(context.applyEvent(5, {
      kind: 'task', event: { kind: 'activated', task: task() },
    })).toBe('checkpoint_required')
    expect(context.applyEvent(5, {
      kind: 'task', event: { kind: 'activated', task: task({
        taskId: 'task-team',
        recipientAddress: '/team',
        taskExecution: { teamRunId: 'team-task-fresh' },
      }) },
    })).toBe('checkpoint_required')

    expect(context.phase).toBe('live')
    expect(context.changeSequence).toBe(4)
    expect(context.view).toEqual(committed)
  })

  it.each([
    ['communication sender', communication('unknown-agent', 'agent-member')],
    ['communication receiver', communication('agent-direct', 'unknown-agent')],
    ['task delegator', {
      kind: 'task' as const,
      event: { kind: 'activated' as const, task: { ...task(), taskId: 'task-2', delegatorAgentRunId: 'unknown-agent' } },
    }],
    ['task execution kind', {
      kind: 'task' as const,
      event: { kind: 'activated' as const, task: { ...task(), taskId: 'task-2', taskExecution: { teamRunId: 'fresh-team' } } },
    }],
    ['reused configured execution', {
      kind: 'task' as const,
      event: { kind: 'activated' as const, task: { ...task(), taskId: 'task-2', taskExecution: { agentRunId: 'agent-member' } } },
    }],
  ] satisfies readonly (readonly [string, AgentOrgExecutionEventDto])[])(
    'fails closed before mutating a miscorrelated %s event', (_label, event) => {
      const { context } = build()
      const committed = structuredClone(context.view)

      expect(() => context.applyEvent(5, event)).toThrow(/identity mismatch/)
      expect(context.phase).toBe('reopen_required')
      expect(context.changeSequence).toBe(4)
      expect(context.view).toEqual(committed)
    },
  )
})
