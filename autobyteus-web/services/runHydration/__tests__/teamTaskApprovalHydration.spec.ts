import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { parseTeamStreamServerMessage } from '@autobyteus/team-stream-contracts'
import { createPinia, setActivePinia } from 'pinia'
import { computed, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { inspectMountedTeamMember } from '~/services/runOpen/teamMemberInspectionCoordinator'
import { isProjectableToolSegment } from '~/services/agentStreaming/handlers/toolActivityProjection'
import { buildToolCardPresentation } from '~/utils/toolCardPresentation'
import ToolCallIndicator from '~/components/conversation/ToolCallIndicator.vue'

const io = vi.hoisted(() => ({ query: vi.fn(), ws: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query }) }))
vi.mock('~/services/agentStreaming/transport', async original => ({ ...await original<any>(), WebSocketClient: class { constructor() { return io.ws } } }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ teamWs: 'ws://fixture.invalid/team' }) }) }))
vi.mock('vue-router', async original => ({ ...await original<any>(), useRoute: () => ({ query: {} }) }))
const ROOT = 'approval-team', TASK = 'approval-task', INV = 'submit-invocation'
let wrapper: ReturnType<typeof mount> | undefined
beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })
afterEach(() => { wrapper?.unmount(); wrapper = undefined; useAgentTeamRunStore().disconnectTeamStream(ROOT); vi.restoreAllMocks() })
const projection = () => ({ data: { getTeamMemberRunProjection: {
  agentRunId: TASK,
  conversation: [{ kind: 'message', role: 'assistant', content: 'Historical work', ts: 10 },
    { kind: 'tool_call_pending', invocationId: INV, toolName: 'submit_task_result', toolArgs: { message: 'old argument' }, ts: 11 }],
  activities: [{ kind: 'system_instruction', activityId: 'system', content: 'Retained system', ts: 10 },
    { kind: 'tool', invocationId: INV, toolName: 'submit_task_result', status: 'parsed', arguments: { message: 'old argument' }, ts: 11 }],
  hasEarlierActiveTraceEvents: true,
} } })
const harness = (subject = TASK, autoExecuteTools = false) => {
  const callbacks = new Map<string, (value?: any) => void>()
  io.ws = { state: 'connected', connect: vi.fn(), disconnect: vi.fn(), send: vi.fn(),
    on: vi.fn((name, fn) => callbacks.set(name, fn)), off: vi.fn() }
  const raw = buildTestTeamContext({ teamRunId: ROOT, coordinatorAddress: '/lead', focusedAgentRunId: 'lead',
    rootChildren: [testAgentNode('/lead', { agentRunId: 'lead', autoExecuteTools: false }), testAgentNode('/worker', { agentRunId: 'worker', autoExecuteTools })] })
  useAgentTeamContextsStore().teams = new Map([[ROOT, raw]])
  const team = useAgentTeamContextsStore().getTeamContextById(ROOT)!
  useAgentSelectionStore().selectRun(ROOT, 'team')
  const stream = useAgentTeamRunStore().connectToTeamStream(ROOT)!
  let sequence = 0
  const emit = (type: string, payload: any) => { const wire = JSON.stringify({ type, payload }); parseTeamStreamServerMessage(wire); callbacks.get('onMessage')!(wire) }
  emit('CONNECTED', { session_id: 'session', root_team_run_id: ROOT })
  emit('TEAM_EXECUTION_VIEW_SNAPSHOT', { root_team_run_id: ROOT, base_change_sequence: 0,
    execution_tree: team.view.getExecutionTree(), tasks: [], messages: [],
    agent_statuses: team.view.listAgentContextEntries().map(e => ({ agent_run_id: e.agentRunId, member_address: e.memberAddress, status: 'idle', trigger: null, tool_name: null, error_message: null, error_details: null })) })
  emit('TASK_DELEGATION_EVENT', { event_type: 'TASK_AGENT_ACTIVATED', change_sequence: ++sequence, parent_team_run_id: ROOT,
    execution: { kind: 'task_agent', address: '/worker', agent_run_id: TASK, platform_agent_run_id: null, started_at: '2026-09-14T10:00:00Z', settled_at: null },
    task: testTaskRecord({ taskId: 'task-1', delegatorAgentRunId: 'lead', recipientAddress: '/worker', target: { agentRunId: TASK } }) })
  expect(stream.isReady).toBe(true)
  expect(team.view.getFocusedAgentRunId()).toBe('lead')
  const context = team.view.getAgentContext(subject)!
  const approval = () => emit('TOOL_APPROVAL_REQUESTED', { change_sequence: ++sequence, agent_run_id: subject, invocation_id: INV,
    tool_name: 'submit_task_result', turn_id: 'task-turn', arguments: { message: 'actual task result' } })
  const data = projection(); data.data.getTeamMemberRunProjection.agentRunId = subject
  io.query.mockResolvedValue(data)
  const select = () => inspectMountedTeamMember({ teamRunId: ROOT, agentRunId: subject, commit: () => useAgentSelectionStore().selectRun(ROOT, 'team') })
  const tools = () => context.conversation.messages.flatMap(m => m.type === 'ai' ? m.segments.filter(isProjectableToolSegment) : [])
  const render = () => {
    const presentations = computed(() => tools().map(buildToolCardPresentation))
    wrapper = mount(defineComponent({ setup: () => () => h('div', presentations.value.map(p => h(ToolCallIndicator, { presentation: p, key: p.invocationId }))) }), { global: { stubs: { Icon: true } } })
  }
  return { team, context, stream, approval, select, tools, render, emit, next: () => ++sequence }
}

