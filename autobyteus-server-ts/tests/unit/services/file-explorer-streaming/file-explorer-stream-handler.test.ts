import { describe, expect, it, vi } from "vitest";
import type { WatcherLease, WorkspaceFileExplorer } from "../../../../src/file-explorer/file-explorer.js";
import type { WorkspaceFileExplorerLease } from "../../../../src/workspaces/filesystem-workspace.js";
import type { WorkspaceManager } from "../../../../src/workspaces/workspace-manager.js";
import { FileExplorerSessionManager } from "../../../../src/services/file-explorer-streaming/file-explorer-session-manager.js";
import { FileExplorerStreamHandler } from "../../../../src/services/file-explorer-streaming/file-explorer-stream-handler.js";
import { ClientMessageType, ServerMessageType } from "../../../../src/services/file-explorer-streaming/models.js";

const createEventStream = (events: string[]) => {
  return async function* () {
    for (const event of events) {
      yield event;
      await new Promise((resolve) => setImmediate(resolve));
    }
  };
};

const createWatcherLease = () => ({
  reason: "test",
  release: vi.fn().mockResolvedValue(undefined),
}) satisfies WatcherLease;

const createFileExplorerLease = (fileExplorer: WorkspaceFileExplorer) => ({
  fileExplorer,
  release: vi.fn().mockResolvedValue(undefined),
}) satisfies WorkspaceFileExplorerLease;

const createFileExplorer = (
  events: string[],
  options: { acquireThrows?: boolean; watcherLease?: WatcherLease } = {},
): WorkspaceFileExplorer & { lease: WatcherLease; acquireWatcherLease: ReturnType<typeof vi.fn> } => {
  const eventStreamFactory = createEventStream(events);
  const lease = options.watcherLease ?? createWatcherLease();
  return {
    lease,
    acquireWatcherLease: vi.fn(async () => {
      if (options.acquireThrows) {
        throw new Error("watcher failed");
      }
      return lease;
    }),
    subscribe: () => eventStreamFactory(),
  } as unknown as WorkspaceFileExplorer & { lease: WatcherLease; acquireWatcherLease: ReturnType<typeof vi.fn> };
};

const createWorkspaceManager = (fileExplorer: WorkspaceFileExplorer, shouldThrow = false): {
  workspaceManager: WorkspaceManager;
  fileExplorerLease: WorkspaceFileExplorerLease;
} => {
  const fileExplorerLease = createFileExplorerLease(fileExplorer);
  const workspace = {
    acquireFileExplorer: vi.fn(async () => fileExplorerLease),
  };

  return {
    fileExplorerLease,
    workspaceManager: {
      getOrCreateWorkspace: vi.fn(async () => {
        if (shouldThrow) {
          throw new Error("workspace missing");
        }
        return workspace;
      }),
    } as unknown as WorkspaceManager,
  };
};

