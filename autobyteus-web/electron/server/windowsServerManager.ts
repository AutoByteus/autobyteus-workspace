import { ManagedBackendShutdownClient } from './managedBackendShutdownClient'
import { childExited } from './managedBackendStop'
import { spawn, execFile } from 'child_process'
import type { ChildProcess, StdioOptions } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import isDev from 'electron-is-dev'
import { BaseServerManager } from './baseServerManager'
import { logger } from '../logger'

export class WindowsServerManager extends BaseServerManager {
  private readonly controls = new WeakMap<ChildProcess, ManagedBackendShutdownClient>()

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
    
    const publicServerUrl = this.serverUrl
    const env = this.buildServerEnv(null)

    const options = {
      cwd: this.serverDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'] as StdioOptions
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
    this.controls.set(this.serverProcess, new ManagedBackendShutdownClient(this.serverProcess))
    this.setupProcessHandlers()
  }

  protected override async requestGracefulStop(proc: ChildProcess): Promise<void> {
    const control = this.controls.get(proc)
    if (!control) throw new Error('Managed backend IPC capability missing')
    try { await control.stop(this.gracefulShutdownTimeoutMs) }
    finally { control.dispose() }
  }
  protected override async forceStop(proc: ChildProcess): Promise<void> {
    if (childExited(proc) || !proc.pid) return
    await new Promise<void>((resolve, reject) => {
      execFile('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { timeout: 1000, maxBuffer: 32768 },
        error => error ? reject(error) : resolve())
    })
  }
}
