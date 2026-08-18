import { ChildProcess } from 'child_process'
import * as net from 'net'
import axios from 'axios'
import { EventEmitter } from 'events'
import { logger as rootLogger } from '../logger'
import { getCanonicalBaseDataPath } from '../appDataPaths'
import { INTERNAL_SERVER_BASE_URL, INTERNAL_SERVER_PORT } from '../../shared/embeddedServerConfig'
import { AppDataService } from './services/AppDataService'
import { createServerProcessOutputForwarder } from './serverOutputLogging'
import { parseEmbeddedServerPlatformFatal, platformFatalError } from './embeddedServerPlatformFatal'

const logger = rootLogger.child('server.base-server-manager')
const stdoutLogger = rootLogger.child('embedded-server.stdout')
const stderrLogger = rootLogger.child('embedded-server.stderr')

// Fixed server port
export const FIXED_SERVER_PORT = INTERNAL_SERVER_PORT

/**
 * Base server manager with platform-agnostic functionality.
 * Simplified to always use an internal server.
 * Now extends EventEmitter for robust event handling.
 */
export abstract class BaseServerManager extends EventEmitter {
  protected serverProcess: ChildProcess | null = null
  protected isServerRunning: boolean = false
  protected serverPort: number = FIXED_SERVER_PORT
  protected serverUrl: string = INTERNAL_SERVER_BASE_URL
  protected ready: boolean = false
  protected serverStartTime: number = 0
  protected maxStartupTime: number = 100000 // 100 seconds timeout
  protected appDataDir: string = ''
  protected firstRun: boolean = false
  protected serverDir: string = ''
  protected gracefulShutdownTimeoutMs: number = 5000  // 5 seconds for graceful shutdown
  protected appDataService: AppDataService
  protected runtimeEnvOverrides: Record<string, string> = {}
  protected healthPollIntervalMs: number = 250
  private startupGeneration: number = 0
  private settledStartupGeneration: number = 0
  private lastStartupError: Error | null = null

  constructor() {
    super()
    this.appDataService = new AppDataService(this.getBaseDataDir())
    this.appDataDir = this.appDataService.getAppDataDir()
    this.firstRun = this.appDataService.isFirstRun()
    this.appDataService.initialize()
  }

