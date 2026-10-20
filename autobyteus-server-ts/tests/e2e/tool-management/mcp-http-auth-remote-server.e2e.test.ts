/**
 * Remote (streamable HTTP) MCP server credentials through the real built server.
 *
 * Purpose: a server configured with a fixed `Authorization` header or with the token receives that credential on
 * every request AutoByteus makes: GraphQL preview, save + discover, import, tool calls through `/mcp/gateway`, and
 * the startup registration after a real process restart. A token together with an `Authorization` header is
 * rejected on save, preview and import, and nothing is saved. Credential values never reach the server's output.
 * Prerequisites: a current build of this worktree (`pnpm -C autobyteus-ts build`, then
 * `pnpm -C autobyteus-server-ts build`). The test owns its server processes, port, runtime root and database.
 * Values: dummy only (`test-dummy`, `test-wrong`). The local MCP servers record only whether `Authorization` was
 * the expected value, another value or missing.
 * Optional: MCP_AUTH_E2E_EVIDENCE_DIR=<dir> writes those value-free observations and the output-scan result.
 * Command: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts --no-watch
 */
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
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
const WRONG = "test-wrong";
const CONFLICT_MESSAGE = "sets both 'token' and an 'Authorization' header; use one of them.";
const evidenceDir = process.env["MCP_AUTH_E2E_EVIDENCE_DIR"]?.trim() || null;

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
const LIST = `query List { mcpServers { ... on StreamableHttpMcpServerConfig { serverId url token headers toolNamePrefix } } }`;

const httpInput = (serverId: string, url: string, credentials: { token?: string | null; headers?: Record<string, string> },
  toolNamePrefix: string | null = null) => ({
  serverId, transportType: "STREAMABLE_HTTP", enabled: true, toolNamePrefix,
  streamableHttpConfig: { url, token: credentials.token ?? null, headers: credentials.headers ?? null },
});

