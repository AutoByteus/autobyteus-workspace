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
import { EMBEDDED_NODE_ID } from '../nodeRegistryTypes'
import { logger } from '../logger'
import { attachRendererConsoleDiagnostics } from '../rendererConsoleDiagnostics'
import {
  ensureEmbeddedNode,
  getNodeProfileById,
  loadNodeRegistrySnapshot,
  nowIsoString,
  sanitizeBaseUrl,
  saveNodeRegistrySnapshot,
} from '../nodeRegistryStore'
import { ServerManagerFactory } from '../server/serverManagerFactory'
import type { BaseServerManager } from '../server/baseServerManager'
import { ServerStatusManager } from '../server/serverStatusManager'
import { AppUpdater } from '../updater/appUpdater'
import { registerExtensionIpcHandlers } from '../extensionIpcHandlers'
import { ManagedExtensionService } from '../extensions/managedExtensionService'
import { BrowserRuntime, startBrowserRuntime } from '../browser/browser-runtime'
import { registerBrowserShellIpcHandlers } from '../browser/register-browser-shell-ipc-handlers'
import { BrowserBridgeAuthRegistry } from '../browser/browser-bridge-auth-registry'
import { WorkspaceShellWindow } from '../shell/workspace-shell-window'
import { WorkspaceShellWindowRegistry } from '../shell/workspace-shell-window-registry'
import { validateReadableRegularFile } from '../localFileValidation'
import { installLocalFileProtocol } from '../local-file-protocol/local-file-protocol'

type ElectronApplicationOptions = {
  profile: ElectronLaunchProfile
}

const shutdownTimeoutMs = 8000

export class ElectronApplication {
  private readonly profile: ElectronLaunchProfile
  private readonly serverManager: BaseServerManager
  private readonly serverStatusManager: ServerStatusManager
  private readonly appUpdater: AppUpdater | null
  private readonly shellWindowRegistry = new WorkspaceShellWindowRegistry()
  private managedExtensionService: ManagedExtensionService | null = null
  private browserRuntime: BrowserRuntime | null = null
  private hasShutdownRun = false
  private shutdownTimer: NodeJS.Timeout | null = null
  private nodeRegistrySnapshot: NodeRegistrySnapshot = { version: 0, nodes: [] }

