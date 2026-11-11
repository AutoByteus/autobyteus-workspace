import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { AgentRunCollaborationContext } from '~/services/agentCollaboration/agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '~/services/agentCollaboration/agentRunCollaborationIndex'
import { agentRootView } from '~/services/agentCollaboration/__tests__/agentRootFixture'

// autobyteus-426 REQ-009 / D-09: the history poll's states-only refresh of task rows under listed runs that are not open;
// autobyteus-461 SR-040: one rule for every hub, active or stopped (its children are runs of their own): the view is
// re-read when the answer's active state or local children differ from it, at most once per distinct answer.

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
/** The node's answer for one run, active or stopped: its open local children's agents with their statuses. */
const answerFor = (runId: string, isActive: boolean, statuses: unknown[]) => ({ runId, isActive, statuses })
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

  it('asks nothing for an unlisted stopped view', async () => {
    io.viewActive = false
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
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

  it('reads no view over ten refreshes of an active hub whose answer equals its view: one batched states read each (AC-005)', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    io.readView.mockClear()
    io.readStatuses.mockResolvedValue([answerFor('host-run', true, children({}))])
    for (let tick = 0; tick < 10; tick += 1) await store.refreshListedStatuses(['host-run'])
    expect(io.readStatuses).toHaveBeenCalledTimes(10)
    expect(io.readView).not.toHaveBeenCalled()
  })

  describe('a listed stopped delegator (autobyteus-461 SR-040)', () => {
    beforeEach(() => { io.viewActive = false })

    it('shows its working children\'s statuses within one poll, with no view re-read on any poll', async () => {
      const store = useAgentRunCollaborationStore()
      await store.inspect('host-run')
      io.readView.mockClear()
      io.readStatuses.mockResolvedValue([answerFor('host-run', false, children({ 'pp-run': 'running', 'pb-run': 'running', 'cua-run': 'idle' }))])
      await store.refreshListedStatuses(['host-run'])
      expect(io.readStatuses).toHaveBeenCalledWith(['host-run'])
      expect(statusOf(store, 'host-run', 'pb-run')).toBe(AgentStatus.Running)
      expect(statusOf(store, 'host-run', 'cua-run')).toBe(AgentStatus.Idle)
      for (let tick = 0; tick < 4; tick += 1) await store.refreshListedStatuses(['host-run'])
      expect(io.readView).not.toHaveBeenCalled()
    })

    it('a child whose Task closed leaves with one re-read; its reopen brings it back with one more', async () => {
      const store = useAgentRunCollaborationStore()
      await store.inspect('host-run')
      io.readView.mockClear()
      io.readStatuses.mockResolvedValueOnce([answerFor('host-run', false, children({}).slice(1))])
      await store.refreshListedStatuses(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(1)
      expect(io.readView).toHaveBeenCalledWith('host-run')

      io.readStatuses.mockResolvedValueOnce([answerFor('host-run', false, children({}, [['new-run', '/release_notes_writer']]))])
      await store.refreshListedStatuses(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(2)
    })

    it('an answer a re-read cannot match is re-read once, then its statuses are applied; another answer is re-read once more', async () => {
      const store = useAgentRunCollaborationStore()
      await store.inspect('host-run')
      io.readView.mockClear()
      // The re-read view keeps all three children; the answer names two.
      const unmatched = answerFor('host-run', false, children({ 'pp-run': 'idle' }).slice(1))
      io.readStatuses.mockResolvedValue([unmatched])
      await store.refreshListedStatuses(['host-run'])
      expect(statusOf(store, 'host-run', 'pp-run')).toBe(AgentStatus.Running)
      for (let tick = 0; tick < 4; tick += 1) await store.refreshListedStatuses(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(1)
      expect(statusOf(store, 'host-run', 'pp-run')).toBe(AgentStatus.Idle)

      io.readStatuses.mockResolvedValue([answerFor('host-run', true, children({}))])
      await store.refreshListedStatuses(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(2)

      // Back to the first answer: it differs from the last re-read's, so once more.
      io.readStatuses.mockResolvedValue([unmatched])
      await store.refreshListedStatuses(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(3)
    })

    it('forgets the re-read answer when the host is released: a later view of it is re-read again for that answer', async () => {
      const store = useAgentRunCollaborationStore()
      await store.inspect('host-run')
      io.readStatuses.mockResolvedValue([answerFor('host-run', false, children({}).slice(1))])
      await store.refreshListedStatuses(['host-run'])
      store.release('host-run')
      await store.inspect('host-run')
      io.readView.mockClear()
      await store.refreshListedStatuses(['host-run'])
      expect(io.readView).toHaveBeenCalledTimes(1)
    })
  })
})
