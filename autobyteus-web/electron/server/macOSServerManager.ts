import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import isDev from 'electron-is-dev'
import { StdioOptions } from 'child_process'
import { BaseServerManager } from './baseServerManager'
import { logger } from '../logger'
import { getLocalIp } from '../utils/networkUtils'
import { getLoginShellPath } from '../utils/shellEnv'
import { buildServerRuntimeEnv } from './serverRuntimeEnv'

export class MacOSServerManager extends BaseServerManager {
  /**
   * Get path to the server root for macOS.
   */
  protected getServerRoot(): string {
    return isDev
      ? path.join(process.cwd(), 'resources', 'server')
      : path.join(process.resourcesPath, 'server')
  }

  /**
   * Launch the server process for macOS.
   */
  protected async launchServerProcess(): Promise<void> {
    const serverEntry = path.join(this.serverDir, 'dist', 'app.js')
    
    logger.info(`Server entrypoint: ${serverEntry}`)

    if (!fs.existsSync(serverEntry)) {
      throw new Error(`Server entrypoint not found at: ${serverEntry}`)
    }
    
    // Dynamically determine the host IP, falling back to localhost if needed.
    const hostIp = getLocalIp() || 'localhost'
    const publicServerUrl = `http://${hostIp}:${this.serverPort}`

    const loginShellPath = getLoginShellPath()
    if (loginShellPath) {
      logger.info('Using PATH from login shell')
    }

    const env = {
      ...process.env,
      ...(loginShellPath ? { PATH: loginShellPath } : {}),
      ELECTRON_RUN_AS_NODE: '1',
      PORT: this.serverPort.toString(),
      SERVER_PORT: this.serverPort.toString(),
      ...buildServerRuntimeEnv(this.appDataDir, publicServerUrl, process.env)
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
      `--port`, `${this.serverPort}`,
      `--data-dir`, `${this.appDataDir}`
    ]

    const formattedPath = process.execPath.includes(' ') ? `"${process.execPath}"` : process.execPath
    logger.info(`Executing: ${formattedPath} ${args.join(' ')}`)
    
    this.serverProcess = spawn(process.execPath, args, options)
    
    if (!this.serverProcess || !this.serverProcess.pid) {
      throw new Error(`Failed to spawn server process at ${process.execPath}`)
    }
    
    logger.info(`Server process spawned with PID: ${this.serverProcess.pid}`)
    this.setupProcessHandlers()
  }

  // No cache directory needed for Node-based server runtime.
}
