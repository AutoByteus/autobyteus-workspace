import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import { agentRootTreeRows, agentRootView } from '~/services/agentCollaboration/__tests__/agentRootFixture'

const stream = vi.hoisted(() => ({
  instances: [] as Array<{ options: any; connect: any; disconnect: any }>,
}))
vi.mock('~/services/agentCollaboration/agentRunCollaborationStreamingService', () => ({
  AgentRunCollaborationStreamingService: class {
    connect = vi.fn(); disconnect = vi.fn()
    constructor(public options: any) { stream.instances.push(this as never) }
  },
}))
const hydration = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('~/services/agentCollaboration/agentRunCollaborationHydration', () => ({ readAgentRunCollaboration: hydration.read }))
// autobyteus-461 rule 2: a delegated run is its own run; the fake owner records the opens and gives each a bound context.
const own = vi.hoisted(() => ({ ensureOpen: vi.fn(), send: vi.fn(async () => undefined), contexts: new Map<string, unknown>() }))
vi.mock('~/stores/delegatedRunsStore', () => ({ useDelegatedRunsStore: () => ({
  ensureOpen: own.ensureOpen,
  bindingOf: (subject: { kind: string; agentRunId: string; teamRunId?: string }) => {
    if (!own.contexts.has(subject.agentRunId)) return null
    return { context: own.contexts.get(subject.agentRunId), workspaceRootPath: '/own-ws',
      browse: subject.kind === 'agent' ? { kind: 'run', runId: subject.agentRunId }
        : { kind: 'teamMember', teamRunId: subject.teamRunId, memberAddress: '/product_team/prototyper', agentRunId: subject.agentRunId },
      interaction: { send: own.send, interrupt: vi.fn(), decideTool: vi.fn() } }
  },
}) }))
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyRunNavigationEffect: vi.fn() }) }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: vi.fn(async () => ({ data: { runTree: null } })) }) }))

import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'
import { useRunTreeStore } from '../runTreeStore'

const HOST = { kind: 'agent' as const, runId: 'host-run' }
const rowOf = (key: string): RunTreeRowDto => useRunTreeStore().rowsOf(HOST).find((row) => row.key === key)!

/**
 * autobyteus-461 SR-084: the agent runs' views, and the row selected in each run's tree. A selected row opens its own run
 * (rule 2) by the target the server gave it; the store keeps only which one.
 */
