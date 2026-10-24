import type { ChildProcess } from 'child_process'
import axios from 'axios'
import { EventEmitter } from 'events'
import { waitForBackendPort, assertBackendPortAvailable, isAddressInUse, PortConflictError } from './backendPortAvailability'
import { inspectPortOwner } from './portOwnerInspector'
import { stopManagedBackend, waitForChildExit, childExited, ShutdownIncompleteError } from './managedBackendStop'
import { logger as rootLogger } from '../logger'
import {
  formatEmbeddedServerClientBaseUrl,
  formatEmbeddedServerClientWebSocketBaseUrl,
} from '../../shared/embeddedServerClientEndpoint'
import { AppDataService } from './services/AppDataService'
import { createServerProcessOutputForwarder } from './serverOutputLogging'
import { parseEmbeddedServerPlatformFatal, platformFatalError } from './embeddedServerPlatformFatal'
import type { EmbeddedServerLaunchConfig } from './embeddedServerLaunchConfig'
import { buildServerProcessEnv } from './serverRuntimeEnv'
import type { EmbeddedServerUrls } from '../../types/serverStatus'

const logger = rootLogger.child('server.base-server-manager')
const stdoutLogger = rootLogger.child('embedded-server.stdout')
const stderrLogger = rootLogger.child('embedded-server.stderr')

/**
 * Base server manager with platform-agnostic functionality.
 * Simplified to always use an internal server.
 * Now extends EventEmitter for robust event handling.
 */
export abstract class BaseServerManager extends EventEmitter {
  protected serverProcess: ChildProcess | null = null
  protected isServerRunning: boolean = false
  protected readonly serverPort: number
  protected readonly serverUrl: string
  protected readonly serverWebSocketUrl: string
  protected ready: boolean = false
  protected serverStartTime: number = 0
  protected startupWarningAfterMs: number = 100000 // Informational only; not a deadline
  protected appDataDir: string = ''
  protected firstRun: boolean = false
  protected serverDir: string = ''
  protected gracefulShutdownTimeoutMs: number = 20000
  protected appDataService: AppDataService
  protected runtimeEnvOverrides: Record<string, string> = {}
  protected healthPollIntervalMs: number = 250
  private stopPromise: Promise<void> | null = null
  private pendingStartup: { promise: Promise<void>; cancel: () => void } | null = null
  private startupGeneration: number = 0
  private settledStartupGeneration: number = 0
  private lastStartupError: Error | null = null

  constructor(protected readonly launchConfig: EmbeddedServerLaunchConfig) {
    super()
    if (launchConfig.listenerPolicy !== 'preserve-backend-default') {
      throw new Error(`Unsupported embedded server listener policy: ${launchConfig.listenerPolicy}`)
    }
    this.serverPort = launchConfig.clientEndpoint.port
    this.serverUrl = formatEmbeddedServerClientBaseUrl(launchConfig.clientEndpoint)
    this.serverWebSocketUrl = formatEmbeddedServerClientWebSocketBaseUrl(launchConfig.clientEndpoint)
    this.appDataService = new AppDataService(launchConfig.baseDataRoot, this.serverUrl)
    this.appDataDir = this.appDataService.getAppDataDir()
    this.firstRun = this.appDataService.isFirstRun()
    this.appDataService.initialize()
  }

  /**
   * Validate that all required files and directories exist.
   */
  protected validateServerEnvironment(serverDir: string): string[] {
    return this.appDataService.validateEnvironment(serverDir)
  }

  /**
   * Wait for the server port to be free before starting the server.
   * This is to ensure that TIME_WAIT state has cleared.
   */
  protected async waitForPortToBeFree(
    timeoutMs: number = (process.platform === 'linux' ? 10000 : 5000),
    signal?: AbortSignal
  ): Promise<void> {
    await waitForBackendPort(this.serverPort, timeoutMs, signal)
  }

