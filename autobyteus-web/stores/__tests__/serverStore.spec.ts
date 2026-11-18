import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useServerStore } from '../serverStore'
import { ServerStatus } from '~/types/serverStatus'

/** REQ-004 / AC-007: the renderer's fallback health poller only runs while STARTING/RESTARTING. */
function setElectronApiMock(mock: Partial<Window['electronAPI']> | null): void {
  Object.defineProperty(window, 'electronAPI', { configurable: true, writable: true, value: mock })
}

const baseUrls = {
  graphql: 'http://127.0.0.1:8080/graphql',
  rest: 'http://127.0.0.1:8080/rest',
  graphqlWs: 'ws://127.0.0.1:8080/graphql',
  terminalWs: 'ws://127.0.0.1:8080/terminal',
  health: 'http://127.0.0.1:8080/rest/health',
}

function snapshot(status: ServerStatus, message?: string) {
  return { status, baseUrl: 'http://127.0.0.1:8080', urls: baseUrls, message, diagnostic: undefined, healthCheckStatus: '' }
}

describe('serverStore fallback health poller (REQ-004, AC-007)', () => {
  let checkServerHealth: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    checkServerHealth = vi.fn().mockResolvedValue({ status: 'ok', data: { status: 'ok' } })
    setElectronApiMock({
      getServerStatus: vi.fn().mockResolvedValue(snapshot(ServerStatus.STARTING)),
      onServerStatus: vi.fn().mockReturnValue(vi.fn()),
      getLogFilePath: vi.fn().mockResolvedValue(''),
      checkServerHealth,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    setElectronApiMock(null)
  })

  it('stops calling health in ERROR and clears the STARTING-era health text', async () => {
    const store = useServerStore()
    await store.initialize()

    store.updateServerStatus(snapshot(ServerStatus.ERROR, 'Server startup failed'))
    expect(store.healthCheckStatus).toBe('')

    checkServerHealth.mockClear()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(checkServerHealth).not.toHaveBeenCalled()
  })

  it('resumes polling after a RESTARTING update', async () => {
    const store = useServerStore()
    await store.initialize()
    store.updateServerStatus(snapshot(ServerStatus.ERROR, 'Server startup failed'))
    checkServerHealth.mockClear()

    store.updateServerStatus(snapshot(ServerStatus.RESTARTING))
    await vi.advanceTimersByTimeAsync(2_000)
    expect(checkServerHealth).toHaveBeenCalledTimes(1)
  })

  it('stops polling once RUNNING, as today', async () => {
    const store = useServerStore()
    await store.initialize()
    checkServerHealth.mockClear()

    store.updateServerStatus(snapshot(ServerStatus.RUNNING))
    await vi.advanceTimersByTimeAsync(2_000)
    expect(checkServerHealth).not.toHaveBeenCalled()

    checkServerHealth.mockClear()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(checkServerHealth).not.toHaveBeenCalled()
  })

  it('still polls while STARTING, unchanged', async () => {
    const store = useServerStore()
    await store.initialize()
    checkServerHealth.mockClear()

    await vi.advanceTimersByTimeAsync(2_000)
    expect(checkServerHealth).toHaveBeenCalledTimes(1)
  })
})
