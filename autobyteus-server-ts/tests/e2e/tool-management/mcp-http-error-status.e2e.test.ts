/**
 * The HTTP status of a remote MCP server's error answer, through the real built server.
 *
 * Purpose: a remote (streamable HTTP) MCP server that answers every request with 401, 403, 404 or 500 makes
 * GraphQL preview fail with `Failed to preview tools for MCP server: Error: HTTP <status> <reason>: Error POSTing
 * to endpoint: <body>`, and save + discover return `success: false` with `Error: HTTP <status> <reason>: …`. The
 * token never appears in a response or in the server's output.
 * Prerequisites: a current build of this worktree (`pnpm -C autobyteus-ts build`, then
 * `pnpm -C autobyteus-server-ts build`). The test owns its server process, port, runtime root and database.
 * Values: dummy only (`test-dummy`).
 * Command: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts --no-watch
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type GraphqlResult<T> = { data?: T; errors?: Array<{ message: string }> };
type StatusServer = { url: string; requests: number; close: () => Promise<void> };

const DUMMY = "test-dummy";

const graphql = async <T>(serverUrl: string, query: string, variables: Record<string, unknown> = {}) => {
  const response = await fetch(`${serverUrl}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return await response.json() as GraphqlResult<T>;
};

const PREVIEW = `query Preview($input: McpServerInput!) { previewMcpServerTools(input: $input) { name } }`;
const CONFIGURE = `mutation Configure($input: McpServerInput!) {
  configureMcpServer(input: $input) { savedConfig { ... on StreamableHttpMcpServerConfig { serverId } } } }`;
const DISCOVER = `mutation Discover($serverId: String!) {
  discoverAndRegisterMcpServerTools(serverId: $serverId) { success message discoveredTools { name } } }`;

const tokenInput = (serverId: string, url: string) => ({
  serverId, transportType: "STREAMABLE_HTTP", enabled: true, toolNamePrefix: serverId,
  streamableHttpConfig: { url, token: DUMMY, headers: null },
});

/** A plain HTTP server that answers every request with `status` and a short text body. */
const startStatusServer = async (status: number, body: string): Promise<StatusServer> => {
  const server: StatusServer = { url: "", requests: 0, close: async () => undefined };
  const httpServer = http.createServer((req, res) => {
    server.requests += 1;
    req.resume();
    req.on("end", () => res.writeHead(status, { "content-type": "text/plain" }).end(body));
  });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  server.url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}/mcp`;
  server.close = () => new Promise<void>((resolve) => {
    httpServer.closeAllConnections();
    httpServer.close(() => resolve());
  });
  return server;
};

const CASES = [
  { status: 401, body: "unauthorized", expected: "HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized" },
  { status: 403, body: "forbidden", expected: "HTTP 403 Forbidden: Error POSTing to endpoint: forbidden" },
  { status: 404, body: "Not Found", expected: "HTTP 404 Not Found: Error POSTing to endpoint: Not Found" },
  { status: 500, body: "Internal Server Error", expected: "HTTP 500 Internal Server Error: Error POSTing to endpoint: Internal Server Error" },
];

describe("HTTP status in remote MCP connection errors through the built server", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const target = {
    runtimeRoot: path.join(testRuntimeRoot, `mcp-http-error-status-${suffix}`),
    database: resolveTestDatabaseLocation(`file:./db/mcp-http-error-status-${suffix}.db`),
  };
  const statusServers: StatusServer[] = [];
  let server: RunningTestServer | null = null;

  afterAll(async () => {
    if (server && server.child.exitCode === null) server.child.kill("SIGKILL");
    for (const each of statusServers) await each.close();
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }, 60_000);

  it("states the HTTP status in the preview and the discover message for 401, 403, 404 and 500", async () => {
    server = await startBuiltTestServer({ runtimeRoot: target.runtimeRoot, databaseUrlOverride: target.database.databaseUrl,
      port: await reserveLoopbackPort() });
    const url = server.serverUrl;
    const responses: unknown[] = [];

    for (const { status, body, expected } of CASES) {
      const remote = await startStatusServer(status, body);
      statusServers.push(remote);
      const serverId = `status_${status}`;

      const preview = await graphql(url, PREVIEW, { input: tokenInput(serverId, remote.url) });
      expect(preview.errors?.[0]?.message).toBe(`Failed to preview tools for MCP server: Error: ${expected}`);

      const saved = await graphql(url, CONFIGURE, { input: tokenInput(serverId, remote.url) });
      expect(saved.errors, JSON.stringify(saved.errors)).toBeUndefined();
      const discover = await graphql<{ discoverAndRegisterMcpServerTools: { success: boolean; message: string;
        discoveredTools: Array<{ name: string }> } }>(url, DISCOVER, { serverId });
      expect(discover.data!.discoverAndRegisterMcpServerTools).toEqual({
        success: false, message: `Error: ${expected}`, discoveredTools: [],
      });

      expect(remote.requests).toBeGreaterThanOrEqual(2);
      responses.push(preview, saved, discover);
    }

    expect(JSON.stringify(responses)).not.toContain(DUMMY);
    await server.stop();
    expect(server.output()).not.toContain(DUMMY);
  }, 180_000);
});
