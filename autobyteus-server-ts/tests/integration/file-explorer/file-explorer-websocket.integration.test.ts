import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { registerFileExplorerWebsocket } from "../../../src/api/websocket/file-explorer.js";

const waitForOpen = (socket: WebSocket, timeoutMs = 2000): Promise<void> =>
  new Promise((resolve, reject) => {
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

const waitForMessage = (socket: WebSocket, timeoutMs = 2000): Promise<string> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket message")), timeoutMs);
    socket.once("message", (data) => {
      clearTimeout(timer);
      resolve(data.toString());
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

const waitForClose = (socket: WebSocket, timeoutMs = 2000): Promise<{ code: number; reason: string }> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket close")), timeoutMs);
    socket.once("close", (code, reason) => {
      clearTimeout(timer);
      resolve({ code, reason: reason.toString() });
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

describe("File explorer websocket integration", () => {
  let app: FastifyInstance;
  let baseUrl: string;

  beforeEach(async () => {
    app = fastify();
    await app.register(websocket);
    await registerFileExplorerWebsocket(app);

    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    baseUrl = `ws://${url.hostname}:${url.port}`;
  });

  afterEach(async () => {
    await app.close();
  });

  it("sends WORKSPACE_NOT_FOUND error payload then closes with 4004 for missing workspace", async () => {
    const missingWorkspaceId = "workspace-does-not-exist";
    const socket = new WebSocket(`${baseUrl}/ws/file-explorer/${missingWorkspaceId}`);
    const messagePromise = waitForMessage(socket);
    const closePromise = waitForClose(socket);

    await waitForOpen(socket);

    const [message, closeInfo] = await Promise.all([messagePromise, closePromise]);

    const parsed = JSON.parse(message) as {
      type: string;
      payload?: { code?: string; message?: string };
    };

    expect(parsed.type).toBe("ERROR");
    expect(parsed.payload?.code).toBe("WORKSPACE_NOT_FOUND");
    expect(parsed.payload?.message).toContain(missingWorkspaceId);
    expect(closeInfo.code).toBe(4004);
  });
});
