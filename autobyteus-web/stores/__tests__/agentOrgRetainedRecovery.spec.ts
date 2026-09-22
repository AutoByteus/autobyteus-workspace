import { mount } from '@vue/test-utils'
import { computed, defineComponent, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { GetAgentOrgExecutionCheckpoint, GetAgentOrgRunInspection } from '~/graphql/queries/runHistoryQueries'

const mocks = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), activity: vi.fn(), terminate: vi.fn(), finalize: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query, mutate: mocks.mutate }) }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => true, getBoundEndpoints: () => ({ orgWs: 'ws://example.test/org' }) }) }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyAgentOrgActivity: mocks.activity, refreshAgentOrgHistory: vi.fn() }) }))
vi.mock('~/stores/agentOrgRunStore', () => ({ useAgentOrgRunStore: () => ({ terminate: mocks.terminate, restore: mocks.mutate }) }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ getAgentDefinitionById: () => null }) }))
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { AgentOrgStreamingService } from '~/services/agentOrgExecution/agentOrgStreamingService'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
vi.mock('~/stores/contextFileUploadStore', () => ({ useContextFileUploadStore: () => ({ finalizeDraftAttachments: mocks.finalize }) }))
import { fetchRunHistoryTree, refreshAgentOrgHistoryForStore } from '~/stores/runHistoryLoadActions'
import { ListCollaborationRootHistory } from '~/graphql/queries/collaborationRootHistoryQueries'
import { historyData } from '~/test-support/agentOrgApolloFixture'
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue'

class Socket {
  static OPEN = 1; static CONNECTING = 0; static instances: Socket[] = []
  readyState = 1
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  sent: string[] = []
  constructor(_url: string) { Socket.instances.push(this) }
  send(value: string) { this.sent.push(value) }
  close() { this.readyState = 3; this.onclose?.() }
  emit(message: unknown) { this.onmessage?.({ data: JSON.stringify(message) }) }
}
const envelope = (active: boolean) => {
  const original = taskBearingView()
  const view = { ...original, is_active: active,
    ...(!active ? { agent_statuses: [], base_change_sequence: 0 } : {}) }
  return { schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: view }
}
const inspection = (active: boolean) => ({ data: { getAgentOrgRunInspection: envelope(active) } })
const projection = (variables: any) => ({ data: { getAgentOrgMemberRunProjection: {
  ...variables, conversation: [{ kind: 'message', role: 'assistant', content: 'Retained conversation', ts: 1700000001 }], activities: [], hasEarlierActiveTraceEvents: false,
} } })
const tick = () => vi.advanceTimersByTimeAsync(0)
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done }); return { promise, resolve } }
let store: ReturnType<typeof useAgentOrgContextsStore>
let wrapper: ReturnType<typeof mount> | undefined
const open = async (address = '/team/worker') => {
  await store.openForInspection('org-run')
  store.select('org-run', address)
  const socket = Socket.instances[0]!
  socket.emit({ type: 'CONNECTED', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 's1' } })
  socket.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: envelope(true) })
  await tick()
  expect(store.contextFor('org-run')!.phase).toBe('live')
  return socket
}
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('WebSocket', Socket); Socket.instances = []
  vi.clearAllMocks(); mocks.query.mockReset(); mocks.terminate.mockReset()
  setActivePinia(createPinia()); store = useAgentOrgContextsStore()
  mocks.query.mockImplementation(async ({ query, variables }) => query === GetAgentOrgRunInspection
    ? inspection(true) : query === GetAgentOrgExecutionCheckpoint
      ? { data: { getAgentOrgExecutionCheckpoint: { orgRunId: 'org-run', changeSequence: 8, hasOpenExecutionWork: true } } }
      : projection(variables))
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined; store.releaseContext('org-run'); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('retained Org disconnected recovery through real service/store/hydration', () => {
  it.each(['/team/worker', '/director'])('RET-01: reconciles %s without refocus or input', async (address) => {
    const socket = await open(address)
    const target = computed(() => store.activeTargetFor('org-run')!)
    const retained = target.value.context
    retained.requirement = 'unsent draft'
    retained.contextFilePaths = [{ locator: '/draft/note.txt' } as never]
    if (address.startsWith('/team/')) {
      wrapper = mount(defineComponent({ setup: () => () => h(TeamWorkspaceSurface, { target: target.value as any }) }), {
        global: { stubs: { AgentEventMonitor: true, SkillImprovementComposerCta: true, WorkspaceHeaderActions: true } },
      })
      expect(wrapper.text()).toContain('Idle')
    }
    mocks.query.mockClear()
    mocks.query.mockImplementation(async ({ variables }) => variables.agentRunId ? projection(variables) : inspection(false))
    socket.close(); await tick()
    expect(store.contextFor('org-run')!.phase).toBe('historical')
    expect(target.value.context).toBe(retained)
    expect(retained.state.currentStatus).toBe('offline')
    expect(target.value.access).toBe('continuable')
    expect(retained.conversation.messages.map(m => m.text)).toEqual(['Retained conversation'])
    expect(retained.requirement).toBe('unsent draft')
    expect(retained.contextFilePaths).toEqual([{ locator: '/draft/note.txt' }])
    expect(store.errorFor('org-run')).toBeNull()
    expect(Socket.instances).toHaveLength(1)
    expect(mocks.query.mock.calls.some(([request]) => request.query === GetAgentOrgExecutionCheckpoint)).toBe(false)
    expect(mocks.mutate).not.toHaveBeenCalled()
    expect(mocks.activity).toHaveBeenLastCalledWith('org-run', false)
    if (wrapper) { expect(wrapper.text()).toContain('Offline'); expect(wrapper.text()).not.toContain('Idle') }
  })
})

