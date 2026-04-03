import { BrowserBridgeServer } from './browser-bridge-server'
import { BrowserShellController } from './browser-shell-controller'
import { BrowserScreenshotArtifactWriter } from './browser-screenshot-artifact-writer'
import { BrowserTabManager } from './browser-tab-manager'
import { BrowserViewFactory } from './browser-view-factory'
import type { WorkspaceShellWindow } from '../shell/workspace-shell-window'

type BrowserRuntimeOptions = {
  iconPath: string
  artifactsDir: string
  setRuntimeEnvOverrides: (overrides: Record<string, string>) => void
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
    this.browserSessionManager = new BrowserTabManager({
      viewFactory: new BrowserViewFactory(),
      screenshotWriter: new BrowserScreenshotArtifactWriter(this.options.artifactsDir),
    })
    this.browserShellController = new BrowserShellController(this.browserSessionManager)

    this.browserBridgeServer = new BrowserBridgeServer(this.browserSessionManager)
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
