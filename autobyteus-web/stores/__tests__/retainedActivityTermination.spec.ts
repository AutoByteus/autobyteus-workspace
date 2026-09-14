import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { parseTeamStreamServerMessage } from '@autobyteus/team-stream-contracts'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import { useAgentTeamContextsStore } from '../agentTeamContextsStore'
import { useAgentTeamRunStore } from '../agentTeamRunStore'
import { useAgentContextsStore } from '../agentContextsStore'
import { useAgentRunStore } from '../agentRunStore'
import { useAgentSelectionStore } from '../agentSelectionStore'
import { useAgentActivityStore } from '../agentActivityStore'
import ActivityFeed from '~/components/progress/ActivityFeed.vue'
import ToolActivityItem from '~/components/progress/ToolActivityItem.vue'

// Only external I/O is substituted. Lifecycle, context, Activity, hydration and renderer are real.
const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), ws: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query, mutate: io.mutate }) }))
vi.mock('~/services/agentStreaming/transport', async original => ({ ...await original<any>(), WebSocketClient: class { constructor() { return io.ws } } }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ teamWs: 'ws://fixture.invalid/team' }) }) }))
vi.mock('vue-router', async original => ({ ...await original<any>(), useRoute: () => ({ query: {} }) }))
const ROOT = 'retention-team'
let wrapper: ReturnType<typeof mount> | undefined
beforeEach(() => { setActivePinia(createPinia()); vi.resetAllMocks(); io.query.mockResolvedValue({ data: {} }) })
afterEach(() => { wrapper?.unmount(); wrapper = undefined; useAgentTeamRunStore().disconnectTeamStream(ROOT); vi.restoreAllMocks() })
const seed = (id: string) => {
  const activity = useAgentActivityStore()
  activity.upsertSystemInstructionActivity(id, { kind: 'system_instruction', activityId: `${id}-system`, content: `Instructions for ${id}`, timestamp: new Date(1000) })
  activity.addToolActivity(id, { kind: 'tool', activityId: `${id}-tool`, invocationId: `${id}-invocation`, toolName: 'send_message_to', type: 'tool_call', status: 'success', contextText: '', arguments: { message: `message-${id}` }, logs: [], result: `delivered-${id}`, error: null, timestamp: new Date(2000) })
  return activity.getActivities(id).slice()
}
const setup = () => {
  const callbacks = new Map<string, (value: any) => void>()
  io.ws = { state: 'connected', connect: vi.fn(), disconnect: vi.fn(), send: vi.fn(), on: vi.fn((name, fn) => callbacks.set(name, fn)), off: vi.fn() }
  const raw = buildTestTeamContext({ teamRunId: ROOT, coordinatorAddress: '/lead', focusedAgentRunId: 'lead', rootChildren: ['lead', 'worker', 'empty'].map(id => testAgentNode(`/${id}`, { agentRunId: id, autoExecuteTools: false })) })
  useAgentTeamContextsStore().teams = new Map([[ROOT, raw]])
  const team = useAgentTeamContextsStore().getTeamContextById(ROOT)!
  useAgentSelectionStore().selectRun(ROOT, 'team')
  const store = useAgentTeamRunStore()
  const service = store.connectToTeamStream(ROOT)!
  const emit = (type: string, payload: any) => { const wire = JSON.stringify({ type, payload }); parseTeamStreamServerMessage(wire); callbacks.get('onMessage')!(wire) }
  const ready = () => {
    emit('CONNECTED', { session_id: 's', root_team_run_id: ROOT })
    emit('TEAM_EXECUTION_VIEW_SNAPSHOT', { root_team_run_id: ROOT, base_change_sequence: 0, execution_tree: team.view.getExecutionTree(), tasks: [], messages: [], agent_statuses: team.view.listAgentContextEntries().map(e => ({ agent_run_id: e.agentRunId, member_address: e.memberAddress, status: 'idle', trigger: null, tool_name: null, error_message: null, error_details: null })) })
  }
  ready()
  const lead = seed('lead'), worker = seed('worker')
  wrapper = mount(ActivityFeed)
  io.mutate.mockResolvedValue({ data: { terminateAgentTeamRun: { success: true } } })
  return { team, store, service, lead, worker, emit, ready }
}
it('BEH-001/004: successful Stop retains same-focus expanded completed/system Activity, other members and genuine empty state', async () => {
  const t = setup(), activity = useAgentActivityStore(), context = t.team.view.getAgentContext('lead')!
  context.requirement = 'unsent draft'; context.contextFilePaths = [{ locator: '/draft/note.txt' } as never]
  const conversation = context.conversation
  activity.setHighlightedActivity('lead', 'lead-tool')
  await nextTick()
  const card = wrapper!.findComponent(ToolActivityItem)
  await card.findAll('div.cursor-pointer').find(d => d.text() === 'Arguments')!.trigger('click')
  await card.findAll('div.cursor-pointer').find(d => d.text() === 'Result')!.trigger('click')
  expect(wrapper!.text()).toContain('2 Events')
  const projectionReads = () => io.query.mock.calls.filter(([r]) => r.query.definitions[0].name.value === 'GetTeamMemberRunProjection').length
  const beforeReads = projectionReads()
  expect(await t.store.terminateTeamRun(ROOT)).toBe(true)
  await nextTick()
  expect(projectionReads()).toBe(beforeReads)
  expect(t.team.view.listAgentContextEntries().every(e => e.agentContext.state.currentStatus === 'offline')).toBe(true)
  expect(wrapper!.findComponent(ToolActivityItem).element).toBe(card.element)
  expect(card.text()).toContain('message-lead'); expect(card.text()).toContain('delivered-lead')
  expect(wrapper!.text()).toContain('Instructions for lead')
  expect(activity.getActivities('lead')).toEqual(t.lead)
  expect(activity.getActivities('worker')).toEqual(t.worker)
  expect(activity.getHighlightedActivityId('lead')).toBe('lead-tool')
  expect(context.state.currentStatus).toBe('offline'); expect(t.team.view.isRootTeamActive()).toBe(false)
  expect(t.team.view.getFocusedAgentRunId()).toBe('lead'); expect(context.conversation).toBe(conversation)
  expect(context.requirement).toBe('unsent draft'); expect(context.contextFilePaths).toEqual([{ locator: '/draft/note.txt' }])
  t.team.view.focusAgent('worker'); await nextTick()
  expect(wrapper!.text()).toContain('delivered-worker'); expect(wrapper!.text()).not.toContain('delivered-lead')
  t.team.view.focusAgent('empty'); await nextTick()
  expect(wrapper!.text()).toContain('0 Events'); expect(wrapper!.text()).toContain('No activity history yet')
  expect(io.mutate).toHaveBeenCalledTimes(1); expect(io.ws.send).not.toHaveBeenCalled()
  expect(io.ws.disconnect).toHaveBeenCalledTimes(1)
})
it.each(['rejected', 'graphql', 'network'])('BEH-004: %s Stop preserves Activity and last-known lifecycle', async kind => {
  const t = setup()
  if (kind === 'network') io.mutate.mockRejectedValue(new Error('offline server'))
  else io.mutate.mockResolvedValue(kind === 'graphql' ? { errors: [{ message: 'denied' }] } : { data: { terminateAgentTeamRun: { success: false } } })
  expect(await t.store.terminateTeamRun(ROOT)).toBe(false)
  expect(useAgentActivityStore().getActivities('lead')).toEqual(t.lead)
  expect(t.team.view.isRootTeamActive()).toBe(true); expect(t.team.view.getAgentContext('lead')!.state.currentStatus).toBe('idle')
  expect(io.ws.disconnect).not.toHaveBeenCalled(); expect(wrapper!.text()).toContain('2 Events')
})
it('BEH-004: concurrent and already-stopped duplicate Stop sends one command', async () => {
  const t = setup(); let resolve!: (value: any) => void
  io.mutate.mockImplementation(() => new Promise(done => { resolve = done }))
  const first = t.store.terminateTeamRun(ROOT)
  expect(await t.store.terminateTeamRun(ROOT)).toBe(false)
  resolve({ data: { terminateAgentTeamRun: { success: true } } }); expect(await first).toBe(true)
  expect(await t.store.terminateTeamRun(ROOT)).toBe(false)
  expect(io.mutate).toHaveBeenCalledTimes(1); expect(useAgentActivityStore().getActivities('lead')).toEqual(t.lead)
})
it('BEH-001/003: retained old approval cannot dispatch via retired store or old service and viewing never restores', async () => {
  const t = setup()
  t.emit('TOOL_APPROVAL_REQUESTED', { change_sequence: 1, agent_run_id: 'lead', invocation_id: 'pending', tool_name: 'send_message_to', turn_id: 'turn', arguments: { message: 'pending' } })
  await t.store.terminateTeamRun(ROOT)
  await t.store.postToolExecutionApproval('pending', true)
  expect(() => t.service.approveTool('pending', { agentRunId: 'lead' })).toThrow('TEAM_STREAM_NOT_READY')
  expect(io.ws.send).not.toHaveBeenCalled()
  expect(io.mutate).toHaveBeenCalledTimes(1)
  expect(wrapper!.findAll('button').filter(b => b.text() === 'Approve')).toHaveLength(0)
  expect(useAgentActivityStore().getToolActivities('lead').find(a => a.invocationId === 'pending')?.status).toBe('awaiting-approval')
})
it('BEH-002: real standalone Agent stop retains Activity in same renderer and context', async () => {
  const t = setup(), context = t.team.view.getAgentContext('lead')!
  useAgentContextsStore().runs = new Map([['lead', context]])
  useAgentSelectionStore().selectRun('lead', 'agent'); await nextTick()
  io.mutate.mockResolvedValue({ data: { terminateAgentRun: { success: true } } })
  expect(await useAgentRunStore().terminateRun('lead')).toBe(true)
  await nextTick()
  expect(useAgentContextsStore().getRun('lead')).toBe(context)
  expect(context.state.currentStatus).toBe('offline')
  expect(useAgentActivityStore().getActivities('lead')).toEqual(t.lead)
  expect(wrapper!.text()).toContain('2 Events'); expect(wrapper!.text()).toContain('delivered-lead')
})
it('BEH-003: later normal Send restores, hydrates and admits exact input without duplicating retained Activity', async () => {
  const t = setup()
  await t.store.terminateTeamRun(ROOT)
  io.mutate.mockResolvedValue({ data: { restoreAgentTeamRun: { success: true } } })
  io.query.mockImplementation(async ({ query, variables }) => {
    const name = query.definitions[0].name.value
    if (name === 'GetTeamRunResumeConfig') return { data: { getTeamRunResumeConfig: { teamRunId: ROOT, isActive: true, executionTree: t.team.view.getExecutionTree(), modelConfigEditability: { editable: false, reason: 'active' } } } }
    if (name === 'GetTeamMemberRunProjection') return { data: { getTeamMemberRunProjection: { agentRunId: variables.agentRunId, conversation: [{ kind: 'message', role: 'assistant', content: 'Historical conversation', ts: 1 }],
      activities: variables.agentRunId === 'empty' ? [] : [
        { kind: 'system_instruction', activityId: `${variables.agentRunId}-system`, content: `Instructions for ${variables.agentRunId}`, ts: 1 },
        { kind: 'tool', invocationId: `${variables.agentRunId}-invocation`, toolName: 'send_message_to', status: 'success', arguments: { message: `message-${variables.agentRunId}` }, result: `delivered-${variables.agentRunId}`, ts: 2 },
      ], hasEarlierActiveTraceEvents: false } } }
    if (name === 'GetTaskDelegationRecords') return { data: { getTaskDelegationRecords: [] } }
    if (name === 'GetTeamCommunicationMessages') return { data: { getTeamCommunicationMessages: [] } }
    return { data: {} }
  })
  io.ws.connect.mockImplementation(() => queueMicrotask(t.ready))
  io.ws.send.mockImplementation((wire: string) => {
    const { type, payload } = JSON.parse(wire)
    expect(type).toBe('SEND_MESSAGE')
    t.emit('MEMBER_INPUT_MESSAGE', { change_sequence: 1, recipient_agent_run_id: payload.agent_run_id, message_id: payload.message_id, dedupe_key: payload.dedupe_key, content: payload.content, input_origin: 'user_message', received_at: '2026-09-14T10:00:00Z', context_file_paths: [], sender_agent_run_id: null, parent_communication_message_id: null })
  })
  await t.store.sendMessageToFocusedMember('deliberate next work', [])
  await flushPromises()
  const adopted = useAgentTeamContextsStore().getTeamContextById(ROOT)!
  expect(adopted.view.isRootTeamActive()).toBe(true)
  expect(adopted.view.getFocusedAgentRunId()).toBe('lead')
  expect(adopted.view.getAgentContext('lead')!.config.autoExecuteTools).toBe(false)
  expect(io.ws.send).toHaveBeenCalledTimes(1)
  expect(io.mutate.mock.calls.map(([r]) => r.mutation.definitions[0].name.value)).toEqual(['TerminateAgentTeamRun', 'RestoreAgentTeamRun'])
  expect(useAgentActivityStore().getActivities('lead')).toHaveLength(2)
  expect(useAgentActivityStore().getToolActivities('lead').map(a => a.invocationId)).toEqual(['lead-invocation'])
  expect(wrapper!.text()).toContain('2 Events'); expect(wrapper!.text()).toContain('delivered-lead')
  const messages = adopted.view.getAgentContext('lead')!.conversation.messages
  expect(messages.filter(m => m.text === 'deliberate next work')).toHaveLength(1)
  expect(messages.filter(m => m.text === 'Historical conversation')).toHaveLength(1)
  t.emit('TOOL_EXECUTION_SUCCEEDED', { change_sequence: 2, agent_run_id: 'lead', invocation_id: 'next-work', tool_name: 'send_message_to', turn_id: 'next-turn', arguments: { message: 'new work' }, result: 'new result' })
  await nextTick()
  expect(useAgentActivityStore().getToolActivities('lead').map(a => a.invocationId)).toEqual(['lead-invocation', 'next-work'])
  expect(wrapper!.text()).toContain('3 Events')
})
