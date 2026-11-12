import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { AgentRunCollaborationContext } from '~/services/agentCollaboration/agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '~/services/agentCollaboration/agentRunCollaborationIndex'
import { agentRootView } from '~/services/agentCollaboration/__tests__/agentRootFixture'
import { closedTaskExecutionsDigest } from '@autobyteus/collaboration-stream-contracts'

// autobyteus-426 REQ-009 / D-09: the history poll's states-only refresh of task rows under listed runs that are not open;
// autobyteus-446: the answer's closed-set digest re-reads a view whose Task closed or reopened; autobyteus-435: also for a
// listed stopped host (its digest comes from the node's Task index), once per digest value.

const io = vi.hoisted(() => ({
  viewActive: true,
  readView: vi.fn(async () => ({})),
  readStatuses: vi.fn(async (_ids: readonly string[]): Promise<unknown[]> => []),
}))
vi.mock('~/services/agentCollaboration/agentRunCollaborationStreamingService', () => ({
  AgentRunCollaborationStreamingService: class {
    connect = vi.fn(); whenReady = vi.fn(async () => undefined); sendMessage = vi.fn(async () => undefined)
    isReady = vi.fn(() => false); disconnect = vi.fn(); interrupt = vi.fn(); decideTool = vi.fn()
  },
}))
const build = (hostRunId: string) => {
  // The fixture's hub is 'host-run'; another hub is the same tree under its own run ID (host and delegator).
  const view = { ...JSON.parse(JSON.stringify(agentRootView()).replaceAll('"host-run"', JSON.stringify(hostRunId))), is_active: io.viewActive }
  return new AgentRunCollaborationContext({
    hostRunId, view,
    entries: [...new AgentRunCollaborationIndex(view.execution_tree).agents.values()].map((agent) => {
      const state = new AgentRunState(agent.agentRunId, { id: agent.agentRunId, messages: [], createdAt: 'x', updatedAt: 'x', agentDefinitionId: 'd', agentName: agent.address })
      return { agentRunId: agent.agentRunId, memberAddress: agent.address, context: new AgentContext({ agentDefinitionId: 'd', agentDefinitionName: agent.address } as never, state) }
    }),
  })
}
vi.mock('~/services/agentCollaboration/agentRunCollaborationHydration', () => ({
  readAgentRunCollaboration: io.readView,
  readAgentRunCollaborationStatuses: io.readStatuses,
  buildAgentRunCollaborationContext: vi.fn(async ({ hostRunId }: { hostRunId: string }) => build(hostRunId)),
}))
vi.mock('~/services/agentCollaboration/agentRunCollaborationChildHydration', () => ({ hubChildLoadTarget: vi.fn(() => null) }))
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyRunNavigationEffect: vi.fn() }) }))

import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

const children = (statuses: Record<string, string>, extra: Array<[string, string]> = []) => [
  ...Object.entries({ 'cua-run': '/computer_use_agent', 'pp-run': '/product_team/prototyper', 'pb-run': '/product_team/bootstrapper' })
    .map(([agentRunId, memberAddress]) => ({ agentRunId, memberAddress, status: statuses[agentRunId] ?? 'idle', recoverableBlock: null })),
  ...extra.map(([agentRunId, memberAddress]) => ({ agentRunId, memberAddress, status: 'running', recoverableBlock: null })),
]
type Reference = { agentRunId: string } | { teamRunId: string }
/** The node's answer for one run, with the digest of its closed set (the fixture's is empty), active or stopped. */
const answerFor = (runId: string, isActive: boolean, statuses: unknown[], closed: Reference[] = []) =>
  ({ runId, isActive, statuses, closedTaskExecutionsDigest: closedTaskExecutionsDigest(closed) })
const statusOf = (store: ReturnType<typeof useAgentRunCollaborationStore>, hostRunId: string, agentRunId: string) =>
  store.contextFor(hostRunId)!.getAgentContext(agentRunId)!.state.currentStatus

