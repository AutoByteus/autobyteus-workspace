/**
 * Remote MCP redirects and unsupported transports through the real built server.
 *
 * Purpose:
 *   - A remote (streamable HTTP) MCP endpoint that redirects to another origin is not followed: GraphQL preview and
 *     discover fail with the SDK's "Redirect to … not followed" message, the other origin receives no request (so
 *     no credential leaves the configured origin), and the message carries no query-string value.
 *   - A same-origin redirect (an endpoint that moved, 308) is followed with the credential, through preview,
 *     save + discover and a tool call through `/mcp/gateway`.
 *   - Bulk import of a `transport_type: "websocket"` entry is rejected and not saved; a valid entry in the same
 *     import is saved. The server log names the supported transports.
 *   - Entries a WebSocket import left in `mcps.json` under earlier builds (stdio shape with an empty command) or a
 *     hand-written `websocket` entry do not stop startup: the valid entry next to them is registered and callable.
 * Prerequisites: a current build of this worktree (`pnpm -C autobyteus-ts build`, then
 * `pnpm -C autobyteus-server-ts build`). The test owns its server processes, ports, runtime roots and databases.
 * Values: dummy only (`test-dummy`, `test-dummy-canary`).
 * Optional: MCP_REDIRECT_E2E_EVIDENCE_DIR=<dir> writes value-free observations and the server-output scan.
 * Command: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts --no-watch
 */
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";
import { AUTH_PROBE_TOOL, startAuthRequiredMcpServer, type AuthRequiredMcpServer } from "../helpers/auth-required-mcp-server.js";

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type GraphqlResult<T> = { data?: T; errors?: Array<{ message: string }> };

const DUMMY = "test-dummy";
const CANARY = "test-dummy-canary";
const evidenceDir = process.env["MCP_REDIRECT_E2E_EVIDENCE_DIR"]?.trim() || null;

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
const IMPORT = `mutation Import($jsonString: String!) {
  importMcpServerConfigs(jsonString: $jsonString) { success message importedCount failedCount } }`;
const LIST = `query List { mcpServers { ... on StreamableHttpMcpServerConfig { serverId } ... on StdioMcpServerConfig { serverId } } }`;

const tokenInput = (serverId: string, url: string, toolNamePrefix: string) => ({
  serverId, transportType: "STREAMABLE_HTTP", enabled: true, toolNamePrefix,
  streamableHttpConfig: { url, token: DUMMY, headers: null },
});

