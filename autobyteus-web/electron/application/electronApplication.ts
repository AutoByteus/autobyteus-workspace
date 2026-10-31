import { ApplicationShutdown } from './applicationShutdown'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import isDev from 'electron-is-dev'
import * as path from 'path'
import { pathToFileURL } from 'url'
import {
  formatEmbeddedServerClientBaseUrl,
} from '../../shared/embeddedServerClientEndpoint'
import type { ElectronLaunchProfile } from '../launch-profile/electronLaunchProfile'
import type {
  NodeRegistryChange,
  NodeRegistrySnapshot,
  WindowNodeContext,
} from '../nodeRegistryTypes'
import { EMBEDDED_ENTRY_ID, isNodeId } from '../nodeRegistryTypes'
import { logger } from '../logger'
import { attachRendererConsoleDiagnostics } from '../rendererConsoleDiagnostics'
import {
  ensureEmbeddedNode,
  getEntryById,
  loadNodeRegistrySnapshot,
  nowIsoString,
  identifyNodeEntry,
  sanitizeBaseUrl,
  saveNodeRegistrySnapshot,
} from '../nodeRegistryStore'
import { ServerManagerFactory } from '../server/serverManagerFactory'
import type { BaseServerManager } from '../server/baseServerManager'
import { ServerStatusManager } from '../server/serverStatusManager'
import { AppUpdater } from '../updater/appUpdater'
import type { AppUpdateController } from '../updater/appUpdateController'
import { DisabledAppUpdater } from '../updater/disabledAppUpdater'
import { registerExtensionIpcHandlers } from '../extensionIpcHandlers'
import { ManagedExtensionService } from '../extensions/managedExtensionService'
import { BrowserRuntime, startBrowserRuntime } from '../browser/browser-runtime'
import { registerBrowserShellIpcHandlers } from '../browser/register-browser-shell-ipc-handlers'
import { BrowserBridgeAuthRegistry } from '../browser/browser-bridge-auth-registry'
import { WorkspaceShellWindow } from '../shell/workspace-shell-window'
import { WorkspaceShellWindowRegistry } from '../shell/workspace-shell-window-registry'
import { validateReadableRegularFile } from '../localFileValidation'
import { installLocalFileProtocol } from '../local-file-protocol/local-file-protocol'
import { runElectronFileMigrations } from '../../client-data-migrations/electron-file-runner'

type ElectronApplicationOptions = {
  profile: ElectronLaunchProfile
}


export class ElectronApplication {
  private readonly profile: ElectronLaunchProfile
  private readonly serverManager: BaseServerManager
  private readonly serverStatusManager: ServerStatusManager
  private readonly appUpdateController: AppUpdateController
  private readonly shellWindowRegistry = new WorkspaceShellWindowRegistry()
  private managedExtensionService: ManagedExtensionService | null = null
  private browserRuntime: BrowserRuntime | null = null
  private readonly shutdown = new ApplicationShutdown(() => this.stopResources(), () => logger.close(), 30000,
    error => logger.error('Application shutdown incomplete', error))
  private nodeRegistrySnapshot: NodeRegistrySnapshot = { version: 0, nodes: [] }

  constructor({ profile }: ElectronApplicationOptions) {
    this.profile = profile
    this.serverManager = ServerManagerFactory.createServerManager({
      clientEndpoint: profile.clientEndpoint,
      listenerPolicy: 'preserve-backend-default',
      baseDataRoot: profile.baseDataRoot,
      environmentPolicy: profile.name === 'e2e' ? 'isolated-baseline' : 'inherit-caller',
    })
    this.serverStatusManager = new ServerStatusManager(this.serverManager)
    this.appUpdateController = profile.updaterEnabled
      ? new AppUpdater({ prepareForInstall: () => this.prepareForInstall() })
      : profile.testUpdateFeedUrl
        ? new AppUpdater({ testFeedUrl: profile.testUpdateFeedUrl, prepareForInstall: () => this.prepareForInstall() })
        : new DisabledAppUpdater()
  }

  private get activeEmbeddedBaseUrl(): string {
    return formatEmbeddedServerClientBaseUrl(this.profile.clientEndpoint)
  }

  private getWindowIcon(): string {
    const iconFile = '512x512.png'
    const prodPath = path.join(process.resourcesPath, 'icons', iconFile)
    const devPath = path.join(__dirname, '..', '..', '..', 'build', 'icons', iconFile)
    const resolvedPath = app.isPackaged ? prodPath : devPath
    if (!fsSync.existsSync(resolvedPath)) {
      logger.warn(`Window icon not found at ${resolvedPath}. Falling back to Electron default.`)
    }
    return resolvedPath
  }

