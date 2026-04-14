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
    bindHost: null as string | null,
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
    constructor(
      _browserSessionManager: unknown,
      _authRegistry: unknown,
      bindHost: string,
    ) {
      browserBridgeServerState.bindHost = bindHost
    }

    start = browserBridgeServerState.start
    stop = browserBridgeServerState.stop

    getRemoteBridgeBaseUrl(advertisedHost: string): string {
      return `http://${advertisedHost}:30123`
    }

    isRemoteSharingActive(): boolean {
      return browserBridgeServerState.bindHost !== '127.0.0.1'
    }
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
    browserBridgeServerState.bindHost = null
    browserSessionProfiles.length = 0
    browserViewFactorySessionProfiles.length = 0
  })

  it('passes the authoritative listener host into the browser bridge server at startup', async () => {
    const setRuntimeEnvOverrides = vi.fn()

    const runtime = await startBrowserRuntime({
      iconPath: '/tmp/icon.png',
      artifactsDir: '/tmp/browser-artifacts',
      setRuntimeEnvOverrides,
      authRegistry: new BrowserBridgeAuthRegistry(),
      listenerHost: '0.0.0.0',
    })

    expect(runtime).not.toBeNull()
    expect(browserBridgeServerState.bindHost).toBe('0.0.0.0')
    expect(browserSessionProfiles).toHaveLength(1)
    expect(browserViewFactorySessionProfiles).toEqual([browserSessionProfiles[0]])
    expect(setRuntimeEnvOverrides).toHaveBeenCalledWith({
      AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL: 'http://127.0.0.1:30123',
      AUTOBYTEUS_BROWSER_BRIDGE_TOKEN: 'embedded-token',
    })
  })
})
