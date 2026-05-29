import { describe, expect, it, vi } from "vitest";
import { FileExplorerSessionManager } from "../../../../src/services/file-explorer-streaming/file-explorer-session-manager.js";
import { FileExplorerStreamHandler } from "../../../../src/services/file-explorer-streaming/file-explorer-stream-handler.js";
import { ClientMessageType, ServerMessageType } from "../../../../src/services/file-explorer-streaming/models.js";
const createEventStream = (events) => {
    return async function* () {
        for (const event of events) {
            yield event;
            await new Promise((resolve) => setImmediate(resolve));
        }
    };
};
const createLease = () => ({
    reason: "test",
    release: vi.fn().mockResolvedValue(undefined),
});
const createFileExplorer = (events, options = {}) => {
    const eventStreamFactory = createEventStream(events);
    const lease = options.lease ?? createLease();
    return {
        lease,
        acquireWatcherLease: vi.fn(async () => {
            if (options.acquireThrows) {
                throw new Error("watcher failed");
            }
            return lease;
        }),
        subscribe: () => eventStreamFactory(),
    };
};
const createWorkspaceManager = (fileExplorer, shouldThrow = false) => {
    const workspace = {
        getFileExplorer: vi.fn(async () => fileExplorer),
    };
    return {
        getOrCreateWorkspace: vi.fn(async () => {
            if (shouldThrow) {
                throw new Error("workspace missing");
            }
            return workspace;
        }),
    };
};
describe("FileExplorerStreamHandler", () => {
    it("connects and sends a CONNECTED message", async () => {
        const sessionManager = new FileExplorerSessionManager();
        const fileExplorer = createFileExplorer([
            JSON.stringify({ changes: [{ type: "add" }] }),
        ]);
        const workspaceManager = createWorkspaceManager(fileExplorer);
        const handler = new FileExplorerStreamHandler(sessionManager, workspaceManager);
        const connection = {
            send: vi.fn(),
            close: vi.fn(),
        };
        const sessionId = await handler.connect(connection, "ws-123");
        expect(sessionId).toBeTruthy();
        expect(fileExplorer.acquireWatcherLease).toHaveBeenCalledWith("file-explorer-websocket");
        expect(sessionManager.getSession(sessionId)).toBeDefined();
        const firstMessage = JSON.parse(connection.send.mock.calls[0][0]);
        expect(firstMessage.type).toBe(ServerMessageType.CONNECTED);
        expect(firstMessage.payload.workspace_id).toBe("ws-123");
        expect(firstMessage.payload.session_id).toBe(sessionId);
        await handler.disconnect(sessionId);
        expect(fileExplorer.lease.release).toHaveBeenCalledTimes(1);
    });
    it("closes with 4004 when workspace is missing", async () => {
        const sessionManager = new FileExplorerSessionManager();
        const fileExplorer = createFileExplorer([]);
        const workspaceManager = createWorkspaceManager(fileExplorer, true);
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
        const workspaceManager = createWorkspaceManager(fileExplorer);
        const handler = new FileExplorerStreamHandler(sessionManager, workspaceManager);
        const connection = {
            send: vi.fn(),
            close: vi.fn(),
        };
        const sessionId = await handler.connect(connection, "ws-1");
        expect(sessionId).toBeNull();
        expect(connection.close).toHaveBeenCalledWith(4005);
        const payload = JSON.parse(connection.send.mock.calls[0][0]);
        expect(payload.type).toBe(ServerMessageType.ERROR);
        expect(payload.payload.code).toBe("WATCHER_UNAVAILABLE");
    });
    it("releases the watcher lease if CONNECTED send fails after session creation", async () => {
        const sessionManager = new FileExplorerSessionManager();
        const fileExplorer = createFileExplorer([]);
        const workspaceManager = createWorkspaceManager(fileExplorer);
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
        expect(sessionManager.activeSessionCount).toBe(0);
        expect(connection.close).toHaveBeenCalledWith(1011);
    });
    it("closes the session and releases the watcher lease if a connected file change send fails", async () => {
        const sessionManager = new FileExplorerSessionManager();
        const fileExplorer = createFileExplorer([
            JSON.stringify({ changes: [{ type: "add" }] }),
        ]);
        const workspaceManager = createWorkspaceManager(fileExplorer);
        const handler = new FileExplorerStreamHandler(sessionManager, workspaceManager);
        const connection = {
            send: vi.fn((payload) => {
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
        expect(connection.close).toHaveBeenCalledWith(1011);
    });
    it("responds to PING with PONG", async () => {
        const handler = new FileExplorerStreamHandler(new FileExplorerSessionManager(), createWorkspaceManager(createFileExplorer([])));
        const response = await handler.handleMessage("session", JSON.stringify({ type: ClientMessageType.PING }));
        expect(response).toBeTruthy();
        const parsed = JSON.parse(response);
        expect(parsed.type).toBe(ServerMessageType.PONG);
    });
    it("returns null for unknown message types", async () => {
        const handler = new FileExplorerStreamHandler(new FileExplorerSessionManager(), createWorkspaceManager(createFileExplorer([])));
        const response = await handler.handleMessage("session", JSON.stringify({ type: "UNKNOWN" }));
        expect(response).toBeNull();
    });
    it("returns null for invalid JSON", async () => {
        const handler = new FileExplorerStreamHandler(new FileExplorerSessionManager(), createWorkspaceManager(createFileExplorer([])));
        const response = await handler.handleMessage("session", "not-json");
        expect(response).toBeNull();
    });
    it("disconnects and removes sessions", async () => {
        const sessionManager = new FileExplorerSessionManager();
        const fileExplorer = createFileExplorer([JSON.stringify({ changes: [] })]);
        const workspaceManager = createWorkspaceManager(fileExplorer);
        const handler = new FileExplorerStreamHandler(sessionManager, workspaceManager);
        const connection = {
            send: vi.fn(),
            close: vi.fn(),
        };
        const sessionId = await handler.connect(connection, "ws-2");
        expect(sessionId).toBeTruthy();
        await handler.disconnect(sessionId);
        expect(sessionManager.getSession(sessionId)).toBeUndefined();
    });
    it("handles disconnecting unknown sessions", async () => {
        const handler = new FileExplorerStreamHandler(new FileExplorerSessionManager(), createWorkspaceManager(createFileExplorer([])));
        await handler.disconnect("missing");
    });
});
