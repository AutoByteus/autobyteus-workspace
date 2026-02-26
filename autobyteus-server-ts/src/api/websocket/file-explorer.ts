import type { FastifyInstance } from "fastify";
import {
  getFileExplorerStreamHandler,
  type WebSocketConnection,
} from "../../services/file-explorer-streaming/index.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type FileExplorerParams = {
  workspaceId: string;
};

export async function registerFileExplorerWebsocket(app: FastifyInstance): Promise<void> {
  app.get(
    "/ws/file-explorer/:workspaceId",
    { websocket: true },
    (connection: unknown, req) => {
      const fileExplorerStreamHandler = getFileExplorerStreamHandler();
      let sessionId: string | null = null;
      const { workspaceId } = req.params as FileExplorerParams;
      const socket = (connection as { socket?: unknown }).socket ?? connection;
      if (!socket || typeof (socket as { on?: unknown }).on !== "function") {
        logger.error("File explorer websocket missing underlying socket; check fastify websocket plugin setup.");
        return;
      }

      const connectionAdapter: WebSocketConnection = {
        send: (data) => (socket as { send: (payload: string) => void }).send(data),
        close: (code) => (socket as { close: (code?: number) => void }).close(code),
      };

      void fileExplorerStreamHandler
        .connect(connectionAdapter, workspaceId)
        .then((id) => {
          sessionId = id;
        })
        .catch((error) => {
          logger.error(`Error connecting file explorer websocket: ${String(error)}`);
          (socket as { close: (code?: number) => void }).close(1011);
        });

      (socket as { on: (event: string, cb: (data: Buffer) => void) => void }).on("message", (data: Buffer) => {
        if (!sessionId) {
          return;
        }

        const message = data.toString();
        void fileExplorerStreamHandler.handleMessage(sessionId, message).then((response) => {
          if (response) {
            (socket as { send: (payload: string) => void }).send(response);
          }
        });
      });

      (socket as { on: (event: string, cb: () => void) => void }).on("close", () => {
        if (!sessionId) {
          return;
        }
        void fileExplorerStreamHandler.disconnect(sessionId);
      });

      (socket as { on: (event: string, cb: (error: unknown) => void) => void }).on("error", (error) => {
        logger.error(`File explorer websocket error: ${String(error)}`);
      });

      logger.info(`File explorer websocket attached for workspace ${workspaceId}`);
    },
  );
}
