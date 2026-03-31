import { PreviewBridgeServer } from './preview-bridge-server'
import { PreviewScreenshotArtifactWriter } from './preview-screenshot-artifact-writer'
import { PreviewSessionManager } from './preview-session-manager'
import { PreviewWindowFactory } from './preview-window-factory'

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

  constructor(private readonly options: PreviewRuntimeOptions) {}

  async start(): Promise<void> {
    this.previewSessionManager = new PreviewSessionManager({
      windowFactory: new PreviewWindowFactory({
        iconPath: this.options.iconPath,
      }),
      screenshotWriter: new PreviewScreenshotArtifactWriter(this.options.artifactsDir),
    })

    this.previewBridgeServer = new PreviewBridgeServer(this.previewSessionManager)
    const previewRuntimeEnv = await this.previewBridgeServer.start()
    this.options.setRuntimeEnvOverrides(previewRuntimeEnv)
  }

  async stop(): Promise<void> {
    try {
      await this.previewBridgeServer?.stop()
    } finally {
      this.previewBridgeServer = null
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