describe('agentRunCollaborationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); stream.instances.length = 0; own.ensureOpen.mockClear(); own.contexts.clear()
    hydration.read.mockReset(); hydration.read.mockResolvedValue(agentRootView())
    useRunTreeStore().streamSnapshot(HOST, agentRootTreeRows())
  })

  it('rule 2: a selected tree row opens as its own run, and the target is that run\'s; the run row returns to the host with a Team tab', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    expect(stream.instances).toHaveLength(0)
    expect(store.childTargetFor('host-run')).toBeNull()
    expect(store.runMessagesView('host-run')).toMatchObject({ rootKind: 'agent', focusedAgentRunId: 'host-run' })
    expect(store.selectTreeRow('host-run', rowOf('team_member:team-run:pp-run'))).toBe(true)
    expect(store.selectedRowKey('host-run')).toBe('team_member:team-run:pp-run')
    expect(store.selectedChild('host-run')).toBe('pp-run')
    // Until its own run is open there is no target; the host never loads it. The view knows it is opening (CR-461-057).
    expect(store.childTargetFor('host-run')).toBeNull()
    expect(store.isSelectedChildOpening('host-run')).toBe(true)
    const member = { conversation: 'own pp' }
    own.contexts.set('pp-run', member)
    expect(store.isSelectedChildOpening('host-run')).toBe(false)
    expect(store.childTargetFor('host-run')).toMatchObject({
      kind: 'agent_run_task_team_member', viewRun: { runId: 'host-run' }, address: '/product_team/prototyper', agentRunId: 'pp-run', access: 'live',
      collaborationMessages: { focusedAgentRunId: 'pp-run' }, workspaceRootPath: '/own-ws', context: member,
    })
    expect(store.selectTreeRow('host-run', rowOf('agent:cua-run'))).toBe(true)
    own.contexts.set('cua-run', { conversation: 'own cua' })
    expect(store.childTargetFor('host-run')).toMatchObject({ kind: 'agent_run_task_agent', agentRunId: 'cua-run', context: { conversation: 'own cua' },
      browse: { kind: 'run', runId: 'cua-run' } })
    expect(own.ensureOpen.mock.calls.map(([subject]) => subject)).toEqual([
      { kind: 'team_member', teamRunId: 'team-run', agentRunId: 'pp-run' },
      { kind: 'agent', agentRunId: 'cua-run' },
    ])
    // The run's own row selects its own agent.
    expect(store.selectTreeRow('host-run', rowOf('agent:host-run'))).toBe(true)
    expect(store.selectedChild('host-run')).toBeNull()
  })

  it('a selected row that leaves the tree returns the view to the run\'s own agent; a peer\'s row opens by its own identity on its node (G-D1); a row error is not selected', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    store.selectTreeRow('host-run', rowOf('agent:cua-run'))
    useRunTreeStore().streamChange(HOST, { added: [], removed: ['agent:cua-run'], updated: [] })
    expect(store.selectedChild('host-run')).toBeNull()
    expect(store.isSelectedChildOpening('host-run')).toBe(false)
    const peer: RunTreeRowDto = { ...rowOf('agent:host-run'), key: 'peer_agent:remote', kind: 'peer_agent', parentKey: 'agent:host-run',
      openTarget: { runKind: 'agent', runId: 'remote', agentRunId: 'remote', nodeId: 'beta' } }
    expect(store.selectTreeRow('host-run', { ...peer, address: '/publisher' })).toBe(true)
    expect(own.ensureOpen).toHaveBeenLastCalledWith({ kind: 'peer', nodeId: 'beta', runKind: 'agent', runId: 'remote', agentRunId: 'remote', address: '/publisher' })
    expect(store.selectTreeRow('host-run', { ...peer, openTarget: null })).toBe(false)
  })

  it('a message to a delegated run goes to its own run, never over the view\'s stream', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    own.contexts.set('cua-run', {})
    store.selectTreeRow('host-run', rowOf('agent:cua-run'))
    const target = store.childTargetFor('host-run')!
    if (target.access !== 'live') throw new Error('expected a live target')
    await target.interaction.send('hello', [])
    expect(own.send).toHaveBeenCalledOnce()
    expect(stream.instances).toHaveLength(0)
  })

  it('autobyteus-565 DEC-001: a run with no delegated run in its tree has its Messages tab, its own agent\'s; a run without a view has none', async () => {
    const store = useAgentRunCollaborationStore()
    expect(store.runMessagesView('host-run')).toBeNull()
    await store.inspect('host-run')
    useRunTreeStore().streamSnapshot(HOST, [rowOf('agent:host-run')])
    expect(store.runMessagesView('host-run')).toMatchObject({ rootKind: 'agent', rootRunId: 'host-run', focusedAgentRunId: 'host-run' })
  })

  it('ensureStoredView reads a run with collaboration once, and never one without', async () => {
    const store = useAgentRunCollaborationStore()
    store.ensureStoredView('plain-run', false)
    store.ensureStoredView('host-run', true)
    store.ensureStoredView('host-run', true)
    await Promise.resolve(); await Promise.resolve()
    expect(hydration.read).toHaveBeenCalledTimes(1)
    expect(hydration.read).toHaveBeenCalledWith('host-run')
    store.ensureStoredView('host-run', true)
    expect(hydration.read).toHaveBeenCalledTimes(1)
    expect(stream.instances).toHaveLength(0)
  })

  it('releaseAll closes every host stream and drops every host view (autobyteus-435 REQ-010 (b))', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    store.attach('host-run')
    expect(stream.instances).toHaveLength(1)
    store.releaseAll()
    expect(stream.instances[0]!.disconnect).toHaveBeenCalled()
    expect(store.contextFor('host-run')).toBeNull()
  })

  it('SR-045: the open run keeps one view stream whether its agent runs or not; its agent state only updates the view', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    hydration.read.mockClear()
    store.syncRun('host-run', false)
    store.syncRun('host-run', false)
    expect(stream.instances).toHaveLength(1)
    expect(stream.instances[0]!.connect).toHaveBeenCalledOnce()
    expect(store.contextFor('host-run')!.isActive).toBe(false)
    store.syncRun('host-run', true)
    expect(store.contextFor('host-run')!.isActive).toBe(true)
    store.syncRun('host-run', false)
    expect(stream.instances).toHaveLength(1)
    expect(stream.instances[0]!.disconnect).not.toHaveBeenCalled()
    expect(hydration.read).not.toHaveBeenCalled()
    // A Stop leaves the service; the server ended the view's stream, so its end reconnects the view to the stopped run's
    // fresh one (CR-461-111): its tree stays live, and a later Save's row change is shown.
    const stop = store.beginRunTermination('host-run')
    expect(stop.confirm()).toBe(true)
    expect(stream.instances[0]!.connect).toHaveBeenCalledOnce()
    stop.finish()
    expect(stream.instances[0]!.disconnect).not.toHaveBeenCalled()
    expect(stream.instances[0]!.connect).toHaveBeenCalledTimes(2)
    // A Stop that is not this one's ends nothing.
    stop.finish()
    expect(stream.instances[0]!.connect).toHaveBeenCalledTimes(2)
  })
})
