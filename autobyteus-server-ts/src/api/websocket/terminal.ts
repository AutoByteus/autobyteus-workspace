import fs from "node:fs/promises";
import os from "node:os";
import type { FastifyInstance } from "fastify";
import {
  TerminalHandler,
  TerminalSessionStartupAbortedError,
  getTerminalHandler,
  type WebSocketConnection,
} from "../../services/terminal-streaming/index.js";
import { canonicalizeWorkspaceRootPath } from "../../workspaces/workspace-path-utils.js";
import {
  authorizeRemoteAccessWebSocket,
  closeSocketForRemoteAccessRejection,
} from "./remote-access-websocket-auth.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type TerminalParams = {
  sessionId: string;
};

type TerminalQuery = {
  cwd?: string;
  rootPath?: string;
};

type SocketLike = {
  on: (event: string, cb: (...args: any[]) => void) => void;
  send: (payload: string) => void;
  close: (code?: number, reason?: string) => void;
};

const isRemoteAccessWebSocketRejection = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; reason?: unknown };
  return (
    typeof candidate.code === "number" && typeof candidate.reason === "string"
  );
};

const resolveTerminalCwd = async (query: TerminalQuery): Promise<string> => {
  const hasExplicitCwd =
    query.cwd !== undefined || query.rootPath !== undefined;
  const rawCwd = hasExplicitCwd
    ? (query.cwd ?? query.rootPath ?? "")
    : os.homedir();
  const cwd = canonicalizeWorkspaceRootPath(rawCwd);
  const stats = await fs.stat(cwd);
  if (!stats.isDirectory()) {
    throw new Error(`Terminal cwd is not a directory: ${cwd}`);
  }
  return cwd;
};

export async function registerTerminalWebsocket(
  app: FastifyInstance,
  handler: TerminalHandler = getTerminalHandler(),
): Promise<void> {
  app.get(
    "/ws/terminal/:sessionId",
    { websocket: true },
    (connection: unknown, req) => {
      const rawSocket =
        (connection as { socket?: unknown }).socket ?? connection;
      if (
        !rawSocket ||
        typeof (rawSocket as { on?: unknown }).on !== "function"
      ) {
        logger.error(
          "Terminal websocket missing underlying socket; check fastify websocket plugin setup.",
        );
        return;
      }

      const socket = rawSocket as SocketLike;
      let closed = false;
      let cleanupStarted = false;
      let connectedSessionId: string | null = null;
      let pendingSessionId: string | null = null;
      let connectPromise: Promise<string> | null = null;
      const abortController = new AbortController();
      const pendingMessages: string[] = [];

      const cleanup = async (): Promise<void> => {
        if (cleanupStarted) return;
        cleanupStarted = true;
        closed = true;
        abortController.abort();
        pendingMessages.length = 0;

        const attachedSessionId = connectedSessionId;
        const startupSessionId = pendingSessionId;
        connectedSessionId = null;
        pendingSessionId = null;
        if (attachedSessionId) {
          await handler.disconnect(attachedSessionId).catch((error) => {
            logger.error(
              `Error disconnecting terminal session ${attachedSessionId}: ${String(error)}`,
            );
          });
        }
        if (startupSessionId && startupSessionId !== attachedSessionId) {
          await handler.disconnect(startupSessionId).catch((error) => {
            logger.error(
              `Error disconnecting startup terminal session ${startupSessionId}: ${String(error)}`,
            );
          });
        }

        if (connectPromise) {
          const lateSessionId = await connectPromise.catch((error) => {
            if (!(error instanceof TerminalSessionStartupAbortedError)) {
              logger.error(
                `Terminal connect promise failed during cleanup: ${String(error)}`,
              );
            }
            return null;
          });
          if (lateSessionId && lateSessionId !== attachedSessionId) {
            await handler.disconnect(lateSessionId).catch((error) => {
              logger.error(
                `Error disconnecting late terminal session ${lateSessionId}: ${String(error)}`,
              );
            });
          }
        }
      };

      socket.on("message", (data: Buffer) => {
        if (closed) return;
        const message = data.toString();
        if (!connectedSessionId) {
          pendingMessages.push(message);
          return;
        }
        void handler.handleMessage(connectedSessionId, message);
      });

      socket.on("close", () => {
        void cleanup();
      });

      socket.on("error", (error: unknown) => {
        logger.error(`Terminal websocket error: ${String(error)}`);
        void cleanup();
      });

      void (async () => {
        try {
          await authorizeRemoteAccessWebSocket(req);
          if (closed) return;

          const { sessionId } = req.params as TerminalParams;
          pendingSessionId = sessionId;
          const query = (req.query ?? {}) as TerminalQuery;
          const cwd = await resolveTerminalCwd(query);
          if (closed) return;

          const connectionAdapter: WebSocketConnection = {
            send: (data) => socket.send(data),
            close: (code, reason) => socket.close(code, reason),
          };
          connectPromise = handler.connect(
            connectionAdapter,
            cwd,
            sessionId,
            cwd,
            { signal: abortController.signal },
          );
          const newSessionId = await connectPromise;
          if (closed) {
            await handler.disconnect(newSessionId);
            return;
          }

          connectedSessionId = newSessionId;
          pendingSessionId = null;
          if (pendingMessages.length > 0) {
            for (const message of pendingMessages.splice(0)) {
              void handler.handleMessage(connectedSessionId, message);
            }
          }
          logger.info(`Terminal websocket attached for cwd ${cwd}`);
        } catch (error) {
          if (closed) return;
          if (isRemoteAccessWebSocketRejection(error)) {
            closeSocketForRemoteAccessRejection(socket, error, req);
          } else if (connectPromise) {
            logger.warn(`Terminal connection failed during startup: ${String(error)}`);
          } else {
            logger.warn(`Terminal connection rejected: ${String(error)}`);
            socket.close(4004, "Terminal cwd unavailable");
          }
          void cleanup();
        }
      })();
    },
  );
}
