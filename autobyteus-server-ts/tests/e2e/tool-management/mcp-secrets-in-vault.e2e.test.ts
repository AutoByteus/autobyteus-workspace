/**
 * MCP server secrets in the vault through the real built server (autobyteus-244), with the tiny MCP test server
 * (Node, autobyteus-189) over stdio and streamable HTTP.
 *
 * Purpose:
 *   - a `mcps.json` written before this change (plain values) still loads and works; the values that look like
 *     secrets are offered for the move (no value in the list), and the move writes a 0600 backup, stores the values in
 *     the server's own vault and rewrites `mcps.json` with references; the moved servers keep working;
 *   - a value saved locked through GraphQL is a vault entry and `mcps.json` holds only its reference;
 *   - tool calls through `/mcp/gateway` receive the stdio env value and the HTTP token resolved from the vault, also
 *     after a restart (startup registration);
 *   - no secret value appears in a GraphQL response (once locked), in `mcps.json`, in the server's output or in any
 *     file under the runtime root except the backup the move wrote on purpose.
 * Prerequisites: a current build of this worktree (`pnpm -C autobyteus-ts build`, then `pnpm -C autobyteus-server-ts
 * build`). The test owns its server process, port, runtime root and database (and so its own vault).
 * Values: dummy only.
 * Command: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-secrets-in-vault.e2e.test.ts --no-watch
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import {
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";
import { startHttpTestServer, type HttpTestServer } from "../../../../autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.js";

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type Entry = { name: string; value: string | null; state: string };
type ListedServer = { serverId: string; env?: Entry[]; headers?: Entry[]; tokenState?: string | null };

const NODE_FIXTURE = fileURLToPath(new URL("../../../../autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs", import.meta.url));
const ENV_SECRET = "test-dummy-env-secret-a1";
const SAVED_SECRET = "test-dummy-env-secret-b2";
const TOKEN_SECRET = "test-dummy-token-secret-c3";
const SECRETS = [ENV_SECRET, SAVED_SECRET, TOKEN_SECRET];

const LIST = `query { mcpServers {
  ... on StdioMcpServerConfig { serverId env { name value state } }
  ... on StreamableHttpMcpServerConfig { serverId tokenState headers { name value state } } } }`;
const CANDIDATES = `query { mcpSecretMoveCandidates { serverId field matchedBy } }`;
const MOVE = `mutation($selection: [McpServerFieldInput!]!) { moveMcpSecretsToVault(selection: $selection) {
  backupPath moved { serverId field } skipped { serverId field } serversFailingAfterMove { serverId reason } } }`;
const CONFIGURE = `mutation($input: McpServerInput!) { configureMcpServer(input: $input) { savedConfig {
  ... on StdioMcpServerConfig { serverId env { name value state } } } } }`;
const DISCOVER = `mutation($id: String!) { discoverAndRegisterMcpServerTools(serverId: $id) { success message } }`;

describe("MCP server secrets in the vault through the built server", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, `mcp-secrets-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/mcp-secrets-${suffix}.db`);
  const outputs: string[] = [];
  let port = 0;
  let server: RunningTestServer | null = null;
  let http: HttpTestServer | null = null;
  let backupPath = "";

  const gql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    const response = await fetch(`${server!.serverUrl}/graphql`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const mcpsText = () => fs.readFileSync(path.join(runtimeRoot, "mcps.json"), "utf8");
  const listed = async () => new Map((await gql<{ mcpServers: ListedServer[] }>(LIST)).mcpServers.map((entry) => [entry.serverId, entry]));

  /** Calls tools through `/mcp/gateway`, waiting until every one is listed (startup registration is in the background). */
  const callThroughGateway = async (calls: Array<{ name: string; args: Record<string, unknown> }>) => {
    const deadline = Date.now() + 60_000;
    for (;;) {
      const client = new Client({ name: "mcp-secrets-e2e", version: "1.0.0" });
      try {
        await client.connect(new StreamableHTTPClientTransport(new URL(`${server!.serverUrl}/mcp/gateway`)));
        const names = (await client.listTools()).tools.map((tool) => tool.name);
        if (calls.every((call) => names.includes(call.name))) {
          const texts: string[] = [];
          for (const call of calls) {
            const result = await client.callTool({ name: call.name, arguments: call.args }) as { content?: Array<{ text?: string }>; isError?: boolean };
            expect(result.isError ?? false, `${call.name}: ${JSON.stringify(result)}`).toBe(false);
            texts.push((result.content ?? []).map((part) => part.text ?? "").join(""));
          }
          return texts;
        }
      } finally {
        await client.close().catch(() => undefined);
      }
      if (Date.now() > deadline) throw new Error(`Gateway never listed ${calls.map((call) => call.name).join(", ")}`);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  };
  const reportedEnv = (text: string) => JSON.parse(text).value as string | null;

  const start = async () => {
    server = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl, port });
  };
  const stop = async () => {
    if (!server) return;
    await server.stop();
    outputs.push(server.output());
    server = null;
  };

  beforeAll(async () => {
    port = await reserveLoopbackPort();
    http = await startHttpTestServer("node", TOKEN_SECRET);
    // A `mcps.json` as the app wrote it before this change: plain values only.
    fs.mkdirSync(runtimeRoot, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(runtimeRoot, "mcps.json"), JSON.stringify({
      mcpServers: {
        local: { command: process.execPath, args: [NODE_FIXTURE], env: { GITHUB_TOKEN: ENV_SECRET, LOG_LEVEL: "debug" }, tool_name_prefix: "local" },
        remote: { url: http.url, token: TOKEN_SECRET, tool_name_prefix: "remote" },
      },
    }, null, 2));
    await start();
  }, 180_000);

  afterAll(async () => {
    if (server && server.child.exitCode === null) server.child.kill("SIGKILL");
    await http?.close();
    await removeOwnedTestRuntime(runtimeRoot, database);
  }, 60_000);

  it("loads the plain file, offers its secrets for the move, and moves them with a backup", async () => {
    const [envBefore, echoBefore] = await callThroughGateway([
      { name: "local_report_env_and_cwd", args: { name: "GITHUB_TOKEN" } },
      { name: "remote_echo", args: { text: "before" } },
    ]);
    expect(reportedEnv(envBefore!)).toBe(ENV_SECRET);
    expect(echoBefore).toContain("before");

    const before = await listed();
    // A plain env value is a setting until it is moved or locked; the token is always secret and never returned.
    expect(before.get("local")?.env).toEqual([
      { name: "GITHUB_TOKEN", value: ENV_SECRET, state: "PLAIN" },
      { name: "LOG_LEVEL", value: "debug", state: "PLAIN" },
    ]);
    expect(before.get("remote")).toMatchObject({ tokenState: "PLAIN", headers: [] });

    const { mcpSecretMoveCandidates: candidates } = await gql<{ mcpSecretMoveCandidates: Array<{ serverId: string; field: string; matchedBy: string }> }>(CANDIDATES);
    expect(candidates).toEqual([
      { serverId: "local", field: "env:GITHUB_TOKEN", matchedBy: "NAME" },
      { serverId: "remote", field: "token", matchedBy: "ALWAYS_SECRET" },
    ]);
    const plainFile = mcpsText();

    const { moveMcpSecretsToVault: result } = await gql<{ moveMcpSecretsToVault: {
      backupPath: string; moved: unknown[]; skipped: unknown[]; serversFailingAfterMove: unknown[] } }>(MOVE,
      { selection: candidates.map(({ serverId, field }) => ({ serverId, field })) });

    expect(result).toMatchObject({ moved: [{ serverId: "local", field: "env:GITHUB_TOKEN" }, { serverId: "remote", field: "token" }], skipped: [], serversFailingAfterMove: [] });
    backupPath = result.backupPath;
    expect(path.dirname(backupPath)).toBe(fs.realpathSync(runtimeRoot));
    expect(path.basename(backupPath)).toMatch(/^mcps\.json\.backup-before-vault-move-/);
    expect(fs.readFileSync(backupPath, "utf8")).toBe(plainFile);
    expect(fs.statSync(backupPath).mode & 0o777).toBe(0o600);

    const stored = JSON.parse(mcpsText()) as { mcpServers: Record<string, any> };
    const reference = { vaultSecretId: expect.stringMatching(/^mcp\.[0-9a-f-]{36}$/) };
    expect(stored.mcpServers.local.env).toEqual({ GITHUB_TOKEN: reference, LOG_LEVEL: "debug" });
    expect(stored.mcpServers.remote.token).toEqual(reference);
    const after = await listed();
    expect(after.get("local")?.env).toEqual([
      { name: "GITHUB_TOKEN", value: null, state: "CONFIGURED" },
      { name: "LOG_LEVEL", value: "debug", state: "PLAIN" },
    ]);
    expect(after.get("remote")).toMatchObject({ tokenState: "CONFIGURED" });
    expect((await gql<{ mcpSecretMoveCandidates: unknown[] }>(CANDIDATES)).mcpSecretMoveCandidates).toEqual([]);

    const [envAfter, echoAfter] = await callThroughGateway([
      { name: "local_report_env_and_cwd", args: { name: "GITHUB_TOKEN" } },
      { name: "remote_echo", args: { text: "after" } },
    ]);
    expect(reportedEnv(envAfter!)).toBe(ENV_SECRET);
    expect(echoAfter).toContain("after");
  }, 120_000);

  it("stores a value saved locked through GraphQL in the vault, and returns only its state", async () => {
    const { configureMcpServer } = await gql<{ configureMcpServer: { savedConfig: ListedServer } }>(CONFIGURE, { input: {
      serverId: "saved", transportType: "STDIO", enabled: true, toolNamePrefix: "saved",
      stdioConfig: { command: process.execPath, args: [NODE_FIXTURE], cwd: null,
        env: [{ name: "SERVICE_PASSWORD", secret: true, value: SAVED_SECRET }, { name: "MODE", secret: false, value: "test" }] },
    } });
    expect(configureMcpServer.savedConfig.env).toEqual([
      { name: "SERVICE_PASSWORD", value: null, state: "CONFIGURED" },
      { name: "MODE", value: "test", state: "PLAIN" },
    ]);
    expect(JSON.parse(mcpsText()).mcpServers.saved.env.SERVICE_PASSWORD).toEqual({ vaultSecretId: expect.stringMatching(/^mcp\./) });
    const discovered = await gql<{ discoverAndRegisterMcpServerTools: { success: boolean; message: string } }>(DISCOVER, { id: "saved" });
    expect(discovered.discoverAndRegisterMcpServerTools.success, discovered.discoverAndRegisterMcpServerTools.message).toBe(true);

    const [env] = await callThroughGateway([{ name: "saved_report_env_and_cwd", args: { name: "SERVICE_PASSWORD" } }]);
    expect(reportedEnv(env!)).toBe(SAVED_SECRET);
  }, 120_000);

  it("resolves the stored secrets from the vault after a restart, and no value leaks", async () => {
    await stop();
    await start();

    const [localEnv, savedEnv, echo] = await callThroughGateway([
      { name: "local_report_env_and_cwd", args: { name: "GITHUB_TOKEN" } },
      { name: "saved_report_env_and_cwd", args: { name: "SERVICE_PASSWORD" } },
      { name: "remote_echo", args: { text: "restarted" } },
    ]);
    expect(reportedEnv(localEnv!)).toBe(ENV_SECRET);
    expect(reportedEnv(savedEnv!)).toBe(SAVED_SECRET);
    expect(echo).toContain("restarted");
    expect(http!.requests().every((auth) => auth === "ok")).toBe(true);
    const listedText = JSON.stringify([...(await listed()).values()]);
    await stop();

    // Nothing but the backup (written on purpose and named to the user) holds a value.
    const combinedOutput = outputs.join("\n");
    const filesWithValues: string[] = [];
    const scan = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else if (full !== fs.realpathSync(backupPath) && SECRETS.some((secret) => fs.readFileSync(full).includes(secret))) filesWithValues.push(full);
      }
    };
    scan(fs.realpathSync(runtimeRoot));
    expect({
      output: SECRETS.filter((secret) => combinedOutput.includes(secret)),
      listed: SECRETS.filter((secret) => listedText.includes(secret)),
      files: filesWithValues,
    }).toEqual({ output: [], listed: [], files: [] });
  }, 120_000);
});
