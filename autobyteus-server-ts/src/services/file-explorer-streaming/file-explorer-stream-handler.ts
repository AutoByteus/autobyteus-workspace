import { randomUUID } from "node:crypto";
import type { BaseFileExplorer, WatcherLease } from "../../file-explorer/base-file-explorer.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import { FileExplorerSessionManager } from "./file-explorer-session-manager.js";
import {
  ClientMessageType,
  createConnectedMessage,
  createErrorMessage,
  createFileChangeMessage,
  createPongMessage,
} from "./models.js";

export type WebSocketConnection = {
  send: (data: string) => void;
  close: (code?: number) => void;
};

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class FileExplorerStreamHandler {
  private manager: FileExplorerSessionManager;
  private workspaceManager: WorkspaceManager;
  private activeTasks = new Map<string, Promise<void>>();

  constructor(
    sessionManager: FileExplorerSessionManager = new FileExplorerSessionManager(),
    workspaceManagerInstance: WorkspaceManager = getWorkspaceManager(),
  ) {
    this.manager = sessionManager;
    this.workspaceManager = workspaceManagerInstance;
  }

  async connect(connection: WebSocketConnection, workspaceId: string): Promise<string | null> {
    let workspace;
    try {
      workspace = await this.workspaceManager.getOrCreateWorkspace(workspaceId);
    } catch (error) {
      logger.warn(
        `File explorer WebSocket connection rejected: workspace ${workspaceId} not found (${String(error)})`,
      );
      connection.close(4004);
      return null;
    }

    let fileExplorer: BaseFileExplorer;
    try {
      fileExplorer = await workspace.getFileExplorer();
    } catch (error) {
      logger.error(`Failed to resolve file explorer for workspace ${workspaceId}: ${String(error)}`);
      connection.close(1011);
      return null;
    }

    const lease = await this.acquireWatcherLease(fileExplorer, connection);
    if (!lease) {
      return null;
    }

    let sessionId: string | null = null;
    let sessionRegistered = false;
    let pendingLease: WatcherLease | null = lease;
    try {
      const eventStreamFactory = () => fileExplorer.subscribe();
      sessionId = randomUUID();
      await this.manager.createSession(sessionId, workspaceId, eventStreamFactory, pendingLease);
      sessionRegistered = true;
      pendingLease = null;

      const connectedMsg = createConnectedMessage(workspaceId, sessionId);
      connection.send(connectedMsg.toJson());

      const task = this.streamLoop(connection, sessionId);
      this.activeTasks.set(sessionId, task);

      logger.info(`File explorer WebSocket connected: ${sessionId} for workspace ${workspaceId}`);
      return sessionId;
    } catch (error) {
      logger.error(`Failed to set up file explorer session: ${String(error)}`);
      if (sessionId && sessionRegistered) {
        await this.manager.closeSession(sessionId);
      } else {
        await pendingLease?.release();
      }
      const errorMsg = createErrorMessage("SESSION_ERROR", String(error));
      try {
        connection.send(errorMsg.toJson());
      } catch {
        // ignore
      }
      connection.close(1011);
      return null;
    }
  }

  private async acquireWatcherLease(
    fileExplorer: BaseFileExplorer,
    connection: WebSocketConnection,
  ): Promise<WatcherLease | null> {
    try {
      return await fileExplorer.acquireWatcherLease("file-explorer-websocket");
    } catch (error) {
      logger.error(`Failed to start file watcher: ${String(error)}`);
      const errorMsg = createErrorMessage(
        "WATCHER_UNAVAILABLE",
        "File watcher is not available for this workspace",
      );
      try {
        connection.send(errorMsg.toJson());
      } catch {
        // ignore
      }
      connection.close(4005);
      return null;
    }
  }

  private async streamLoop(connection: WebSocketConnection, sessionId: string): Promise<void> {
    const session = this.manager.getSession(sessionId);
    if (!session) {
      return;
    }

    let shouldCloseConnection = false;
    try {
      for await (const eventJson of session.events()) {
        try {
          const changeEvent = JSON.parse(eventJson) as { changes?: unknown };
          const changes = Array.isArray(changeEvent.changes) ? changeEvent.changes : [];
          const msg = createFileChangeMessage(changes as Record<string, unknown>[]);
          connection.send(msg.toJson());
        } catch (error) {
          logger.error(`Error sending file change event: ${String(error)}`);
          shouldCloseConnection = true;
          break;
        }
      }
    } catch (error) {
      logger.error(`Stream error for session ${sessionId}: ${String(error)}`);
      shouldCloseConnection = true;
    } finally {
      if (!this.activeTasks.has(sessionId)) {
        return;
      }
      this.activeTasks.delete(sessionId);
      await this.manager.closeSession(sessionId);
      if (shouldCloseConnection) {
        try {
          connection.close(1011);
        } catch {
          // ignore
        }
      }
      logger.info(`File explorer WebSocket stream ended: ${sessionId}`);
    }
  }

  async handleMessage(sessionId: string, message: string): Promise<string | null> {
    try {
      const data = JSON.parse(message) as { type?: string };
      if (data.type === ClientMessageType.PING) {
        return createPongMessage().toJson();
      }

      logger.warn(`Unknown message type from client: ${String(data.type)}`);
      return null;
    } catch (error) {
      logger.error(`Invalid JSON from client: ${message.slice(0, 100)} (${String(error)})`);
      return null;
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    const task = this.activeTasks.get(sessionId);
    this.activeTasks.delete(sessionId);

    await this.manager.closeSession(sessionId);

    if (task) {
      try {
        await task;
      } catch {
        // ignore
      }
    }

    logger.info(`File explorer WebSocket disconnected: ${sessionId}`);
  }
}

let cachedFileExplorerStreamHandler: FileExplorerStreamHandler | null = null;

export const getFileExplorerStreamHandler = (): FileExplorerStreamHandler => {
  if (!cachedFileExplorerStreamHandler) {
    cachedFileExplorerStreamHandler = new FileExplorerStreamHandler();
  }
  return cachedFileExplorerStreamHandler;
};
