import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { registerTerminalWebsocket } from "../../../src/api/websocket/terminal.js";
import {
  PtySessionManager,
  TerminalHandler,
} from "../../../src/services/terminal-streaming/index.js";
import { canonicalizeWorkspaceRootPath } from "../../../src/workspaces/workspace-path-utils.js";

type CloseEvent = {
  code: number;
  reason: Buffer;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const waitForOpen = (socket: WebSocket, timeoutMs = 5_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for terminal websocket open")),
      timeoutMs,
    );
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

const waitForClose = (
  socket: WebSocket,
  timeoutMs = 5_000,
): Promise<CloseEvent> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for terminal websocket close")),
      timeoutMs,
    );
    socket.once("close", (code, reason) => {
      clearTimeout(timer);
      resolve({ code, reason });
    });
  });

const waitForSessionCount = async (
  manager: PtySessionManager,
  expected: number,
  timeoutMs = 6_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (manager.sessionCount === expected) {
      return;
    }
    await sleep(25);
  }
  throw new Error(
    `Expected ${expected} terminal sessions, found ${manager.sessionCount}: ${JSON.stringify(manager.listSessions())}`,
  );
};

const waitForSession = async (
  manager: PtySessionManager,
  sessionId: string,
  timeoutMs = 6_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (manager.getSession(sessionId)) {
      return;
    }
    await sleep(25);
  }
  throw new Error(`Terminal session ${sessionId} was not created in time.`);
};

const sendTerminalInput = (socket: WebSocket, input: string): void => {
  socket.send(
    JSON.stringify({
      type: "input",
      data: Buffer.from(input, "utf8").toString("base64"),
    }),
  );
};

const waitForDecodedOutput = (
  socket: WebSocket,
  predicate: (combinedOutput: string) => boolean,
  timeoutMs = 8_000,
): Promise<string> =>
  new Promise((resolve, reject) => {
    let combinedOutput = "";
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(
        new Error(
          `Timed out waiting for terminal output. Last output: ${JSON.stringify(combinedOutput.slice(-500))}`,
        ),
      );
    }, timeoutMs);

    const onMessage = (raw: WebSocket.RawData) => {
      let parsed: { type?: string; data?: string };
      try {
        parsed = JSON.parse(raw.toString()) as { type?: string; data?: string };
      } catch {
        return;
      }
      if (parsed.type !== "output" || typeof parsed.data !== "string") {
        return;
      }
      combinedOutput += Buffer.from(parsed.data, "base64").toString("utf8");
      if (predicate(combinedOutput)) {
        clearTimeout(timer);
        socket.off("message", onMessage);
        resolve(combinedOutput);
      }
    };

    socket.on("message", onMessage);
  });

describe("Terminal websocket lifecycle e2e", () => {
  let app: FastifyInstance;
  let baseUrl: string;
  let workspaceRoot: string;
  let workspaceRootWithSpaces: string;
  let manager: PtySessionManager;

  const terminalUrl = (sessionId: string, cwd: string): string => {
    const url = new URL(
      `${baseUrl}/ws/terminal/${encodeURIComponent(sessionId)}`,
    );
    url.searchParams.set("cwd", cwd);
    return url.toString();
  };

  const terminalUrlWithoutCwd = (sessionId: string): string => {
    const url = new URL(
      `${baseUrl}/ws/terminal/${encodeURIComponent(sessionId)}`,
    );
    return url.toString();
  };

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "autobyteus-terminal-e2e-"),
    );
    workspaceRootWithSpaces = path.join(workspaceRoot, "workspace with spaces");
    await fs.mkdir(workspaceRootWithSpaces, { recursive: true });
    await fs.writeFile(
      path.join(workspaceRootWithSpaces, ".terminal-e2e-marker"),
      "terminal cwd marker\n",
      "utf8",
    );

    manager = new PtySessionManager();
    app = fastify();
    await app.register(websocket);
    await registerTerminalWebsocket(app, new TerminalHandler(manager));
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    baseUrl = `ws://${url.hostname}:${url.port}`;
  });

  afterEach(async () => {
    await manager.closeAll().catch(() => undefined);
    await app.close();
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  it("opens a real PTY in the requested cwd and releases it on websocket close", async () => {
    const sessionId = "real-pty-cwd";
    const expectedCwd = canonicalizeWorkspaceRootPath(workspaceRootWithSpaces);
    const socket = new WebSocket(
      terminalUrl(sessionId, `${workspaceRootWithSpaces}${path.sep}`),
    );

    await waitForOpen(socket);
    await waitForSession(manager, sessionId);
    expect(manager.listSessions()[sessionId]).toBe(expectedCwd);

    const outputPromise = waitForDecodedOutput(
      socket,
      (output) =>
        output.includes("__AB_TERMINAL_CWD_OK__") &&
        output.includes("workspace with spaces"),
    );
    sendTerminalInput(
      socket,
      'if [ -f .terminal-e2e-marker ]; then printf "__AB_TERMINAL_CWD_OK__:%s\\n" "$PWD"; else printf "__AB_TERMINAL_CWD_MISSING__\\n"; fi\n',
    );
    const output = await outputPromise;

    expect(output).toContain("__AB_TERMINAL_CWD_OK__");
    expect(output).toContain("workspace with spaces");

    socket.close();
    await waitForClose(socket);
    await waitForSessionCount(manager, 0);
  }, 20_000);

  it("opens a real PTY in server home when cwd and rootPath are omitted", async () => {
    const sessionId = "real-pty-server-home-default";
    const expectedCwd = canonicalizeWorkspaceRootPath(os.homedir());
    const socket = new WebSocket(terminalUrlWithoutCwd(sessionId));

    await waitForOpen(socket);
    await waitForSession(manager, sessionId);
    expect(manager.listSessions()[sessionId]).toBe(expectedCwd);

    const outputPromise = waitForDecodedOutput(
      socket,
      (output) =>
        output.includes("__AB_TERMINAL_HOME_OK__") &&
        output.includes(expectedCwd),
    );
    sendTerminalInput(
      socket,
      'printf "__AB_TERMINAL_HOME_OK__:%s\\n" "$PWD"\n',
    );
    const output = await outputPromise;

    expect(output).toContain(`__AB_TERMINAL_HOME_OK__:${expectedCwd}`);

    socket.close();
    await waitForClose(socket);
    await waitForSessionCount(manager, 0);
  }, 20_000);

  it("rejects unavailable cwd before creating a PTY session", async () => {
    const socket = new WebSocket(
      terminalUrl("invalid-cwd", path.join(workspaceRoot, "missing")),
    );

    const closeEvent = await waitForClose(socket);

    expect(closeEvent.code).toBe(4004);
    expect(closeEvent.reason.toString()).toBe("Terminal cwd unavailable");
    expect(manager.sessionCount).toBe(0);
  }, 10_000);

  it("does not retain PTYs across close-before-connect and repeated open/close churn", async () => {
    for (let index = 0; index < 5; index += 1) {
      const socket = new WebSocket(
        terminalUrl(`early-close-${index}`, workspaceRootWithSpaces),
      );
      await waitForOpen(socket);
      socket.close();
      await waitForClose(socket);
      await waitForSessionCount(manager, 0);
    }

    for (let index = 0; index < 8; index += 1) {
      const sessionId = `churn-${index}`;
      const socket = new WebSocket(
        terminalUrl(sessionId, workspaceRootWithSpaces),
      );
      await waitForOpen(socket);
      await waitForSession(manager, sessionId);
      socket.close();
      await waitForClose(socket);
      await waitForSessionCount(manager, 0);
    }
  }, 30_000);
});
