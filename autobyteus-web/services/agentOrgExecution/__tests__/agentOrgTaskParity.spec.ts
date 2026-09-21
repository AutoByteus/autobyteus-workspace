import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, shallowReactive } from 'vue'
import { projectAgentOrgTasks } from '../agentOrgTaskPresentation'
import { AgentOrgExecutionViewIndex } from '../agentOrgExecutionViewIndex'
import { projectAgentOrgCommunicationPerspective } from '../agentOrgCommunicationPerspective'
import { stageAgentOrgExecutionContext } from '../agentOrgContextHydration'
import { taskBearingView, taskRecord } from './taskBearingOrgFixture'
const mocks = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  ensureWorkspaceByRootPath: vi.fn(), resolveWorkspaceMetadataByRootPath: vi.fn(),
}) }))
beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mocks.query.mockImplementation(async ({ variables }) => ({ data: { getAgentOrgMemberRunProjection: {
    agentRunId: variables.agentRunId, memberAddress: variables.memberAddress, conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
  } } }))
})

describe('task-inclusive exact Org presentation', () => {
  it('keeps repeated same-address assignments and independent descendants distinct', () => {
    const view = taskBearingView()
    const first = view.execution_tree.rootOrg.taskExecutions[1] as any
    const second = structuredClone(first)
    second.teamRunId = 'team-second'
    second.members.forEach((agent: any) => { agent.agentRunId += '-second' })
    const descendant = { address: '/worker', agentRunId: 'descendant-run', platformAgentRunId: 'actual-child', startedAt: first.startedAt, settledAt: null }
    first.taskExecutions.push(descendant)
    view.execution_tree.rootOrg.taskExecutions.push(second)
    view.task_records.records.push(taskRecord('task-second', '/team', { teamRunId: 'team-second' }), {
      ...taskRecord('child-task', '/worker', { agentRunId: 'descendant-run' }), delegatorAgentRunId: 'agent-task-lead',
    })
    const index = new AgentOrgExecutionViewIndex(view)
    const task = view.task_records.records[1]!
    expect(index.taskParticipants(task).map((agent) => agent.agentRunId)).toEqual(['agent-task-lead', 'agent-task-worker'])
    expect(index.isRelevant(task, 'agent-director')).toBe(true)
    for (const unrelated of ['agent-lead-configured', 'agent-task-lead-second', 'descendant-run']) expect(index.isRelevant(task, unrelated)).toBe(false)
    expect(index.isRelevant(view.task_records.records[3]!, 'agent-task-lead')).toBe(true)
    expect(index.coordinator('team-second').agentRunId).toBe('agent-task-lead-second')
    const entries = projectAgentOrgTasks({ orgRunId: 'org-run', view, index, focusedAgentRunId: 'agent-director' })
    const direction = entries.find(entry => entry.taskId === task.taskId)!.lifecycleItems[0].direction
    expect(direction).toEqual({ kind: 'directed',
      from: { kind: 'named', label: 'director', targetKind: 'agent',
        link: { label: 'director', address: '/director', agentRunId: 'agent-director' } },
      to: { kind: 'named', label: 'team', targetKind: 'task_team', teamRunId: 'team-task', participants: [
        { label: 'lead', address: '/team/lead', agentRunId: 'agent-task-lead' },
        { label: 'worker', address: '/team/worker', agentRunId: 'agent-task-worker' },
      ] },
    })
    expect(entries.map(entry => entry.taskId)).not.toContain('child-task')

    expect(index.requireAgent('descendant-run')).toMatchObject({ execution: { platformAgentRunId: 'actual-child' },
      source: { agentDefinitionId: 'definition-agent-worker-configured' }, task: { taskId: 'child-task' }, host: { runId: 'team-task' } })
  })

  it.each([
    ['agent-director', 'agent-worker-configured'], ['agent-director', 'agent-worker-task'],
    ['agent-worker-task', 'agent-director'], ['agent-worker-task', 'agent-task-lead'],
    ['agent-task-lead', 'agent-task-worker'],
  ])('projects %s -> %s as one ordinary message with exact retained counterpart', (sender, receiver) => {
    const view = taskBearingView()
    const index = new AgentOrgExecutionViewIndex(view)
    const message = { messageId: 'message', senderAgentRunId: sender, receiverAgentRunId: receiver,
      content: 'Same text, exact identities.', messageType: 'agent_message', referenceFiles: ['/tmp/result.txt'],
      createdAt: '2026-09-01T00:00:03.000Z' }
    const sent = projectAgentOrgCommunicationPerspective({ index, messages: [message], focusedAgentRunId: sender })
    const received = projectAgentOrgCommunicationPerspective({ index, messages: [message], focusedAgentRunId: receiver })
    expect(sent).toHaveLength(1)
    expect(received).toHaveLength(1)
    expect(sent[0]).toMatchObject({ messageId: 'message', direction: 'sent', counterpartAgentRunId: receiver })
    expect(received[0]).toMatchObject({ messageId: 'message', direction: 'received', counterpartAgentRunId: sender })
    expect(sent[0]!.referenceFiles).toEqual(received[0]!.referenceFiles)
    if (index.requireAgent(receiver).task) expect(sent[0]!.counterpart.kind).toBe('task')
    expect(() => projectAgentOrgCommunicationPerspective({ index, messages: [{ ...message, receiverAgentRunId: 'unknown' }], focusedAgentRunId: sender })).toThrow('retained')
  })

  it('provides direct-Agent Tasks and retains the exact settled conversation read-only without refocus', async () => {
    const view = taskBearingView()
    const context = shallowReactive(await hydrateAgentOrgExecutionContext({ orgRunId: 'org-run', view }))
    context.select('/director')
    const direct = context.selectedTarget()!
    expect('collaborationTasks' in direct && direct.collaborationTasks.listDelegatedTaskEntries()).toHaveLength(2)
    context.select({ kind: 'agent_execution', agentRunId: 'agent-worker-task' })
    const observed = computed(() => context.selectedTarget())
    expect(observed.value).toMatchObject({ kind: 'agent_org_task_agent', access: 'read_only', context: { config: {
      agentDefinitionId: 'definition-agent-worker-configured', runtimeKind: 'codex_app_server',
    } } })
    const originalContext = observed.value!.context
    const submitted = { ...view.task_records.records[0]!, status: 'awaiting_review' as const, updates: [{
      submissionId: 's1', message: 'Verified result', referenceFiles: ['/tmp/result.txt'], createdAt: '2026-09-01T00:03:00.000Z',
    }] }
    context.applyEvent(9, { kind: 'task', event: { kind: 'submitted', task: submitted } })
    const task = { ...submitted, status: 'accepted' as const, updates: [...submitted.updates, {
      reviewId: 'r1', reviewedSubmissionId: 's1', decision: 'accept' as const, comment: 'Accepted', referenceFiles: [], createdAt: '2026-09-01T00:04:00.000Z',
    }] }
    context.applyEvent(10, { kind: 'task', event: { kind: 'reviewed', task } })
    context.applyEvent(11, { kind: 'task', event: { kind: 'settled', task, settledAt: '2026-09-01T00:05:00.000Z' } })
    expect(observed.value).toMatchObject({ kind: 'agent_org_task_agent', access: 'read_only', task: { displayStatus: 'accepted' } })
    expect(observed.value!.context).toBe(originalContext)
    expect('interaction' in observed.value!).toBe(false)
    expect(context.selection).toEqual({ kind: 'agent_execution', agentRunId: 'agent-worker-task' })
    expect(context.index.requireAgent('agent-worker-task').live).toBe(false)
    // A committed input consequence still belongs to its retained receiver;
    // settlement does not turn it into a new live admission request.
    context.applyEvent(12, { kind: 'agent_presentation', agent_run_id: 'agent-worker-task', member_address: '/worker', message: {
      type: 'MEMBER_INPUT_MESSAGE', payload: { message_id: 'accepted-input', dedupe_key: 'accepted-input-key',
        content: 'Already accepted exact input', input_origin: 'inter_agent_delivery', received_at: '2026-09-01T00:04:59.000Z',
        sender_agent_run_id: 'agent-director', parent_communication_message_id: 'accepted-message', context_file_paths: [] },
    } })
    expect(originalContext.state.conversation.messages).toEqual([expect.objectContaining({ text: 'Already accepted exact input', messageId: 'accepted-input' })])
    expect(observed.value).toMatchObject({ access: 'read_only' })
    expect(context.getAgentContext('agent-worker-configured')!.state.conversation.messages).toEqual([])
  })

  it('distinguishes genuine empty history from unavailable projection, without a live interaction port', async () => {
    const view = taskBearingView(); view.is_active = false
    view.agent_statuses = []
    const context = await hydrateAgentOrgExecutionContext({ orgRunId: 'org-run', view })
    context.select({ kind: 'agent_execution', agentRunId: 'agent-task-lead' })
    expect(context.selectedTarget()).toMatchObject({ access: 'read_only', kind: 'agent_org_task_team_member',
      context: { state: { runId: 'agent-task-lead', conversation: { messages: [] } } } })
    expect('interaction' in context.selectedTarget()!).toBe(false)
    mocks.query.mockRejectedValueOnce(new Error('trace unavailable'))
    await expect(hydrateAgentOrgExecutionContext({ orgRunId: 'org-run', view })).rejects.toThrow('trace unavailable')
  })
})

async function hydrateAgentOrgExecutionContext(input: Omit<Parameters<typeof stageAgentOrgExecutionContext>[0], 'source'>) {
  const staged = await stageAgentOrgExecutionContext({ ...input, source: 'stream' })
  staged.commitActivities()
  return staged.context
}