  /** Start once; all callers share the same pending startup, including preflight. */
  public startServer(): Promise<void> {
    if (this.pendingStartup) return this.pendingStartup.promise
    if (this.isRunning()) return Promise.resolve()
    if (this.serverProcess && !childExited(this.serverProcess)) return Promise.reject(new ShutdownIncompleteError('Previous backend exit remains unconfirmed'))

    const generation = ++this.startupGeneration
    this.settledStartupGeneration = 0
    this.lastStartupError = null
    this.ready = false
    this.isServerRunning = false
    const controller = new AbortController()
    const cancelled = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true })
    })
    const cancel = () => {
      const error = generation === this.startupGeneration && this.lastStartupError
        ? this.lastStartupError : new Error('Server startup stopped')
      if (generation === this.startupGeneration && this.settledStartupGeneration !== generation) {
        this.settledStartupGeneration = generation
        this.lastStartupError = error
      }
      controller.abort(error)
    }
    this.once('stopped', cancel)
    // Defer setup until pending ownership and cancellation are installed.
    const work = Promise.resolve().then(() => this.startAttempt(generation, controller.signal))
    const promise = Promise.race([work, cancelled]).finally(() => {
      this.removeListener('stopped', cancel)
      if (this.pendingStartup?.promise === promise) this.pendingStartup = null
    })
    this.pendingStartup = { promise, cancel }
    return promise
  }

  /** Platform stop overrides must also cancel preflight/no-close startup waits. */
  protected cancelPendingStartup(): void {
    this.pendingStartup?.cancel()
  }

  private async startAttempt(generation: number, signal: AbortSignal): Promise<void> {
    try {
      signal.throwIfAborted()
      const serverRoot = this.getServerRoot()
      this.serverDir = serverRoot
      
      logger.info(`Server installation directory: ${this.serverDir}`)
      logger.info(`App data directory: ${this.appDataDir}`)
      
      this.firstRun = this.appDataService.isFirstRun()
      if (this.firstRun) {
        this.appDataService.initializeFirstRun(this.serverDir)
        this.firstRun = this.appDataService.isFirstRun()
      }
      
      const validationErrors = this.validateServerEnvironment(this.serverDir)
      if (validationErrors.length > 0) {
        const errorMessage = `Server environment validation failed:\n- ${validationErrors.join('\n- ')}`
        logger.error(errorMessage)
        throw new Error(errorMessage)
      }

      this.serverStartTime = Date.now()

      // Wait for the port to be free to avoid TIME_WAIT conflicts
      await this.waitForPortToBeFree(undefined, signal);
      signal.throwIfAborted()

      // Always start a new internal server process.
      await this.launchServerProcess()
      const launchedProcess = this.serverProcess
      if (!launchedProcess) {
        throw new Error('Server launcher did not provide a child process')
      }
      signal.throwIfAborted()
      await this.waitForServerReady(generation, launchedProcess, signal)
    } catch (error) {
      logger.error('Failed to start server:', error)
      const normalized = error instanceof Error ? error : new Error(`${error}`)
      if (!signal.aborted) this.settleStartupError(generation, normalized)
      throw normalized
    }
  }

  /**
   * Launch the server process - to be implemented by platform-specific subclasses.
   */
  protected abstract launchServerProcess(): Promise<void>;

  /**
   * Stop the backend server with graceful-to-forceful fallback.
   * First sends SIGTERM for graceful shutdown, then escalates to SIGKILL if timeout expires.
   */
  public stopServer(): Promise<void> {
    this.cancelPendingStartup()
    if (this.stopPromise) return this.stopPromise
    const proc = this.serverProcess
    if (!proc) return Promise.resolve()
    this.stopPromise = stopManagedBackend(proc, this.gracefulShutdownTimeoutMs,
      () => this.requestGracefulStop(proc), () => this.forceStop(proc)).finally(() => {
        if (childExited(proc) && this.serverProcess === proc) {
          this.serverProcess = null; this.isServerRunning = false; this.ready = false; this.emit('stopped')
        }
        this.stopPromise = null
      })
    return this.stopPromise
  }
  protected async requestGracefulStop(proc: ChildProcess): Promise<void> {
    if (!childExited(proc)) proc.kill('SIGTERM')
    await waitForChildExit(proc, this.gracefulShutdownTimeoutMs)
  }
  protected async forceStop(proc: ChildProcess): Promise<void> {
    if (!childExited(proc)) proc.kill('SIGKILL')
  }

  /**
   * Check if the server is healthy by calling the health check endpoint.
   */
  protected async checkServerHealth(
    generation: number = this.startupGeneration,
    process: ChildProcess | null = this.serverProcess
  ): Promise<void> {
    try {
      const response = await axios.get(`${this.serverUrl}/rest/health`, {
        timeout: 2000
      })
      if (response.status === 200 && response.data.status === 'ok') {
        if (generation !== this.startupGeneration || process !== this.serverProcess) {
          return
        }
        logger.info('Server health check successful, server is ready')
        if (!this.ready && this.settledStartupGeneration !== generation) {
          this.isServerRunning = true
          this.ready = true
          this.settledStartupGeneration = generation
          this.emit('ready')
        }
      }
    } catch (error) {
      // Ignore errors during health check polling.
    }
  }

  /**
   * Check if the server is running.
   */
  public isRunning(): boolean {
    return this.isServerRunning && this.ready
  }

  /**
   * Get the server port.
   */
  public getServerPort(): number {
    return this.serverPort
  }

  /**
   * Get the server URL (base URL without path).
   */
  public getServerBaseUrl(): string {
    return this.serverUrl
  }

  /**
   * Get the server API URLs for all required endpoints.
   */
  public getServerUrls(): EmbeddedServerUrls {
    return {
      graphql: `${this.serverUrl}/graphql`,
      rest: `${this.serverUrl}/rest`,
      graphqlWs: `${this.serverWebSocketUrl}/graphql`,
      transcription: `${this.serverWebSocketUrl}/ws/transcribe`,
      terminalWs: `${this.serverWebSocketUrl}/ws/terminal`,
      health: `${this.serverUrl}/rest/health`
    }
  }

  /**
   * Get path to the server executable based on the platform.
   * Must be implemented by subclasses.
   */
  protected abstract getServerRoot(): string;

  /**
   * Get the application's data directory path.
   */
  public getAppDataDir(): string {
    return this.appDataService.getAppDataDir()
  }

  public setRuntimeEnvOverrides(overrides: Record<string, string | null | undefined>): void {
    const next: Record<string, string> = {}
    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        next[key] = value
      }
    }
    this.runtimeEnvOverrides = next
  }

  protected getRuntimeEnvOverrides(): Record<string, string> {
    return { ...this.runtimeEnvOverrides }
  }

  /**
   * Compose the server child environment under this launch's environment policy.
   */
  protected buildServerEnv(loginShellPath: string | null): NodeJS.ProcessEnv {
    return buildServerProcessEnv({
      policy: this.launchConfig.environmentPolicy,
      callerEnv: process.env,
      loginShellPath,
      port: this.serverPort,
      appDataDir: this.appDataDir,
      publicServerUrl: this.serverUrl,
      runtimeOverrides: this.getRuntimeEnvOverrides(),
    })
  }

  /**
   * Reset the app data directory to a clean state.
   */
  public async resetAppDataDir(): Promise<void> {
    try {
      await this.appDataService.resetAppDataDir()
      this.appDataDir = this.appDataService.getAppDataDir()
      this.firstRun = this.appDataService.isFirstRun()
    } catch (error) {
      logger.error('Failed to reset app data directory:', error)
      throw error
    }
  }

  /**
   * Set up event handlers for the server process.
   */
  protected setupProcessHandlers(): void {
    if (!this.serverProcess) return
    const process = this.serverProcess
    const generation = this.startupGeneration
    const capturePlatformFatal = (line: string): void => {
      if (
        generation !== this.startupGeneration
        || process !== this.serverProcess
        || this.ready
      ) return
      const fatal = parseEmbeddedServerPlatformFatal(line)
      if (fatal) this.settleStartupError(generation, platformFatalError(fatal))
    }
    const stdoutForwarder = createServerProcessOutputForwarder(
      stdoutLogger,
      'info',
      capturePlatformFatal,
    )
    const stderrForwarder = createServerProcessOutputForwarder(
      stderrLogger,
      'error',
      capturePlatformFatal,
    )

    this.serverProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      stdoutForwarder.pushChunk(output)
    })

    this.serverProcess.stderr?.on('data', (data) => {
      const output = data.toString()
      stderrForwarder.pushChunk(output)
    })

    this.serverProcess.on('error', (error) => {
      logger.error('Server process error:', error)
      if (generation !== this.startupGeneration || process !== this.serverProcess) return
      this.isServerRunning = false
      this.ready = false
      this.settleStartupError(generation, error)
      if (!process.pid) this.serverProcess = null
    })

    this.serverProcess.on('exit', (code) => {
      stdoutForwarder.flush()
      stderrForwarder.flush()
      logger.info(`Server process exited with code ${code}`)
      if (generation !== this.startupGeneration || process !== this.serverProcess) return
      const closedBeforeHealth = !this.ready
      this.isServerRunning = false
      this.ready = false
      this.serverProcess = null
      if (closedBeforeHealth && !this.stopPromise) {
        void this.diagnoseExitedStartup(generation, new Error(`Server process exited before health was available (code ${code ?? 'unknown'})`))
      } else if (code !== 0 && code !== null) {
        this.emit('error', new Error(`Server process exited with code ${code}`))
      }
      if (this.stopPromise || !closedBeforeHealth) this.emit('stopped');
    })
  }

  private async diagnoseExitedStartup(generation: number, error: Error): Promise<void> {
    try { await assertBackendPortAvailable(this.serverPort) }
    catch (bindError) {
      if (isAddressInUse(bindError)) error = new PortConflictError(await inspectPortOwner(this.serverPort))
    }
    this.settleStartupError(generation, error)
  }

  private settleStartupError(generation: number, error: Error): void {
    if (
      generation !== this.startupGeneration
      || this.settledStartupGeneration === generation
    ) {
      return
    }
    this.settledStartupGeneration = generation
    this.lastStartupError = error
    if (this.listenerCount('error') > 0) {
      this.emit('error', error)
    }
  }

  /** Observe the current child until health, a genuine failure, or explicit stop. */
  protected async waitForServerReady(
    generation: number,
    process: ChildProcess,
    signal: AbortSignal
  ): Promise<void> {
    signal.throwIfAborted()
    if (this.ready) return
    if (this.settledStartupGeneration === generation && this.lastStartupError) {
      throw this.lastStartupError
    }
    return new Promise<void>((resolve, reject) => {
      let warningTimer: NodeJS.Timeout
      let healthInterval: NodeJS.Timeout
      let settled = false
      const finish = (error?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(warningTimer)
        clearInterval(healthInterval)
        this.removeListener('ready', onReady)
        this.removeListener('error', onError)
        signal.removeEventListener('abort', onAbort)
        if (error) reject(error)
        else resolve()
      }
      const onReady = () => finish()
      const onError = (error: Error) => finish(error)
      const onAbort = () => finish(signal.reason)
      this.once('ready', onReady)
      this.once('error', onError)
      signal.addEventListener('abort', onAbort, { once: true })

      const pollHealth = () => { void this.checkServerHealth(generation, process) }
      healthInterval = setInterval(pollHealth, this.healthPollIntervalMs)
      warningTimer = setTimeout(() => {
        if (settled || signal.aborted || generation !== this.startupGeneration || process !== this.serverProcess) return
        const message = 'Startup is taking longer than usual. Waiting for the backend; see logs for details.'
        logger.warn(message)
        this.emit('startup-delayed', message)
      }, this.startupWarningAfterMs)
      pollHealth()
    })
  }
}
