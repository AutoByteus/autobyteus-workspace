import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { WorkspaceConfig } from "autobyteus-ts";
import { registerTerminalWebsocket } from "../../../src/api/websocket/terminal.js";
import { PtySessionManager, TerminalHandler, } from "../../../src/services/terminal-streaming/index.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
const workspaceManager = getWorkspaceManager();
const isWindows = process.platform === "win32";
const findWslExecutable = () => {
    const candidates = ["wsl.exe", "wsl"];
    const pathEntries = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
    for (const entry of pathEntries) {
        for (const candidate of candidates) {
            const full = path.join(entry, candidate);
            try {
                const result = spawnSync(full, ["-l"], { encoding: "buffer", timeout: 2000 });
                if (result.status === 0) {
                    return full;
                }
            }
            catch {
                // ignore
            }
        }
    }
    return null;
};
const listWslDistros = (wslExe) => {
    const result = spawnSync(wslExe, ["-l", "-q"], { encoding: "buffer", timeout: 5000 });
    if (result.status !== 0) {
        return [];
    }
    const output = result.stdout.toString("utf8");
    return output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
};
const selectWslDistro = (wslExe) => {
    const result = spawnSync(wslExe, ["-l", "-v"], { encoding: "buffer", timeout: 5000 });
    if (result.status !== 0) {
        return null;
    }
    const output = result.stdout.toString("utf8");
    for (const line of output.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith("*")) {
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 2) {
                return parts[1] ?? null;
            }
        }
    }
    const distros = listWslDistros(wslExe);
    return distros[0] ?? null;
};
const getWslContext = () => {
    if (!isWindows) {
        return null;
    }
    try {
        const wslExe = findWslExecutable();
        if (!wslExe) {
            return null;
        }
        const distros = listWslDistros(wslExe);
        if (distros.length === 0) {
            return null;
        }
        const distro = selectWslDistro(wslExe) ?? distros[0];
        const result = spawnSync(wslExe, ["-d", distro, "--exec", "tmux", "-V"], {
            encoding: "buffer",
            timeout: 5000,
        });
        if (result.status !== 0) {
            return null;
        }
        return { wslExe, distro };
    }
    catch {
        return null;
    }
};
const wslContext = getWslContext();
const describeIf = wslContext ? describe : describe.skip;
const createTempWorkspace = async () => {
    return fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-terminal-wsl-"));
};
const waitForMessage = (socket, timeoutMs) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
        reject(new Error("Timed out waiting for websocket message"));
    }, timeoutMs);
    socket.once("message", (data) => {
        clearTimeout(timer);
        resolve(data.toString());
    });
});
const receiveUntilOutputContains = async (socket, needle, timeoutMs = 8000) => {
    let buffer = Buffer.alloc(0);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const remaining = Math.max(100, deadline - Date.now());
        const message = await waitForMessage(socket, remaining);
        const payload = JSON.parse(message);
        if (payload.type !== "output" || !payload.data) {
            continue;
        }
        const chunk = Buffer.from(payload.data, "base64");
        buffer = Buffer.concat([buffer, chunk]);
        if (buffer.includes(needle)) {
            return buffer;
        }
    }
    throw new Error(`Expected output not received: ${needle.toString("utf8")}`);
};
const waitForSession = async (manager, sessionId, timeoutMs = 10000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const session = manager.getSession(sessionId);
        if (session) {
            return session;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Terminal session ${sessionId} was not created in time.`);
};
const waitForSessionClose = async (manager, sessionId, timeoutMs = 5000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (!manager.getSession(sessionId)) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Terminal session ${sessionId} did not close in time.`);
};
describeIf("Terminal websocket WSL integration", () => {
    let app;
    let baseUrl;
    let workspaceRoot;
    let workspaceId;
    let manager;
    beforeEach(async () => {
        workspaceRoot = await createTempWorkspace();
        const workspace = await workspaceManager.createWorkspace(new WorkspaceConfig({ rootPath: workspaceRoot }));
        workspaceId = workspace.workspaceId;
        manager = new PtySessionManager();
        const handler = new TerminalHandler(manager);
        app = fastify();
        await app.register(websocket);
        await registerTerminalWebsocket(app, handler);
        await app.listen({ port: 0, host: "127.0.0.1" });
        const address = app.server.address();
        const port = typeof address === "string" ? Number(new URL(address).port) : address?.port;
        baseUrl = `ws://127.0.0.1:${port}`;
    });
    afterEach(async () => {
        await app.close();
        await fs.rm(workspaceRoot, { recursive: true, force: true });
    });
    it("echoes output via WSL session", async () => {
        if (!wslContext) {
            return;
        }
        const sessionId = "wsl-session-1";
        const socket = new WebSocket(`${baseUrl}/ws/terminal/${workspaceId}/${sessionId}`);
        await new Promise((resolve, reject) => {
            socket.once("open", () => resolve());
            socket.once("error", (error) => reject(error));
        });
        await waitForSession(manager, sessionId);
        const payload = Buffer.from("echo autobyteus_ws\n", "utf8").toString("base64");
        socket.send(JSON.stringify({ type: "input", data: payload }));
        const output = await receiveUntilOutputContains(socket, Buffer.from("autobyteus_ws", "utf8"), 12000);
        expect(output.toString("utf8")).toContain("autobyteus_ws");
        socket.close();
        await waitForSessionClose(manager, sessionId);
    });
});
