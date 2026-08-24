import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installHostScenario } from '../shared/install-host-scenario.js'

const globals = globalThis as typeof globalThis & {
  window: any
  localStorage: { getItem(key: string): string | null }
}

describe('deterministic host scenario adapter', () => {
  beforeEach(() => {
    globals.window = globals
    globals.localStorage = {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {},
      setItem: () => {},
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    delete globals.window.electronAPI
    delete globals.window.__AUTOBYTEUS_HOST_MOCK__
  })

  it('does not install a native bridge for the ordinary browser context', () => {
    expect(installHostScenario({ context: 'desktop' })).toBeNull()
    expect(globals.window.electronAPI).toBeUndefined()
  })

  it('represents the embedded Electron window and recovers its server locally', async () => {
    vi.useFakeTimers()
    const controller = installHostScenario({ context: 'electron_internal', scenario: 'electron_error' })

    expect(controller?.context).toBe('electron_internal')
    expect(await globals.window.electronAPI.getWindowContext()).toEqual({ windowId: 1, nodeId: 'embedded-local' })
    expect((await globals.window.electronAPI.getServerStatus()).status).toBe('error')

    const restart = await globals.window.electronAPI.restartServer()
    expect(restart.status).toBe('restarting')
    await vi.advanceTimersByTimeAsync(350)
    expect((await globals.window.electronAPI.getServerStatus()).status).toBe('running')
  })

  it('represents an external-node Electron window and local update transitions', async () => {
    installHostScenario({ context: 'electron_external', scenario: 'update_available' })

    expect(await globals.window.electronAPI.getWindowContext()).toEqual({ windowId: 2, nodeId: 'remote-prototype' })
    expect((await globals.window.electronAPI.getAppUpdateState()).status).toBe('available')
    expect((await globals.window.electronAPI.downloadAppUpdate()).status).toBe('downloaded')
  })
})
