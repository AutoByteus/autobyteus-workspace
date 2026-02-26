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
const createFileExplorer = (events, shouldThrow = false) => {
    const eventStreamFactory = createEventStream(events);
    return {
        ensureWatcherStarted: vi.fn(async () => {
            if (shouldThrow) {
                throw new Error("watcher failed");
            }
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
        expect(sessionManager.getSession(sessionId)).toBeDefined();
        const firstMessage = JSON.parse(connection.send.mock.calls[0][0]);
        expect(firstMessage.type).toBe(ServerMessageType.CONNECTED);
        expect(firstMessage.payload.workspace_id).toBe("ws-123");
        expect(firstMessage.payload.session_id).toBe(sessionId);
        await handler.disconnect(sessionId);
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
    });
    it("sends an error when watcher is unavailable", async () => {
        const sessionManager = new FileExplorerSessionManager();
        const fileExplorer = createFileExplorer([], true);
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
