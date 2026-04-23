import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const {
  applicationsCapabilityStoreMock,
  windowNodeContextStoreMock,
  fetchMock,
} = vi.hoisted(() => ({
  applicationsCapabilityStoreMock: {
    ensureResolved: vi.fn(),
    isEnabled: true,
    status: 'resolved',
  },
  windowNodeContextStoreMock: {
    bindingRevision: 0,
    lastReadyError: null,
    waitForBoundBackendReady: vi.fn(),
    getBoundEndpoints: vi.fn(),
  },
  fetchMock: vi.fn(),
}))

vi.mock('~/stores/applicationsCapabilityStore', () => ({
  useApplicationsCapabilityStore: () => applicationsCapabilityStoreMock,
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}))

import { useApplicationHostStore } from '../applicationHostStore'

const createDeferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const okJson = (payload: unknown) => ({
  ok: true,
  json: vi.fn(async () => payload),
}) as unknown as Response

describe('applicationHostStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)

    applicationsCapabilityStoreMock.ensureResolved.mockResolvedValue(undefined)
    applicationsCapabilityStoreMock.isEnabled = true
    applicationsCapabilityStoreMock.status = 'resolved'

    windowNodeContextStoreMock.bindingRevision = 0
    windowNodeContextStoreMock.lastReadyError = null
    windowNodeContextStoreMock.waitForBoundBackendReady.mockResolvedValue(true)
    windowNodeContextStoreMock.getBoundEndpoints.mockReturnValue({
      rest: 'http://127.0.0.1:43123/rest',
    })

    fetchMock.mockReset()
  })

  it('drops a stale in-flight launch result after clearLaunchState invalidates the route visit', async () => {
    const ensureReadyResponse = createDeferred<Response>()
    fetchMock.mockReturnValue(ensureReadyResponse.promise)

    const store = useApplicationHostStore()
    const pendingLaunch = store.startLaunch('bundle-app__pkg__brief-studio')

    await vi.waitFor(() => {
      expect(store.getLaunchState('bundle-app__pkg__brief-studio').status).toBe('preparing')
    })

    store.clearLaunchState('bundle-app__pkg__brief-studio')

    expect(store.getLaunchState('bundle-app__pkg__brief-studio').status).toBe('idle')

    ensureReadyResponse.resolve(okJson({
      state: 'ready',
      startedAt: '2026-04-22T10:00:00.000Z',
      lastFailure: null,
    }))

    await expect(pendingLaunch).resolves.toMatchObject({
      status: 'idle',
      launchInstanceId: null,
    })

    expect(store.getLaunchState('bundle-app__pkg__brief-studio').status).toBe('idle')
    expect(store.getLaunchState('bundle-app__pkg__brief-studio').launchInstanceId).toBeNull()
  })

  it('creates a fresh launchInstanceId after clearLaunchState and later route re-entry', async () => {
    fetchMock
      .mockResolvedValueOnce(okJson({
        state: 'ready',
        startedAt: '2026-04-22T10:00:00.000Z',
        lastFailure: null,
      }))
      .mockResolvedValueOnce(okJson({
        state: 'ready',
        startedAt: '2026-04-22T10:05:00.000Z',
        lastFailure: null,
      }))

    const store = useApplicationHostStore()

    const firstLaunch = await store.startLaunch('bundle-app__pkg__brief-studio')
    expect(firstLaunch.launchInstanceId).toBe('bundle-app__pkg__brief-studio::launch-1')

    store.clearLaunchState('bundle-app__pkg__brief-studio')
    expect(store.getLaunchState('bundle-app__pkg__brief-studio').status).toBe('idle')

    const secondLaunch = await store.startLaunch('bundle-app__pkg__brief-studio')

    expect(secondLaunch.launchInstanceId).toBe('bundle-app__pkg__brief-studio::launch-2')
    expect(secondLaunch.launchInstanceId).not.toBe(firstLaunch.launchInstanceId)
  })
})