it.each(['network', 'missing', 'malformed', 'foreign', 'graphql', 'projection'])('RET-03: %s stays unknown and never publishes inactive', async (failure) => {
  const socket = await open()
  const retained = store.contextFor('org-run')!
  mocks.query.mockImplementation(async ({ variables }) => {
    if (failure === 'network') throw new Error('unreachable')
    if (failure === 'projection' && variables.agentRunId) throw new Error('projection unavailable')
    if (failure === 'missing') return { data: {} }
    if (failure === 'malformed') return { data: { getAgentOrgRunInspection: {} } }
    const result = inspection(false)
    if (failure === 'foreign') result.data.getAgentOrgRunInspection.root_run_id = 'foreign'
    if (failure === 'graphql') return { ...result, errors: [{ message: 'not authorized' }] }
    return result
  })
  socket.close(); await vi.advanceTimersByTimeAsync(20000)
  expect(store.contextFor('org-run')).toBe(retained)
  expect(retained.phase).toBe('reopen_required')
  expect(store.activeTargetFor('org-run')!.access).toBe('read_only')
  expect(store.errorFor('org-run')).toBeTruthy()
  expect(Socket.instances).toHaveLength(1)
  expect(mocks.mutate).not.toHaveBeenCalled()
})

it('RET-04: history restarts an exhausted bounded cycle, coalesces requests and ignores unretained/omitted roots', async () => {
  const socket = await open()
  mocks.query.mockRejectedValue(new Error('server unavailable'))
  socket.close(); await vi.advanceTimersByTimeAsync(20000)
  const requests = mocks.query.mock.calls.length
  await vi.advanceTimersByTimeAsync(60000)
  expect(mocks.query).toHaveBeenCalledTimes(requests)
  store.reconcileRetainedHistory(['unretained'])
  await tick(); expect(mocks.query).toHaveBeenCalledTimes(requests)
  const gate = deferred<any>()
  mocks.query.mockImplementation(({ variables }) => variables.agentRunId ? projection(variables) : gate.promise)
  store.reconcileRetainedHistory(['org-run', 'org-run'])
  store.reconcileRetainedHistory(['org-run'])
  await tick()
  expect(mocks.query).toHaveBeenCalledTimes(requests + 1)
  store.reconcileRetainedHistory(['org-run']); await tick()
  expect(mocks.query).toHaveBeenCalledTimes(requests + 1)
  gate.resolve(inspection(false)); await tick()
  expect(store.contextFor('org-run')!.phase).toBe('historical')
  expect(store.errorFor('org-run')).toBeNull()
  expect(store.contextFor('unretained')).toBeNull()
})

it.each(['inspection', 'projection'])('RET-05: pending %s cannot publish during stop, even before terminate resolves', async (boundary) => {
  const socket = await open()
  const retained = store.contextFor('org-run')!
  const gate = deferred<any>()
  mocks.query.mockImplementation(({ variables }) => boundary === 'inspection' && !variables.agentRunId
    ? gate.promise : boundary === 'projection' && variables.agentRunId ? gate.promise
      : variables.agentRunId ? projection(variables) : inspection(false))
  socket.close(); await tick()
  const terminate = deferred<void>(); mocks.terminate.mockReturnValue(terminate.promise)
  const stopping = store.stopAndInspect('org-run')
  gate.resolve(boundary === 'inspection' ? inspection(false) : projection({ agentRunId: 'wrong', memberAddress: '/wrong' }))
  await tick()
  expect(store.contextFor('org-run')).toBe(retained)
  expect(retained.phase).toBe('reopen_required')
  expect(store.operations['org-run']).toBe('stop')
  mocks.query.mockImplementation(async ({ variables }) => variables.agentRunId ? projection(variables) : inspection(false))
  terminate.resolve(); await stopping
  expect(store.contextFor('org-run')!.phase).toBe('historical')
})