  private getStartUrl(): string {
    if (isDev) {
      return process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000'
    }
    const rendererIndexCandidates = [
      path.join(__dirname, '../../../renderer/index.html'),
      path.join(__dirname, '../../renderer/index.html'),
    ]
    for (const candidate of rendererIndexCandidates) {
      if (fsSync.existsSync(candidate)) {
        return pathToFileURL(candidate).toString()
      }
    }
    logger.error('Renderer index.html not found for packaged app', {
      dirname: __dirname,
      candidates: rendererIndexCandidates,
    })
    return pathToFileURL(rendererIndexCandidates[0]).toString()
  }

  private broadcastNodeRegistrySnapshot(): void {
    this.shellWindowRegistry.broadcast('node-registry-updated', this.nodeRegistrySnapshot)
  }

  private commitNodeRegistrySnapshot(snapshot: NodeRegistrySnapshot): void {
    this.nodeRegistrySnapshot = snapshot
    saveNodeRegistrySnapshot(app.getPath('userData'), snapshot)
    this.broadcastNodeRegistrySnapshot()
  }

  private getWindowContextByWebContentsId(webContentsId: number): WindowNodeContext {
    return {
      windowId: webContentsId,
      entryId: this.shellWindowRegistry.getEntryIdForShell(webContentsId) || EMBEDDED_ENTRY_ID,
    }
  }

