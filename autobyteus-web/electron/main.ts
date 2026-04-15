import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import isDev from 'electron-is-dev';
import * as path from 'path';
import { pathToFileURL, URL } from 'url';
import type {
  NodeProfile,
  NodeRegistryChange,
  NodeRegistrySnapshot,
  WindowNodeContext,
} from './nodeRegistryTypes';
import { EMBEDDED_NODE_ID } from './nodeRegistryTypes';
import { logger } from './logger';
import { attachRendererConsoleDiagnostics } from './rendererConsoleDiagnostics';
import {
  ensureEmbeddedNode,
  getNodeProfileById,
  loadNodeRegistrySnapshot,
  nowIsoString,
  sanitizeBaseUrl,
  saveNodeRegistrySnapshot,
} from './nodeRegistryStore';
import { serverManager } from './server/serverManagerFactory';
import { ServerStatusManager } from './server/serverStatusManager';
import { AppUpdater } from './updater/appUpdater';
import { registerExtensionIpcHandlers } from './extensionIpcHandlers';
import { ManagedExtensionService } from './extensions/managedExtensionService';
import { getCanonicalBaseDataPath } from './appDataPaths';
import { BrowserRuntime, startBrowserRuntime } from './browser/browser-runtime';
import { registerBrowserShellIpcHandlers } from './browser/register-browser-shell-ipc-handlers';
import { BrowserBridgeAuthRegistry } from './browser/browser-bridge-auth-registry';
import { BrowserPairingStateController } from './browser/browser-pairing-state-controller';
import { registerBrowserPairingIpcHandlers } from './browser/register-browser-pairing-ipc-handlers';
import { RemoteBrowserSharingSettingsStore } from './browser/remote-browser-sharing-settings-store';
import { WorkspaceShellWindow } from './shell/workspace-shell-window';
import { WorkspaceShellWindowRegistry } from './shell/workspace-shell-window-registry';

const serverStatusManager = new ServerStatusManager(serverManager);
const appUpdater = new AppUpdater();
let managedExtensionService: ManagedExtensionService | null = null;
let browserRuntime: BrowserRuntime | null = null
let browserPairingStateController: BrowserPairingStateController | null = null
let browserBridgeAuthRegistry: BrowserBridgeAuthRegistry | null = null
let remoteBrowserSharingSettingsStore: RemoteBrowserSharingSettingsStore | null = null
const shellWindowRegistry = new WorkspaceShellWindowRegistry();

const shutdownTimeoutMs = 8000;

let isAppQuitting = false;
let hasShutdownRun = false;
let shutdownTimer: NodeJS.Timeout | null = null;

let nodeRegistrySnapshot: NodeRegistrySnapshot = {
  version: 0,
  nodes: [],
};

function getWindowIcon(): string {
  const iconFile = '512x512.png';
  const prodPath = path.join(process.resourcesPath, 'icons', iconFile);
  const devPath = path.join(__dirname, '..', '..', 'build', 'icons', iconFile);
  const resolvedPath = app.isPackaged ? prodPath : devPath;

  if (!fsSync.existsSync(resolvedPath)) {
    logger.warn(`Window icon not found at ${resolvedPath}. Falling back to Electron default.`);
  }

  return resolvedPath;
}

function getStartUrl(): string {
  if (isDev) {
    return process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  }

  const rendererIndexCandidates = [
    path.join(__dirname, '../../renderer/index.html'),
    path.join(__dirname, '../renderer/index.html'),
  ];

  for (const candidate of rendererIndexCandidates) {
    if (fsSync.existsSync(candidate)) {
      return pathToFileURL(candidate).toString();
    }
  }

  logger.error('Renderer index.html not found for packaged app', {
    dirname: __dirname,
    candidates: rendererIndexCandidates,
  });
  return pathToFileURL(rendererIndexCandidates[0]).toString();
}

function broadcastNodeRegistrySnapshot(): void {
  shellWindowRegistry.broadcast('node-registry-updated', nodeRegistrySnapshot);
}

function commitNodeRegistrySnapshot(snapshot: NodeRegistrySnapshot): void {
  nodeRegistrySnapshot = snapshot
  saveNodeRegistrySnapshot(app.getPath('userData'), nodeRegistrySnapshot)
  broadcastNodeRegistrySnapshot()
}