it.each(['release', 'manual'])('RET-05: late inspection cannot overwrite %s owner', async (action) => {
  const socket = await open()
  const gate = deferred<any>()
  mocks.query.mockReturnValue(gate.promise)
  socket.close(); await tick()
  if (action === 'release') store.releaseContext('org-run')
  else {
    mocks.query.mockImplementation(async ({ variables }) => variables.agentRunId ? projection(variables) : inspection(false))
    store.select('org-run', '/director')
    await store.openForInspection('org-run')
  }
  const current = store.contextFor('org-run')
  gate.resolve(inspection(true)); await tick()
  expect(store.contextFor('org-run')).toBe(current)
  expect(Socket.instances).toHaveLength(1)
  if (action === 'manual') expect(store.activeTargetFor('org-run')!.context.state.runId).toBe('agent-director')
})

it('RET-02: active observation still needs both checkpoint barriers and a new snapshot', async () => {
  const first = await open()
  mocks.query.mockClear()
  first.close(); await tick()
  expect(Socket.instances).toHaveLength(2)
  expect(store.activeTargetFor('org-run')!.access).toBe('read_only')
  expect(mocks.query.mock.calls.map(([r]) => r.query)).toEqual([GetAgentOrgRunInspection, GetAgentOrgExecutionCheckpoint])
  const second = Socket.instances[1]!
  second.emit({ type: 'CONNECTED', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 's2' } })
  second.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: envelope(true) }); await tick()
  expect(store.activeTargetFor('org-run')!.access).toBe('live')
  expect(mocks.query.mock.calls.filter(([r]) => r.query === GetAgentOrgExecutionCheckpoint)).toHaveLength(2)
})

it('RET-02: active-to-inactive checkpoint rejection retries via new inspection, not error classification', async () => {
  const first = await open()
  let reads = 0
  mocks.query.mockImplementation(async ({ query, variables }) => {
    if (query === GetAgentOrgRunInspection) return inspection(++reads === 1)
    if (query === GetAgentOrgExecutionCheckpoint) throw new Error('arbitrary checkpoint failure')
    return projection(variables)
  })
  first.close(); await tick()
  expect(store.contextFor('org-run')!.phase).toBe('reopen_required')
  await vi.advanceTimersByTimeAsync(1000)
  expect(store.contextFor('org-run')!.phase).toBe('historical')
  expect(Socket.instances).toHaveLength(1)
})


it('RET-05: pending attachment submission remains excluded through historical cleanup and settles once', async () => {
  const socket = await open()
  const target = store.activeTargetFor('org-run')!
  if (target.access !== 'live') throw new Error('expected live target')
  const retained = target.context
  const files = [{ locator: '/rest/drafts/agent-org-runs/org-run/agent-runs/agent-worker/context-files/note.txt', type: 'Text' }] as any
  const gate = deferred<any>()
  mocks.finalize.mockReturnValue(gate.promise)
  const sending = target.interaction.send('pending message', files)
  const outcome = sending.catch(error => error)
  expect(mocks.finalize).toHaveBeenCalledTimes(1)
  retained.requirement = 'newer draft'
  retained.contextFilePaths = [{ locator: '/newer.txt' } as any]
  mocks.query.mockImplementation(async ({ variables }) => variables.agentRunId ? projection(variables) : inspection(false))
  socket.close(); await tick()
  expect(store.contextFor('org-run')!.phase).toBe('historical')
  expect(store.activeTargetFor('org-run')!.context).toBe(retained)
  expect(retained.submissionPending).toBe(true)
  expect(store.activeTargetFor('org-run')!.access).toBe('read_only')
  await expect(target.interaction.send('duplicate', [])).rejects.toThrow()
  const finalFiles = [{ ...files[0], locator: '/rest/agent-org-runs/org-run/agent-runs/agent-worker/context-files/note.txt' }]
  gate.resolve(finalFiles)
  expect(await outcome).toBeInstanceOf(Error)
  expect(retained.submissionPending).toBe(false)
  expect(store.activeTargetFor('org-run')!.access).toBe('continuable')
  const users = retained.conversation.messages.filter(m => m.type === 'user')
  expect(users).toHaveLength(1)
  expect(users[0]!.contextFilePaths).toEqual(finalFiles)
  expect(retained.conversation.messages.filter(m => m.type === 'ai')).toHaveLength(2)
  expect(retained.requirement).toBe('newer draft')
  expect(retained.contextFilePaths).toEqual([{ locator: '/newer.txt' }])
  expect(socket.sent).toHaveLength(0)
  expect(mocks.mutate).not.toHaveBeenCalled()
})

