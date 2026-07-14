import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useWorkingContextCompactionStrategyCatalogStore } from '~/stores/workingContextCompactionStrategyCatalog'
import { getApolloClient } from '~/utils/apolloClient'

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}))

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('working-context compaction strategy catalog store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getApolloClient).mockReset()
    const windowNodeContextStore = useWindowNodeContextStore()
    windowNodeContextStore.lastReadyError = null
    vi.spyOn(windowNodeContextStore, 'waitForBoundBackendReady').mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps registry-provided id/name options without a frontend branch', async () => {
    const query = vi.fn().mockResolvedValue({
      data: {
        getWorkingContextCompactionStrategies: [
          { id: 'structured-json', name: 'Structured JSON' },
          { id: 'test-second', name: 'Test Second' },
        ],
      },
    })
    vi.mocked(getApolloClient).mockReturnValue({ query } as any)
    const store = useWorkingContextCompactionStrategyCatalogStore()

    await expect(store.fetchStrategies()).resolves.toEqual([
      { id: 'structured-json', name: 'Structured JSON' },
      { id: 'test-second', name: 'Test Second' },
    ])
    expect(store.bindingRevision).toBe(0)
    expect(store.error).toBeNull()
  })

  it('surfaces an empty catalog without fabricating a default', async () => {
    vi.mocked(getApolloClient).mockReturnValue({
      query: vi.fn().mockResolvedValue({
        data: { getWorkingContextCompactionStrategies: [] },
      }),
    } as any)
    const store = useWorkingContextCompactionStrategyCatalogStore()

    await expect(store.fetchStrategies()).resolves.toEqual([])
    expect(store.strategies).toEqual([])
    expect(store.bindingRevision).toBe(0)
  })

  it('keeps an actionable error and reloads on retry', async () => {
    const query = vi.fn()
      .mockRejectedValueOnce(new Error('catalog offline'))
      .mockResolvedValueOnce({
        data: {
          getWorkingContextCompactionStrategies: [
            { id: 'structured-json', name: 'Structured JSON' },
          ],
        },
      })
    vi.mocked(getApolloClient).mockReturnValue({ query } as any)
    const store = useWorkingContextCompactionStrategyCatalogStore()

    await expect(store.fetchStrategies()).rejects.toThrow('catalog offline')
    expect(store.error).toBe('catalog offline')
    await expect(store.retry()).resolves.toEqual([
      { id: 'structured-json', name: 'Structured JSON' },
    ])
    expect(store.error).toBeNull()
  })

  it('invalidates old-node catalog state and ignores its stale response after rebinding', async () => {
    let resolveFirst!: (value: any) => void
    const firstQuery = vi.fn(() => new Promise((resolve) => { resolveFirst = resolve }))
    const secondQuery = vi.fn().mockResolvedValue({
      data: {
        getWorkingContextCompactionStrategies: [
          { id: 'remote-strategy', name: 'Remote Strategy' },
        ],
      },
    })
    vi.mocked(getApolloClient)
      .mockReturnValueOnce({ query: firstQuery } as any)
      .mockReturnValue({ query: secondQuery } as any)

    const store = useWorkingContextCompactionStrategyCatalogStore()
    const firstLoad = store.fetchStrategies()
    await vi.waitFor(() => expect(firstQuery).toHaveBeenCalledOnce())

    useWindowNodeContextStore().bindNodeContext('remote', 'http://127.0.0.1:3900')
    await nextTick()
    resolveFirst({
      data: {
        getWorkingContextCompactionStrategies: [
          { id: 'stale', name: 'Stale' },
        ],
      },
    })
    await firstLoad
    expect(store.strategies).toEqual([])

    await store.fetchStrategies()
    expect(store.strategies).toEqual([
      { id: 'remote-strategy', name: 'Remote Strategy' },
    ])
    expect(store.bindingRevision).toBe(1)
  })

  it('keeps current loading active when an overlapping old-node catalog request rejects', async () => {
    const oldResponse = deferred<any>()
    const newResponse = deferred<any>()
    const oldClient = { query: vi.fn(() => oldResponse.promise) }
    const newClient = { query: vi.fn(() => newResponse.promise) }
    vi.mocked(getApolloClient)
      .mockReturnValueOnce(oldClient as any)
      .mockReturnValue(newClient as any)

    const store = useWorkingContextCompactionStrategyCatalogStore()
    const oldLoad = store.fetchStrategies()
    await vi.waitFor(() => expect(oldClient.query).toHaveBeenCalledOnce())

    useWindowNodeContextStore().bindNodeContext('remote', 'http://127.0.0.1:3900')
    const newLoad = store.fetchStrategies()
    await vi.waitFor(() => expect(newClient.query).toHaveBeenCalledOnce())

    oldResponse.reject(new Error('old catalog rejected'))
    await expect(oldLoad).rejects.toThrow('old catalog rejected')
    expect(store.isLoading).toBe(true)
    expect(store.error).toBeNull()

    newResponse.resolve({
      data: {
        getWorkingContextCompactionStrategies: [
          { id: 'remote-strategy', name: 'Remote Strategy' },
        ],
      },
    })
    await expect(newLoad).resolves.toEqual([
      { id: 'remote-strategy', name: 'Remote Strategy' },
    ])
    expect(store.isLoading).toBe(false)
    expect(store.bindingRevision).toBe(1)
  })
})