function getWindowContextByWebContentsId(webContentsId: number): WindowNodeContext {
  const nodeId = shellWindowRegistry.getNodeIdForShell(webContentsId) || EMBEDDED_NODE_ID;
  return {
    windowId: webContentsId,
    nodeId,
  };
}

function focusWindowById(windowId: number): boolean {
  return shellWindowRegistry.focusShell(windowId);
}

function createNodeBoundWindow(nodeId: string): WorkspaceShellWindow {
  const startURL = getStartUrl();
  const window = new WorkspaceShellWindow({
    nodeId,
    startUrl: startURL,
    preloadPath: path.join(__dirname, 'preload.js'),
    iconPath: getWindowIcon(),
  });
  shellWindowRegistry.register(window);
  browserRuntime?.registerShell(window);

  logger.info(`Creating node-bound window for nodeId=${nodeId}; url=${startURL}`);
  attachRendererConsoleDiagnostics(window.browserWindow.webContents, { logger, nodeId });
  window.browserWindow.webContents.on('did-finish-load', () => {
    window.send('server-status', serverStatusManager.getStatus());
    window.send('node-registry-updated', nodeRegistrySnapshot);
  });

  window.browserWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logger.error('Page failed to load:', {
      nodeId,
      errorCode,
      errorDescription,
      validatedURL,
      startURL,
    });
  });

  window.browserWindow.on('closed', () => {
    browserRuntime?.unregisterShell(window.shellId);
    shellWindowRegistry.unregister(window.shellId);
  });

  return window;
}

function openNodeWindow(nodeId: string): { windowId: number; created: boolean } {
  const existingWindow = shellWindowRegistry.getByNodeId(nodeId);
  if (existingWindow && !existingWindow.isDestroyed()) {
    const focused = focusWindowById(existingWindow.shellId);
    if (focused) {
      return {
        windowId: existingWindow.shellId,
        created: false,
      };
    }
  }

  const createdWindow = createNodeBoundWindow(nodeId);
  return {
    windowId: createdWindow.shellId,
    created: true,
  };
}

function closeNodeWindowIfOpen(nodeId: string): void {
  shellWindowRegistry.closeNodeWindow(nodeId);
}

function listNodeWindows(): Array<{ windowId: number; nodeId: string }> {
  return shellWindowRegistry.list();
}

function ensureNodeExists(nodeId: string): void {
  if (!getNodeProfileById(nodeRegistrySnapshot, nodeId)) {
    throw new Error(`Node does not exist: ${nodeId}`);
  }
}

function applyNodeRegistryChange(change: NodeRegistryChange): NodeRegistrySnapshot {
  const now = nowIsoString();
  const existingNodes = [...nodeRegistrySnapshot.nodes];

  if (change.type === 'add') {
    const candidate = change.node;
    if (!candidate.id.trim()) {
      throw new Error('Node id is required');
    }
    if (!candidate.name.trim()) {
      throw new Error('Node name is required');
    }
    if (!candidate.baseUrl.trim()) {
      throw new Error('Node baseUrl is required');
    }
    if (candidate.nodeType !== 'remote') {
      throw new Error('Only remote nodes can be added manually');
    }
    if (existingNodes.some((node) => node.id === candidate.id)) {
      throw new Error(`Node id already exists: ${candidate.id}`);
    }

    const normalizedBaseUrl = sanitizeBaseUrl(candidate.baseUrl);
    if (
      existingNodes.some((node) => sanitizeBaseUrl(node.baseUrl).toLowerCase() === normalizedBaseUrl.toLowerCase())
    ) {
      throw new Error(`Node baseUrl already exists: ${candidate.baseUrl}`);
    }

    existingNodes.push({
      ...candidate,
      baseUrl: normalizedBaseUrl,
      isSystem: false,
      createdAt: candidate.createdAt || now,
      updatedAt: now,
    });
  } else if (change.type === 'remove') {
    if (change.nodeId === EMBEDDED_NODE_ID) {
      throw new Error('Embedded node cannot be removed');
    }
    const removeIndex = existingNodes.findIndex((node) => node.id === change.nodeId);
    if (removeIndex === -1) {
      throw new Error(`Node does not exist: ${change.nodeId}`);
    }
    browserPairingStateController?.handleNodeRemoval(change.nodeId)
    closeNodeWindowIfOpen(change.nodeId);
    existingNodes.splice(removeIndex, 1);
  } else if (change.type === 'rename') {
    const target = existingNodes.find((node) => node.id === change.nodeId);
    if (!target) {
      throw new Error(`Node does not exist: ${change.nodeId}`);
    }
    if (!change.name.trim()) {
      throw new Error('Node name is required');
    }
    target.name = change.name.trim();
    target.updatedAt = now;
  } else {
    const neverChange: never = change;
    throw new Error(`Unsupported registry change: ${JSON.stringify(neverChange)}`);
  }

  return {
    version: nodeRegistrySnapshot.version + 1,
    nodes: ensureEmbeddedNode({
      version: nodeRegistrySnapshot.version,
      nodes: existingNodes,
    }).nodes,
  };
}

