import { BrowserBridgeServer } from './browser-bridge-server'
import { BrowserShellController } from './browser-shell-controller'
import { BrowserScreenshotArtifactWriter } from './browser-screenshot-artifact-writer'
import { BrowserSessionProfile } from './browser-session-profile'
import { BrowserTabManager } from './browser-tab-manager'
import { BrowserViewFactory } from './browser-view-factory'
import { BrowserBridgeAuthRegistry } from './browser-bridge-auth-registry'
import type { WorkspaceShellWindow } from '../shell/workspace-shell-window'

type BrowserRuntimeOptions = {
  iconPath: string
  artifactsDir: string
  setRuntimeEnvOverrides: (overrides: Record<string, string>) => void
  authRegistry: BrowserBridgeAuthRegistry
  listenerHost: string
}

type StartBrowserRuntimeOptions = BrowserRuntimeOptions & {
  onStartError?: (error: unknown) => void
}

export class BrowserRuntime {
  private browserSessionManager: BrowserTabManager | null = null
  private browserBridgeServer: BrowserBridgeServer | null = null
  private browserShellController: BrowserShellController | null = null

  constructor(private readonly options: BrowserRuntimeOptions) {}

  async start(): Promise<void> {
    const sessionProfile = new BrowserSessionProfile()
    this.browserSessionManager = new BrowserTabManager({
      viewFactory: new BrowserViewFactory(sessionProfile),
      screenshotWriter: new BrowserScreenshotArtifactWriter(this.options.artifactsDir),
    })
    this.browserShellController = new BrowserShellController(this.browserSessionManager)

    this.browserBridgeServer = new BrowserBridgeServer(
      this.browserSessionManager,
      this.options.authRegistry,
      this.options.listenerHost,
    )
    const browserRuntimeEnv = await this.browserBridgeServer.start()
    this.options.setRuntimeEnvOverrides(browserRuntimeEnv)
  }

  registerShell(shell: WorkspaceShellWindow): void {
    this.browserShellController?.registerShell(shell)
  }

  unregisterShell(shellId: number): void {
    this.browserShellController?.unregisterShell(shellId)
  }

  getShellController(): BrowserShellController {
    if (!this.browserShellController) {
      throw new Error('Browser shell controller is not started.')
    }
    return this.browserShellController
  }

  getRemoteBridgeBaseUrl(advertisedHost: string): string {
    if (!this.browserBridgeServer) {
      throw new Error('Browser bridge server is not started.')
    }
    return this.browserBridgeServer.getRemoteBridgeBaseUrl(advertisedHost)
  }

  isRemoteSharingActive(): boolean {
    return this.browserBridgeServer?.isRemoteSharingActive() ?? false
  }

  async stop(): Promise<void> {
    try {
      await this.browserBridgeServer?.stop()
    } finally {
      this.browserBridgeServer = null
    }

    try {
      this.browserShellController?.dispose()
      this.browserShellController = null
    } finally {
      // no-op
    }

    try {
      await this.browserSessionManager?.closeAllSessions()
    } finally {
      this.browserSessionManager = null
    }
  }
}

export const startBrowserRuntime = async (
  options: StartBrowserRuntimeOptions,
): Promise<BrowserRuntime | null> => {
  const runtime = new BrowserRuntime(options)

  try {
    await runtime.start()
    return runtime
  } catch (error) {
    options.setRuntimeEnvOverrides({})
    options.onStartError?.(error)
    try {
      await runtime.stop()
    } catch {
      // Cleanup failure does not change the startup outcome.
    }
    return null
  }
}
