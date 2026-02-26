import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { WorkspaceConfig } from "autobyteus-ts";
import {
  PtySessionManager,
  TerminalHandler,
  type TerminalSession,
} from "../../../src/services/terminal-streaming/index.js";
import { registerTerminalWebsocket } from "../../../src/api/websocket/terminal.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
const workspaceManager = getWorkspaceManager();

class FakePtySession implements TerminalSession {
  sessionId: string;
  cwd: string | null = null;
  writtenData: Buffer[] = [];
  resizeCalls: Array<[number, number]> = [];
  private dataQueue: Buffer[] = [];
  private pendingReads: Array<{ resolve: (value: Buffer | null) => void; timer?: NodeJS.Timeout }> = [];
  private closed = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async start(cwd: string): Promise<void> {
    this.cwd = cwd;
  }

  async write(data: Buffer | string): Promise<void> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
    this.writtenData.push(buffer);
    const pending = this.pendingReads.shift();
    if (pending) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      pending.resolve(buffer);
    } else {
      this.dataQueue.push(buffer);
    }
  }

  async read(timeout: number = 0.1): Promise<Buffer | null> {
    if (this.closed) {
      return null;
    }
    if (this.dataQueue.length > 0) {
      return this.dataQueue.shift() ?? null;
    }
    if (timeout <= 0) {
      return null;
    }

    return new Promise((resolve) => {
      const pending = { resolve } as { resolve: (value: Buffer | null) => void; timer?: NodeJS.Timeout };
      pending.timer = setTimeout(() => {
        this.pendingReads = this.pendingReads.filter((item) => item !== pending);
        resolve(null);
      }, timeout * 1000);
      this.pendingReads.push(pending);
    });
  }

  resize(rows: number, cols: number): void {
    this.resizeCalls.push([rows, cols]);
  }

  async close(): Promise<void> {
    this.closed = true;
    while (this.pendingReads.length > 0) {
      const pending = this.pendingReads.shift();
      if (!pending) {
        continue;
      }
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      pending.resolve(null);
    }
  }
}

const createTempWorkspace = async (): Promise<string> => {
  return fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-terminal-"));
};

const waitForMessage = (socket: WebSocket, timeoutMs: number = 2000): Promise<string> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timed out waiting for websocket message"));
    }, timeoutMs);

    socket.once("message", (data) => {
      clearTimeout(timer);
      resolve(data.toString());
    });
  });

const waitForSession = async (manager: PtySessionManager, sessionId: string, timeoutMs = 2000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const session = manager.getSession(sessionId);
    if (session) {
      return session;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Terminal session ${sessionId} was not created in time.`);
};

const waitForSessionClose = async (manager: PtySessionManager, sessionId: string, timeoutMs = 2000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const session = manager.getSession(sessionId);
    if (!session) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Terminal session ${sessionId} did not close in time.`);
};

describe("Terminal websocket integration", () => {
  let app: FastifyInstance;
  let baseUrl: string;
  let workspaceRoot: string;
  let workspaceId: string;
  let manager: PtySessionManager;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
    const workspace = await workspaceManager.createWorkspace(
      new WorkspaceConfig({ rootPath: workspaceRoot }),
    );
    workspaceId = workspace.workspaceId;

    manager = new PtySessionManager(FakePtySession);
    const handler = new TerminalHandler(manager);

    app = fastify();
    await app.register(websocket);
    await registerTerminalWebsocket(app, handler, workspaceManager);
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    baseUrl = `ws://${url.hostname}:${url.port}`;

  });

  afterEach(async () => {
    await app.close();
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  it("round-trips input/output and resize", async () => {
    const sessionId = "session-1";
    const socket = new WebSocket(`${baseUrl}/ws/terminal/${workspaceId}/${sessionId}`);

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), 2000);
      socket.once("open", () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      socket.once("unexpected-response", (_req, res) => {
        clearTimeout(timer);
        reject(new Error(`Unexpected response: ${res.statusCode}`));
      });
    });

    await waitForSession(manager, sessionId);

    const payload = Buffer.from("pwd", "utf8").toString("base64");
    const responsePromise = waitForMessage(socket);
    socket.send(JSON.stringify({ type: "input", data: payload }));
    const response = await responsePromise;
    const parsed = JSON.parse(response) as { type: string; data: string };

    expect(parsed.type).toBe("output");
    expect(Buffer.from(parsed.data, "base64").toString("utf8")).toBe("pwd");

    socket.send(JSON.stringify({ type: "resize", rows: 40, cols: 120 }));

    const session = (await waitForSession(manager, sessionId)) as FakePtySession;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(session.resizeCalls).toEqual([[40, 120]]);
    expect(session.cwd).toBe(workspaceRoot);

    socket.close();
    await waitForSessionClose(manager, sessionId);
  });

  it("rejects missing workspace", async () => {
    const socket = new WebSocket(`${baseUrl}/ws/terminal/missing/s1`);

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(socket.readyState).not.toBe(WebSocket.OPEN);
    if (socket.readyState === WebSocket.OPEN) {
      socket.terminate();
    }
  });
});