describe('agentRunCollaborationStore.refreshListedStatuses', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    io.viewActive = true
    io.readView.mockClear()
    io.readStatuses.mockReset().mockResolvedValue([])
  })

  it('asks nothing when no listed run has a published view, and never asks for an open run (AC-009d)', async () => {
    const store = useAgentRunCollaborationStore()
    await store.refreshListedStatuses(['host-run'])
    expect(io.readStatuses).not.toHaveBeenCalled()

    await store.inspect('host-run')
    store.attach('host-run')
    await store.refreshListedStatuses(['host-run'])
    expect(io.readStatuses).not.toHaveBeenCalled()
  })

  it('applies the children\'s new states without reading the view when nothing else changed (AC-009a)', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    await store.inspect('other-run')
    io.readView.mockClear()
    io.readStatuses.mockResolvedValueOnce([
      answerFor('host-run', true, children({ 'cua-run': 'running', 'pp-run': 'idle' })),
      answerFor('other-run', true, children({})),
    ])

    await store.refreshListedStatuses(['host-run'])

    // One read, for the listed run and for the run whose view is still live.
    expect(io.readStatuses).toHaveBeenCalledTimes(1)
    expect(io.readStatuses.mock.calls[0]![0]).toEqual(['host-run', 'other-run'])
    expect(statusOf(store, 'host-run', 'cua-run')).toBe(AgentStatus.Running)
    expect(statusOf(store, 'host-run', 'pp-run')).toBe(AgentStatus.Idle)
    expect(io.readView).not.toHaveBeenCalled()
  })

  it('re-reads the view once when a child appeared, or a listed child is no longer answered (AC-009b)', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    io.readView.mockClear()
    io.readStatuses.mockResolvedValueOnce([answerFor('host-run', true, children({}, [['new-run', '/release_notes_writer']]))])
    await store.refreshListedStatuses(['host-run'])
    expect(io.readView).toHaveBeenCalledTimes(1)

    io.readView.mockClear()
    io.readStatuses.mockResolvedValueOnce([answerFor('host-run', true, children({}).slice(1))])
    await store.refreshListedStatuses(['host-run'])
    expect(io.readView).toHaveBeenCalledTimes(1)
  })

  it('re-reads the view once when the run stopped (rows go offline), or a stored view\'s run became active', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    io.readView.mockClear()
    io.readStatuses.mockResolvedValueOnce([answerFor('host-run', false, [])])
    // The run is no longer listed active, but its view is live: it is asked once.
    await store.refreshListedStatuses([])
    expect(io.readStatuses).toHaveBeenCalledTimes(1)
    expect(io.readView).toHaveBeenCalledTimes(1)

    io.viewActive = false
    await store.inspect('stored-run')
    io.readView.mockClear()
    io.readStatuses.mockResolvedValueOnce([answerFor('stored-run', true, children({}))])
    await store.refreshListedStatuses(['stored-run'])
    expect(io.readView).toHaveBeenCalledTimes(1)
  })

  it('does nothing when the listed run and its stored view are both inactive (activating), and asks nothing for an unlisted stored view', async () => {
    io.viewActive = false
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    io.readView.mockClear()
    io.readStatuses.mockResolvedValueOnce([answerFor('host-run', false, [])])
    await store.refreshListedStatuses(['host-run'])
    expect(io.readView).not.toHaveBeenCalled()
    expect(statusOf(store, 'host-run', 'pp-run')).toBe(AgentStatus.Running)

    io.readStatuses.mockClear()
    await store.refreshListedStatuses([])
    expect(io.readStatuses).not.toHaveBeenCalled()
  })

  it('drops an answer whose hub changed meanwhile: another node binding, or a stream attached', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    let answer!: (value: unknown[]) => void
    io.readStatuses.mockImplementationOnce(() => new Promise((resolve) => { answer = resolve }))
    const refresh = store.refreshListedStatuses(['host-run'])
    store.attach('host-run')
    answer([answerFor('host-run', true, children({ 'cua-run': 'running' }))])
    await refresh
    expect(statusOf(store, 'host-run', 'cua-run')).toBe(AgentStatus.Idle)

    store.release('host-run')
    await store.inspect('host-run')
    io.readStatuses.mockImplementationOnce(() => new Promise((resolve) => { answer = resolve }))
    const next = store.refreshListedStatuses(['host-run'])
    const context = store.contextFor('host-run')!
    useWindowNodeContextStore().bindNodeContext('other-node', 'http://other:29695')
    answer([answerFor('host-run', true, children({ 'cua-run': 'running' }))])
    await next
    expect(store.contextFor('host-run')).toBeNull()
    expect(context.getAgentContext('cua-run')!.state.currentStatus).toBe(AgentStatus.Idle)
  })

  it('runs one refresh at a time: a tick that finds one running joins it instead of asking again', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    let answer!: (value: unknown[]) => void
    io.readStatuses.mockImplementationOnce(() => new Promise((resolve) => { answer = resolve }))
    const first = store.refreshListedStatuses(['host-run'])
    const second = store.refreshListedStatuses(['host-run'])
    answer([answerFor('host-run', true, children({}))])
    await Promise.all([first, second])
    expect(io.readStatuses).toHaveBeenCalledTimes(1)
    await store.refreshListedStatuses(['host-run'])
    expect(io.readStatuses).toHaveBeenCalledTimes(2)
  })

  it('keeps the rows as they were when the status read fails', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    io.readStatuses.mockRejectedValueOnce(new Error('Response not successful: Received status code 502'))
    await store.refreshListedStatuses(['host-run'])
    expect(statusOf(store, 'host-run', 'pp-run')).toBe(AgentStatus.Running)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  describe('the closed-set digest (autobyteus-446)', () => {
    it('re-reads the view once when a listed run\'s Task closed (the digest differs), and applies no states from that answer', async () => {
      const store = useAgentRunCollaborationStore()
      await store.inspect('host-run')
      io.readView.mockClear()
      io.readStatuses.mockResolvedValueOnce([answerFor('host-run', true, children({ 'cua-run': 'running' }), [{ agentRunId: 'cua-run' }, { teamRunId: 'team-run' }])])
      await store.refreshListedStatuses(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(1)
      expect(io.readView).toHaveBeenCalledWith('host-run')
      expect(statusOf(store, 'host-run', 'cua-run')).toBe(AgentStatus.Idle)
    })

    it('re-reads the view once when a closed Task was reopened (the node\'s set shrank)', async () => {
      const store = useAgentRunCollaborationStore()
      await store.inspect('host-run')
      store.contextFor('host-run')!.applyEvent(5, { kind: 'task_executions_closed', task_executions: [{ agentRunId: 'cua-run' }] })
      io.readView.mockClear()
      io.readStatuses.mockResolvedValueOnce([answerFor('host-run', true, children({}), [])])
      await store.refreshListedStatuses(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(1)
    })

    it('reads no view over ten refreshes while the digests match: one batched states read each (AC-005)', async () => {
      const store = useAgentRunCollaborationStore()
      await store.inspect('host-run')
      io.readView.mockClear()
      io.readStatuses.mockResolvedValue([answerFor('host-run', true, children({}))])
      for (let tick = 0; tick < 10; tick += 1) await store.refreshListedStatuses(['host-run'])
      expect(io.readStatuses).toHaveBeenCalledTimes(10)
      expect(io.readView).not.toHaveBeenCalled()
    })

    it('a closed set the context already follows (a live event) matches the node\'s digest: no extra re-read', async () => {
      const store = useAgentRunCollaborationStore()
      await store.inspect('host-run')
      store.contextFor('host-run')!.applyEvent(5, { kind: 'task_executions_closed', task_executions: [{ teamRunId: 'team-run' }, { agentRunId: 'cua-run' }] })
      io.readView.mockClear()
      io.readStatuses.mockResolvedValueOnce([answerFor('host-run', true, children({ 'pp-run': 'idle' }), [{ agentRunId: 'cua-run' }, { teamRunId: 'team-run' }])])
      await store.refreshListedStatuses(['host-run'])
      expect(io.readView).not.toHaveBeenCalled()
      expect(statusOf(store, 'host-run', 'pp-run')).toBe(AgentStatus.Idle)
    })

    it('an inactive answer whose digest matches the stopped view re-reads nothing', async () => {
      io.viewActive = false
      const store = useAgentRunCollaborationStore()
      await store.inspect('host-run')
      io.readView.mockClear()
      io.readStatuses.mockResolvedValueOnce([answerFor('host-run', false, [])])
      await store.refreshListedStatuses(['host-run'])
      expect(io.readView).not.toHaveBeenCalled()
    })
  })

  describe('a listed stopped host (autobyteus-435 REQ-011)', () => {
    beforeEach(() => { io.viewActive = false })

    it('asks for a listed stopped host and re-reads its view when its Task closed while it is stopped (AC-011-1)', async () => {
      const store = useAgentRunCollaborationStore()
      await store.inspect('host-run')
      io.readView.mockClear()
      io.readStatuses.mockResolvedValueOnce([answerFor('host-run', false, [], [{ agentRunId: 'cua-run' }])])
      await store.refreshListedStatuses(['host-run'])
      expect(io.readStatuses).toHaveBeenCalledWith(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(1)
      expect(io.readView).toHaveBeenCalledWith('host-run')
    })

    it('re-reads at most once per digest value, even when the re-read view still differs (a stale index entry, AC-011-2)', async () => {
      const store = useAgentRunCollaborationStore()
      await store.inspect('host-run')
      io.readView.mockClear()
      const closed = answerFor('host-run', false, [], [{ agentRunId: 'cua-run' }])
      io.readStatuses.mockResolvedValue([closed])
      for (let tick = 0; tick < 5; tick += 1) await store.refreshListedStatuses(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(1)

      // Another value (the Task reopened, or a second one closed): one more re-read.
      io.readStatuses.mockResolvedValue([answerFor('host-run', false, [], [{ agentRunId: 'cua-run' }, { teamRunId: 'team-run' }])])
      for (let tick = 0; tick < 3; tick += 1) await store.refreshListedStatuses(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(2)

      // Back to the first value: it differs from the last re-read's, so once more.
      io.readStatuses.mockResolvedValue([closed])
      await store.refreshListedStatuses(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(3)
    })

    it('forgets the re-read digest when the host is released: a later view of it is re-read again for that value', async () => {
      const store = useAgentRunCollaborationStore()
      await store.inspect('host-run')
      io.readStatuses.mockResolvedValue([answerFor('host-run', false, [], [{ agentRunId: 'cua-run' }])])
      await store.refreshListedStatuses(['host-run'])
      store.release('host-run')
      await store.inspect('host-run')
      io.readView.mockClear()
      await store.refreshListedStatuses(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(1)
    })
  })
})