it('RET-05: an activity conflict cannot partially publish; a later recovery preserves latest focus', async () => {
  const socket = await open()
  const retained = store.contextFor('org-run')!
  const activities = useAgentActivityStore()
  const commit = vi.spyOn(activities, 'replaceProjectionActivitiesIfRevisions').mockReturnValue('conflict')
  const gate = deferred<any>()
  mocks.query.mockImplementation(({ variables }) => variables.agentRunId ? projection(variables) : gate.promise)
  socket.close(); await tick()
  store.select('org-run', '/director')
  gate.resolve(inspection(false)); await tick()
  expect(store.contextFor('org-run')).toBe(retained)
  expect(retained.phase).toBe('reopen_required')
  expect(store.activeTargetFor('org-run')!.context.state.runId).toBe('agent-director')
  commit.mockRestore()
  mocks.query.mockImplementation(async ({ variables }) => variables.agentRunId ? projection(variables) : inspection(false))
  await vi.advanceTimersByTimeAsync(1000)
  expect(store.contextFor('org-run')!.phase).toBe('historical')
  expect(store.activeTargetFor('org-run')!.context).toBe(retained.getAgentContext('agent-director'))
})


it.each(['full', 'focused'])('RET-04: successful %s loader recovers an exhausted retained service through inspection', async (kind) => {
  const socket = await open()
  const retained = store.activeTargetFor('org-run')!.context
  mocks.query.mockRejectedValue(new Error('offline server'))
  socket.close(); await vi.advanceTimersByTimeAsync(20000)
  const history = { refreshRunNavigationTopology: vi.fn(), agentOrgRequestGeneration: 0, historyFamilyErrors: { workspace: null, agentOrg: null }, agentOrgHistory: [], workspaceGroups: [] } as any
  mocks.query.mockImplementation(async ({ query, variables }) => {
    if (query === ListCollaborationRootHistory) return { data: historyData(true) } // stale active row is only a trigger.
    if (query === GetAgentOrgRunInspection) return inspection(false)
    if (variables?.agentRunId) return projection(variables)
    throw new Error('independent workspace failure')
  })
  if (kind === 'full') await fetchRunHistoryTree(history)
  else await refreshAgentOrgHistoryForStore(history)
  await tick()
  expect(history.historyFamilyErrors.agentOrg).toBeNull()
  expect(store.contextFor('org-run')!.phase).toBe('historical')
  expect(store.activeTargetFor('org-run')!.context).toBe(retained)
  expect(retained.state.currentStatus).toBe('offline')
  expect(Socket.instances).toHaveLength(1)
  expect(mocks.mutate).not.toHaveBeenCalled()
})


it('RET-01/05: inactive publication rejects readiness and released service cannot resurrect', async () => {
  const connect = vi.spyOn(AgentOrgStreamingService.prototype, 'connect')
  const socket = await open()
  const service = connect.mock.contexts[0] as AgentOrgStreamingService
  mocks.query.mockImplementation(async ({ variables }) => variables.agentRunId ? projection(variables) : inspection(false))
  socket.close()
  const waiting = service.whenReady().then(() => 'ready', () => 'released')
  await tick()
  expect(await waiting).toBe('released')
  expect(service.isReady()).toBe(false)
  await expect(service.whenReady()).rejects.toThrow('released')
  service.requestRecovery(); service.connect(); await vi.advanceTimersByTimeAsync(20000)
  expect(Socket.instances).toHaveLength(1)
  expect(store.contextFor('org-run')!.phase).toBe('historical')
  const read = mocks.query.mock.calls.find(([r]) => r.query === GetAgentOrgRunInspection)![0]
  expect(read).toMatchObject({ variables: { orgRunId: 'org-run' }, fetchPolicy: 'network-only', context: { queryDeduplication: false } })
  connect.mockRestore()
})
