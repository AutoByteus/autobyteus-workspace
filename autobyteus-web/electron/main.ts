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
import { NodeWindowCommandRelay } from './node-window-command-relay';
import type {
  DispatchNodeWindowCommandResult,
  NodeWindowCommand,
} from './window-command-types';
import { isNodeWindowCommand } from './window-command-validators';
import { logger } from './logger';
import { serverManager } from './server/serverManagerFactory';
import { ServerStatusManager } from './server/serverStatusManager';

const serverStatusManager = new ServerStatusManager(serverManager);

const NODE_REGISTRY_FILE_NAME = 'node-registry.v1.json';
const INTERNAL_SERVER_PORT = 29695;
const shutdownTimeoutMs = 8000;

let isAppQuitting = false;
let hasShutdownRun = false;
let shutdownTimer: NodeJS.Timeout | null = null;

const nodeIdByWindowId = new Map<number, string>();
const windowIdByNodeId = new Map<string, number>();
const readyWindowIds = new Set<number>();
const nodeWindowCommandRelay = new NodeWindowCommandRelay();
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

function getRegistryFilePath(): string {
  return path.join(app.getPath('userData'), NODE_REGISTRY_FILE_NAME);
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

function nowIsoString(): string {
  return new Date().toISOString();
}

function getEmbeddedNodeProfile(): NodeProfile {
  const now = nowIsoString();
  return {
    id: EMBEDDED_NODE_ID,
    name: 'Embedded Node',
    baseUrl: `http://localhost:${INTERNAL_SERVER_PORT}`,
    nodeType: 'embedded',
    registrationSource: 'embedded',
    capabilities: {
      terminal: true,
      fileExplorerStreaming: true,
    },
    capabilityProbeState: 'ready',
    isSystem: true,
    createdAt: now,
    updatedAt: now,
  };
}

function ensureEmbeddedNode(snapshot: NodeRegistrySnapshot): NodeRegistrySnapshot {
  const existing = snapshot.nodes.find((node) => node.id === EMBEDDED_NODE_ID);
  if (existing) {
    return snapshot;
  }

  return {
    version: snapshot.version + 1,
    nodes: [getEmbeddedNodeProfile(), ...snapshot.nodes],
  };
}

function loadNodeRegistrySnapshot(): NodeRegistrySnapshot {
  const filePath = getRegistryFilePath();
  if (!fsSync.existsSync(filePath)) {
    return ensureEmbeddedNode({
      version: 0,
      nodes: [],
    });
  }

  try {
    const raw = fsSync.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as NodeRegistrySnapshot;
    if (!Array.isArray(parsed.nodes) || typeof parsed.version !== 'number') {
      logger.warn('Node registry file is invalid; regenerating default registry.');
      return ensureEmbeddedNode({
        version: 0,
        nodes: [],
      });
    }
    return ensureEmbeddedNode(parsed);
  } catch (error) {
    logger.error('Failed to read node registry file:', error);
    return ensureEmbeddedNode({
      version: 0,
      nodes: [],
    });
  }
}

function saveNodeRegistrySnapshot(snapshot: NodeRegistrySnapshot): void {
  try {
    fsSync.writeFileSync(getRegistryFilePath(), JSON.stringify(snapshot, null, 2), 'utf8');
  } catch (error) {
    logger.error('Failed to persist node registry snapshot:', error);
  }
}

function broadcastNodeRegistrySnapshot(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('node-registry-updated', nodeRegistrySnapshot);
  }
}

function getNodeProfileById(nodeId: string): NodeProfile | undefined {
  return nodeRegistrySnapshot.nodes.find((node) => node.id === nodeId);
}

function sanitizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

function getWindowContextByWebContentsId(webContentsId: number): WindowNodeContext {
  const nodeId = nodeIdByWindowId.get(webContentsId) || EMBEDDED_NODE_ID;
  return {
    windowId: webContentsId,
    nodeId,
  };
}

function mapWindowNodeBinding(window: BrowserWindow, nodeId: string): void {
  const webContentsId = window.webContents.id;
  nodeIdByWindowId.set(webContentsId, nodeId);
  windowIdByNodeId.set(nodeId, webContentsId);
  readyWindowIds.delete(webContentsId);
}

function clearWindowNodeBindingByWebContentsId(webContentsId: number): void {
  const nodeId = nodeIdByWindowId.get(webContentsId);
  if (nodeId) {
    windowIdByNodeId.delete(nodeId);
  }
  readyWindowIds.delete(webContentsId);
  nodeIdByWindowId.delete(webContentsId);
}

function focusWindowById(windowId: number): boolean {
  const window = BrowserWindow.fromId(windowId);
  if (!window || window.isDestroyed()) {
    return false;
  }
  if (window.isMinimized()) {
    window.restore();
  }
  window.focus();
  return true;
}

