import { PtySessionManager, type TerminalSession } from "./pty-session-manager.js";

export type WebSocketConnection = {
  send: (data: string) => void;
  close: (code?: number) => void;
};

type ClientMessage =
  | { type: "input"; data: string }
  | { type: "resize"; rows?: number; cols?: number };

type PendingReadLoop = {
  session: TerminalSession;
  promise: Promise<void>;
};

const READ_TIMEOUT_SECONDS = 0.05;
const LOOP_SLEEP_MS = 10;

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TerminalHandler {
  private manager: PtySessionManager;
  private activeTasks: Map<string, PendingReadLoop> = new Map();

  constructor(sessionManager: PtySessionManager = new PtySessionManager()) {
    this.manager = sessionManager;
  }

  async connect(
    connection: WebSocketConnection,
    workspaceId: string,
    sessionId: string,
    cwd: string,
  ): Promise<string> {
    try {
      await this.manager.createSession(sessionId, workspaceId, cwd);
      const session = this.manager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session '${sessionId}' was not created`);
      }

      const promise = this.readLoop(connection, sessionId, session);
      this.activeTasks.set(sessionId, { session, promise });

      logger.info(`Terminal WebSocket connected: ${sessionId}`);
      return sessionId;
    } catch (error) {
      logger.error(`Failed to create terminal session: ${String(error)}`);
      connection.close(1011);
      throw error;
    }
  }

  async handleMessage(sessionId: string, message: string): Promise<void> {
    const session = this.manager.getSession(sessionId);
    if (!session) {
      logger.warn(`Message for unknown session: ${sessionId}`);
      return;
    }

    try {
      const data = TerminalHandler.parseMessage(message);

      if (data.type === "input") {
        const input = Buffer.from(data.data, "base64");
        await session.write(input);
      } else if (data.type === "resize") {
        const rows = data.rows ?? 24;
        const cols = data.cols ?? 80;
        session.resize(rows, cols);
      }
    } catch (error) {
      logger.error(`Error handling message for ${sessionId}: ${String(error)}`);
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    const task = this.activeTasks.get(sessionId);
    this.activeTasks.delete(sessionId);

    await this.manager.closeSession(sessionId);

    if (task) {
      try {
        await task.promise;
      } catch {
        // ignore
      }
    }

    logger.info(`Terminal WebSocket disconnected: ${sessionId}`);
  }

  private async readLoop(
    connection: WebSocketConnection,
    sessionId: string,
    session: TerminalSession,
  ): Promise<void> {
    try {
      while (this.manager.getSession(sessionId) === session) {
        const output = await session.read(READ_TIMEOUT_SECONDS);
        if (output && output.length > 0) {
          const message = TerminalHandler.encodeOutput(output);
          connection.send(message);
        }
        await sleep(LOOP_SLEEP_MS);
      }
    } catch (error) {
      logger.error(`Error in terminal read loop for ${sessionId}: ${String(error)}`);
    }
  }

  static parseMessage(raw: string): ClientMessage {
    let data: unknown;

    try {
      data = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Invalid JSON: ${String(error)}`);
    }

    if (!data || typeof data !== "object" || !("type" in data)) {
      throw new Error("Message missing 'type' field");
    }

    return data as ClientMessage;
  }

  static encodeOutput(data: Buffer): string {
    return JSON.stringify({
      type: "output",
      data: data.toString("base64"),
    });
  }
}

let cachedTerminalHandler: TerminalHandler | null = null;

export const getTerminalHandler = (): TerminalHandler => {
  if (!cachedTerminalHandler) {
    cachedTerminalHandler = new TerminalHandler();
  }
  return cachedTerminalHandler;
};
