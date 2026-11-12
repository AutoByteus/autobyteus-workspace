import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const stores = vi.hoisted(() => ({
  history: {
    error: null as string | null, workspaceGroups: [] as any[], agentOrgHistory: [] as any[],
    setHistoryWindow: vi.fn(), fetchTree: vi.fn(async () => undefined), refreshTreeQuietly: vi.fn(async () => undefined),
    loadWorkspaceCatalogForNavigation: vi.fn(async () => undefined), refreshRunNavigationTopology: vi.fn(),
    listedRuns: [] as { kind: string; runId: string }[],
  },
  agents: { fetchAllAgentDefinitions: vi.fn(async () => undefined) },
  teams: { fetchAllAgentTeamDefinitions: vi.fn(async () => undefined) },
  orgs: { fetchAll: vi.fn(async () => undefined) },
  listed: { refresh: vi.fn(async (_runs: readonly unknown[]) => false) },
}))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => stores.history }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => stores.agents }))
vi.mock('~/stores/agentTeamDefinitionStore', () => ({ useAgentTeamDefinitionStore: () => stores.teams }))
vi.mock('~/stores/agentOrgDefinitionStore', () => ({ useAgentOrgDefinitionStore: () => stores.orgs }))
vi.mock('~/stores/listedRunChildrenStore', () => ({ useListedRunChildrenStore: () => stores.listed }))

import { useRunHistorySectionLoad } from '../useRunHistorySectionLoad'

const host = (input: { window: number | null; polling: boolean }) => {
  const state = reactive(input)
  let load!: ReturnType<typeof useRunHistorySectionLoad>
  const wrapper = mount(defineComponent({ setup() {
    load = useRunHistorySectionLoad({ window: () => state.window, polling: () => state.polling })
    return () => h('div')
  } }))
  return { state, wrapper, load: () => load }
}

describe('useRunHistorySectionLoad (autobyteus-277 DS-001)', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.clearAllMocks()
    stores.history.error = null; stores.history.workspaceGroups = []; stores.history.agentOrgHistory = []
    stores.history.fetchTree.mockImplementation(async () => undefined)
    stores.history.listedRuns = []; stores.listed.refresh.mockImplementation(async () => false)
  })
  afterEach(() => vi.useRealTimers())

  it('loads the history in its window with the catalog and the definitions, then polls every 5 s', async () => {
    const { load } = host({ window: null, polling: true })
    await expect(load().initialLoad).resolves.toBeUndefined()
    expect(stores.history.setHistoryWindow).toHaveBeenCalledWith(null)
    expect(stores.history.fetchTree).toHaveBeenCalledTimes(1)
    expect(stores.history.loadWorkspaceCatalogForNavigation).toHaveBeenCalledTimes(1)
    expect(stores.agents.fetchAllAgentDefinitions).toHaveBeenCalledTimes(1)
    expect(stores.teams.fetchAllAgentTeamDefinitions).toHaveBeenCalledTimes(1)
    expect(stores.orgs.fetchAll).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(10_000)
    expect(stores.history.refreshTreeQuietly).toHaveBeenCalledTimes(2)
  })

  it('pauses the poll while polling is false, and reads at once when it resumes', async () => {
    const { state, load } = host({ window: null, polling: true })
    await load().initialLoad
    state.polling = false; await nextTick()
    vi.advanceTimersByTime(20_000)
    expect(stores.history.refreshTreeQuietly).not.toHaveBeenCalled()
    state.polling = true; await nextTick()
    expect(stores.history.refreshTreeQuietly).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(5_000)
    expect(stores.history.refreshTreeQuietly).toHaveBeenCalledTimes(2)
  })

  it('does not poll while hidden from the start, and stops on unmount', async () => {
    const { state, wrapper, load } = host({ window: null, polling: false })
    await load().initialLoad
    vi.advanceTimersByTime(10_000)
    expect(stores.history.refreshTreeQuietly).not.toHaveBeenCalled()
    state.polling = true; await nextTick()
    wrapper.unmount()
    vi.advanceTimersByTime(10_000)
    expect(stores.history.refreshTreeQuietly).toHaveBeenCalledTimes(1)
  })

  it('re-reads once when the window changes', async () => {
    const { state, load } = host({ window: 6, polling: true })
    await load().initialLoad
    state.window = null; await nextTick()
    expect(stores.history.setHistoryWindow).toHaveBeenLastCalledWith(null)
    expect(stores.history.fetchTree).toHaveBeenCalledTimes(2)
  })

  it('settles even when the history read throws; the store shows the failure, and polling still starts', async () => {
    stores.history.fetchTree.mockRejectedValueOnce(new Error('Request failed with status code 401'))
    const { load } = host({ window: null, polling: true })
    await expect(load().initialLoad).resolves.toBeUndefined()
    vi.advanceTimersByTime(5_000)
    expect(stores.history.refreshTreeQuietly).toHaveBeenCalledTimes(1)
  })

  it('a later load settles with nothing to decide, whatever the store recorded (autobyteus-426 SR-008)', async () => {
    stores.history.fetchTree.mockImplementation(async () => { stores.history.error = 'offline' })
    const { load } = host({ window: null, polling: false })
    await expect(load().initialLoad).resolves.toBeUndefined()
    await expect(load().load()).resolves.toBeUndefined()
    expect(stores.history.fetchTree).toHaveBeenCalledTimes(2)
    await flushPromises()
  })

  // autobyteus-461 SR-055 (autobyteus-426 REQ-009): the listed runs of every kind are asked for their children after each
  // history read; a changed answer rebuilds the run list, whose rows of a run that is not open come from it.
  it('reads the listed runs\' children after the first load, each quiet read, a window change and a resumed poll', async () => {
    stores.history.listedRuns = [{ kind: 'agent', runId: 'run-a' }, { kind: 'agent_team', runId: 'team-a' }, { kind: 'agent_org', runId: 'org-a' }]
    const order: string[] = []
    stores.history.fetchTree.mockImplementation(async () => { order.push('history') })
    stores.history.refreshTreeQuietly.mockImplementation(async () => { order.push('quiet history') })
    stores.listed.refresh.mockImplementation(async () => { order.push('children'); return false })
    const { state, load } = host({ window: null, polling: true })
    await load().initialLoad
    expect(order).toEqual(['history', 'children'])
    expect(stores.listed.refresh).toHaveBeenLastCalledWith(stores.history.listedRuns)

    await vi.advanceTimersByTimeAsync(5_000)
    expect(order).toEqual(['history', 'children', 'quiet history', 'children'])

    state.window = 6; await nextTick(); await flushPromises()
    expect(stores.listed.refresh).toHaveBeenCalledTimes(3)

    state.polling = false; await nextTick()
    await vi.advanceTimersByTimeAsync(20_000)
    expect(stores.listed.refresh).toHaveBeenCalledTimes(3)
    state.polling = true; await nextTick(); await flushPromises()
    expect(stores.listed.refresh).toHaveBeenCalledTimes(4)
    // No answer changed: the run list is not rebuilt.
    expect(stores.history.refreshRunNavigationTopology).not.toHaveBeenCalled()
  })

  it('rebuilds the run list when an answer changed', async () => {
    stores.listed.refresh.mockImplementation(async () => true)
    const { load } = host({ window: null, polling: false })
    await load().initialLoad
    expect(stores.history.refreshRunNavigationTopology).toHaveBeenCalledWith('listed-run-children')
  })
})