  private getBaseDataDir(): string {
    return getCanonicalBaseDataPath()
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
  protected async waitForPortToBeFree(timeoutMs: number = (process.platform === 'linux' ? 10000 : 5000)): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const isFree = await new Promise<boolean>((resolve) => {
        const tester = net.createServer()
          .once('error', () => {
            resolve(false);
          })
          .once('listening', () => {
            tester.close(() => resolve(true));
          })
          .listen(this.serverPort);
      });
      if (isFree) {
        logger.info(`Port ${this.serverPort} is free.`);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Port ${this.serverPort} is still in use after ${timeoutMs}ms`);
  }

  /**
   * Start the backend server.
   * Always starts a new internal server.
   */
  public async startServer(): Promise<void> {
    if (this.isServerRunning) {
      logger.info('Server is already running')
      return
    }

    const generation = ++this.startupGeneration
    this.settledStartupGeneration = 0
    this.lastStartupError = null
    this.ready = false
    this.isServerRunning = false

    try {
      this.serverUrl = INTERNAL_SERVER_BASE_URL
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
      await this.waitForPortToBeFree();

      // Always start a new internal server process.
      await this.launchServerProcess()
      const launchedProcess = this.serverProcess
      if (!launchedProcess) {
        throw new Error('Server launcher did not provide a child process')
      }
      await this.waitForServerReady(generation, launchedProcess)
    } catch (error) {
      logger.error('Failed to start server:', error)
      const normalized = error instanceof Error ? error : new Error(`${error}`)
      this.settleStartupError(generation, normalized)
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
    if (!this.serverProcess) {
      logger.info('Server is not running');
      return Promise.resolve();
    }
    
    const proc = this.serverProcess;

    return new Promise((resolve) => {
      let forceKillTimeout: NodeJS.Timeout;
      
      const cleanup = () => {
        clearTimeout(forceKillTimeout);
        this.isServerRunning = false;
        this.ready = false;
        this.serverProcess = null;
        this.emit('stopped');
      };
      
      // When process closes, cleanup and resolve
      proc.once('close', () => {
        logger.info('Server process closed');
        cleanup();
        resolve();
      });

      logger.info('Stopping server...');
      
      try {
        // Step 1: Send SIGTERM for graceful shutdown
        logger.info('Sending SIGTERM signal for graceful shutdown');
        proc.kill('SIGTERM');
        
        // Step 2: Set timeout to escalate to SIGKILL if graceful fails
        forceKillTimeout = setTimeout(() => {
          if (this.serverProcess) {
            logger.warn(`Graceful shutdown timed out after ${this.gracefulShutdownTimeoutMs}ms, sending SIGKILL`);
            try {
              proc.kill('SIGKILL');
            } catch (killError) {
              logger.error('Error sending SIGKILL:', killError);
              // Process is likely already gone, cleanup
              cleanup();
              resolve();
            }
          }
        }, this.gracefulShutdownTimeoutMs);
      } catch (error) {
        logger.error('Error sending SIGTERM to server:', error);
        // If kill fails, assume process is gone and cleanup state manually.
        cleanup();
        resolve();
      }
    });
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
  public getServerUrls(): {
    graphql: string;
    rest: string;
    ws: string;
    transcription: string;
    health: string;
  } {
    return {
      graphql: `${this.serverUrl}/graphql`,
      rest: `${this.serverUrl}/rest`,
      ws: `ws://localhost:${this.serverPort}/graphql`,
      transcription: `ws://localhost:${this.serverPort}/transcribe`,
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
    })

    this.serverProcess.on('close', (code) => {
      stdoutForwarder.flush()
      stderrForwarder.flush()
      logger.info(`Server process exited with code ${code}`)
      if (generation !== this.startupGeneration || process !== this.serverProcess) return
      const closedBeforeHealth = !this.ready
      this.isServerRunning = false
      this.ready = false
      this.serverProcess = null
      this.emit('stopped');
      if (closedBeforeHealth) {
        this.settleStartupError(
          generation,
          new Error(`Server process exited before health was available (code ${code ?? 'unknown'})`)
        )
      } else if (code !== 0 && code !== null) {
        this.emit('error', new Error(`Server process exited with code ${code}`))
      }
    })
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

  /**
   * Wait for the server to be ready or timeout.
   */
  protected async waitForServerReady(
    generation: number,
    process: ChildProcess
  ): Promise<void> {
    if (this.ready) {
      return Promise.resolve();
    }
    if (this.settledStartupGeneration === generation && this.lastStartupError) {
      return Promise.reject(this.lastStartupError)
    }
    return new Promise<void>((resolve, reject) => {
        let timeoutId: NodeJS.Timeout;
        let healthIntervalId: NodeJS.Timeout;

        const onReadyListener = () => {
            clearTimeout(timeoutId);
            clearInterval(healthIntervalId);
            this.removeListener('error', onErrorListener);
            resolve();
        };

        const onErrorListener = (error: Error) => {
            clearTimeout(timeoutId);
            clearInterval(healthIntervalId);
            this.removeListener('ready', onReadyListener);
            reject(error);
        };

        this.once('ready', onReadyListener);
        this.once('error', onErrorListener);

        const pollHealth = () => {
          void this.checkServerHealth(generation, process)
        }
        healthIntervalId = setInterval(pollHealth, this.healthPollIntervalMs)
        pollHealth()

        timeoutId = setTimeout(() => {
            clearInterval(healthIntervalId);
            this.removeListener('ready', onReadyListener);
            this.removeListener('error', onErrorListener);
            const error = new Error(`Server failed to start within ${this.maxStartupTime / 1000} seconds`);
            this.settleStartupError(generation, error);
            reject(error);
        }, this.maxStartupTime);
    });
  }
}
