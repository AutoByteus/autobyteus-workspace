import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { agentRootView } from '~/services/agentCollaboration/__tests__/agentRootFixture'
import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'
import { useAgentRunStore } from '../agentRunStore'
import { useAgentContextsStore } from '../agentContextsStore'
import { useAgentActivityStore } from '../agentActivityStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'
import { handleCompactionStatus } from '~/services/agentStreaming/handlers/agentStatusHandler'

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), inactive: vi.fn(), streams: [] as any[] }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query, mutate: io.mutate }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ markRunAsInactive: io.inactive,
  refreshTreeQuietly: vi.fn(), ensureWorkspaceByRootPath: vi.fn(), resolveWorkspaceMetadataByRootPath: vi.fn(async () => null) }) }))
vi.mock('~/services/agentCollaboration/agentRunCollaborationStreamingService', () => ({
  AgentRunCollaborationStreamingService: class {
    connect = vi.fn(); disconnect = vi.fn()
    constructor(public options: any) { io.streams.push(this) }
  },
}))
const deferred = <T = any>() => {
  let resolve!: (v: T) => void; let reject!: (e: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
// autobyteus-461 SR-084: the view is its host's; the runs it delegated are runs of their own, outside it (rule 2).
const nativeView = () => agentRootView()
const envelope = (view: ReturnType<typeof nativeView> | null) => ({ data: { agentRunCollaboration: view && {
  root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: view,
} } })
let view: ReturnType<typeof nativeView>
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks(); io.streams.length = 0; view = nativeView()
  io.query.mockImplementation(async () => envelope(view))
})
afterEach(() => { useAgentRunCollaborationStore().release('host-run') })
const seed = (context: AgentContext, operation = context.state.runId, phase: any = 'started') => {
  context.state.inputProjection = { runInstanceId: `instance-${context.state.runId}`, revision: 3 }
  handleCompactionStatus({ occurred_at: '2026-11-23T16:55:09.697Z', phase, compaction_operation_id: operation, turn_id: 't', raw_trace_count: 12,
    requested_turn_id: 'r', execution_turn_id: 'e', compaction_model_identifier: 'model' }, context)
}
const setup = async () => {
  const store = useAgentRunCollaborationStore(); await store.inspect('host-run')
  const root = store.contextFor('host-run')!
  const host = new AgentContext({ runtimeKind: 'autobyteus' } as any,
    new AgentRunState('host-run', { id: 'host-run', messages: [], createdAt: 'x', updatedAt: 'x', agentDefinitionId: 'd', agentName: 'Host' }))
  useAgentContextsStore().runs = new Map([['host-run', host]])
  const retainedHost = useAgentContextsStore().getRun('host-run')!
  seed(retainedHost)
  return { store, root, host: retainedHost, activities: useAgentActivityStore() }
}

it('a Stop of the run\'s own agent keeps the view\'s stream; only the host\'s compaction stops (SR-045)', async () => {
  const { store, root, activities, host } = await setup()
  const stream = store.attach('host-run'); const request = deferred()
  io.mutate.mockImplementation(() => {
    expect(stream.disconnect).not.toHaveBeenCalled()
    return request.promise
  })
  const pending = useAgentRunStore().terminateRun('host-run')
  expect(() => store.attach('host-run')).toThrow('being stopped')
  expect(await useAgentRunStore().terminateRun('host-run')).toBe(false)
  expect(io.mutate).toHaveBeenCalledOnce()
  request.resolve({ data: { terminateAgentRun: { success: true } } })
  expect(await pending).toBe(true)
  expect(host.state.compactionStatus?.phase).toBe('stopped')
  expect(activities.getCompactionActivities('host-run')[0]).toMatchObject({ phase: 'stopped', message: 'Stopped', rawTraceCount: 12 })
  expect(store.contextFor('host-run')).toBe(root); expect(root.isActive).toBe(false)
  expect(stream.disconnect).not.toHaveBeenCalled()
  expect(io.streams).toHaveLength(1)
  expect(store.attach('host-run')).toBe(stream)
})