const callThroughGateway = async (serverUrl: string, name: string) => {
  const client = new Client({ name: "mcp-redirect-e2e-gateway-client", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${serverUrl}/mcp/gateway`)));
  try {
    const result = await client.callTool({ name, arguments: {} }) as { content?: Array<{ text?: string }>; isError?: boolean };
    return { isError: result.isError ?? false, text: (result.content ?? []).map((part) => part.text ?? "").join("") };
  } finally {
    await client.close();
  }
};

const waitForGatewayTool = async (serverUrl: string, name: string, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const client = new Client({ name: "mcp-redirect-e2e-wait", version: "1.0.0" });
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL(`${serverUrl}/mcp/gateway`)));
      if ((await client.listTools()).tools.some((tool) => tool.name === name)) return true;
    } catch {
      // Not listening or not registered yet.
    } finally {
      await client.close().catch(() => undefined);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
};

describe("Remote MCP redirects and unsupported transports through the built server", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const targets: Array<{ runtimeRoot: string; database: ReturnType<typeof resolveTestDatabaseLocation> }> = [];
  const running = new Set<RunningTestServer>();
  const outputs: string[] = [];
  // B: the other origin, which accepts the credential (so any request that reaches it would succeed).
  let other: AuthRequiredMcpServer;
  // A: the configured origin; `/mcp` redirects to B (307, with a query value), `/moved` redirects to `/mcp-new` (308).
  let crossOrigin: AuthRequiredMcpServer;
  let moved: AuthRequiredMcpServer;
  // A plain server for the import and stored-entry cases.
  let plain: AuthRequiredMcpServer;

  const newTarget = (label: string) => {
    const target = {
      runtimeRoot: path.join(testRuntimeRoot, `mcp-redirect-${label}-${suffix}`),
      database: resolveTestDatabaseLocation(`file:./db/mcp-redirect-${label}-${suffix}.db`),
    };
    targets.push(target);
    return target;
  };
  const start = async (target: { runtimeRoot: string; database: ReturnType<typeof resolveTestDatabaseLocation> }) => {
    const server = await startBuiltTestServer({ runtimeRoot: target.runtimeRoot, databaseUrlOverride: target.database.databaseUrl,
      port: await reserveLoopbackPort() });
    running.add(server);
    return server;
  };
  const stop = async (server: RunningTestServer) => {
    await server.stop();
    outputs.push(server.output());
    running.delete(server);
  };

  beforeAll(async () => {
    other = await startAuthRequiredMcpServer({ requiredAuthorization: `Bearer ${DUMMY}`, marker: "MARKER-OTHER-8811" });
    crossOrigin = await startAuthRequiredMcpServer({ requiredAuthorization: `Bearer ${DUMMY}`, marker: "MARKER-A-8812",
      redirects: { "/mcp": { status: 307, location: `${other.url}?canary=${CANARY}` } } });
    moved = await startAuthRequiredMcpServer({ requiredAuthorization: `Bearer ${DUMMY}`, marker: "MARKER-MOVED-8813",
      redirects: { "/mcp": { status: 308, location: "/mcp-new" } } });
    plain = await startAuthRequiredMcpServer({ requiredAuthorization: `Bearer ${DUMMY}`, marker: "MARKER-PLAIN-8814" });
  }, 60_000);

  afterAll(async () => {
    for (const server of running) if (server.child.exitCode === null) server.child.kill("SIGKILL");
    for (const each of [other, crossOrigin, moved, plain]) await each?.close();
    for (const target of targets) await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }, 60_000);

  it("refuses a cross-origin redirect, follows a same-origin one, and rejects a websocket import", async () => {
    const server = await start(newTarget("api"));
    const url = server.serverUrl;

    // Cross-origin: preview and save + discover fail with the redirect message; the other origin sees nothing.
    const crossPreview = await graphql(url, PREVIEW, { input: tokenInput("cross", crossOrigin.url, "cross") });
    expect(crossPreview.errors?.[0]?.message).toContain(`Redirect to ${other.url} not followed (redirectPolicy: 'same-origin')`);
    const crossSaved = await graphql(url, CONFIGURE, { input: tokenInput("cross", crossOrigin.url, "cross") });
    expect(crossSaved.errors, JSON.stringify(crossSaved.errors)).toBeUndefined();
    const crossDiscover = await graphql<{ discoverAndRegisterMcpServerTools: { success: boolean; message: string } }>(
      url, DISCOVER, { serverId: "cross" });
    expect(crossDiscover.data!.discoverAndRegisterMcpServerTools.success).toBe(false);
    expect(crossDiscover.data!.discoverAndRegisterMcpServerTools.message).toContain("not followed (redirectPolicy: 'same-origin')");
    expect(JSON.stringify([crossPreview, crossDiscover])).not.toContain(CANARY);
    expect(JSON.stringify([crossPreview, crossDiscover])).not.toContain(DUMMY);
    expect(other.observations).toEqual([]);
    expect(crossOrigin.observations.length).toBeGreaterThanOrEqual(2);
    expect(new Set(crossOrigin.observations.map((entry) => entry.path))).toEqual(new Set(["/mcp"]));

    // Same origin (the endpoint moved, 308): preview, save + discover and a gateway tool call all work.
    const movedPreview = await graphql<{ previewMcpServerTools: Array<{ name: string }> }>(url, PREVIEW,
      { input: tokenInput("moved", moved.url, "moved") });
    expect(movedPreview.errors, JSON.stringify(movedPreview.errors)).toBeUndefined();
    expect(movedPreview.data!.previewMcpServerTools.map((tool) => tool.name)).toEqual([`moved_${AUTH_PROBE_TOOL}`]);
    expect((await graphql(url, CONFIGURE, { input: tokenInput("moved", moved.url, "moved") })).errors).toBeUndefined();
    const movedDiscover = await graphql<{ discoverAndRegisterMcpServerTools: { success: boolean; message: string } }>(
      url, DISCOVER, { serverId: "moved" });
    expect(movedDiscover.data!.discoverAndRegisterMcpServerTools.success, movedDiscover.data!.discoverAndRegisterMcpServerTools.message).toBe(true);
    expect(await callThroughGateway(url, `moved_${AUTH_PROBE_TOOL}`)).toEqual({ isError: false, text: moved.marker });
    const followed = moved.observations.filter((entry) => entry.path === "/mcp-new");
    expect(followed.map((entry) => entry.rpcMethod)).toEqual(expect.arrayContaining(["initialize", "tools/list", "tools/call"]));
    expect(new Set(followed.map((entry) => entry.auth))).toEqual(new Set(["expected"]));

    // WebSocket import: rejected and not saved; the valid entry in the same import is saved.
    const imported = await graphql<{ importMcpServerConfigs: { success: boolean; message: string; importedCount: number; failedCount: number } }>(
      url, IMPORT, { jsonString: JSON.stringify({ mcpServers: {
        ws: { transport_type: "websocket", url: "ws://127.0.0.1:9/mcp" },
        plain: { transport_type: "streamable_http", url: plain.url, token: DUMMY, tool_name_prefix: "plain" },
      } }) });
    expect(imported.data!.importMcpServerConfigs).toMatchObject({ success: false, importedCount: 1, failedCount: 1 });
    const listed = await graphql<{ mcpServers: Array<{ serverId: string }> }>(url, LIST);
    expect(listed.data!.mcpServers.map((entry) => entry.serverId).sort()).toEqual(["cross", "moved", "plain"]);
    const stored = JSON.parse(fs.readFileSync(path.join(server.runtimeRoot, "mcps.json"), "utf8")) as { mcpServers: Record<string, unknown> };
    expect(Object.keys(stored.mcpServers).sort()).toEqual(["cross", "moved", "plain"]);
    expect(server.output()).toContain("Valid types are: stdio, streamable_http.");

    await stop(server);
  }, 180_000);

  it("starts with WebSocket-era entries in mcps.json and registers the valid entry next to them", async () => {
    const target = newTarget("stored");
    fs.mkdirSync(target.runtimeRoot, { recursive: true, mode: 0o700 });
    // What a WebSocket import left under earlier builds (stdio shape, empty command), a hand-written websocket
    // entry, and a valid HTTP entry with the token.
    fs.writeFileSync(path.join(target.runtimeRoot, "mcps.json"), JSON.stringify({ mcpServers: {
      legacy_ws: { command: "" },
      hand_ws: { transport_type: "websocket", url: "ws://127.0.0.1:9/mcp" },
      plain: { url: plain.url, token: DUMMY, tool_name_prefix: "plain" },
    } }, null, 2));
    const mark = plain.observations.length;
    const server = await start(target);
    expect(await waitForGatewayTool(server.serverUrl, `plain_${AUTH_PROBE_TOOL}`)).toBe(true);
    expect(await callThroughGateway(server.serverUrl, `plain_${AUTH_PROBE_TOOL}`)).toEqual({ isError: false, text: plain.marker });
    const listed = await graphql<{ mcpServers: Array<{ serverId: string }> }>(server.serverUrl, LIST);
    expect(listed.data!.mcpServers.map((entry) => entry.serverId)).toEqual(["plain"]);
    expect(new Set(plain.observations.slice(mark).map((entry) => entry.auth))).toEqual(new Set(["expected"]));
    await stop(server);

    // No credential or query value reached either server's output.
    const combined = outputs.join("\n");
    // `test-dummy` is also the prefix of the canary, so one check covers the token and the query value.
    const scan = { outputBytes: combined.length, containsDummy: combined.includes(DUMMY), containsCanary: combined.includes(CANARY) };
    expect(scan).toMatchObject({ containsDummy: false, containsCanary: false });
    if (evidenceDir) {
      fs.mkdirSync(evidenceDir, { recursive: true });
      fs.writeFileSync(path.join(evidenceDir, "observations.json"), JSON.stringify({
        observations: { other: other.observations, crossOrigin: crossOrigin.observations, moved: moved.observations, plain: plain.observations },
        serverOutputScan: scan,
      }, null, 2));
    }
  }, 180_000);
});