  private createNodeBoundWindow(entryId: string): WorkspaceShellWindow {
    const startUrl = this.getStartUrl()
    const window = new WorkspaceShellWindow({
      entryId,
      startUrl,
      preloadPath: path.join(__dirname, '..', 'preload.js'),
      iconPath: this.getWindowIcon(),
    })
    this.shellWindowRegistry.register(window)
    this.browserRuntime?.registerShell(window)
    logger.info(`Creating node-bound window for entryId=${entryId}; url=${startUrl}`)
    attachRendererConsoleDiagnostics(window.browserWindow.webContents, { logger, entryId })
    window.browserWindow.webContents.on('did-finish-load', () => {
      window.send('server-status', this.serverStatusManager.getStatus())
      window.send('node-registry-updated', this.nodeRegistrySnapshot)
    })
    window.browserWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL) => {
        logger.error('Page failed to load:', {
          entryId,
          errorCode,
          errorDescription,
          validatedURL,
          startUrl,
        })
      },
    )
    window.browserWindow.on('closed', () => {
      this.browserRuntime?.unregisterShell(window.shellId)
      this.shellWindowRegistry.unregister(window.shellId)
    })
    return window
  }

  private openNodeWindow(entryId: string): { windowId: number; created: boolean } {
    const existingWindow = this.shellWindowRegistry.getByEntryId(entryId)
    if (existingWindow && !existingWindow.isDestroyed()) {
      const focused = this.shellWindowRegistry.focusShell(existingWindow.shellId)
      if (focused) {
        return { windowId: existingWindow.shellId, created: false }
      }
    }
    const createdWindow = this.createNodeBoundWindow(entryId)
    return { windowId: createdWindow.shellId, created: true }
  }

  private ensureNodeExists(entryId: string): void {
    if (!getEntryById(this.nodeRegistrySnapshot, entryId)) {
      throw new Error(`Node does not exist: ${entryId}`)
    }
  }

  private applyNodeRegistryChange(change: NodeRegistryChange): NodeRegistrySnapshot {
    const now = nowIsoString()
    let existingNodes = [...this.nodeRegistrySnapshot.nodes]
    if (change.type === 'add') {
      const candidate = change.node
      if (!candidate.id.trim() || !candidate.name.trim() || !candidate.baseUrl.trim()) {
        throw new Error('Node id, name, and baseUrl are required')
      }
      if (candidate.nodeType !== 'remote') {
        throw new Error('Only remote nodes can be added manually')
      }
      if (existingNodes.some((node) => node.id === candidate.id)) {
        throw new Error(`Node id already exists: ${candidate.id}`)
      }
      if (candidate.nodeId !== undefined && !isNodeId(candidate.nodeId)) {
        throw new Error(`Invalid node ID: ${candidate.nodeId}`)
      }
      const normalizedBaseUrl = sanitizeBaseUrl(candidate.baseUrl)
      if (existingNodes.some(
        (node) => sanitizeBaseUrl(node.baseUrl).toLowerCase() === normalizedBaseUrl.toLowerCase(),
      )) {
        throw new Error(`Node baseUrl already exists: ${candidate.baseUrl}`)
      }
      existingNodes.push({
        ...candidate,
        baseUrl: normalizedBaseUrl,
        createdAt: candidate.createdAt || now,
        updatedAt: now,
      })
    } else if (change.type === 'remove') {
      if (change.entryId === EMBEDDED_ENTRY_ID) {
        throw new Error('Embedded node cannot be removed')
      }
      const removeIndex = existingNodes.findIndex((node) => node.id === change.entryId)
      if (removeIndex === -1) {
        throw new Error(`Node does not exist: ${change.entryId}`)
      }
      this.shellWindowRegistry.closeNodeWindow(change.entryId)
      existingNodes.splice(removeIndex, 1)
    } else if (change.type === 'rename') {
      const target = existingNodes.find((node) => node.id === change.entryId)
      if (!target || !change.name.trim()) {
        throw new Error(target ? 'Node name is required' : `Node does not exist: ${change.entryId}`)
      }
      target.name = change.name.trim()
      target.updatedAt = now
    } else if (change.type === 'identify') {
      const identified = identifyNodeEntry(existingNodes, change, now)
      if (identified === existingNodes) return this.nodeRegistrySnapshot
      existingNodes = identified
    } else {
      const neverChange: never = change
      throw new Error(`Unsupported registry change: ${JSON.stringify(neverChange)}`)
    }
    return {
      version: this.nodeRegistrySnapshot.version + 1,
      nodes: ensureEmbeddedNode(
        { version: this.nodeRegistrySnapshot.version, nodes: existingNodes },
        this.activeEmbeddedBaseUrl,
      ).nodes,
    }
  }

  private installIpcHandlers(): void {
    ipcMain.on('ping', (event) => event.reply('pong', 'Pong from main process!'))
    ipcMain.on('start-shutdown', () => {
      app.quit()
    })
    ipcMain.handle('open-node-window', async (_event, entryId: string) => {
      this.ensureNodeExists(entryId)
      return this.openNodeWindow(entryId)
    })
    ipcMain.handle('focus-node-window', async (_event, entryId: string) => {
      this.ensureNodeExists(entryId)
      const existing = this.shellWindowRegistry.getByEntryId(entryId)
      return existing
        ? { focused: this.shellWindowRegistry.focusShell(existing.shellId) }
        : { focused: false, reason: 'not-found' }
    })
    ipcMain.handle('list-node-windows', async () => this.shellWindowRegistry.list())
    ipcMain.handle('get-window-context', async (event) =>
      this.getWindowContextByWebContentsId(event.sender.id))
    ipcMain.handle('upsert-node-registry', async (_event, change: NodeRegistryChange) => {
      const next = this.applyNodeRegistryChange(change)
      // An `identify` with the ID already stored changes nothing, so nothing is written.
      if (next !== this.nodeRegistrySnapshot) this.commitNodeRegistrySnapshot(next)
      return this.nodeRegistrySnapshot
    })
    ipcMain.handle('get-node-registry-snapshot', async () => this.nodeRegistrySnapshot)
    registerBrowserShellIpcHandlers(ipcMain, () => this.browserRuntime)
    ipcMain.handle('get-server-status', () => this.serverStatusManager.getStatus())
    ipcMain.handle('restart-server', async () => this.serverStatusManager.restartServer())
    ipcMain.handle('check-server-health', async () => this.serverStatusManager.checkServerHealth())
    ipcMain.handle('get-log-file-path', () => logger.getLogPath())
    ipcMain.handle('get-platform', () => process.platform)
    ipcMain.handle('get-app-locale', () => app.getLocale())
    ipcMain.handle('reset-server-data', async () => {
      try {
        await this.serverManager.stopServer()
        await this.serverManager.resetAppDataDir()
        return { success: true }
      } catch (error) {
        logger.error('Failed to reset server data:', error)
        return { success: false, error: error instanceof Error ? error.message : String(error) }
      }
    })
    ipcMain.handle('open-log-file', async (_event, filePath: string) => {
      try {
        if (!fsSync.existsSync(filePath)) return { success: false, error: 'Log file does not exist' }
        await shell.openPath(filePath)
        return { success: true }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) }
      }
    })
    ipcMain.handle('open-external-link', async (_event, url: string) => {
      try {
        await shell.openExternal(url)
        return { success: true }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) }
      }
    })
    ipcMain.handle('read-log-file', async (_event, filePath: string) => {
      try {
        if (!fsSync.existsSync(filePath)) return { success: false, error: 'Log file does not exist' }
        const content = await fs.readFile(filePath, 'utf8')
        const lines = content.split('\n')
        return {
          success: true,
          content: lines.slice(Math.max(0, lines.length - 500)).join('\n'),
          filePath,
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) }
      }
    })
    ipcMain.handle('read-local-text-file', async (_event, filePath: string) => {
      try {
        const validation = await validateReadableRegularFile(filePath)
        if (!validation.ok) return { success: false, errorCode: validation.code }
        return { success: true, content: await fs.readFile(validation.filePath, 'utf-8') }
      } catch {
        return { success: false, errorCode: 'unavailable' }
      }
    })
    ipcMain.handle('show-folder-dialog', async () => {
      try {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
        return result.canceled || result.filePaths.length === 0
          ? { canceled: true, path: null }
          : { canceled: false, path: result.filePaths[0] }
      } catch (error) {
        return { canceled: true, path: null, error: error instanceof Error ? error.message : String(error) }
      }
    })
    registerExtensionIpcHandlers(ipcMain, this.managedExtensionService!)
  }

  private installLifecycleHandlers(): void {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit()
    })
    app.on('will-quit', event => {
      this.shutdown.quit(event,
        () => this.shellWindowRegistry.broadcast('app-quitting', undefined),
        () => app.quit(), () => app.exit(1))
    })
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) this.openNodeWindow(EMBEDDED_ENTRY_ID)
    })
  }

  async start(): Promise<void> {
    // autobyteus-290 SM-6: the stored node list's names follow the code before anything reads it.
    runElectronFileMigrations(app.getPath('userData'), logger)
    this.nodeRegistrySnapshot = loadNodeRegistrySnapshot(
      app.getPath('userData'),
      this.activeEmbeddedBaseUrl,
    )
    saveNodeRegistrySnapshot(app.getPath('userData'), this.nodeRegistrySnapshot)
    await app.whenReady()
    this.managedExtensionService = new ManagedExtensionService(this.profile.baseDataRoot)
    this.appUpdateController.initialize()
    const authRegistry = new BrowserBridgeAuthRegistry()
    this.browserRuntime = await startBrowserRuntime({
      iconPath: this.getWindowIcon(),
      artifactsDir: this.profile.name === 'e2e'
        ? this.profile.paths.browserArtifacts
        : path.join(this.profile.baseDataRoot, 'browser-artifacts'),
      setRuntimeEnvOverrides: (overrides) => this.serverManager.setRuntimeEnvOverrides(overrides),
      authRegistry,
      onStartError: (error) => logger.error(
        'Failed to start browser subsystem. Browser tools will remain unavailable.',
        error,
      ),
    })
    this.installIpcHandlers()
    this.serverStatusManager.on('status-change', (status) => {
      this.shellWindowRegistry.broadcast('server-status', status)
    })
    this.installLifecycleHandlers()
    installLocalFileProtocol({
      isOwnedMainFrame: this.shellWindowRegistry.isOwnedMainFrame.bind(this.shellWindowRegistry),
    })

    if (this.profile.name === 'e2e') {
      await this.serverStatusManager.initializeServer()
      this.openNodeWindow(EMBEDDED_ENTRY_ID)
      // Only with an explicit test update feed; the disabled updater schedules nothing.
      this.appUpdateController.startAutoCheck()
      return
    }

    this.openNodeWindow(EMBEDDED_ENTRY_ID)
    this.appUpdateController.startAutoCheck()
    void this.serverStatusManager.initializeServer().catch((error) => {
      logger.error('Server initialization failed in background:', error)
    })
  }

  stop(): Promise<void> { return this.shutdown.stop() }
  /**
   * "Install update and restart": an incomplete stop (already reported by the shutdown) still installs
   * when the server process is confirmed gone; otherwise the error stands and nothing is installed.
   */
  private async prepareForInstall(): Promise<void> {
    try { await this.shutdown.stop() }
    catch (error) {
      if (!this.serverManager.isServerProcessGone()) throw error
      this.shutdown.acceptIncompleteStopForInstall()
    }
  }
  private async stopResources(): Promise<void> {
    const errors: unknown[] = []
    try { await this.serverManager.stopServer() } catch (error) { errors.push(error); logger.error('Backend shutdown incomplete', error) }
    try { await this.browserRuntime?.stop() } catch (error) { errors.push(error); logger.error('Browser shutdown incomplete', error) }
    if (errors.length) throw new AggregateError(errors, 'Application shutdown incomplete')
  }
}
