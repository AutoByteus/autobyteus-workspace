import { describe, expect, it } from "vitest";
import { FileExplorerSession } from "../../../../src/services/file-explorer-streaming/file-explorer-session.js";
import { FileExplorerSessionManager } from "../../../../src/services/file-explorer-streaming/file-explorer-session-manager.js";
const emptyEventStream = async function* () {
    return;
};
class MockSession {
    sessionId;
    workspaceId;
    started = false;
    closed = false;
    constructor(sessionId, workspaceId, _eventStreamFactory) {
        this.sessionId = sessionId;
        this.workspaceId = workspaceId;
    }
    async start() {
        this.started = true;
    }
    close() {
        this.closed = true;
    }
}
describe("FileExplorerSessionManager", () => {
    it("creates sessions using the default session class", async () => {
        const manager = new FileExplorerSessionManager();
        const session = await manager.createSession("sess-1", "ws-1", emptyEventStream);
        expect(session).toBeInstanceOf(FileExplorerSession);
    });
    it("accepts a custom session class", async () => {
        const manager = new FileExplorerSessionManager(MockSession);
        const session = await manager.createSession("sess-2", "ws-2", emptyEventStream);
        expect(session).toBeInstanceOf(MockSession);
    });
    it("stores created sessions", async () => {
        const manager = new FileExplorerSessionManager(MockSession);
        const session = await manager.createSession("sess-3", "ws-3", emptyEventStream);
        expect(manager.getSession("sess-3")).toBe(session);
    });
    it("supports multiple active sessions", async () => {
        const manager = new FileExplorerSessionManager(MockSession);
        const s1 = await manager.createSession("s1", "w1", emptyEventStream);
        const s2 = await manager.createSession("s2", "w2", emptyEventStream);
        const s3 = await manager.createSession("s3", "w1", emptyEventStream);
        expect(manager.getSession("s1")).toBe(s1);
        expect(manager.getSession("s2")).toBe(s2);
        expect(manager.getSession("s3")).toBe(s3);
    });
    it("returns undefined for unknown sessions", () => {
        const manager = new FileExplorerSessionManager(MockSession);
        expect(manager.getSession("missing")).toBeUndefined();
    });
    it("closes and removes sessions", async () => {
        const manager = new FileExplorerSessionManager(MockSession);
        const session = await manager.createSession("sess-4", "ws-4", emptyEventStream);
        await manager.closeSession("sess-4");
        expect(session.closed).toBe(true);
        expect(manager.getSession("sess-4")).toBeUndefined();
    });
    it("handles closing unknown sessions safely", async () => {
        const manager = new FileExplorerSessionManager(MockSession);
        await manager.closeSession("missing");
    });
    it("tracks active session count", async () => {
        const manager = new FileExplorerSessionManager(MockSession);
        expect(manager.activeSessionCount).toBe(0);
        await manager.createSession("s1", "w1", emptyEventStream);
        expect(manager.activeSessionCount).toBe(1);
        await manager.createSession("s2", "w2", emptyEventStream);
        expect(manager.activeSessionCount).toBe(2);
        await manager.closeSession("s1");
        expect(manager.activeSessionCount).toBe(1);
    });
    it("closes all sessions", async () => {
        const manager = new FileExplorerSessionManager(MockSession);
        await manager.createSession("s1", "w1", emptyEventStream);
        await manager.createSession("s2", "w2", emptyEventStream);
        await manager.createSession("s3", "w3", emptyEventStream);
        await manager.closeAllSessions();
        expect(manager.activeSessionCount).toBe(0);
    });
});