function installServerStatusFanout(): void {
  serverStatusManager.on('status-change', (status) => {
    shellWindowRegistry.broadcast('server-status', status);
  });
}

function installIpcHandlers(): void {
  ipcMain.on('ping', (event, args) => {
    logger.info('Received ping:', args);
    event.reply('pong', 'Pong from main process!');
  });

  ipcMain.on('start-shutdown', () => {
    logger.info('Received start-shutdown signal from renderer. Quitting app.');
    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
      shutdownTimer = null;
    }
    app.quit();
  });

  ipcMain.handle('open-node-window', async (_event, nodeId: string) => {
    ensureNodeExists(nodeId);
    return openNodeWindow(nodeId);
  });

  ipcMain.handle('focus-node-window', async (_event, nodeId: string) => {
    ensureNodeExists(nodeId);
    const existingWindow = shellWindowRegistry.getByNodeId(nodeId);
    if (!existingWindow) {
      return { focused: false, reason: 'not-found' };
    }
    const focused = focusWindowById(existingWindow.shellId);
    return { focused };
  });

  ipcMain.handle('list-node-windows', async () => listNodeWindows());

  ipcMain.handle('get-window-context', async (event): Promise<WindowNodeContext> => {
    return getWindowContextByWebContentsId(event.sender.id);
  });

  ipcMain.handle('upsert-node-registry', async (_event, change: NodeRegistryChange) => {
    commitNodeRegistrySnapshot(applyNodeRegistryChange(change));
    return nodeRegistrySnapshot;
  });

  ipcMain.handle('get-node-registry-snapshot', async () => nodeRegistrySnapshot);
  registerBrowserShellIpcHandlers(ipcMain, () => browserRuntime);
  registerBrowserPairingIpcHandlers(ipcMain, () => browserPairingStateController);

  ipcMain.handle('get-server-status', () => {
    return serverStatusManager.getStatus();
  });

  ipcMain.handle('restart-server', async () => {
    return await serverStatusManager.restartServer();
  });

  ipcMain.handle('check-server-health', async () => {
    return await serverStatusManager.checkServerHealth();
  });

  ipcMain.handle('get-log-file-path', () => {
    return logger.getLogPath();
  });

  ipcMain.handle('get-platform', () => {
    return process.platform;
  });

  ipcMain.handle('get-app-locale', () => {
    return app.getLocale();
  });

  ipcMain.handle('reset-server-data', async () => {
    try {
      await serverManager.stopServer();
    } catch (error) {
      logger.error('Failed to stop server before resetting data:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
    try {
      await serverManager.resetAppDataDir();
      return { success: true };
    } catch (error) {
      logger.error('Failed to reset app data directory:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('open-log-file', async (_event, filePath: string) => {
    try {
      if (!fsSync.existsSync(filePath)) {
        return { success: false, error: 'Log file does not exist' };
      }
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error opening log file',
      };
    }
  });

  ipcMain.handle('open-external-link', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error opening external link',
      };
    }
  });

  ipcMain.handle('read-log-file', async (_event, filePath: string) => {
    try {
      if (!fsSync.existsSync(filePath)) {
        return { success: false, error: 'Log file does not exist' };
      }
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const lastLines = lines.slice(Math.max(0, lines.length - 500)).join('\n');
      return {
        success: true,
        content: lastLines,
        filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reading log file',
      };
    }
  });

  ipcMain.handle('read-local-text-file', async (_event, filePath: string) => {
    try {
      if (!fsSync.existsSync(filePath)) {
        return { success: false, error: 'File does not exist' };
      }
      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reading file',
      };
    }
  });

  ipcMain.handle('show-folder-dialog', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true, path: null };
      }
      return { canceled: false, path: result.filePaths[0] };
    } catch (error) {
      logger.error('Failed to show folder dialog:', error);
      return {
        canceled: true,
        path: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  registerExtensionIpcHandlers(ipcMain, managedExtensionService!);
}

function installAppLifecycleHandlers(): void {
  app.on('before-quit', () => {
    isAppQuitting = true;
    shellWindowRegistry.broadcast('app-quitting', undefined);
    shutdownTimer = setTimeout(() => {
      logger.warn('Renderer did not acknowledge shutdown in time. Forcing quit.');
      app.quit();
    }, shutdownTimeoutMs);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('will-quit', async () => {
    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
      shutdownTimer = null;
    }
    if (hasShutdownRun) {
      return;
    }
    hasShutdownRun = true;
    try {
      await serverManager.stopServer();
    } catch (error) {
      logger.error('Error during server shutdown:', error);
    }
    try {
      browserPairingStateController?.stop()
    } catch (error) {
      logger.error('Error during browser pairing controller shutdown:', error)
    }
    try {
      await browserRuntime?.stop()
    } catch (error) {
      logger.error('Error during browser runtime shutdown:', error);
    } finally {
      logger.close();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openNodeWindow(EMBEDDED_NODE_ID);
    }
  });
}

function installProtocols(): void {
  protocol.handle('local-file', (request) => {
    try {
      const requestUrl = new URL(request.url);
      const filePath = path.normalize(decodeURIComponent(requestUrl.pathname));
      return net.fetch(pathToFileURL(filePath).toString());
    } catch (error) {
      logger.error(`[local-file protocol] Error handling request ${request.url}:`, error);
      return new Response(null, { status: 404 });
    }
  });
}

async function bootstrap(): Promise<void> {
  nodeRegistrySnapshot = loadNodeRegistrySnapshot(app.getPath('userData'));
  saveNodeRegistrySnapshot(app.getPath('userData'), nodeRegistrySnapshot);

  await app.whenReady();
  managedExtensionService = new ManagedExtensionService(getCanonicalBaseDataPath());
  appUpdater.initialize();
  const authRegistry = new BrowserBridgeAuthRegistry()
  const settingsStore = new RemoteBrowserSharingSettingsStore(app.getPath('userData'))
  browserBridgeAuthRegistry = authRegistry
  remoteBrowserSharingSettingsStore = settingsStore
  browserRuntime = await startBrowserRuntime({
    iconPath: getWindowIcon(),
    artifactsDir: path.join(getCanonicalBaseDataPath(), 'browser-artifacts'),
    setRuntimeEnvOverrides: (overrides) => serverManager.setRuntimeEnvOverrides(overrides),
    authRegistry,
    listenerHost: settingsStore.getListenerHost(),
    onStartError: (error) => {
      logger.error('Failed to start browser subsystem. Browser tools will remain unavailable.', error)
    },
  });
  browserPairingStateController = new BrowserPairingStateController({
    settingsStore,
    authRegistry,
    isRemoteSharingActive: () => browserRuntime?.isRemoteSharingActive() ?? false,
    getRemoteBridgeBaseUrl: (advertisedHost) => {
      if (!browserRuntime) {
        throw new Error('Browser runtime is unavailable.')
      }
      return browserRuntime.getRemoteBridgeBaseUrl(advertisedHost)
    },
    getNodeRegistrySnapshot: () => nodeRegistrySnapshot,
    commitNodeRegistrySnapshot,
  })
  installIpcHandlers();
  installServerStatusFanout();
  installAppLifecycleHandlers();

  installProtocols();

  openNodeWindow(EMBEDDED_NODE_ID);
  appUpdater.startAutoCheck();
  serverStatusManager.initializeServer().catch((error) => {
    logger.error('Server initialization failed in background:', error);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to initialize app:', error);
  if (!isAppQuitting) {
    app.quit();
  }
});