/** Lists and calls every tool through the server's `/mcp/gateway`, as an external MCP client does. */
const callThroughGateway = async (serverUrl: string, toolNames: string[]) => {
  const client = new Client({ name: "mcp-auth-e2e-gateway-client", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${serverUrl}/mcp/gateway`)));
  try {
    const listed = (await client.listTools()).tools.map((tool) => tool.name);
    const results: Record<string, string> = {};
    for (const name of toolNames) {
      const result = await client.callTool({ name, arguments: {} }) as { content?: Array<{ text?: string }>; isError?: boolean };
      expect(result.isError ?? false, `${name}: ${JSON.stringify(result)}`).toBe(false);
      results[name] = (result.content ?? []).map((part) => part.text ?? "").join("");
    }
    return { listed, results };
  } finally {
    await client.close();
  }
};

describe("Remote MCP server credentials through the built server", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, `mcp-http-auth-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/mcp-http-auth-${suffix}.db`);
  const outputs: string[] = [];
  let port = 0;
  let server: RunningTestServer | null = null;
  // Fixed header as Atlassian documents it (Basic), the token (sent as Bearer), an imported header entry, and an
  // open server without credentials.
  let hdr: AuthRequiredMcpServer;
  let tok: AuthRequiredMcpServer;
  let imp: AuthRequiredMcpServer;
  let open: AuthRequiredMcpServer;
  const allServers = () => ({ hdr, tok, imp, open });
  const toolName = (prefix: string) => `${prefix}_${AUTH_PROBE_TOOL}`;
  const allTools = ["hdr", "tok", "imp", "open"].map(toolName);

  const start = async () => {
    server = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl, port });
    return server;
  };
  const stop = async () => {
    if (!server) return;
    await server.stop();
    outputs.push(server.output());
    server = null;
  };

  beforeAll(async () => {
    port = await reserveLoopbackPort();
    hdr = await startAuthRequiredMcpServer({ requiredAuthorization: `Basic ${DUMMY}`, marker: "MARKER-HDR-5521" });
    tok = await startAuthRequiredMcpServer({ requiredAuthorization: `Bearer ${DUMMY}`, marker: "MARKER-TOK-5522" });
    imp = await startAuthRequiredMcpServer({ requiredAuthorization: `Bearer ${DUMMY}`, marker: "MARKER-IMP-5523" });
    open = await startAuthRequiredMcpServer({ requiredAuthorization: null, marker: "MARKER-OPEN-5524" });
    await start();
  }, 180_000);

  afterAll(async () => {
    if (server && server.child.exitCode === null) server.child.kill("SIGKILL");
    for (const each of [hdr, tok, imp, open]) await each?.close();
    await removeOwnedTestRuntime(runtimeRoot, database);
  }, 60_000);

  it("sends the header or token on preview, save, import and tool calls, and rejects token plus Authorization", async () => {
    const url = server!.serverUrl;

    // Preview: header form, token form (surrounding whitespace trimmed), open server.
    for (const [input, target] of [
      [httpInput("hdr", hdr.url, { headers: { Authorization: `Basic ${DUMMY}` } }), hdr],
      [httpInput("tok", tok.url, { token: `  ${DUMMY}  ` }), tok],
      [httpInput("open", open.url, {}), open],
    ] as const) {
      const preview = await graphql<{ previewMcpServerTools: Array<{ name: string }> }>(url, PREVIEW, { input });
      expect(preview.errors, JSON.stringify(preview.errors)).toBeUndefined();
      expect(preview.data!.previewMcpServerTools.map((tool) => tool.name)).toEqual([AUTH_PROBE_TOOL]);
      expect(target.observations.map((entry) => entry.rpcMethod)).toEqual(expect.arrayContaining(["initialize", "tools/list"]));
    }
    expect(new Set(hdr.observations.map((entry) => entry.auth))).toEqual(new Set(["expected"]));
    expect(new Set(tok.observations.map((entry) => entry.auth))).toEqual(new Set(["expected"]));
    expect(new Set(open.observations.map((entry) => entry.auth))).toEqual(new Set(["none"]));

    // Wrong credential and blank token: the server's auth failure is reported, and the value is not in the error.
    const tokBefore = tok.observations.length;
    const wrong = await graphql(url, PREVIEW, { input: httpInput("tok", tok.url, { token: WRONG }) });
    const blank = await graphql(url, PREVIEW, { input: httpInput("tok", tok.url, { token: "   " }) });
    expect(wrong.errors?.[0]?.message).toContain("Failed to preview tools for MCP server");
    expect(blank.errors?.[0]?.message).toContain("Failed to preview tools for MCP server");
    expect(JSON.stringify([wrong, blank])).not.toContain(WRONG);
    const rejected = tok.observations.slice(tokBefore).map((entry) => entry.auth);
    expect(rejected).toContain("other");
    expect(rejected).toContain("none");

    // Token plus Authorization (any letter case): rejected on save, preview and import; nothing reaches the server.
    const tokBeforeConflict = tok.observations.length;
    const conflictSave = await graphql(url, CONFIGURE,
      { input: httpInput("conflict", tok.url, { token: DUMMY, headers: { authorization: `Basic ${DUMMY}` } }) });
    const conflictPreview = await graphql(url, PREVIEW,
      { input: httpInput("conflict", tok.url, { token: DUMMY, headers: { Authorization: `Basic ${DUMMY}` } }) });
    const conflictImport = await graphql<{ importMcpServerConfigs: { success: boolean; importedCount: number; failedCount: number } }>(
      url, IMPORT, { jsonString: JSON.stringify({ mcpServers: { conflict: {
        transport_type: "streamable_http", url: tok.url, token: DUMMY, headers: { AUTHORIZATION: `Basic ${DUMMY}` } } } }) });
    expect(conflictSave.errors?.[0]?.message).toContain(CONFLICT_MESSAGE);
    expect(conflictPreview.errors?.[0]?.message).toContain(CONFLICT_MESSAGE);
    expect(JSON.stringify([conflictSave.errors, conflictPreview.errors])).not.toContain(DUMMY);
    expect(conflictImport.data!.importMcpServerConfigs).toMatchObject({ success: false, importedCount: 0, failedCount: 1 });
    expect(tok.observations.length).toBe(tokBeforeConflict);

    // Save + discover through GraphQL; import a header entry in the documented `{url, headers}` shape.
    for (const input of [
      httpInput("hdr", hdr.url, { headers: { Authorization: `Basic ${DUMMY}` } }, "hdr"),
      httpInput("tok", tok.url, { token: DUMMY }, "tok"),
      httpInput("open", open.url, {}, "open"),
    ]) {
      const saved = await graphql(url, CONFIGURE, { input });
      expect(saved.errors, JSON.stringify(saved.errors)).toBeUndefined();
    }
    const imported = await graphql<{ importMcpServerConfigs: { success: boolean; importedCount: number } }>(url, IMPORT,
      { jsonString: JSON.stringify({ mcpServers: { imp: {
        transport_type: "streamable_http", url: imp.url, headers: { Authorization: `Bearer ${DUMMY}` }, tool_name_prefix: "imp" } } }) });
    expect(imported.data!.importMcpServerConfigs).toMatchObject({ success: true, importedCount: 1 });
    for (const serverId of ["hdr", "tok", "imp", "open"]) {
      const discovered = await graphql<{ discoverAndRegisterMcpServerTools: { success: boolean; message: string; discoveredTools: Array<{ name: string }> } }>(
        url, DISCOVER, { serverId });
      expect(discovered.data!.discoverAndRegisterMcpServerTools.success, discovered.data!.discoverAndRegisterMcpServerTools.message).toBe(true);
      expect(discovered.data!.discoverAndRegisterMcpServerTools.discoveredTools.map((tool) => tool.name)).toEqual([toolName(serverId)]);
    }

    // Saved state: nothing from the rejected attempts; token and headers kept as separate fields.
    const listed = await graphql<{ mcpServers: Array<{ serverId: string; token: string | null; headers: Record<string, string> | null }> }>(url, LIST);
    const byId = new Map(listed.data!.mcpServers.map((entry) => [entry.serverId, entry]));
    expect([...byId.keys()].sort()).toEqual(["hdr", "imp", "open", "tok"]);
    expect(byId.get("tok")).toMatchObject({ token: DUMMY, headers: {} });
    expect(byId.get("hdr")).toMatchObject({ token: null, headers: { Authorization: `Basic ${DUMMY}` } });
    type StoredEntry = { url?: string; token?: string; headers?: Record<string, string>; tool_name_prefix?: string };
    const stored = JSON.parse(fs.readFileSync(path.join(runtimeRoot, "mcps.json"), "utf8")) as {
      mcpServers: { hdr: StoredEntry; tok: StoredEntry; imp: StoredEntry; open: StoredEntry } };
    expect(Object.keys(stored.mcpServers).sort()).toEqual(["hdr", "imp", "open", "tok"]);
    expect(Object.keys(stored.mcpServers.tok).sort()).toEqual(["token", "tool_name_prefix", "url"]);
    expect(stored.mcpServers.tok.token).toBe(DUMMY);
    expect(Object.keys(stored.mcpServers.hdr).sort()).toEqual(["headers", "tool_name_prefix", "url"]);

    // Tool calls through the gateway: each remote server sees its credential on the tools/call request itself.
    const { listed: gatewayTools, results } = await callThroughGateway(url, allTools);
    expect(gatewayTools).toEqual(expect.arrayContaining(allTools));
    expect(results).toEqual({ [toolName("hdr")]: hdr.marker, [toolName("tok")]: tok.marker, [toolName("imp")]: imp.marker,
      [toolName("open")]: open.marker });
    for (const each of [hdr, tok, imp]) {
      expect(each.toolCalls().map((entry) => entry.auth)).toEqual(["expected"]);
    }
    expect(open.toolCalls().map((entry) => entry.auth)).toEqual(["none"]);
    expect(new Set(imp.observations.map((entry) => entry.auth))).toEqual(new Set(["expected"]));
  }, 180_000);

  it("re-registers saved credentials at startup after a restart and keeps sending them", async () => {
    await stop();
    const marks = new Map([hdr, tok, imp, open].map((each) => [each, each.observations.length]));
    const restarted = await start();

    // Startup registration runs in the background; wait until the gateway lists every saved server's tool.
    const deadline = Date.now() + 60_000;
    let ready = false;
    while (!ready && Date.now() < deadline) {
      const client = new Client({ name: "mcp-auth-e2e-wait", version: "1.0.0" });
      try {
        await client.connect(new StreamableHTTPClientTransport(new URL(`${restarted.serverUrl}/mcp/gateway`)));
        const names = (await client.listTools()).tools.map((tool) => tool.name);
        ready = allTools.every((name) => names.includes(name));
      } catch {
        ready = false;
      } finally {
        await client.close().catch(() => undefined);
      }
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 250));
    }
    expect(ready).toBe(true);
    const { results } = await callThroughGateway(restarted.serverUrl, allTools);
    expect(results[toolName("tok")]).toBe(tok.marker);
    expect(results[toolName("hdr")]).toBe(hdr.marker);
    expect(results[toolName("imp")]).toBe(imp.marker);

    for (const each of [hdr, tok, imp]) {
      const since = each.observations.slice(marks.get(each));
      // Startup registration (initialize + tools/list) and the tool call, all with the saved credential.
      expect(since.map((entry) => entry.rpcMethod)).toEqual(expect.arrayContaining(["initialize", "tools/list", "tools/call"]));
      expect(new Set(since.map((entry) => entry.auth))).toEqual(new Set(["expected"]));
    }
    expect(new Set(open.observations.slice(marks.get(open)).map((entry) => entry.auth))).toEqual(new Set(["none"]));

    await stop();
    // No credential value reaches the server's own output (both runs).
    const combined = outputs.join("\n");
    const scan = { outputBytes: combined.length, containsDummy: combined.includes(DUMMY), containsWrong: combined.includes(WRONG) };
    expect(scan).toMatchObject({ containsDummy: false, containsWrong: false });

    if (evidenceDir) {
      fs.mkdirSync(evidenceDir, { recursive: true });
      fs.writeFileSync(path.join(evidenceDir, "observations.json"), JSON.stringify({
        observations: Object.fromEntries(Object.entries(allServers()).map(([key, each]) => [key, each.observations])),
        serverOutputScan: scan,
      }, null, 2));
    }
  }, 180_000);
});