it.each(['before', 'after', 'during'])('TASK-01/02: actual task approval %s first inspection survives hydration and renders one exact command', async order => {
  const test = harness()
  const retained = test.context
  retained.requirement = 'unsent task draft'
  if (order === 'before') test.approval()
  if (order === 'during') io.query.mockImplementationOnce(async () => { test.approval(); return projection() })
  expect((await test.select()).disposition).toBe('committed')
  if (order === 'after') test.approval()
  expect(test.team.view.getAgentContext(TASK)).toBe(retained)
  expect(retained.requirement).toBe('unsent task draft')
  expect(retained.config.autoExecuteTools).toBe(false)
  expect(retained.conversation.messages.some(m => m.text.includes('Historical work'))).toBe(true)
  expect(test.tools()).toHaveLength(1)
  expect(test.tools()[0]).toMatchObject({ invocationId: INV, status: 'awaiting-approval', arguments: { message: 'actual task result' } })
  expect(useAgentActivityStore().getToolActivities(TASK)).toEqual([expect.objectContaining({ invocationId: INV, status: 'awaiting-approval', arguments: { message: 'actual task result' } })])
  test.render()
  const buttons = wrapper!.findAll('button').filter(b => b.text() === 'Approve')
  expect(buttons).toHaveLength(1)
  await buttons[0]!.trigger('click')
  expect(io.ws.send).toHaveBeenCalledTimes(1)
  expect(JSON.parse(io.ws.send.mock.calls[0][0])).toMatchObject({ type: 'APPROVE_TOOL', payload: { agent_run_id: TASK, invocation_id: INV } })
  if (order === 'during') expect(io.query.mock.calls.filter(([r]) => r.query.definitions[0].name.value === 'GetTeamMemberRunProjection' && r.variables.agentRunId === TASK)).toHaveLength(2)
})

it.each([
  ['TOOL_APPROVED', 'approved', { reason: null }], ['TOOL_EXECUTION_STARTED', 'executing', {}],
  ['TOOL_DENIED', 'denied', { reason: 'not allowed', error: null }],
  ['TOOL_EXECUTION_SUCCEEDED', 'success', { result: 'done' }],
  ['TOOL_EXECUTION_FAILED', 'error', { error: 'failure' }],
  ['TOOL_EXECUTION_INTERRUPTED', 'interrupted', { reason: 'stopped' }],
])('TASK-03: actual %s before selection is not downgraded by history', async (type, status, extra) => {
  const test = harness(); test.approval()
  test.emit(type as string, { change_sequence: test.next(), agent_run_id: TASK, invocation_id: INV,
    tool_name: 'submit_task_result', turn_id: 'task-turn', ...(type === 'TOOL_APPROVED' ? {} : { arguments: null }), ...extra as object })
  expect((await test.select()).disposition).toBe('committed')
  expect(test.tools()[0]?.status).toBe(status)
  expect(useAgentActivityStore().getToolActivities(TASK)[0]?.status).toBe(status)
  test.render()
  expect(wrapper!.findAll('button').filter(b => b.text() === 'Approve')).toHaveLength(0)
  expect(io.ws.send).not.toHaveBeenCalled()
})
it('TASK-02/03: missing projected tool retains observed pending while blank history-only call cannot invent it', async () => {
  const test = harness(); test.approval()
  const data = projection(); data.data.getTeamMemberRunProjection.conversation.pop(); data.data.getTeamMemberRunProjection.activities.pop()
  io.query.mockResolvedValue(data)
  expect((await test.select()).disposition).toBe('committed')
  expect(test.tools()).toHaveLength(1)
  expect(test.tools()[0]?.status).toBe('awaiting-approval')
  expect(test.context.conversation.messages.filter(m => m.text === 'Historical work')).toHaveLength(1)
  expect(useAgentActivityStore().getActivities(TASK).some(a => a.kind === 'system_instruction')).toBe(true)
})
it('TASK-03: parsed history with no incoming live approval has no permission controls', async () => {
  const test = harness()
  expect((await test.select()).disposition).toBe('committed')
  test.render()
  expect(test.tools()[0]?.status).toBe('parsed')
  expect(wrapper!.findAll('button').filter(b => b.text() === 'Approve')).toHaveLength(0)
  expect(io.ws.send).not.toHaveBeenCalled()
})
it.each(['disconnect', 'inactive'])('TASK-04: %s during fetch invalidates live applicability; retry hydrates history without live permission', async boundary => {
  const test = harness(); test.approval()
  io.query.mockImplementationOnce(async () => {
    if (boundary === 'disconnect') useAgentTeamRunStore().disconnectTeamStream(ROOT)
    else test.team.view.setRootTeamActive(false)
    return projection()
  })
  expect((await test.select()).disposition).toBe('committed')
  expect(test.tools()[0]?.status).toBe('parsed')
  test.render()
  expect(wrapper!.findAll('button').filter(b => b.text() === 'Approve')).toHaveLength(0)
  expect(io.ws.send).not.toHaveBeenCalled()
})
it('TASK-04: final Activity commit conflict cannot partially replace conversation or pending approval', async () => {
  const test = harness(); test.approval()
  const original = test.context.conversation
  vi.spyOn(useAgentActivityStore(), 'replaceProjectionActivitiesIfRevisions').mockReturnValue('conflict')
  expect((await test.select()).disposition).toBe('rejected')
  expect(test.context.conversation).toBe(original)
  expect(test.tools()[0]?.status).toBe('awaiting-approval')
  expect(test.team.view.getFocusedAgentRunId()).toBe('lead')
  expect(useAgentActivityStore().getToolActivities(TASK)[0]?.status).toBe('awaiting-approval')
})


