import { spawn, ChildProcess, StdioOptions } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import isDev from 'electron-is-dev'
import { BaseServerManager } from './baseServerManager'
import { logger } from '../logger'
import { getLocalIp } from '../utils/networkUtils'
import { buildServerRuntimeEnv } from './serverRuntimeEnv'

export class WindowsServerManager extends BaseServerManager {
  private async waitForProcessExit(proc: ChildProcess, timeoutMs: number): Promise<boolean> {
    if (proc.exitCode !== null) {
      return true
    }

    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout | undefined
      const onClose = () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        resolve(true)
      }

      proc.once('close', onClose)

      timeoutId = setTimeout(() => {
        proc.removeListener('close', onClose)
        resolve(false)
      }, timeoutMs)
    })
  }

  /**
   * Get path to the server executable for Windows.
   */
  protected getServerRoot(): string {
    return isDev
      ? path.join(process.cwd(), 'resources', 'server')
      : path.join(process.resourcesPath, 'server')
  }

  /**
   * Launch the server process for Windows.
   */
  protected async launchServerProcess(): Promise<void> {
    const serverEntry = path.join(this.serverDir, 'dist', 'app.js')
    if (!fs.existsSync(serverEntry)) {
      throw new Error(`Server entrypoint not found at: ${serverEntry}`)
    }
    
    // Dynamically determine the host IP, falling back to localhost if needed.
    const hostIp = getLocalIp() || 'localhost'
    const publicServerUrl = `http://${hostIp}:${this.serverPort}`

    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: this.serverPort.toString(),
      SERVER_PORT: this.serverPort.toString(),
      ...buildServerRuntimeEnv(this.appDataDir, process.env),
      // Explicitly provide the server with its public-facing URL.
      AUTOBYTEUS_SERVER_HOST: publicServerUrl,
      // Embedded Electron server is the default discovery registry node.
      AUTOBYTEUS_NODE_DISCOVERY_ENABLED: process.env.AUTOBYTEUS_NODE_DISCOVERY_ENABLED ?? 'true',
      AUTOBYTEUS_NODE_DISCOVERY_ROLE: process.env.AUTOBYTEUS_NODE_DISCOVERY_ROLE ?? 'registry',
      AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL:
        process.env.AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL ?? publicServerUrl,
    }

    const options = {
      cwd: this.serverDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'] as StdioOptions
    }

    logger.info(`Starting server with port: ${this.serverPort}`)
    logger.info(`Setting AUTOBYTEUS_SERVER_HOST to: ${publicServerUrl}`)
    logger.info(`Working directory: ${this.serverDir}`)
    logger.info(`App data directory: ${this.appDataDir}`)
    
    const args = [
      serverEntry,
      `--host`, `0.0.0.0`,
      `--port`, `${this.serverPort}`,
      `--data-dir`, `${this.appDataDir}`
    ]

    const formattedPath = process.execPath.includes(' ') ? `"${process.execPath}"` : process.execPath
    logger.info(`Executing: ${formattedPath} ${args.join(' ')}`)

    this.serverProcess = spawn(process.execPath, args, options)
    this.setupProcessHandlers()
  }

  /**
   * Stop the backend server on Windows with graceful-to-forceful fallback.
   * First tries graceful taskkill (without /f), then escalates to forceful kill after timeout.
   */
  public stopServer(): Promise<void> {
    if (!this.serverProcess) {
      logger.info('Server is not running');
      return Promise.resolve();
    }

    logger.info('Stopping server on Windows...');

    return new Promise((resolve) => {
      const proc = this.serverProcess
      const pid = proc?.pid;
      
      const cleanup = () => {
        this.isServerRunning = false;
        this.ready = false;
        this.serverProcess = null;
        this.emit('stopped');
      };

      if (!pid || !proc) {
        logger.warn('Server process exists but has no PID. Cannot kill.');
        cleanup();
        resolve();
        return;
      }

      let forceKillTimeout: NodeJS.Timeout;
      let hardTimeout: NodeJS.Timeout;
      let isResolved = false;
      
      const resolveOnce = () => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(forceKillTimeout);
          clearTimeout(hardTimeout);
          cleanup();
          resolve();
        }
      };

      // Wait for actual process exit, not just taskkill completion.
      this.waitForProcessExit(proc, this.gracefulShutdownTimeoutMs).then((exited) => {
        if (exited) {
          logger.info(`Server process ${pid} exited after graceful shutdown`);
          resolveOnce();
        }
      });
      
      // Step 1: Try graceful kill first (without /f flag)
      logger.info(`Sending graceful taskkill for PID ${pid}`);
      const gracefulKill = spawn('taskkill', ['/pid', pid.toString(), '/t']);
      
      gracefulKill.on('close', (code) => {
        if (code === 0) {
          logger.info(`Graceful taskkill for PID ${pid} completed successfully`);
        }
        // If code !== 0, the timeout will handle force kill
      });

      gracefulKill.on('error', (err) => {
        logger.error(`Graceful taskkill failed for PID ${pid}:`, err);
        // Let the force kill timeout handle it
      });
      
      // Step 2: Force kill after timeout
      forceKillTimeout = setTimeout(() => {
        if (!isResolved) {
          logger.warn(`Graceful shutdown timed out after ${this.gracefulShutdownTimeoutMs}ms, forcing kill for PID ${pid}`);
          const forceKill = spawn('taskkill', ['/pid', pid.toString(), '/f', '/t']);
          
          forceKill.on('close', () => {
            logger.info(`Force taskkill for PID ${pid} completed`);
            this.waitForProcessExit(proc, 2000).then(() => resolveOnce());
          });
          
          forceKill.on('error', (err) => {
            logger.error(`Force taskkill failed for PID ${pid}:`, err);
            resolveOnce(); // Resolve anyway to not hang
          });
        }
      }, this.gracefulShutdownTimeoutMs);

      // Hard timeout to avoid hanging if the process never exits.
      hardTimeout = setTimeout(() => {
        if (!isResolved) {
          logger.warn(`Server process ${pid} did not exit in time; continuing with cleanup`);
          resolveOnce();
        }
      }, this.gracefulShutdownTimeoutMs + 7000);
    });
  }

  // No cache directory needed for Node-based server runtime.
}
