import type { FastifyInstance } from "fastify";
import {
  getFileExplorerStreamHandler,
  type WebSocketConnection,
} from "../../services/file-explorer-streaming/index.js";
import {
  authorizeRemoteAccessWebSocket,
  closeSocketForRemoteAccessRejection,
} from "./remote-access-websocket-auth.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type FileExplorerParams = {
  workspaceId: string;
};

type FileExplorerSocket = {
  on(event: "message", cb: (data: Buffer) => void): void;
  on(event: "close", cb: () => void): void;
  on(event: "error", cb: (error: unknown) => void): void;
  send(payload: string): void;
  close(code?: number, reason?: string): void;
};

export async function registerFileExplorerWebsocket(app: FastifyInstance): Promise<void> {
  app.get(
    "/ws/file-explorer/:workspaceId",
    { websocket: true },
    (connection: unknown, req) => {
      const socket = (connection as { socket?: unknown }).socket ?? connection;
      if (!socket || typeof (socket as { on?: unknown }).on !== "function") {
        logger.error("File explorer websocket missing underlying socket; check fastify websocket plugin setup.");
        return;
      }

      const wsSocket = socket as FileExplorerSocket;
      const fileExplorerStreamHandler = getFileExplorerStreamHandler();
      const { workspaceId } = req.params as FileExplorerParams;
      let closed = false;
      let cleanupStarted = false;
      let sessionId: string | null = null;
      let connectPromise: Promise<string | null> | null = null;

      const disconnectLateSession = (id: string): void => {
        void fileExplorerStreamHandler.disconnect(id).catch((error) => {
          logger.error(`Failed to disconnect file explorer session ${id}: ${String(error)}`);
        });
      };

      const cleanup = (): void => {
        closed = true;
        if (cleanupStarted) {
          return;
        }
        cleanupStarted = true;

        if (sessionId) {
          const id = sessionId;
          sessionId = null;
          disconnectLateSession(id);
          return;
        }

        if (connectPromise) {
          void connectPromise
            .then((lateSessionId) => {
              if (lateSessionId) {
                disconnectLateSession(lateSessionId);
              }
            })
            .catch(() => undefined);
        }
      };

      wsSocket.on("close", cleanup);
      wsSocket.on("error", (error) => {
        logger.error(`File explorer websocket error: ${String(error)}`);
        cleanup();
      });
      wsSocket.on("message", (data: Buffer) => {
        if (!sessionId || closed) {
          return;
        }

        const activeSessionId = sessionId;
        const message = data.toString();
        void fileExplorerStreamHandler.handleMessage(activeSessionId, message).then((response) => {
          if (response && !closed) {
            wsSocket.send(response);
          }
        });
      });

      void (async () => {
        try {
          try {
            await authorizeRemoteAccessWebSocket(req);
          } catch (error) {
            if (!closed) {
              closeSocketForRemoteAccessRejection(wsSocket, error, req);
            }
            return;
          }

          if (closed) {
            return;
          }

          const connectionAdapter: WebSocketConnection = {
            send: (data) => wsSocket.send(data),
            close: (code) => wsSocket.close(code),
          };

          connectPromise = fileExplorerStreamHandler.connect(connectionAdapter, workspaceId);
          const id = await connectPromise;
          connectPromise = null;

          if (closed) {
            return;
          }

          sessionId = id;
          if (!id) {
            wsSocket.close(1011);
          }

          logger.info(`File explorer websocket attached for workspace ${workspaceId}`);
        } catch (error) {
          logger.error(`Error connecting file explorer websocket: ${String(error)}`);
          if (!closed) {
            wsSocket.close(1011);
          }
        }
      })();
    },
  );
}
