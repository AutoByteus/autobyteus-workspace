import "reflect-metadata";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerFileExplorerWebsocket } from "../../../src/api/websocket/file-explorer.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";

type WsMessage = {
  type?: string;
  payload?: Record<string, unknown>;
};

const workspaceManager = getWorkspaceManager();

const waitForOpen = (socket: WebSocket, timeoutMs = 5_000): Promise<void> =>
  new Promise((resolve, reject) => {
    if (socket.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

const waitForClose = (socket: WebSocket, timeoutMs = 5_000): Promise<void> =>
  new Promise((resolve, reject) => {
    if (socket.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }

    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket close")), timeoutMs);
    socket.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

const waitForMessage = (
  socket: WebSocket,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 8_000,
): Promise<WsMessage> =>
  new Promise((resolve, reject) => {
    const seen: string[] = [];
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error(`Timed out waiting for ${label}. Seen: ${seen.slice(-5).join(" | ")}`));
    }, timeoutMs);

    const onMessage = (raw: WebSocket.RawData) => {
      const text = raw.toString();
      seen.push(text);
      let parsed: WsMessage;
      try {
        parsed = JSON.parse(text) as WsMessage;
      } catch {
        return;
      }

      if (predicate(parsed)) {
        clearTimeout(timer);
        socket.off("message", onMessage);
        resolve(parsed);
      }
    };

    socket.on("message", onMessage);
  });

const waitForCondition = async (
  predicate: () => boolean | Promise<boolean>,
  label: string,
  timeoutMs = 5_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const closeSocket = async (socket: WebSocket | null): Promise<void> => {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    return;
  }
  socket.close();
  await waitForClose(socket).catch(() => {
    socket.terminate();
  });
};

const closeWorkspaceWithTimeout = async (workspace: { close: () => Promise<void> }): Promise<void> => {
  await Promise.race([
    workspace.close(),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
};

const getWorkspaceFileExplorerState = async (workspaceId: string) => {
  const workspace = workspaceManager.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new Error(`Workspace not found in test: ${workspaceId}`);
  }
  const fileExplorer = (workspace as unknown as {
    fileExplorer?: { fileWatcher?: unknown; watcherLeaseCount?: number } | null;
  }).fileExplorer ?? null;
  return {
    fileExplorer,
    hasFileExplorer: workspace.hasFileExplorerForDiagnostics(),
    watcher: fileExplorer?.fileWatcher ?? null,
    leaseCount: fileExplorer?.watcherLeaseCount ?? 0,
  };
};

const countOpenFds = (): number | null => {
  try {
    return fs.readdirSync("/dev/fd").length;
  } catch {
    return null;
  }
};

const assertChildProcessSpawnWorks = async (): Promise<void> => {
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn("/bin/echo", ["codex-spawn-probe-ok"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`spawn probe exited ${String(code)}: ${stderr}`));
      }
    });
  });

  expect(output).toBe("codex-spawn-probe-ok");
};

