import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startBrowserRuntime } from '../browser-runtime'
import { BrowserBridgeAuthRegistry } from '../browser-bridge-auth-registry'

const {
  browserBridgeServerState,
  closeAllSessionsMock,
  disposeShellControllerMock,
  browserSessionProfiles,
  browserViewFactorySessionProfiles,
} = vi.hoisted(() => {
  const browserBridgeServerState = {
    constructorArgsCount: 0,
    start: vi.fn().mockResolvedValue({
      AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL: 'http://127.0.0.1:30123',
      AUTOBYTEUS_BROWSER_BRIDGE_TOKEN: 'embedded-token',
    }),
    stop: vi.fn().mockResolvedValue(undefined),
  }

  return {
    browserBridgeServerState,
    closeAllSessionsMock: vi.fn().mockResolvedValue(undefined),
    disposeShellControllerMock: vi.fn(),
    browserSessionProfiles: [] as unknown[],
    browserViewFactorySessionProfiles: [] as unknown[],
  }
})

vi.mock('../browser-bridge-server', () => ({
  BrowserBridgeServer: class MockBrowserBridgeServer {
    constructor(...args: unknown[]) {
      browserBridgeServerState.constructorArgsCount = args.length
    }

    start = browserBridgeServerState.start
    stop = browserBridgeServerState.stop
  },
}))

vi.mock('../browser-tab-manager', () => ({
  BrowserTabManager: class MockBrowserTabManager {
    closeAllSessions = closeAllSessionsMock
  },
}))

vi.mock('../browser-shell-controller', () => ({
  BrowserShellController: class MockBrowserShellController {
    registerShell(): void {
      // no-op
    }

    unregisterShell(): void {
      // no-op
    }

    dispose = disposeShellControllerMock
  },
}))

vi.mock('../browser-screenshot-artifact-writer', () => ({
  BrowserScreenshotArtifactWriter: class MockBrowserScreenshotArtifactWriter {
    constructor(_artifactsDir: string) {}
  },
}))

vi.mock('../browser-session-profile', () => ({
  BrowserSessionProfile: class MockBrowserSessionProfile {
    constructor() {
      browserSessionProfiles.push(this)
    }
  },
}))

vi.mock('../browser-view-factory', () => ({
  BrowserViewFactory: class MockBrowserViewFactory {
    constructor(sessionProfile: unknown) {
      browserViewFactorySessionProfiles.push(sessionProfile)
    }
  },
}))

describe('BrowserRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    browserBridgeServerState.constructorArgsCount = 0
    browserSessionProfiles.length = 0
    browserViewFactorySessionProfiles.length = 0
  })

  it('starts the local browser bridge and injects env overrides for the bundled server', async () => {
    const setRuntimeEnvOverrides = vi.fn()

    const runtime = await startBrowserRuntime({
      iconPath: '/tmp/icon.png',
      artifactsDir: '/tmp/browser-artifacts',
      setRuntimeEnvOverrides,
      authRegistry: new BrowserBridgeAuthRegistry(),
    })

    expect(runtime).not.toBeNull()
    expect(browserBridgeServerState.constructorArgsCount).toBe(2)
    expect(browserSessionProfiles).toHaveLength(1)
    expect(browserViewFactorySessionProfiles).toEqual([browserSessionProfiles[0]])
    expect(setRuntimeEnvOverrides).toHaveBeenCalledWith({
      AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL: 'http://127.0.0.1:30123',
      AUTOBYTEUS_BROWSER_BRIDGE_TOKEN: 'embedded-token',
    })
  })
})
