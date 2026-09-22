import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { GetAgentOrgExecutionCheckpoint, GetAgentOrgRunInspection } from '~/graphql/queries/runHistoryQueries'
import { useAgentOrgContextsStore } from '../agentOrgContextsStore'
import { useAgentActivityStore } from '../agentActivityStore'
import ActivityFeed from '~/components/progress/ActivityFeed.vue'

// Real Org command/context/stream/hydration and Activity renderer; only network substituted.
const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query, mutate: io.mutate }) }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => true, getBoundEndpoints: () => ({ orgWs: 'ws://fixture.invalid/org' }) }) }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))
vi.mock('vue-router', async original => ({ ...await original<any>(), useRoute: () => ({ query: { rootSubjectKind: 'agent_org', mode: 'active', orgRunId: 'org-run' } }) }))
class Socket {
  static OPEN = 1; static CONNECTING = 0; static instances: Socket[] = []
  readyState = 1; onmessage: ((event: { data: string }) => void) | null = null; onclose: (() => void) | null = null; onerror = null
  sent: string[] = []
  constructor() { Socket.instances.push(this) }
  send(value: string) { this.sent.push(value) }
  close() { this.readyState = 3; this.onclose?.() }
  emit(message: unknown) { this.onmessage?.({ data: JSON.stringify(message) }) }
}
const envelope = (active: boolean) => ({ schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: { ...taskBearingView(), is_active: active, ...(!active ? { agent_statuses: [], base_change_sequence: 0 } : {}) } })
const projection = (variables: any) => ({ data: { getAgentOrgMemberRunProjection: { ...variables,
  conversation: [{ kind: 'message', role: 'assistant', content: 'Retained conversation', ts: 1 }],
  activities: [{ kind: 'system_instruction', activityId: `${variables.agentRunId}-system`, content: `System ${variables.agentRunId}`, ts: 1 },
    { kind: 'tool', invocationId: `${variables.agentRunId}-tool`, toolName: 'send_message_to', status: 'success', arguments: { message: variables.agentRunId }, result: `Delivered ${variables.agentRunId}`, ts: 2 }], hasEarlierActiveTraceEvents: false,
} } })
let active: boolean, failInspection: boolean, wrapper: ReturnType<typeof mount> | undefined
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks(); vi.useFakeTimers(); vi.stubGlobal('WebSocket', Socket); Socket.instances = []; active = true; failInspection = false
  io.query.mockImplementation(async ({ query, variables }) => {
    if (query === GetAgentOrgRunInspection) { if (failInspection) throw new Error('inspection unavailable'); return { data: { getAgentOrgRunInspection: envelope(active) } } }
    if (query === GetAgentOrgExecutionCheckpoint) return { data: { getAgentOrgExecutionCheckpoint: { orgRunId: 'org-run', changeSequence: 8, hasOpenExecutionWork: true } } }
    return variables?.agentRunId ? projection(variables) : { data: {} }
  })
  io.mutate.mockImplementation(async () => { active = false; return { data: { terminateAgentOrgRun: { success: true } } } })
})
afterEach(() => { wrapper?.unmount(); useAgentOrgContextsStore().releaseContext('org-run'); vi.useRealTimers(); vi.unstubAllGlobals() })
const open = async (address: string) => {
  const store = useAgentOrgContextsStore()
  await store.openForInspection('org-run'); store.select('org-run', address)
  const socket = Socket.instances[0]!
  socket.emit({ type: 'CONNECTED', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 's' } })
  socket.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: envelope(true) }); await vi.advanceTimersByTimeAsync(0)
  expect(store.contextFor('org-run')!.phase).toBe('live')
  wrapper = mount(ActivityFeed)
  return { store, socket, context: store.activeTargetFor('org-run')!.context }
}
it.each(['/director', '/team/worker'])('BEH-002: actual Org stop retains %s Activity through historical inspection at same focus', async address => {
  const { store, socket, context } = await open(address)
  const id = context.state.runId, before = useAgentActivityStore().getActivities(id)
  expect(wrapper!.text()).toContain('2 Events')
  context.requirement = 'draft'; context.contextFilePaths = [{ locator: '/draft.txt' } as never]
  await store.stopAndInspect('org-run'); await nextTick()
  expect(store.activeTargetFor('org-run')!.context).toBe(context)
  expect(context.state.currentStatus).toBe('offline'); expect(store.contextFor('org-run')!.phase).toBe('historical')
  expect(context.requirement).toBe('draft'); expect(context.contextFilePaths).toEqual([{ locator: '/draft.txt' }])
  expect(useAgentActivityStore().getActivities(id)).toEqual(before)
  expect(wrapper!.text()).toContain('2 Events'); expect(wrapper!.text()).toContain(`Delivered ${id}`)
  expect(wrapper!.text()).toContain(`System ${id}`)
  expect(socket.readyState).toBe(3); expect(socket.sent).toHaveLength(0)
  expect(io.mutate).toHaveBeenCalledTimes(1)
  expect(io.mutate.mock.calls[0][0].mutation.definitions[0].name.value).toBe('TerminateAgentOrgRun')
})
it('BEH-002/004: failed post-stop inspection retains last-known Activity instead of blanking it', async () => {
  const { store, context } = await open('/team/worker')
  const before = useAgentActivityStore().getActivities(context.state.runId)
  failInspection = true
  await expect(store.stopAndInspect('org-run')).rejects.toThrow('inspection unavailable')
  await nextTick()
  expect(context.state.currentStatus).toBe('offline')
  expect(useAgentActivityStore().getActivities(context.state.runId)).toEqual(before)
  expect(wrapper!.text()).toContain('2 Events')
})
it('BEH-004: rejected Org Stop preserves last-known Activity/liveness but retires input transport', async () => {
  const { store, context, socket } = await open('/director')
  const before = useAgentActivityStore().getActivities(context.state.runId)
  io.mutate.mockResolvedValue({ data: { terminateAgentOrgRun: { success: false, message: 'stop denied' } } })
  await expect(store.stopAndInspect('org-run')).rejects.toThrow('stop denied')
  expect(useAgentActivityStore().getActivities(context.state.runId)).toEqual(before)
  expect(context.state.currentStatus).toBe('idle'); expect(socket.readyState).toBe(3)
  expect(store.contextFor('org-run')!.phase).toBe('reopen_required')
})