function createNodeBoundWindow(nodeId: string): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: getWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: true,
  });

  const webContentsId = window.webContents.id;
  mapWindowNodeBinding(window, nodeId);

  window.webContents.on('will-navigate', (event) => {
    logger.warn(`Blocked navigation attempt to: ${event.url}`);
    event.preventDefault();
  });

  window.webContents.setWindowOpenHandler(() => {
    logger.warn('Blocked attempt to open a new window.');
    return { action: 'deny' };
  });

  const startURL = getStartUrl();
  logger.info(`Creating node-bound window for nodeId=${nodeId}; url=${startURL}`);
  window.loadURL(startURL).catch((error) => {
    logger.error(`Failed to load URL (${startURL}) for node window ${nodeId}:`, error);
  });

  window.webContents.on('did-finish-load', () => {
    readyWindowIds.add(webContentsId);
    window.webContents.send('server-status', serverStatusManager.getStatus());
    window.webContents.send('node-registry-updated', nodeRegistrySnapshot);
    flushPendingNodeCommands(nodeId, webContentsId);
  });

  window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    readyWindowIds.delete(webContentsId);
    logger.error('Page failed to load:', {
      nodeId,
      errorCode,
      errorDescription,
      validatedURL,
      startURL,
    });
  });

  window.on('closed', () => {
    clearWindowNodeBindingByWebContentsId(webContentsId);
  });

  return window;
}

function openNodeWindow(nodeId: string): { windowId: number; created: boolean } {
  const existingWindowId = windowIdByNodeId.get(nodeId);
  if (typeof existingWindowId === 'number') {
    const focused = focusWindowById(existingWindowId);
    if (focused) {
      return {
        windowId: existingWindowId,
        created: false,
      };
    }
    windowIdByNodeId.delete(nodeId);
  }

  const createdWindow = createNodeBoundWindow(nodeId);
  return {
    windowId: createdWindow.webContents.id,
    created: true,
  };
}

function closeNodeWindowIfOpen(nodeId: string): void {
  const windowId = windowIdByNodeId.get(nodeId);
  if (typeof windowId !== 'number') {
    return;
  }
  const window = BrowserWindow.fromId(windowId);
  if (window && !window.isDestroyed()) {
    window.close();
  }
}

function listNodeWindows(): Array<{ windowId: number; nodeId: string }> {
  return Array.from(nodeIdByWindowId.entries()).map(([windowId, nodeId]) => ({
    windowId,
    nodeId,
  }));
}

function ensureNodeExists(nodeId: string): void {
  if (!getNodeProfileById(nodeId)) {
    throw new Error(`Node does not exist: ${nodeId}`);
  }
}

function isWindowReadyForCommands(windowId: number): boolean {
  return readyWindowIds.has(windowId);
}

function deliverNodeWindowCommand(windowId: number, command: NodeWindowCommand): boolean {
  const target = BrowserWindow.fromId(windowId);
  if (!target || target.isDestroyed()) {
    return false;
  }

  try {
    target.webContents.send('node-window-command', command);
    return true;
  } catch (error) {
    logger.error('Failed to deliver node-window-command', {
      windowId,
      nodeId: nodeIdByWindowId.get(windowId),
      commandId: command.commandId,
      commandType: command.commandType,
      error,
    });
    return false;
  }
}

function flushPendingNodeCommands(nodeId: string, windowId: number): number {
  const pendingCommands = nodeWindowCommandRelay.drain(nodeId);
  if (pendingCommands.length === 0) {
    return 0;
  }

  let deliveredCount = 0;
  for (const command of pendingCommands) {
    if (deliverNodeWindowCommand(windowId, command)) {
      deliveredCount += 1;
      continue;
    }
    nodeWindowCommandRelay.enqueue(nodeId, command);
  }

  logger.info('Flushed pending node-window-command queue', {
    nodeId,
    windowId,
    deliveredCount,
    remaining: nodeWindowCommandRelay.getPendingCount(nodeId),
  });

  return deliveredCount;
}

