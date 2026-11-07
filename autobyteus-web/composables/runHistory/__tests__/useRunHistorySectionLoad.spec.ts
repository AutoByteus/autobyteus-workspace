import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const stores = vi.hoisted(() => ({
  history: {
    error: null as string | null, historyReadFailure: null as unknown, workspaceGroups: [] as any[], agentOrgHistory: [] as any[],
    setHistoryWindow: vi.fn(), fetchTree: vi.fn(async () => undefined), refreshTreeQuietly: vi.fn(async () => undefined),
    loadWorkspaceCatalogForNavigation: vi.fn(async () => undefined),
  },
  agents: { fetchAllAgentDefinitions: vi.fn(async () => undefined) },
  teams: { fetchAllAgentTeamDefinitions: vi.fn(async () => undefined) },
  orgs: { fetchAll: vi.fn(async () => undefined) },
}))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => stores.history }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => stores.agents }))
vi.mock('~/stores/agentTeamDefinitionStore', () => ({ useAgentTeamDefinitionStore: () => stores.teams }))
vi.mock('~/stores/agentOrgDefinitionStore', () => ({ useAgentOrgDefinitionStore: () => stores.orgs }))

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
    stores.history.error = null; stores.history.historyReadFailure = null; stores.history.workspaceGroups = []; stores.history.agentOrgHistory = []
    stores.history.fetchTree.mockImplementation(async () => undefined)
  })
  afterEach(() => vi.useRealTimers())

  it('loads the history in its window with the catalog and the definitions, then polls every 5 s', async () => {
    const { load } = host({ window: null, polling: true })
    await expect(load().initialLoad).resolves.toEqual({ ok: true })
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

  it('reports a read that threw, with its error', async () => {
    const cause = Object.assign(new Error('Request failed with status code 401'), { response: { status: 401 } })
    stores.history.fetchTree.mockRejectedValueOnce(cause)
    const { load } = host({ window: null, polling: true })
    await expect(load().initialLoad).resolves.toEqual({ ok: false, cause })
  })

  it('reports a read that listed nothing while the store recorded an error; with runs listed it is a success', async () => {
    stores.history.fetchTree.mockImplementation(async () => { stores.history.error = 'offline' })
    const { load } = host({ window: null, polling: false })
    await expect(load().initialLoad).resolves.toEqual({ ok: false, cause: 'offline' })
    stores.history.workspaceGroups = [{ agentDefinitions: [{ runs: [{}] }], teamDefinitions: [] }]
    await expect(load().load()).resolves.toEqual({ ok: true })
    await flushPromises()
  })

  it('reports the failed read\'s thrown error as its cause when the store kept it (autobyteus-426 D-02)', async () => {
    const thrown = Object.assign(new Error('Response not successful: Received status code 403'), { networkError: { statusCode: 403 } })
    stores.history.fetchTree.mockImplementation(async () => {
      stores.history.error = thrown.message
      stores.history.historyReadFailure = thrown
    })
    const { load } = host({ window: null, polling: false })
    await expect(load().initialLoad).resolves.toEqual({ ok: false, cause: thrown })
    await flushPromises()
  })
})