  constructor({ profile }: ElectronApplicationOptions) {
    this.profile = profile
    this.serverManager = ServerManagerFactory.createServerManager({
      clientEndpoint: profile.clientEndpoint,
      listenerPolicy: 'preserve-backend-default',
      baseDataRoot: profile.baseDataRoot,
    })
    this.serverStatusManager = new ServerStatusManager(this.serverManager)
    this.appUpdater = profile.updaterEnabled ? new AppUpdater() : null
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
      nodeId: this.shellWindowRegistry.getNodeIdForShell(webContentsId) || EMBEDDED_NODE_ID,
    }
  }

  private createNodeBoundWindow(nodeId: string): WorkspaceShellWindow {
    const startUrl = this.getStartUrl()
    const window = new WorkspaceShellWindow({
      nodeId,
      startUrl,
      preloadPath: path.join(__dirname, '..', 'preload.js'),
      iconPath: this.getWindowIcon(),
    })
    this.shellWindowRegistry.register(window)
    this.browserRuntime?.registerShell(window)
    logger.info(`Creating node-bound window for nodeId=${nodeId}; url=${startUrl}`)
    attachRendererConsoleDiagnostics(window.browserWindow.webContents, { logger, nodeId })
    window.browserWindow.webContents.on('did-finish-load', () => {
      window.send('server-status', this.serverStatusManager.getStatus())
      window.send('node-registry-updated', this.nodeRegistrySnapshot)
    })
    window.browserWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL) => {
        logger.error('Page failed to load:', {
          nodeId,
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

  private openNodeWindow(nodeId: string): { windowId: number; created: boolean } {
    const existingWindow = this.shellWindowRegistry.getByNodeId(nodeId)
    if (existingWindow && !existingWindow.isDestroyed()) {
      const focused = this.shellWindowRegistry.focusShell(existingWindow.shellId)
      if (focused) {
        return { windowId: existingWindow.shellId, created: false }
      }
    }
    const createdWindow = this.createNodeBoundWindow(nodeId)
    return { windowId: createdWindow.shellId, created: true }
  }

  private ensureNodeExists(nodeId: string): void {
    if (!getNodeProfileById(this.nodeRegistrySnapshot, nodeId)) {
      throw new Error(`Node does not exist: ${nodeId}`)
    }
  }

  private applyNodeRegistryChange(change: NodeRegistryChange): NodeRegistrySnapshot {
    const now = nowIsoString()
    const existingNodes = [...this.nodeRegistrySnapshot.nodes]
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
      const normalizedBaseUrl = sanitizeBaseUrl(candidate.baseUrl)
      if (existingNodes.some(
        (node) => sanitizeBaseUrl(node.baseUrl).toLowerCase() === normalizedBaseUrl.toLowerCase(),
      )) {
        throw new Error(`Node baseUrl already exists: ${candidate.baseUrl}`)
      }
      existingNodes.push({
        ...candidate,
        baseUrl: normalizedBaseUrl,
        isSystem: false,
        createdAt: candidate.createdAt || now,
        updatedAt: now,
      })
    } else if (change.type === 'remove') {
      if (change.nodeId === EMBEDDED_NODE_ID) {
        throw new Error('Embedded node cannot be removed')
      }
      const removeIndex = existingNodes.findIndex((node) => node.id === change.nodeId)
      if (removeIndex === -1) {
        throw new Error(`Node does not exist: ${change.nodeId}`)
      }
      this.shellWindowRegistry.closeNodeWindow(change.nodeId)
      existingNodes.splice(removeIndex, 1)
    } else if (change.type === 'rename') {
      const target = existingNodes.find((node) => node.id === change.nodeId)
      if (!target || !change.name.trim()) {
        throw new Error(target ? 'Node name is required' : `Node does not exist: ${change.nodeId}`)
      }
      target.name = change.name.trim()
      target.updatedAt = now
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
      if (this.shutdownTimer) clearTimeout(this.shutdownTimer)
      this.shutdownTimer = null
      app.quit()
    })
    ipcMain.handle('open-node-window', async (_event, nodeId: string) => {
      this.ensureNodeExists(nodeId)
      return this.openNodeWindow(nodeId)
    })
    ipcMain.handle('focus-node-window', async (_event, nodeId: string) => {
      this.ensureNodeExists(nodeId)
      const existing = this.shellWindowRegistry.getByNodeId(nodeId)
      return existing
        ? { focused: this.shellWindowRegistry.focusShell(existing.shellId) }
        : { focused: false, reason: 'not-found' }
    })
    ipcMain.handle('list-node-windows', async () => this.shellWindowRegistry.list())
    ipcMain.handle('get-window-context', async (event) =>
      this.getWindowContextByWebContentsId(event.sender.id))
    ipcMain.handle('upsert-node-registry', async (_event, change: NodeRegistryChange) => {
      this.commitNodeRegistrySnapshot(this.applyNodeRegistryChange(change))
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
    app.on('before-quit', () => {
      this.shellWindowRegistry.broadcast('app-quitting', undefined)
      this.shutdownTimer = setTimeout(() => app.quit(), shutdownTimeoutMs)
    })
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit()
    })
    app.on('will-quit', () => {
      void this.stop()
    })
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) this.openNodeWindow(EMBEDDED_NODE_ID)
    })
  }

  async start(): Promise<void> {
    this.nodeRegistrySnapshot = loadNodeRegistrySnapshot(
      app.getPath('userData'),
      this.activeEmbeddedBaseUrl,
    )
    saveNodeRegistrySnapshot(app.getPath('userData'), this.nodeRegistrySnapshot)
    await app.whenReady()
    this.managedExtensionService = new ManagedExtensionService(this.profile.baseDataRoot)
    this.appUpdater?.initialize()
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
      this.openNodeWindow(EMBEDDED_NODE_ID)
      return
    }

    this.openNodeWindow(EMBEDDED_NODE_ID)
    this.appUpdater?.startAutoCheck()
    void this.serverStatusManager.initializeServer().catch((error) => {
      logger.error('Server initialization failed in background:', error)
    })
  }

  async stop(): Promise<void> {
    if (this.hasShutdownRun) return
    this.hasShutdownRun = true
    if (this.shutdownTimer) clearTimeout(this.shutdownTimer)
    this.shutdownTimer = null
    try {
      await this.serverManager.stopServer()
    } catch (error) {
      logger.error('Error during server shutdown:', error)
    }
    try {
      await this.browserRuntime?.stop()
    } catch (error) {
      logger.error('Error during browser runtime shutdown:', error)
    } finally {
      logger.close()
    }
  }
}
