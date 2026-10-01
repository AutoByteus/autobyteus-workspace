import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { GetAgentOrgExecutionCheckpoint, GetAgentOrgRunInspection } from '~/graphql/queries/runHistoryQueries'
import { useAgentOrgContextsStore } from '../agentOrgContextsStore'
import { useAgentActivityStore } from '../agentActivityStore'
import ActivityFeed from '~/components/progress/ActivityFeed.vue'

// IR007: actual Org command, stream retirement, stage/commit/adopt and store. Only external I/O substituted.
const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), binding: 1 }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query, mutate: io.mutate }) }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ bindingRevision: io.binding, waitForBoundBackendReady: async () => true, getBoundEndpoints: () => ({ orgWs: 'ws://fixture.invalid/org' }) }) }))
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
const envelope = (active: boolean) => ({ root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: { ...JSON.parse(JSON.stringify(taskBearingView()).replaceAll('codex_app_server', 'autobyteus')), is_active: active, ...(!active ? { agent_statuses: [], base_change_sequence: 0 } : {}) } })
const projection = (variables: any) => ({ data: { getAgentOrgMemberRunProjection: { ...variables,
  conversation: [{ kind: 'message', role: 'assistant', content: 'Retained conversation', ts: 1 }],
  activities: [{ kind: 'system_instruction', activityId: `${variables.agentRunId}-system`, content: `System ${variables.agentRunId}`, ts: 1 },
    { kind: 'tool', invocationId: `${variables.agentRunId}-tool`, toolName: 'send_message_to', status: 'success', arguments: { message: variables.agentRunId }, result: `Delivered ${variables.agentRunId}`, ts: 2 }], hasEarlierActiveTraceEvents: false,
} } })
let active: boolean, failInspection: boolean, wrapper: ReturnType<typeof mount> | undefined
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks(); vi.useFakeTimers(); vi.stubGlobal('WebSocket', Socket); Socket.instances = []; active = true; failInspection = false; io.binding = 1
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

import { handleCompactionStatus } from '~/services/agentStreaming/handlers/agentStatusHandler'
const seedMembers = (store: ReturnType<typeof useAgentOrgContextsStore>) => {
  const entries = store.contextFor('org-run')!.listAgentContextEntries()
  for (const { agentRunId, context } of entries) {
    context.state.inputProjection = { runInstanceId: `runtime-${agentRunId}`, revision: 1 }
    handleCompactionStatus({phase:'started',compaction_operation_id:`op-${agentRunId}`,turn_id:'turn-4',raw_trace_count:9,compaction_model_identifier:'native-model'},context)
  }
  return entries
}
it('Org success reconciles every configured/task Agent/Team member before real empty-native projection commit/adoption', async () => {
  const {store,socket}=await open('/director');const entries=seedMembers(store);const activities=useAgentActivityStore()
  expect(entries.length).toBe(7)
  const beforeStates=entries.map(e=>e.context.state)
  const query=io.query.getMockImplementation()!
  io.query.mockImplementation(async (request:any)=>{
    if(request.query===GetAgentOrgRunInspection) {
      for(const e of entries) expect(activities.getCompactionActivities(e.agentRunId)[0].phase).toBe('stopped')
      expect(socket.readyState).toBe(3)
    }
    return query(request)
  })
  await store.stopAndInspect('org-run');await nextTick()
  for(const [i,e] of entries.entries()) {
    const current=store.contextFor('org-run')!.getAgentContext(e.agentRunId)!
    expect(current).toBe(e.context);expect(current.state).not.toBe(beforeStates[i]);expect(current.state.currentStatus).toBe('offline')
    expect(activities.getCompactionActivities(e.agentRunId)).toEqual([expect.objectContaining({phase:'stopped',message:'Stopped',rawTraceCount:9,compactionModelIdentifier:'native-model'})])
    expect(activities.getActivities(e.agentRunId)).toHaveLength(3)
  }
  expect(socket.sent).toHaveLength(0);expect(io.mutate).toHaveBeenCalledTimes(1)
  expect(store.contextFor('org-run')!.phase).toBe('historical')
})
it.each(['completed','failed'] as const)('Org retains actual %s and excludes external runtime while settling other members',async phase=>{
  const {store}=await open('/director');const entries=seedMembers(store)
  const first=entries[0],external=entries[1]
  handleCompactionStatus({phase,compaction_operation_id:`op-${first.agentRunId}`,turn_id:'turn-4'},first.context)
  external.context.config.runtimeKind='codex_app_server'
  failInspection=true
  await expect(store.stopAndInspect('org-run')).rejects.toThrow('inspection unavailable')
  const activities=useAgentActivityStore()
  expect(activities.getCompactionActivities(first.agentRunId)[0].phase).toBe(phase)
  expect(activities.getCompactionActivities(external.agentRunId)[0].phase).toBe('started')
  expect(activities.getCompactionActivities(entries[2].agentRunId)[0].phase).toBe('stopped')
  expect(store.contextFor('org-run')!.phase).toBe('historical')
})
it('Org rejected Stop retires transport but does not synthesize stopped or inspect',async()=>{
  const {store,socket}=await open('/director');const entries=seedMembers(store);io.query.mockClear()
  io.mutate.mockResolvedValue({data:{terminateAgentOrgRun:{success:false,message:'member failure'}}})
  await expect(store.stopAndInspect('org-run')).rejects.toThrow('member failure')
  for(const e of entries) expect(useAgentActivityStore().getCompactionActivities(e.agentRunId)[0].phase).toBe('started')
  expect(socket.readyState).toBe(3);expect(io.query).not.toHaveBeenCalled();expect(store.contextFor('org-run')!.phase).toBe('reopen_required')
})
it.each(['binding','state','instance','view'] as const)('Org stale %s response does not reconcile, mark historical, or inspect',async change=>{
  const {store}=await open('/director');const entries=seedMembers(store);const org=store.contextFor('org-run')!
  let resolve!:(value:any)=>void;io.mutate.mockImplementation(()=>new Promise(done=>{resolve=done}));io.query.mockClear()
  const pending=store.stopAndInspect('org-run')
  if(change==='binding')io.binding++
  if(change==='state')entries[0].context.state=Object.assign(Object.create(Object.getPrototypeOf(entries[0].context.state)),entries[0].context.state)
  if(change==='instance')entries[0].context.state.inputProjection={runInstanceId:'new-runtime',revision:1}
  if(change==='view')org.view={...org.view}
  resolve({data:{terminateAgentOrgRun:{success:true}}});await pending
  for(const e of entries)expect(useAgentActivityStore().getCompactionActivities(e.agentRunId)[0].phase).toBe('started')
  expect(io.query).not.toHaveBeenCalled();expect(org.isActive).toBe(true)
})
it('success plus inspection failure preserves stopped historical state, without manufacturing a new native activity',async()=>{
  const {store}=await open('/director');const entries=seedMembers(store);failInspection=true
  useAgentActivityStore().clearActivities(entries[0].agentRunId)
  await expect(store.stopAndInspect('org-run')).rejects.toThrow('inspection unavailable')
  expect(useAgentActivityStore().getActivities(entries[0].agentRunId)).toEqual([])
  expect(useAgentActivityStore().getCompactionActivities(entries[1].agentRunId)[0].phase).toBe('stopped')
  expect(store.contextFor('org-run')!.phase).toBe('historical')
})