describe("File explorer websocket lifecycle e2e", () => {
  let app: FastifyInstance;
  let wsBaseUrl: string;
  let tempRoot: string;
  let initialIds: Set<string>;

  beforeAll(async () => {
    app = fastify();
    await app.register(websocket);
    await registerFileExplorerWebsocket(app);
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    wsBaseUrl = `ws://${url.hostname}:${url.port}`;
  });

  beforeEach(() => {
    initialIds = new Set(workspaceManager.getAllWorkspaces().map((ws) => ws.workspaceId));
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-file-explorer-ws-e2e-"));
  });

  afterEach(async () => {
    const workspaces = workspaceManager.getAllWorkspaces();
    for (const workspace of workspaces) {
      if (!initialIds.has(workspace.workspaceId)) {
        await closeWorkspaceWithTimeout(workspace);
        (workspaceManager as unknown as { activeWorkspaces?: Map<string, unknown> })
          .activeWorkspaces?.delete?.(workspace.workspaceId);
      }
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  afterAll(async () => {
    await app.close();
  });

  const openFileExplorerSocket = async (workspaceId: string): Promise<{
    socket: WebSocket;
    connected: WsMessage;
  }> => {
    const socket = new WebSocket(`${wsBaseUrl}/ws/file-explorer/${workspaceId}`);
    const connectedPromise = waitForMessage(
      socket,
      (message) => message.type === "CONNECTED",
      "CONNECTED",
    );
    await waitForOpen(socket);
    const connected = await connectedPromise;
    expect(connected.payload?.workspace_id).toBe(workspaceId);
    expect(connected.payload?.session_id).toBeTruthy();
    return { socket, connected };
  };

  it("keeps workspace/search snapshot APIs watcher-free, then leases one real watcher across visible websocket consumers", async () => {
    fs.mkdirSync(path.join(tempRoot, "src"), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, "README.md"), "# watcher lifecycle\n", "utf-8");
    fs.writeFileSync(path.join(tempRoot, "src", "alpha.ts"), "export const alpha = true;\n", "utf-8");

    const workspace = await workspaceManager.createWorkspace({ rootPath: tempRoot });
    const initial = await getWorkspaceFileExplorerState(workspace.workspaceId);
    expect(initial.watcher).toBeNull();
    expect(initial.leaseCount).toBe(0);

    const searchLease = await workspace.acquireFileExplorer("e2e-search-snapshot");
    try {
      const searchResults = await searchLease.fileExplorer.searchFiles("alpha");
      expect(searchResults.some((result) => result.endsWith("src/alpha.ts"))).toBe(true);
    } finally {
      await searchLease.release();
    }
    const afterSearch = await getWorkspaceFileExplorerState(workspace.workspaceId);
    expect(afterSearch.watcher).toBeNull();
    expect(afterSearch.leaseCount).toBe(0);

    const first = await openFileExplorerSocket(workspace.workspaceId);
    const afterFirstOpen = await getWorkspaceFileExplorerState(workspace.workspaceId);
    expect(afterFirstOpen.watcher).toBeTruthy();
    expect(afterFirstOpen.leaseCount).toBe(1);

    const second = await openFileExplorerSocket(workspace.workspaceId);
    const afterSecondOpen = await getWorkspaceFileExplorerState(workspace.workspaceId);
    expect(afterSecondOpen.watcher).toBe(afterFirstOpen.watcher);
    expect(afterSecondOpen.leaseCount).toBe(2);

    fs.writeFileSync(path.join(tempRoot, "live-added.txt"), "visible explorer should receive this\n", "utf-8");
    const fileChange = await waitForMessage(
      first.socket,
      (message) =>
        message.type === "FILE_SYSTEM_CHANGE" &&
        Array.isArray(message.payload?.changes) &&
        (message.payload.changes as Array<{ type?: string; node?: { name?: string } }>).some(
          (change) => change.type === "add" && change.node?.name === "live-added.txt",
        ),
      "FILE_SYSTEM_CHANGE for live-added.txt",
    );
    expect(fileChange.type).toBe("FILE_SYSTEM_CHANGE");

    await closeSocket(first.socket);
    await waitForCondition(async () => {
      const state = await getWorkspaceFileExplorerState(workspace.workspaceId);
      return state.leaseCount === 1 && state.watcher === afterFirstOpen.watcher;
    }, "first websocket release keeps shared watcher alive");

    await closeSocket(second.socket);
    await waitForCondition(async () => {
      const state = await getWorkspaceFileExplorerState(workspace.workspaceId);
      return state.leaseCount === 0 && state.watcher === null;
    }, "final websocket release stops watcher");
  }, 20_000);

  it("does not leak watcher leases when sockets close before CONNECTED is observed", async () => {
    fs.writeFileSync(path.join(tempRoot, "early-close.txt"), "close before connected\n", "utf-8");
    const workspace = await workspaceManager.createWorkspace({ rootPath: tempRoot });

    for (let index = 0; index < 5; index += 1) {
      const socket = new WebSocket(`${wsBaseUrl}/ws/file-explorer/${workspace.workspaceId}`);
      await waitForOpen(socket);
      socket.close();
      await waitForClose(socket);
      await waitForCondition(async () => {
        const state = await getWorkspaceFileExplorerState(workspace.workspaceId);
        return state.leaseCount === 0 && state.watcher === null;
      }, `early-close cycle ${index + 1} watcher cleanup`);
    }
  }, 20_000);

  it("survives repeated open/close cycles without descriptor growth and keeps child-process spawn healthy", async () => {
    for (let index = 0; index < 80; index += 1) {
      fs.writeFileSync(path.join(tempRoot, `file-${index}.txt`), `file ${index}\n`, "utf-8");
    }
    const workspace = await workspaceManager.createWorkspace({ rootPath: tempRoot });
    const baselineFdCount = countOpenFds();

    for (let index = 0; index < 8; index += 1) {
      const { socket } = await openFileExplorerSocket(workspace.workspaceId);
      const connectedState = await getWorkspaceFileExplorerState(workspace.workspaceId);
      expect(connectedState.leaseCount).toBe(1);
      expect(connectedState.watcher).toBeTruthy();

      await closeSocket(socket);
      await waitForCondition(async () => {
        const state = await getWorkspaceFileExplorerState(workspace.workspaceId);
        return state.leaseCount === 0 && state.watcher === null;
      }, `open/close cycle ${index + 1} watcher cleanup`);
    }

    await assertChildProcessSpawnWorks();
    const finalFdCount = countOpenFds();
    if (baselineFdCount !== null && finalFdCount !== null) {
      expect(finalFdCount).toBeLessThanOrEqual(baselineFdCount + 20);
    }
  }, 30_000);
});
