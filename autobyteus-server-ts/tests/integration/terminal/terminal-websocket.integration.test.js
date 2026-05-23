import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { PtySessionManager, TerminalHandler, } from "../../../src/services/terminal-streaming/index.js";
import { registerTerminalWebsocket } from "../../../src/api/websocket/terminal.js";
class FakePtySession {
    sessionId;
    cwd = null;
    writtenData = [];
    resizeCalls = [];
    dataQueue = [];
    pendingReads = [];
    closed = false;
    constructor(sessionId) {
        this.sessionId = sessionId;
    }
    async start(cwd) {
        this.cwd = cwd;
    }
    async write(data) {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
        this.writtenData.push(buffer);
        const pending = this.pendingReads.shift();
        if (pending) {
            if (pending.timer) {
                clearTimeout(pending.timer);
            }
            pending.resolve(buffer);
        }
        else {
            this.dataQueue.push(buffer);
        }
    }
    async read(timeout = 0.1) {
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
            const pending = { resolve };
            pending.timer = setTimeout(() => {
                this.pendingReads = this.pendingReads.filter((item) => item !== pending);
                resolve(null);
            }, timeout * 1000);
            this.pendingReads.push(pending);
        });
    }
    resize(rows, cols) {
        this.resizeCalls.push([rows, cols]);
    }
    async close() {
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
class DelayedTerminalHandler extends TerminalHandler {
    delayMs;
    constructor(sessionManager, delayMs) {
        super(sessionManager);
        this.delayMs = delayMs;
    }
    async connect(connection, terminalTargetId, sessionId, cwd) {
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));
        return super.connect(connection, terminalTargetId, sessionId, cwd);
    }
}
class FailingAfterCreateManager extends PtySessionManager {
    async createSession(sessionId, terminalTargetId, cwd) {
        const session = await super.createSession(sessionId, terminalTargetId, cwd);
        throw new Error(`setup failed after creating ${session.sessionId}`);
    }
}
const createTempWorkspace = async () => {
    return fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-terminal-"));
};
const waitForMessage = (socket, timeoutMs = 2000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
        reject(new Error("Timed out waiting for websocket message"));
    }, timeoutMs);
    socket.once("message", (data) => {
        clearTimeout(timer);
        resolve(data.toString());
    });
});
const waitForOpen = (socket, timeoutMs = 2000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
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
const waitForSession = async (manager, sessionId, timeoutMs = 2000) => {
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
const waitForSessionClose = async (manager, sessionId, timeoutMs = 2000) => {
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
const waitForSessionCount = async (manager, expected, timeoutMs = 2000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (manager.sessionCount === expected)
            return;
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`Expected ${expected} terminal sessions, found ${manager.sessionCount}.`);
};
describe("Terminal websocket integration", () => {
    let app;
    let baseUrl;
    let workspaceRoot;
    let manager;
    const terminalUrl = (sessionId, cwd = workspaceRoot) => {
        const url = new URL(`${baseUrl}/ws/terminal/${encodeURIComponent(sessionId)}`);
        url.searchParams.set("cwd", cwd);
        return url.toString();
    };
    beforeEach(async () => {
        workspaceRoot = await createTempWorkspace();
        manager = new PtySessionManager(FakePtySession);
        const handler = new TerminalHandler(manager);
        app = fastify();
        await app.register(websocket);
        await registerTerminalWebsocket(app, handler);
        const address = await app.listen({ port: 0, host: "127.0.0.1" });
        const url = new URL(address);
        baseUrl = `ws://${url.hostname}:${url.port}`;
    });
    afterEach(async () => {
        await app.close();
        await fs.rm(workspaceRoot, { recursive: true, force: true });
    });
    it("round-trips input/output and resize from cwd without materializing a workspace", async () => {
        const sessionId = "session-1";
        const socket = new WebSocket(terminalUrl(sessionId));
        await waitForOpen(socket);
        await waitForSession(manager, sessionId);
        const payload = Buffer.from("pwd", "utf8").toString("base64");
        const responsePromise = waitForMessage(socket);
        socket.send(JSON.stringify({ type: "input", data: payload }));
        const response = await responsePromise;
        const parsed = JSON.parse(response);
        expect(parsed.type).toBe("output");
        expect(Buffer.from(parsed.data, "base64").toString("utf8")).toBe("pwd");
        socket.send(JSON.stringify({ type: "resize", rows: 40, cols: 120 }));
        const session = (await waitForSession(manager, sessionId));
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(session.resizeCalls).toEqual([[40, 120]]);
        expect(session.cwd).toBe(workspaceRoot);
        socket.close();
        await waitForSessionClose(manager, sessionId);
    });
    it("rejects an invalid cwd", async () => {
        const socket = new WebSocket(terminalUrl("invalid-cwd", path.join(workspaceRoot, "missing")));
        const closeEvent = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Timed out waiting for invalid cwd close")), 2000);
            socket.once("close", (code, reason) => {
                clearTimeout(timer);
                resolve({ code, reason });
            });
        });
        expect(closeEvent.code).toBe(4004);
        expect(closeEvent.reason.toString()).toBe("Terminal cwd unavailable");
        expect(manager.sessionCount).toBe(0);
    });
    it("does not leave a late PTY session when the socket closes while connect is pending", async () => {
        await app.close();
        manager = new PtySessionManager(FakePtySession);
        const delayedHandler = new DelayedTerminalHandler(manager, 150);
        app = fastify();
        await app.register(websocket);
        await registerTerminalWebsocket(app, delayedHandler);
        const address = await app.listen({ port: 0, host: "127.0.0.1" });
        const url = new URL(address);
        baseUrl = `ws://${url.hostname}:${url.port}`;
        const socket = new WebSocket(terminalUrl("early-close"));
        await waitForOpen(socket);
        socket.send(JSON.stringify({
            type: "input",
            data: Buffer.from("lost", "utf8").toString("base64"),
        }));
        socket.close();
        await waitForSessionCount(manager, 0, 3000);
    });
    it("cleans up a partially created PTY session when setup fails", async () => {
        const failingManager = new FailingAfterCreateManager(FakePtySession);
        const failingHandler = new TerminalHandler(failingManager);
        const closeCodes = [];
        await expect(failingHandler.connect({
            send: () => undefined,
            close: (code) => closeCodes.push(code),
        }, workspaceRoot, "partial-session", workspaceRoot)).rejects.toThrow("setup failed after creating partial-session");
        expect(failingManager.sessionCount).toBe(0);
        expect(closeCodes).toContain(1011);
    });
});
