import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const io = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query }) }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => true }) }))

import { useDefinitionProblemsStore } from '../definitionProblemsStore'

const problem = (definitionId: string) => ({
  kind: 'AGENT_TEAM', definitionId, code: 'DEFINITION_REFERENCE_UNRESOLVED', reason: 'x',
  definitionPath: `/p/${definitionId}`, packageRoot: '/p', usingLastGood: false, dependencyChain: [],
})

describe('definitionProblemsStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); io.query.mockReset() })

  it('does not load a kind until a page asks for it', async () => {
    await useDefinitionProblemsStore().reloadIfLoaded(['AGENT_TEAM'])
    expect(io.query).not.toHaveBeenCalled()
  })

  it('reloads once more when a change arrives while a load is in flight, so the notice ends current', async () => {
    let release!: () => void
    io.query
      .mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ data: { definitionProblems: [problem('stale')] } }) }))
      .mockResolvedValueOnce({ data: { definitionProblems: [] } })
    const store = useDefinitionProblemsStore()
    const first = store.ensureLoaded('AGENT_TEAM')
    await Promise.resolve()
    const second = store.reloadIfLoaded(['AGENT_TEAM'])
    release()
    await Promise.all([first, second])
    expect(io.query).toHaveBeenCalledTimes(2)
    expect(store.problemsByKind.AGENT_TEAM).toEqual([])
  })

  it('keeps the previous notice when a reload fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    io.query.mockResolvedValueOnce({ data: { definitionProblems: [problem('broken')] } }).mockRejectedValueOnce(new Error('offline'))
    const store = useDefinitionProblemsStore()
    await store.ensureLoaded('AGENT_TEAM')
    await store.reloadIfLoaded(['AGENT_TEAM'])
    expect(store.problemsByKind.AGENT_TEAM.map((entry) => entry.definitionId)).toEqual(['broken'])
    error.mockRestore()
  })
})
