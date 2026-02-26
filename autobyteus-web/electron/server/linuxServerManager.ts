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

export class LinuxServerManager extends BaseServerManager {
  /**
   * Get path to the server executable for Linux.
   */
  protected getServerRoot(): string {
    return isDev
      ? path.join(process.cwd(), 'resources', 'server')
      : path.join(process.resourcesPath, 'server')
  }

  /**
   * Launch the server process for Linux.
   */
  protected async launchServerProcess(): Promise<void> {
    const serverEntry = path.join(this.serverDir, 'dist', 'app.js')

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

  // No cache directory needed for Node-based server runtime.
}