function dispatchNodeWindowCommand(
  nodeId: string,
  command: NodeWindowCommand,
): DispatchNodeWindowCommandResult {
  ensureNodeExists(nodeId);

  const { windowId } = openNodeWindow(nodeId);
  if (!isWindowReadyForCommands(windowId)) {
    nodeWindowCommandRelay.enqueue(nodeId, command);
    return {
      accepted: true,
      delivered: false,
      queued: true,
      windowId,
      reason: 'destination-window-not-ready',
    };
  }

  if (deliverNodeWindowCommand(windowId, command)) {
    return {
      accepted: true,
      delivered: true,
      queued: false,
      windowId,
    };
  }

  nodeWindowCommandRelay.enqueue(nodeId, command);
  return {
    accepted: true,
    delivered: false,
    queued: true,
    windowId,
    reason: 'delivery-failed-enqueued',
  };
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
      registrationSource: candidate.registrationSource ?? 'manual',
      isSystem: false,
      createdAt: candidate.createdAt || now,
      updatedAt: now,
    });
  } else if (change.type === 'upsert_discovered') {
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
      throw new Error('Only remote nodes can be discovered');
    }

    const normalizedBaseUrl = sanitizeBaseUrl(candidate.baseUrl);
    const existingByIdIndex = existingNodes.findIndex((node) => node.id === candidate.id);
    const conflictingByBaseUrl = existingNodes.find((node) => {
      if (node.id === candidate.id) {
        return false;
      }
      return sanitizeBaseUrl(node.baseUrl).toLowerCase() === normalizedBaseUrl.toLowerCase();
    });

    if (conflictingByBaseUrl) {
      throw new Error(`Node baseUrl already exists: ${candidate.baseUrl}`);
    }

    if (existingByIdIndex >= 0) {
      const existing = existingNodes[existingByIdIndex];
      if (sanitizeBaseUrl(existing.baseUrl).toLowerCase() !== normalizedBaseUrl.toLowerCase()) {
        throw new Error(`Node id already exists with a different baseUrl: ${candidate.id}`);
      }

      const nextRegistrationSource = existing.registrationSource ?? candidate.registrationSource ?? 'discovered';
      const nextName = nextRegistrationSource === 'manual'
        ? existing.name
        : candidate.name.trim();

      existingNodes[existingByIdIndex] = {
        ...existing,
        name: nextName,
        baseUrl: normalizedBaseUrl,
        registrationSource: nextRegistrationSource,
        capabilities: candidate.capabilities ?? existing.capabilities,
        capabilityProbeState: candidate.capabilityProbeState ?? existing.capabilityProbeState,
        updatedAt: now,
      };
    } else {
      existingNodes.push({
        ...candidate,
        baseUrl: normalizedBaseUrl,
        registrationSource: candidate.registrationSource ?? 'discovered',
        isSystem: false,
        createdAt: candidate.createdAt || now,
        updatedAt: now,
      });
    }
  } else if (change.type === 'remove') {
    if (change.nodeId === EMBEDDED_NODE_ID) {
      throw new Error('Embedded node cannot be removed');
    }
    const removeIndex = existingNodes.findIndex((node) => node.id === change.nodeId);
    if (removeIndex === -1) {
      throw new Error(`Node does not exist: ${change.nodeId}`);
    }
    closeNodeWindowIfOpen(change.nodeId);
    nodeWindowCommandRelay.clearNode(change.nodeId);
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
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('server-status', status);
    }
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
    const existingWindowId = windowIdByNodeId.get(nodeId);
    if (typeof existingWindowId !== 'number') {
      return { focused: false, reason: 'not-found' };
    }
    const focused = focusWindowById(existingWindowId);
    return { focused };
  });

  ipcMain.handle('list-node-windows', async () => listNodeWindows());

  ipcMain.handle(
    'dispatch-node-window-command',
    async (
      _event,
      nodeId: string,
      commandCandidate: unknown,
    ): Promise<DispatchNodeWindowCommandResult> => {
      try {
        if (!isNodeWindowCommand(commandCandidate)) {
          return {
            accepted: false,
            delivered: false,
            queued: false,
            reason: 'invalid-command-payload',
          };
        }

        const command = commandCandidate;
        if (command.payload.homeNodeId !== nodeId) {
          return {
            accepted: false,
            delivered: false,
            queued: false,
            reason: 'command-home-node-mismatch',
          };
        }

        return dispatchNodeWindowCommand(nodeId, command);
      } catch (error) {
        return {
          accepted: false,
          delivered: false,
          queued: false,
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  ipcMain.handle('get-window-context', async (event): Promise<WindowNodeContext> => {
    return getWindowContextByWebContentsId(event.sender.id);
  });

  ipcMain.handle('upsert-node-registry', async (_event, change: NodeRegistryChange) => {
    nodeRegistrySnapshot = applyNodeRegistryChange(change);
    saveNodeRegistrySnapshot(nodeRegistrySnapshot);
    broadcastNodeRegistrySnapshot();
    return nodeRegistrySnapshot;
  });

  ipcMain.handle('get-node-registry-snapshot', async () => nodeRegistrySnapshot);

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
}

function installAppLifecycleHandlers(): void {
  app.on('before-quit', () => {
    isAppQuitting = true;
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('app-quitting');
    }
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
  nodeRegistrySnapshot = loadNodeRegistrySnapshot();
  saveNodeRegistrySnapshot(nodeRegistrySnapshot);

  installIpcHandlers();
  installServerStatusFanout();
  installAppLifecycleHandlers();

  await app.whenReady();
  installProtocols();

  openNodeWindow(EMBEDDED_NODE_ID);
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
