import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const io = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query }) }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => true }) }))

import { useDefinitionDiagnosticsStore } from '../definitionDiagnosticsStore'

const diagnostic = (definitionId: string) => ({
  subject: 'AGENT_TEAM', definitionId, code: 'DEFINITION_REFERENCE_UNRESOLVED', reason: 'x',
  definitionPath: `/p/${definitionId}`, packageRoot: '/p', usingLastGood: false, dependencyChain: [],
})

describe('definitionDiagnosticsStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); io.query.mockReset() })

  it('does not load a subject until a page asks for it', async () => {
    await useDefinitionDiagnosticsStore().reloadIfLoaded(['AGENT_TEAM'])
    expect(io.query).not.toHaveBeenCalled()
  })

  it('reloads once more when a change arrives while a load is in flight, so the notice ends current', async () => {
    let release!: () => void
    io.query
      .mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ data: { definitionDiagnostics: [diagnostic('stale')] } }) }))
      .mockResolvedValueOnce({ data: { definitionDiagnostics: [] } })
    const store = useDefinitionDiagnosticsStore()
    const first = store.ensureLoaded('AGENT_TEAM')
    await Promise.resolve()
    const second = store.reloadIfLoaded(['AGENT_TEAM'])
    release()
    await Promise.all([first, second])
    expect(io.query).toHaveBeenCalledTimes(2)
    expect(store.diagnosticsBySubject.AGENT_TEAM).toEqual([])
  })

  it('keeps the previous notice when a reload fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    io.query.mockResolvedValueOnce({ data: { definitionDiagnostics: [diagnostic('broken')] } }).mockRejectedValueOnce(new Error('offline'))
    const store = useDefinitionDiagnosticsStore()
    await store.ensureLoaded('AGENT_TEAM')
    await store.reloadIfLoaded(['AGENT_TEAM'])
    expect(store.diagnosticsBySubject.AGENT_TEAM.map((entry) => entry.definitionId)).toEqual(['broken'])
    error.mockRestore()
  })
})
