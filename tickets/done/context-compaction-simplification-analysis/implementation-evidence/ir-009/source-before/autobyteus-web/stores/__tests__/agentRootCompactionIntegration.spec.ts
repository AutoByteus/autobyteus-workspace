import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { agentRootView } from '~/services/agentCollaboration/__tests__/agentRootFixture'
import { AgentRunCollaborationContext } from '~/services/agentCollaboration/agentRunCollaborationContext'
import { stageAgentRunCollaborationContext } from '~/services/agentCollaboration/agentRunCollaborationHydration'
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
    connect = vi.fn(); disconnect = vi.fn(); isReady = () => false
    constructor(public options: any) { io.streams.push(this) }
  },
}))
const deferred = <T = any>() => {
  let resolve!: (v: T) => void; let reject!: (e: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const nativeView = () => {
  const view = agentRootView()
  for (const entry of view.execution_tree.collaborators) {
    const launch = entry.kind === 'agent' ? entry.launchConfiguration : entry.defaultLaunchConfiguration
    launch.runtimeKind = 'autobyteus'
    launch.workspaceRootPath = null
  }
  return view
}
const envelope = (view: ReturnType<typeof nativeView> | null) => ({ data: { agentRunCollaboration: view && {
  root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: view,
} } })
const emptyProjection = ({ variables }: any) => ({ data: { agentRunCollaborationMemberProjection: {
  agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
  conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
} } })
let view: ReturnType<typeof nativeView>
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks(); io.streams.length = 0; view = nativeView()
  io.query.mockImplementation(async (input) => input.variables.runId ? envelope(view) : emptyProjection(input))
})
afterEach(() => { useAgentRunCollaborationStore().release('host-run') })
const seed = (context: AgentContext, operation = context.state.runId, phase: any = 'started') => {
  context.state.inputProjection = { runInstanceId: `instance-${context.state.runId}`, revision: 3 }
  handleCompactionStatus({ phase, compaction_operation_id: operation, turn_id: 't', raw_trace_count: 12,
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
  root.listAgentContextEntries().forEach(entry => seed(entry.context))
  return { store, root, host: retainedHost, activities: useAgentActivityStore() }
}

it('real host action retires children BEFORE one request, settles all children before real empty-history hydration', async () => {
  const { store, root, activities, host } = await setup()
  store.selectChild('host-run', 'cua-run')
  root.getAgentContext('pp-run')!.requirement = 'keep my draft'
  seed(root.getAgentContext('pb-run')!, 'already-completed', 'completed')
  const stream = store.attach('host-run'); const request = deferred()
  io.mutate.mockImplementation(() => {
    expect(stream.disconnect).toHaveBeenCalledOnce()
    expect(activities.getCompactionActivities('cua-run')[0].phase).toBe('started')
    return request.promise
  })
  const pending = useAgentRunStore().terminateRun('host-run')
  expect(() => store.attach('host-run')).toThrow('being stopped')
  expect(await useAgentRunStore().terminateRun('host-run')).toBe(false)
  expect(io.mutate).toHaveBeenCalledOnce()
  const child = root.getAgentContext('cua-run')!; child.requirement = 'held draft'
  await expect(store.submit('host-run', 'cua-run', child, 'hello', [])).rejects.toThrow('being stopped')
  expect(child.requirement).toBe('held draft'); expect(child.conversation.messages).toEqual([])
  const cold = nativeView(); cold.is_active = false; cold.agent_statuses.forEach(s => { s.status = 'offline' })
  io.query.mockImplementation(async input => {
    expect(activities.getCompactionActivities('cua-run')[0].phase).toBe('stopped')
    expect(host.state.compactionStatus?.phase).toBe('stopped')
    return input.variables.runId ? envelope(cold) : emptyProjection(input)
  })
  request.resolve({ data: { terminateAgentRun: { success: true } } })
  expect(await pending).toBe(true)
  await store.inspect('host-run')
  expect(store.contextFor('host-run')).not.toBe(root)
  expect(store.contextFor('host-run')!.getAgentContext('pp-run')!.requirement).toBe('keep my draft')
  for (const id of ['host-run', 'cua-run', 'pp-run', 'pb-run']) {
    expect(activities.getCompactionActivities(id)[0]).toMatchObject({ phase: 'stopped', message: 'Stopped', rawTraceCount: 12 })
  }
  expect(activities.getCompactionActivities('pb-run')[1].phase).toBe('completed')
  expect(io.streams).toHaveLength(1); expect(store.selectedChild('host-run')).toBe('cua-run')
})

it.each(['false', 'missing', 'transport', 'children-failed-after-inactive', 'host-failed-after-children'])(
  '%s is never whole-command confirmation and never auto-wakes the host', async kind => {
    const { store, root, activities } = await setup(); store.attach('host-run')
    const retired = io.streams[0]; const pending = deferred(); io.mutate.mockReturnValue(pending.promise)
    const stop = useAgentRunStore().terminateRun('host-run')
    retired.options.onInactive(); retired.options.reportError('obsolete callback')
    if (kind === 'transport') pending.reject(new Error('lost response'))
    else pending.resolve({ data: { terminateAgentRun: kind === 'missing' ? undefined : { success: false, message: kind } } })
    expect(await stop).toBe(false)
    for (const id of ['host-run', 'cua-run', 'pp-run']) expect(activities.getCompactionActivities(id)[0].phase).toBe('started')
    expect(root.phase).toBe('reopen_required'); expect(store.errors['host-run']).not.toBe('obsolete callback')
    store.syncHost('host-run', true); expect(io.streams).toHaveLength(1)
  },
)

it.each(['state', 'instance', 'runtime', 'address', 'root', 'release', 'node', 'host-state'])(
  'late success cannot settle a replaced %s batch', async kind => {
    const { store, root, activities, host } = await setup()
    const pending = deferred(); io.mutate.mockReturnValue(pending.promise)
    const stop = useAgentRunStore().terminateRun('host-run')
    const child = root.getAgentContext('pp-run')!
    if (kind === 'state') child.state = Object.assign(Object.create(Object.getPrototypeOf(child.state)), child.state)
    if (kind === 'instance') child.state.inputProjection = { runInstanceId: 'new-instance', revision: 0 }
    if (kind === 'runtime') child.config.runtimeKind = 'codex_app_server'
    if (kind === 'address') root.index.agents.set('pp-run', { ...root.index.requireAgent('pp-run'), address: '/wrong' as never })
    if (kind === 'root') store.contexts = { ...store.contexts, 'host-run': (await stageAgentRunCollaborationContext({ hostRunId: 'host-run', view })).context }
    if (kind === 'release') store.release('host-run')
    if (kind === 'node') useWindowNodeContextStore().bindingRevision++
    if (kind === 'host-state') host.state = Object.assign(Object.create(Object.getPrototypeOf(host.state)), host.state)
    pending.resolve({ data: { terminateAgentRun: { success: true } } }); await stop
    expect(activities.getCompactionActivities('cua-run')[0].phase).toBe('started')
    expect(activities.getCompactionActivities('pp-run')[0].phase).toBe('started')
  },
)

it('inspection failure after success retains Stopped and history; an empty cold store fabricates no activity', async () => {
  const { store, activities } = await setup()
  io.query.mockRejectedValue(new Error('inspection unavailable'))
  io.mutate.mockResolvedValue({ data: { terminateAgentRun: { success: true } } })
  expect(await useAgentRunStore().terminateRun('host-run')).toBe(true)
  await store.inspect('host-run')
  expect(store.errors['host-run']).toBe('inspection unavailable')
  expect(store.contextFor('host-run')?.phase).toBe('historical')
  expect(activities.getCompactionActivities('cua-run')[0].phase).toBe('stopped')
  setActivePinia(createPinia())
  io.query.mockImplementation(async input => input.variables.runId ? envelope(view) : emptyProjection(input))
  await useAgentRunCollaborationStore().inspect('host-run')
  expect(useAgentActivityStore().getActivities('cua-run')).toEqual([])
})

it.each(['view', 'member'])('captures ALL revisions before deferred %s fetch; conflict changes no member/config/activity/selection', async point => {
  const { store, root, activities } = await setup()
  store.selectChild('host-run', 'pp-run'); store.toggleTaskTeam('host-run', 'team-run')
  const before = root.listAgentContextEntries().map(e => ({ ...e, state: e.context.state, config: e.context.config }))
  const delay = deferred(); io.query.mockImplementation(async input => {
    if ((point === 'view' && input.variables.runId) || (point === 'member' && input.variables.agentRunId === 'pp-run')) await delay.promise
    return input.variables.runId ? envelope(view) : emptyProjection(input)
  })
  const pending = store.inspect('host-run'); await nextTick(); await nextTick()
  seed(root.getAgentContext('pp-run')!, 'concurrent')
  const revs = before.map(e => activities.getActivityContentRevision(e.agentRunId))
  delay.resolve(null); await pending
  expect(store.errors['host-run']).toContain('activity changed')
  expect(store.contextFor('host-run')).toBe(root)
  before.forEach((e, i) => {
    expect(e.context.state).toBe(e.state); expect(e.context.config).toBe(e.config)
    expect(activities.getActivityContentRevision(e.agentRunId)).toBe(revs[i])
  })
  expect(store.selectedChild('host-run')).toBe('pp-run'); expect(store.isTaskTeamExpanded('host-run', 'team-run')).toBe(false)
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

it('preflights every retained identity before committing any activity or swapping earlier contexts', async () => {
  const { store, root, activities } = await setup()
  const candidate = (await stageAgentRunCollaborationContext({ hostRunId: 'host-run', view })).context
  candidate.index.agents.set('pp-run', { ...candidate.index.requireAgent('pp-run'), address: '/wrong' as never })
  const old = root.getAgentContext('cua-run')!; const state = old.state; const config = old.config
  const commit = vi.fn(); store.attach('host-run')
  expect(() => io.streams[0].options.publish(candidate, commit)).toThrow('retained identity')
  expect(commit).not.toHaveBeenCalled(); expect(old.state).toBe(state); expect(old.config).toBe(config)
  expect(store.contextFor('host-run')).toBe(root); expect(activities.getCompactionActivities('cua-run')[0].phase).toBe('started')
})