describe("FileExplorerStreamHandler", () => {
  it("connects and sends a CONNECTED message", async () => {
    const sessionManager = new FileExplorerSessionManager();
    const fileExplorer = createFileExplorer([
      JSON.stringify({ changes: [{ type: "add" }] }),
    ]);
    const { workspaceManager, fileExplorerLease } = createWorkspaceManager(fileExplorer);

    const handler = new FileExplorerStreamHandler(sessionManager, workspaceManager);

    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "ws-123");

    expect(sessionId).toBeTruthy();
    expect(fileExplorer.acquireWatcherLease).toHaveBeenCalledWith("file-explorer-websocket");
    expect(sessionManager.getSession(sessionId as string)).toBeDefined();

    const firstMessage = JSON.parse(connection.send.mock.calls[0][0]);
    expect(firstMessage.type).toBe(ServerMessageType.CONNECTED);
    expect(firstMessage.payload.workspace_id).toBe("ws-123");
    expect(firstMessage.payload.session_id).toBe(sessionId);

    await handler.disconnect(sessionId as string);
    expect(fileExplorer.lease.release).toHaveBeenCalledTimes(1);
    expect(fileExplorerLease.release).toHaveBeenCalledTimes(1);
  });

  it("closes with 4004 when workspace is missing", async () => {
    const sessionManager = new FileExplorerSessionManager();
    const fileExplorer = createFileExplorer([]);
    const { workspaceManager } = createWorkspaceManager(fileExplorer, true);

    const handler = new FileExplorerStreamHandler(sessionManager, workspaceManager);

    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "missing");

    expect(sessionId).toBeNull();
    expect(connection.close).toHaveBeenCalledWith(4004);
    expect(fileExplorer.acquireWatcherLease).not.toHaveBeenCalled();
  });

  it("sends an error when watcher is unavailable", async () => {
    const sessionManager = new FileExplorerSessionManager();
    const fileExplorer = createFileExplorer([], { acquireThrows: true });
    const { workspaceManager, fileExplorerLease } = createWorkspaceManager(fileExplorer);

    const handler = new FileExplorerStreamHandler(sessionManager, workspaceManager);

    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "ws-1");

    expect(sessionId).toBeNull();
    expect(connection.close).toHaveBeenCalledWith(4005);
    expect(fileExplorerLease.release).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(connection.send.mock.calls[0][0]);
    expect(payload.type).toBe(ServerMessageType.ERROR);
    expect(payload.payload.code).toBe("WATCHER_UNAVAILABLE");
  });

  it("releases the watcher and file-explorer leases if CONNECTED send fails after session creation", async () => {
    const sessionManager = new FileExplorerSessionManager();
    const fileExplorer = createFileExplorer([]);
    const { workspaceManager, fileExplorerLease } = createWorkspaceManager(fileExplorer);
    const handler = new FileExplorerStreamHandler(sessionManager, workspaceManager);
    const connection = {
      send: vi.fn(() => {
        throw new Error("send failed");
      }),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "ws-send-fail");

    expect(sessionId).toBeNull();
    expect(fileExplorer.lease.release).toHaveBeenCalledTimes(1);
    expect(fileExplorerLease.release).toHaveBeenCalledTimes(1);
    expect(sessionManager.activeSessionCount).toBe(0);
    expect(connection.close).toHaveBeenCalledWith(1011);
  });

  it("closes the session and releases leases if a connected file change send fails", async () => {
    const sessionManager = new FileExplorerSessionManager();
    const fileExplorer = createFileExplorer([
      JSON.stringify({ changes: [{ type: "add" }] }),
    ]);
    const { workspaceManager, fileExplorerLease } = createWorkspaceManager(fileExplorer);
    const handler = new FileExplorerStreamHandler(sessionManager, workspaceManager);
    const connection = {
      send: vi.fn((payload: string) => {
        const parsed = JSON.parse(payload);
        if (parsed.type === ServerMessageType.FILE_SYSTEM_CHANGE) {
          throw new Error("file change send failed");
        }
      }),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "ws-send-loop-fail");

    expect(sessionId).toBeTruthy();
    await new Promise((resolve) => setImmediate(resolve));

    expect(sessionManager.activeSessionCount).toBe(0);
    expect(fileExplorer.lease.release).toHaveBeenCalledTimes(1);
    expect(fileExplorerLease.release).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledWith(1011);
  });

  it("responds to PING with PONG", async () => {
    const { workspaceManager } = createWorkspaceManager(createFileExplorer([]));
    const handler = new FileExplorerStreamHandler(new FileExplorerSessionManager(), workspaceManager);

    const response = await handler.handleMessage("session", JSON.stringify({ type: ClientMessageType.PING }));

    expect(response).toBeTruthy();
    const parsed = JSON.parse(response as string);
    expect(parsed.type).toBe(ServerMessageType.PONG);
  });

  it("returns null for unknown message types", async () => {
    const { workspaceManager } = createWorkspaceManager(createFileExplorer([]));
    const handler = new FileExplorerStreamHandler(new FileExplorerSessionManager(), workspaceManager);

    const response = await handler.handleMessage("session", JSON.stringify({ type: "UNKNOWN" }));

    expect(response).toBeNull();
  });

  it("returns null for invalid JSON", async () => {
    const { workspaceManager } = createWorkspaceManager(createFileExplorer([]));
    const handler = new FileExplorerStreamHandler(new FileExplorerSessionManager(), workspaceManager);

    const response = await handler.handleMessage("session", "not-json");

    expect(response).toBeNull();
  });

  it("disconnects and removes sessions", async () => {
    const sessionManager = new FileExplorerSessionManager();
    const fileExplorer = createFileExplorer([JSON.stringify({ changes: [] })]);
    const { workspaceManager, fileExplorerLease } = createWorkspaceManager(fileExplorer);

    const handler = new FileExplorerStreamHandler(sessionManager, workspaceManager);

    const connection = {
      send: vi.fn(),
      close: vi.fn(),
    };

    const sessionId = await handler.connect(connection, "ws-2");

    expect(sessionId).toBeTruthy();

    await handler.disconnect(sessionId as string);

    expect(sessionManager.getSession(sessionId as string)).toBeUndefined();
    expect(fileExplorer.lease.release).toHaveBeenCalledTimes(1);
    expect(fileExplorerLease.release).toHaveBeenCalledTimes(1);
  });

  it("handles disconnecting unknown sessions", async () => {
    const { workspaceManager } = createWorkspaceManager(createFileExplorer([]));
    const handler = new FileExplorerStreamHandler(new FileExplorerSessionManager(), workspaceManager);

    await handler.disconnect("missing");
  });
});