it.each(['false', 'missing', 'transport', 'children-failed-after-inactive', 'host-failed-after-children'])(
  '%s is never whole-command confirmation and never auto-wakes the host', async kind => {
    const { store, root, activities } = await setup(); store.attach('host-run')
    const stream = io.streams[0]; const pending = deferred(); io.mutate.mockReturnValue(pending.promise)
    const stop = useAgentRunStore().terminateRun('host-run')
    stream.options.reportError('obsolete callback')
    if (kind === 'transport') pending.reject(new Error('lost response'))
    else pending.resolve({ data: { terminateAgentRun: kind === 'missing' ? undefined : { success: false, message: kind } } })
    expect(await stop).toBe(false)
    expect(activities.getCompactionActivities('host-run')[0].phase).toBe('started')
    // Not confirmed: the run's agent is not marked stopped; the view's stream continues (SR-045).
    expect(root.isActive).toBe(true); expect(store.errors['host-run']).not.toBe('obsolete callback')
    expect(stream.disconnect).not.toHaveBeenCalled()
    store.syncRun('host-run', true); expect(io.streams).toHaveLength(1)
  },
)

// The host's Stop settles only the host's compaction (SR-045): a late success settles nothing once the host's request is
// no longer current.
it.each(['host-state', 'host-instance', 'node'])(
  'late success cannot settle a replaced %s', async kind => {
    const { activities, host } = await setup()
    const pending = deferred(); io.mutate.mockReturnValue(pending.promise)
    const stop = useAgentRunStore().terminateRun('host-run')
    if (kind === 'host-state') host.state = Object.assign(Object.create(Object.getPrototypeOf(host.state)), host.state)
    if (kind === 'host-instance') host.state.inputProjection = { runInstanceId: 'new-instance', revision: 0 }
    if (kind === 'node') useWindowNodeContextStore().bindingRevision++
    pending.resolve({ data: { terminateAgentRun: { success: true } } }); await stop
    expect(activities.getCompactionActivities('host-run')[0].phase).toBe('started')
  },
)

it('inspection failure after success keeps the stopped host; an empty cold store fabricates no activity', async () => {
  const { store, activities } = await setup()
  io.query.mockRejectedValue(new Error('inspection unavailable'))
  io.mutate.mockResolvedValue({ data: { terminateAgentRun: { success: true } } })
  expect(await useAgentRunStore().terminateRun('host-run')).toBe(true)
  await store.inspect('host-run')
  expect(store.errors['host-run']).toBe('inspection unavailable')
  expect(store.contextFor('host-run')?.isActive).toBe(false)
  expect(activities.getCompactionActivities('host-run')[0].phase).toBe('stopped')
  setActivePinia(createPinia())
  io.query.mockImplementation(async () => envelope(view))
  await useAgentRunCollaborationStore().inspect('host-run')
  expect(useAgentActivityStore().getActivities('host-run')).toEqual([])
})

it.each(['null', 'view', 'error'])('stale %s inspection after attach cannot remove newer service or context', async result => {
  const { store, root } = await setup(); const read = deferred(); io.query.mockReturnValue(read.promise)
  const pending = store.inspect('host-run'); const service = store.attach('host-run')
  if (result === 'error') read.reject(new Error('stale error'))
  else read.resolve(envelope(result === 'null' ? null : view))
  await pending
  expect(store.contextFor('host-run')).toBe(root); expect(store.errors['host-run']).toBeNull()
  expect(store.attach('host-run')).toBe(service)
})

it('release invalidates old stream callbacks and old inspection finally cannot delete a new read slot', async () => {
  const { store, root } = await setup()
  const oldRead = deferred(); io.query.mockReturnValueOnce(oldRead.promise)
  const oldPending = store.inspect('host-run')
  const oldStream = store.attach('host-run') as any
  store.release('host-run')
  const nextRead = deferred(); io.query.mockReturnValueOnce(nextRead.promise)
  const nextPending = store.inspect('host-run')
  oldRead.resolve(envelope(null)); await oldPending
  const queriesBefore = io.query.mock.calls.length
  const coalesced = store.inspect('host-run')
  expect(io.query.mock.calls.length).toBe(queriesBefore)
  nextRead.resolve(envelope(view)); await nextPending; await coalesced
  const nextRoot = store.contextFor('host-run')
  const nextStream = store.attach('host-run')
  oldStream.options.reportError('stale')
  expect(() => oldStream.options.publish(root)).toThrow('ownership released')
  expect(store.attach('host-run')).toBe(nextStream); expect(store.contextFor('host-run')).toBe(nextRoot)
  expect(store.errors['host-run']).toBeNull()
})
