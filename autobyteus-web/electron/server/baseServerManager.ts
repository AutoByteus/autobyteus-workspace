import { ChildProcess } from 'child_process'
import * as net from 'net'
import * as os from 'os'
import * as path from 'path'
import axios from 'axios'
import { EventEmitter } from 'events'
import { logger } from '../logger'
import { AppDataService } from './services/AppDataService'

// Fixed server port
export const FIXED_SERVER_PORT = 29695

/**
 * Base server manager with platform-agnostic functionality.
 * Simplified to always use an internal server.
 * Now extends EventEmitter for robust event handling.
 */
export abstract class BaseServerManager extends EventEmitter {
  protected serverProcess: ChildProcess | null = null
  protected isServerRunning: boolean = false
  protected serverPort: number = FIXED_SERVER_PORT
  protected serverUrl: string = `http://localhost:${FIXED_SERVER_PORT}`
  protected ready: boolean = false
  protected serverStartTime: number = 0
  protected maxStartupTime: number = 100000 // 100 seconds timeout
  protected appDataDir: string = ''
  protected firstRun: boolean = false
  protected serverDir: string = ''
  protected gracefulShutdownTimeoutMs: number = 5000  // 5 seconds for graceful shutdown
  protected appDataService: AppDataService

  constructor() {
    super()
    this.appDataService = new AppDataService(this.getBaseDataDir())
    this.appDataDir = this.appDataService.getAppDataDir()
    this.firstRun = this.appDataService.isFirstRun()
    this.appDataService.initialize()
  }

  private getBaseDataDir(): string {
    const homeDir = os.homedir()
    if (process.platform === 'win32') {
      return path.join(homeDir, '.autobyteus')
    }
    return path.join(homeDir, '.autobyteus')
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

    try {
      this.serverUrl = `http://localhost:${this.serverPort}`
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
      await this.waitForServerReady()
    } catch (error) {
      logger.error('Failed to start server:', error)
      this.emit('error', error instanceof Error ? error : new Error(`${error}`))
      throw error
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
  protected async checkServerHealth(): Promise<void> {
    try {
      const response = await axios.get(`${this.serverUrl}/rest/health`, {
        timeout: 2000
      })
      if (response.status === 200 && response.data.status === 'ok') {
        logger.info('Server health check successful, server is ready')
        if (!this.ready) {
          this.isServerRunning = true
          this.ready = true
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

    this.serverProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      logger.info(`Server stdout: ${output}`)
      if (!this.ready && this.checkForReadyMessage(output)) {
        this.isServerRunning = true
        this.ready = true
        this.emit('ready')
      }
    })

    this.serverProcess.stderr?.on('data', (data) => {
      const output = data.toString()
      logger.error(`Server stderr: ${output}`)
      if (!this.ready && this.checkForReadyMessage(output)) {
        this.isServerRunning = true
        this.ready = true
        this.emit('ready')
      }
    })

    this.serverProcess.on('error', (error) => {
      logger.error('Server process error:', error)
      this.isServerRunning = false
      this.ready = false
      this.emit('error', error)
    })

    this.serverProcess.on('close', (code) => {
      logger.info(`Server process exited with code ${code}`)
      this.isServerRunning = false
      this.ready = false
      this.serverProcess = null
      this.emit('stopped');
      if (code !== 0 && code !== null) {
        this.emit('error', new Error(`Server process exited with code ${code}`))
      }
    })
  }

  /**
   * Check if the given output contains server ready messages.
   */
  protected checkForReadyMessage(output: string): boolean {
    return (
      output.includes('Application startup complete') || 
      output.includes('Running on http://') || 
      output.includes('Uvicorn running on') ||
      output.includes('Server listening on') ||
      output.includes('Server listening at') ||
      output.includes('INFO:     Application startup complete') ||
      output.includes('INFO:     Uvicorn running on')
    )
  }

  /**
   * Wait for the server to be ready or timeout.
   */
  protected async waitForServerReady(): Promise<void> {
    if (this.ready) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
        let timeoutId: NodeJS.Timeout;

        const onReadyListener = () => {
            clearTimeout(timeoutId);
            this.removeListener('error', onErrorListener);
            resolve();
        };

        const onErrorListener = (error: Error) => {
            clearTimeout(timeoutId);
            this.removeListener('ready', onReadyListener);
            reject(error);
        };

        this.once('ready', onReadyListener);
        this.once('error', onErrorListener);

        timeoutId = setTimeout(() => {
            this.removeListener('ready', onReadyListener);
            this.removeListener('error', onErrorListener);
            const error = new Error(`Server failed to start within ${this.maxStartupTime / 1000} seconds`);
            this.emit('error', error);
            reject(error);
        }, this.maxStartupTime);
    });
  }
}
