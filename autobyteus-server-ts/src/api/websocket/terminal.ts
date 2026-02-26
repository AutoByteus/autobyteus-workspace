import type { FastifyInstance } from "fastify";
import {
  TerminalHandler,
  getTerminalHandler,
  type WebSocketConnection,
} from "../../services/terminal-streaming/index.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type TerminalParams = {
  workspaceId: string;
  sessionId: string;
};

export async function registerTerminalWebsocket(
  app: FastifyInstance,
  handler: TerminalHandler = getTerminalHandler(),
  workspaceManagerInstance = getWorkspaceManager(),
): Promise<void> {
  app.get(
    "/ws/terminal/:workspaceId/:sessionId",
    { websocket: true },
    (connection: unknown, req) => {
      try {
        const { workspaceId, sessionId } = req.params as TerminalParams;
        const socket = (connection as { socket?: unknown }).socket ?? connection;
        if (!socket || typeof (socket as { on?: unknown }).on !== "function") {
          logger.error("Terminal websocket missing underlying socket; check fastify websocket plugin setup.");
          return;
        }

        const workspace = workspaceManagerInstance.getWorkspaceById(workspaceId);
        if (!workspace) {
          logger.warn(`Terminal connection rejected: workspace ${workspaceId} not found`);
          try {
            (socket as { close: (code?: number, reason?: string) => void }).close(4004, "Workspace not found");
          } catch {
            // ignore close failures
          }
          return;
        }

        const connectionAdapter: WebSocketConnection = {
          send: (data) => (socket as { send: (payload: string) => void }).send(data),
          close: (code) => (socket as { close: (code?: number) => void }).close(code),
        };

        let connectedSessionId: string | null = null;
        const pendingMessages: string[] = [];

        (socket as { on: (event: string, cb: (data: Buffer) => void) => void }).on("message", (data: Buffer) => {
          const message = data.toString();
          if (!connectedSessionId) {
            pendingMessages.push(message);
            return;
          }
          void handler.handleMessage(connectedSessionId, message);
        });

        (socket as { on: (event: string, cb: () => void) => void }).on("close", () => {
          if (!connectedSessionId) {
            return;
          }
          void handler.disconnect(connectedSessionId);
        });

        (socket as { on: (event: string, cb: (error: unknown) => void) => void }).on("error", (error) => {
          logger.error(`Terminal websocket error: ${String(error)}`);
        });

        void handler
          .connect(connectionAdapter, workspaceId, sessionId, workspace.getBasePath())
          .then((id) => {
            connectedSessionId = id;
            if (pendingMessages.length > 0) {
              for (const message of pendingMessages) {
                void handler.handleMessage(connectedSessionId, message);
              }
              pendingMessages.length = 0;
            }
          })
        .catch((error) => {
          logger.error(`Error connecting terminal websocket: ${String(error)}`);
          (socket as { close: (code?: number) => void }).close(1011);
        });

        logger.info(`Terminal websocket attached for workspace ${workspaceId}`);
      } catch (error) {
        logger.error(`Terminal websocket setup failed: ${String(error)}`);
        try {
          (connection as { socket?: { close?: (code?: number) => void } }).socket?.close?.(1011);
        } catch {
          // ignore
        }
      }
    },
  );
}