it('TASK-04: configured Team member retains the same manual decision and context', async () => {
  const test = harness('worker'); test.approval()
  expect((await test.select()).disposition).toBe('committed')
  expect(test.team.view.getAgentContext('worker')).toBe(test.context)
  expect(test.tools()[0]?.status).toBe('awaiting-approval')
  test.render()
  await wrapper!.findAll('button').find(b => b.text() === 'Approve')!.trigger('click')
  expect(JSON.parse(io.ws.send.mock.calls[0][0])).toMatchObject({ type: 'APPROVE_TOOL', payload: { agent_run_id: 'worker', invocation_id: INV } })
})
it('TASK-03: auto task execution retains its actual terminal lifecycle without manufacturing manual controls', async () => {
  const test = harness(TASK, true)
  for (const type of ['TOOL_EXECUTION_STARTED', 'TOOL_EXECUTION_SUCCEEDED']) test.emit(type, {
    change_sequence: test.next(), agent_run_id: TASK, invocation_id: INV, tool_name: 'submit_task_result',
    turn_id: 'auto-turn', arguments: { message: 'automatic result' }, ...(type.endsWith('SUCCEEDED') ? { result: 'submitted' } : {}),
  })
  expect((await test.select()).disposition).toBe('committed')
  expect(test.context.config.autoExecuteTools).toBe(true)
  expect(test.tools()[0]?.status).toBe('success')
  test.render()
  expect(wrapper!.findAll('button').filter(b => b.text() === 'Approve')).toHaveLength(0)
  expect(io.ws.send).not.toHaveBeenCalled()
})

it('TASK-03: terminal event during the first fetch retries and cannot become pending again', async () => {
  const test = harness(); test.approval()
  io.query.mockImplementationOnce(async () => {
    test.emit('TOOL_EXECUTION_SUCCEEDED', { change_sequence: test.next(), agent_run_id: TASK, invocation_id: INV,
      tool_name: 'submit_task_result', turn_id: 'task-turn', arguments: null, result: 'submitted once' })
    return projection()
  })
  expect((await test.select()).disposition).toBe('committed')
  expect(test.tools()[0]).toMatchObject({ status: 'success', result: 'submitted once' })
  expect(useAgentActivityStore().getToolActivities(TASK)[0]).toMatchObject({ status: 'success', result: 'submitted once' })
  expect(io.ws.send).not.toHaveBeenCalled()
})
it('TASK-04: a settled task does not inherit actionable obsolete live approval', async () => {
  const test = harness(); test.approval()
  test.emit('TASK_DELEGATION_EVENT', { event_type: 'TASK_EXECUTION_SETTLED', change_sequence: test.next(),
    execution: { agent_run_id: TASK }, settled_at: '2026-09-14T10:05:00Z',
    task: { ...testTaskRecord({ taskId: 'task-1', delegatorAgentRunId: 'lead', recipientAddress: '/worker', target: { agentRunId: TASK } }), status: 'accepted' } })
  expect((await test.select()).disposition).toBe('committed')
  expect(test.tools()[0]?.status).toBe('parsed')
  test.render()
  expect(wrapper!.findAll('button').filter(b => b.text() === 'Approve')).toHaveLength(0)
  expect(io.ws.send).not.toHaveBeenCalled()
})
it('TASK-04: superseded selection leaves the existing conversation and Activity untouched', async () => {
  const test = harness(); test.approval()
  const before = test.context.conversation
  io.query.mockImplementationOnce(async () => { useAgentSelectionStore().beginSelectionIntent(); return projection() })
  expect((await test.select()).disposition).toBe('superseded')
  expect(test.team.view.getFocusedAgentRunId()).toBe('lead')
  expect(test.context.conversation).toBe(before)
  expect(useAgentActivityStore().getToolActivities(TASK)[0]?.status).toBe('awaiting-approval')
})
