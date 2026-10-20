/**
 * The HTTP status of a remote MCP server's error answer, through the real built server.
 *
 * Purpose: a remote (streamable HTTP) MCP server that answers every request with 401, 403, 404 or 500 makes
 * GraphQL preview fail with `Failed to preview tools for MCP server: Error: HTTP <status> <reason>: Error POSTing
 * to endpoint: <body>`, and save + discover return `success: false` with `Error: HTTP <status> <reason>: …`. A 404
 * with an empty body still names its status (`HTTP 404 Not Found: Error POSTing to endpoint: `). Failures without an
 * HTTP answer keep their own text and get no status: a URL where nothing listens (`TypeError: fetch failed`) and a
 * stdio server whose process exits at once. The token never appears in a response or in the server's output.
 * Prerequisites: a current build of this worktree (`pnpm -C autobyteus-ts build`, then
 * `pnpm -C autobyteus-server-ts build`). The test owns its server process, port, runtime root and database.
 * Values: dummy only (`test-dummy`).
 * Command: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts --no-watch
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

/** A loopback URL on a port that was free a moment ago, so nothing listens there. */
const unusedLocalUrl = async (): Promise<string> => {
  const probe = http.createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const { port } = probe.address() as AddressInfo;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return `http://127.0.0.1:${port}/mcp`;
};

type DiscoverResult = { discoverAndRegisterMcpServerTools: { success: boolean; message: string; discoveredTools: Array<{ name: string }> } };

/** The SDK closes the stdio transport when the process exits before answering; the text has no status. */
const STDIO_EXIT_MESSAGE = "Failed to preview tools for MCP server: SdkError: Connection closed";

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

  let url = "";
  const responses: unknown[] = [];

  beforeAll(async () => {
    server = await startBuiltTestServer({ runtimeRoot: target.runtimeRoot, databaseUrlOverride: target.database.databaseUrl,
      port: await reserveLoopbackPort() });
    url = server.serverUrl;
  }, 120_000);

  afterAll(async () => {
    if (server && server.child.exitCode === null) server.child.kill("SIGKILL");
    for (const each of statusServers) await each.close();
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }, 60_000);

  it("states the HTTP status in the preview and the discover message for 401, 403, 404 and 500", async () => {
    for (const { status, body, expected } of CASES) {
      const remote = await startStatusServer(status, body);
      statusServers.push(remote);
      const serverId = `status_${status}`;

      const preview = await graphql(url, PREVIEW, { input: tokenInput(serverId, remote.url) });
      expect(preview.errors?.[0]?.message).toBe(`Failed to preview tools for MCP server: Error: ${expected}`);

      const saved = await graphql(url, CONFIGURE, { input: tokenInput(serverId, remote.url) });
      expect(saved.errors, JSON.stringify(saved.errors)).toBeUndefined();
      const discover = await graphql<DiscoverResult>(url, DISCOVER, { serverId });
      expect(discover.data!.discoverAndRegisterMcpServerTools).toEqual({
        success: false, message: `Error: ${expected}`, discoveredTools: [],
      });

      expect(remote.requests).toBeGreaterThanOrEqual(2);
      responses.push(preview, saved, discover);
    }
  }, 180_000);

  it("names the status of a 404 whose body is empty", async () => {
    const remote = await startStatusServer(404, "");
    statusServers.push(remote);
    const expected = "HTTP 404 Not Found: Error POSTing to endpoint: ";

    const preview = await graphql(url, PREVIEW, { input: tokenInput("status_404_empty", remote.url) });
    expect(preview.errors?.[0]?.message).toBe(`Failed to preview tools for MCP server: Error: ${expected}`);
    expect((await graphql(url, CONFIGURE, { input: tokenInput("status_404_empty", remote.url) })).errors).toBeUndefined();
    const discover = await graphql<DiscoverResult>(url, DISCOVER, { serverId: "status_404_empty" });
    expect(discover.data!.discoverAndRegisterMcpServerTools).toEqual({ success: false, message: `Error: ${expected}`, discoveredTools: [] });
    responses.push(preview, discover);
  }, 60_000);

  it("keeps the text of failures without an HTTP answer, without a status", async () => {
    // Nothing listens on this port any more: the SDK's fetch fails before any HTTP answer.
    const refusedUrl = await unusedLocalUrl();
    const refusedPreview = await graphql(url, PREVIEW, { input: tokenInput("refused", refusedUrl) });
    expect(refusedPreview.errors?.[0]?.message).toBe("Failed to preview tools for MCP server: TypeError: fetch failed");
    expect((await graphql(url, CONFIGURE, { input: tokenInput("refused", refusedUrl) })).errors).toBeUndefined();
    const refusedDiscover = await graphql<DiscoverResult>(url, DISCOVER, { serverId: "refused" });
    expect(refusedDiscover.data!.discoverAndRegisterMcpServerTools).toEqual({
      success: false, message: "TypeError: fetch failed", discoveredTools: [],
    });

    // A stdio server whose process exits before answering `initialize`.
    const stdioPreview = await graphql(url, PREVIEW, { input: {
      serverId: "exits_at_once", transportType: "STDIO", enabled: true, toolNamePrefix: "exits_at_once",
      stdioConfig: { command: process.execPath, args: ["-e", "process.exit(3)"], env: null, cwd: null },
    } });
    const stdioMessage = stdioPreview.errors?.[0]?.message ?? "";
    expect(stdioMessage).toBe(STDIO_EXIT_MESSAGE);

    for (const message of [refusedPreview.errors?.[0]?.message, refusedDiscover.data!.discoverAndRegisterMcpServerTools.message, stdioMessage]) {
      expect(message).not.toMatch(/HTTP \d{3}/);
    }
    responses.push(refusedPreview, refusedDiscover, stdioPreview);
  }, 60_000);

  it("never shows the token in a response or in the server's output", async () => {
    expect(responses.length).toBeGreaterThan(0);
    expect(JSON.stringify(responses)).not.toContain(DUMMY);
    await server!.stop();
    expect(server!.output()).not.toContain(DUMMY);
  }, 60_000);
});
