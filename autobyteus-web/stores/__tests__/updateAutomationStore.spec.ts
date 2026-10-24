import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import { useUpdateAutomationStore } from '../updateAutomationStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'
import type { UpdateAutomationSettings } from '~/types/updateNotifications'

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))

const settings = (overrides: Partial<UpdateAutomationSettings> = {}): UpdateAutomationSettings => ({
  intervals: { agentPackages: 30, skillSources: 30, agentRuntimes: 60 },
  automaticUpdates: { agentPackages: false, skillSources: false, agentRuntimes: false },
  githubWaitUntil: null, desktopEmbeddedNode: true, ...overrides,
})

let query: ReturnType<typeof vi.fn>
let mutate: ReturnType<typeof vi.fn>
beforeEach(() => {
  setActivePinia(createPinia())
  vi.spyOn(useWindowNodeContextStore(), 'waitForBoundBackendReady').mockResolvedValue(true)
  query = vi.fn().mockResolvedValue({ data: { updateAutomationSettings: settings() } })
  mutate = vi.fn()
  vi.mocked(getApolloClient).mockReturnValue({ query, mutate } as never)
})

describe('updateAutomationStore (DS-004)', () => {
  it('reads the node settings once and answers from the cache afterwards', async () => {
    const store = useUpdateAutomationStore()
    await Promise.all([store.ensureResolved(), store.ensureResolved()])
    await store.ensureResolved()
    expect(query).toHaveBeenCalledTimes(1)
    expect(store.resolved).toEqual(settings())
  })

  it('sends one mutation per subject with the node\'s kind, and takes the node\'s answer', async () => {
    const store = useUpdateAutomationStore()
    mutate.mockResolvedValueOnce({ data: { setUpdateCheckInterval: settings({ intervals: { agentPackages: 15, skillSources: 30, agentRuntimes: 60 } }) } })
    await store.setInterval('agent_package', 15)
    expect(mutate.mock.calls[0]![0].variables).toEqual({ kind: 'AGENT_PACKAGE', minutes: 15 })
    expect(store.resolved?.intervals.agentPackages).toBe(15)

    mutate.mockResolvedValueOnce({ data: { setAutomaticUpdates: settings({ automaticUpdates: { agentPackages: false, skillSources: false, agentRuntimes: true } }) } })
    await store.setAutomatic('agent_runtime', true)
    expect(mutate.mock.calls[1]![0].variables).toEqual({ kind: 'AGENT_RUNTIME', enabled: true })
    expect(store.resolved?.automaticUpdates.agentRuntimes).toBe(true)
  })

  it('throws the node\'s refusal and keeps the settings', async () => {
    const store = useUpdateAutomationStore()
    await store.ensureResolved()
    mutate.mockResolvedValueOnce({ data: null, errors: [{ message: 'Enter a whole number from 15 minutes to 24 hours.' }] })
    await expect(store.setInterval('skill_source', 5)).rejects.toThrow('Enter a whole number from 15 minutes to 24 hours.')
    expect(store.resolved?.intervals.skillSources).toBe(30)
  })

  it('keeps the last settings when a later refresh fails; reports an error when the first one fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const store = useUpdateAutomationStore()
    await store.refresh()
    query.mockRejectedValueOnce(new Error('offline'))
    await store.refresh()
    expect(store.status).toBe('resolved')
    setActivePinia(createPinia())
    vi.spyOn(useWindowNodeContextStore(), 'waitForBoundBackendReady').mockResolvedValue(true)
    query.mockRejectedValueOnce(new Error('offline'))
    const fresh = useUpdateAutomationStore()
    await fresh.refresh()
    expect(fresh.status).toBe('error')
    expect(fresh.resolved).toBeNull()
  })

  it('forgets the settings when the window binds another node, and discards an answer for the earlier one', async () => {
    const store = useUpdateAutomationStore()
    let answer!: (value: unknown) => void
    query.mockReturnValueOnce(new Promise((resolve) => { answer = resolve }))
    const pending = store.refresh()
    await Promise.resolve()
    useWindowNodeContextStore().bindingRevision += 1
    answer({ data: { updateAutomationSettings: settings({ desktopEmbeddedNode: false }) } })
    await pending
    expect(store.status).toBe('unknown')
    expect(store.resolved).toBeNull()
  })
})
