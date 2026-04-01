import { PreviewBridgeServer } from './preview-bridge-server'
import { PreviewShellController } from './preview-shell-controller'
import { PreviewScreenshotArtifactWriter } from './preview-screenshot-artifact-writer'
import { PreviewSessionManager } from './preview-session-manager'
import { PreviewViewFactory } from './preview-view-factory'
import type { WorkspaceShellWindow } from '../shell/workspace-shell-window'

type PreviewRuntimeOptions = {
  iconPath: string
  artifactsDir: string
  setRuntimeEnvOverrides: (overrides: Record<string, string>) => void
}

type StartPreviewRuntimeOptions = PreviewRuntimeOptions & {
  onStartError?: (error: unknown) => void
}

export class PreviewRuntime {
  private previewSessionManager: PreviewSessionManager | null = null
  private previewBridgeServer: PreviewBridgeServer | null = null
  private previewShellController: PreviewShellController | null = null

  constructor(private readonly options: PreviewRuntimeOptions) {}

  async start(): Promise<void> {
    this.previewSessionManager = new PreviewSessionManager({
      viewFactory: new PreviewViewFactory(),
      screenshotWriter: new PreviewScreenshotArtifactWriter(this.options.artifactsDir),
    })
    this.previewShellController = new PreviewShellController(this.previewSessionManager)

    this.previewBridgeServer = new PreviewBridgeServer(this.previewSessionManager)
    const previewRuntimeEnv = await this.previewBridgeServer.start()
    this.options.setRuntimeEnvOverrides(previewRuntimeEnv)
  }

  registerShell(shell: WorkspaceShellWindow): void {
    this.previewShellController?.registerShell(shell)
  }

  unregisterShell(shellId: number): void {
    this.previewShellController?.unregisterShell(shellId)
  }

  getShellController(): PreviewShellController {
    if (!this.previewShellController) {
      throw new Error('Preview shell controller is not started.')
    }
    return this.previewShellController
  }

  async stop(): Promise<void> {
    try {
      await this.previewBridgeServer?.stop()
    } finally {
      this.previewBridgeServer = null
    }

    try {
      this.previewShellController?.dispose()
      this.previewShellController = null
    } finally {
      // no-op
    }

    try {
      await this.previewSessionManager?.closeAllSessions()
    } finally {
      this.previewSessionManager = null
    }
  }
}

export const startPreviewRuntime = async (
  options: StartPreviewRuntimeOptions,
): Promise<PreviewRuntime | null> => {
  const runtime = new PreviewRuntime(options)

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
