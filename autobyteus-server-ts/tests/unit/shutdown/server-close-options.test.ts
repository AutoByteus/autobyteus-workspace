/**
 * REQ-001 / AC-001 (autobyteus-339, FU-008): closing a server never waits on a client connection.
 * From probe P-003: a used keep-alive connection plus a connection that never sends a request. With
 * Fastify's default options `close()` waits for the silent connection indefinitely, and `onClose`
 * (the studio's run cleanup) never starts. Real sockets on 127.0.0.1.
 */
import net from "node:net";
import type { FastifyInstance } from "fastify";
import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SERVER_CLOSE_OPTIONS } from "../../../src/shutdown/server-close-options.js";

vi.mock("../../../src/credential-proxy/credential-proxy-routes.js", () => ({
  registerCredentialProxyRoutes: async (app: FastifyInstance) => { app.get("/x", async () => "ok"); },
}));
vi.mock("../../../src/agent-tools/mcp/agent-tools-mcp-routes.js", () => ({
  registerAgentToolsMcpRoutes: async (app: FastifyInstance) => { app.get("/x", async () => "ok"); },
}));
vi.mock("../../../src/logging/runtime-logger-bootstrap.js", () => ({ getFastifyLoggerOptions: () => false }));
vi.mock("../../../src/logging/http-access-log-policy.js", () => ({ registerHttpAccessLogPolicy: () => undefined }));

import { CredentialProxyLocalServer } from "../../../src/credential-proxy/credential-proxy-local-server.js";
import { AgentToolsMcpLocalServer } from "../../../src/agent-tools/mcp/agent-tools-mcp-local-server.js";

const CLOSE_LIMIT_MS = 1_000;
const sockets: net.Socket[] = [];

/**
 * One used keep-alive connection and one that never sends a request, both left open. Returns once the
 * server has accepted both: a silent connection holds the default close only after the server has it.
 */
const holdClientConnections = async (httpServer: net.Server): Promise<net.Socket> => {
  const port = (httpServer.address() as net.AddressInfo).port;
  const used = net.connect(port, "127.0.0.1");
  sockets.push(used);
  await new Promise<void>((resolve, reject) => {
    used.once("error", reject);
    used.write("GET /x HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: keep-alive\r\n\r\n");
    used.once("data", () => resolve());
  });
  const silent = net.connect(port, "127.0.0.1");
  sockets.push(silent);
  await new Promise<void>((resolve) => silent.once("connect", () => resolve()));
  await vi.waitFor(async () => {
    const count = await new Promise<number>((resolve, reject) => httpServer.getConnections((error, n) => error ? reject(error) : resolve(n)));
    expect(count).toBe(2);
  });
  return silent;
};

/** Closes and reports the time, or `null` when close is still waiting at the limit. */
const timedClose = async (close: () => Promise<void>): Promise<number | null> => {
  const startedAt = Date.now();
  const closed = close().then(() => Date.now() - startedAt);
  return Promise.race([closed, new Promise<null>((resolve) => setTimeout(() => resolve(null), CLOSE_LIMIT_MS))]);
};

/** The local servers keep their Fastify instance private; the test reaches its HTTP server only to count accepted connections. */
const httpServerOf = (server: object): net.Server => (server as { app: FastifyInstance }).app.server;

afterEach(() => { for (const socket of sockets.splice(0)) socket.destroy(); });

describe("server close options", () => {
  it("close and onClose do not wait on a silent or idle client connection; preClose still runs first", async () => {
    const app = fastify({ ...SERVER_CLOSE_OPTIONS, logger: false });
    let silent!: net.Socket;
    let silentOpenAtPreClose: boolean | null = null;
    let onCloseRan = false;
    app.addHook("preClose", async () => { silentOpenAtPreClose = !silent.destroyed && !silent.readableEnded; });
    app.addHook("onClose", async () => { onCloseRan = true; });
    app.get("/x", async () => "ok");
    await app.listen({ host: "127.0.0.1", port: 0 });
    silent = await holdClientConnections(app.server);

    const closeMs = await timedClose(() => app.close());

    expect(closeMs, "close still waiting on a client connection").not.toBeNull();
    expect(closeMs!).toBeLessThan(CLOSE_LIMIT_MS);
    expect(onCloseRan).toBe(true);
    expect(silentOpenAtPreClose).toBe(true);
  });

  it("the credential proxy's local server closes without waiting on its clients", async () => {
    const server = new CredentialProxyLocalServer(() => ({}) as never);
    await server.listen();
    await holdClientConnections(httpServerOf(server));
    expect(await timedClose(() => server.close())).not.toBeNull();
  });

  it("the Agent Tools MCP local server closes without waiting on its clients", async () => {
    const server = new AgentToolsMcpLocalServer({ loggingConfig: {} as never, routeDependencies: {} as never });
    await server.listen();
    await holdClientConnections(httpServerOf(server));
    expect(await timedClose(() => server.close())).not.toBeNull();
  });
});
