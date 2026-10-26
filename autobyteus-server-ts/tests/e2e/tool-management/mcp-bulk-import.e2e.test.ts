/**
 * MCP bulk import through the real built server (mcp-bulk-import-errors, autobyteus-190; MCP secrets, autobyteus-244).
 *
 * Purpose:
 *   - a mixed import reports each failed entry with its server id and reason, and no env, header or token value
 *     appears anywhere in the result (AC-001); a value the secret rule matches is stored in the server's vault, the
 *     result lists it (`storedSecrets`), and `mcps.json` holds only its reference;
 *   - importing the content of the app's own `mcps.json` (entries without `transport_type`) imports every entry and
 *     saves the same entries again (AC-002). A secret reference is kept when the server already holds one at that
 *     field; otherwise (for example after the server was deleted) it imports as needing a secret (`needsSecret`, a
 *     fresh `MISSING` reference), because a foreign vault ID is never adopted (MDEC-007).
 * Prerequisites: a current build of this worktree (`pnpm -C autobyteus-ts build`, then `pnpm -C autobyteus-server-ts
 * build`). The test owns its server process, port, runtime root and database (and so its own vault). No MCP server is
 * started: import only saves.
 * Values: dummy only.
 * Command: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-bulk-import.e2e.test.ts --no-watch
 */
import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type ImportResult = {
  success: boolean;
  message: string;
  importedCount: number;
  failedCount: number;
  failures: Array<{ serverId: string; reason: string }>;
  storedSecrets: Array<{ serverId: string; field: string }>;
  needsSecret: Array<{ serverId: string; field: string }>;
};

const DUMMY_SECRET = /test-dummy-[a-z]+-secret/;

describe("MCP bulk import through GraphQL", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, `mcp-bulk-import-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/mcp-bulk-import-${suffix}.db`);
  let server: RunningTestServer | null = null;

  const gql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const res = await fetch(`${server!.serverUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }) });
    const body = await res.json() as { data?: T; errors?: unknown[] };
    if (!body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const importJson = async (json: string) => (await gql<{ importMcpServerConfigs: ImportResult }>(
    "mutation($json: String!) { importMcpServerConfigs(jsonString: $json) { success message importedCount failedCount failures { serverId reason } storedSecrets { serverId field } needsSecret { serverId field } } }",
    { json })).importMcpServerConfigs;
  const storedText = async () => fs.readFile(path.join(runtimeRoot, "mcps.json"), "utf8");
  const storedFile = async () => JSON.parse(await storedText()) as { mcpServers: Record<string, any> };
  const deleteServer = async (serverId: string) =>
    gql("mutation($id: String!) { deleteMcpServer(serverId: $id) { success } }", { id: serverId });

  beforeAll(async () => {
    server = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl });
  }, 180_000);

  afterAll(async () => {
    if (server) {
      await server.stop();
      // No value reaches the server's own output.
      expect(server.output()).not.toMatch(DUMMY_SECRET);
    }
    await removeOwnedTestRuntime(runtimeRoot, database);
  }, 60_000);

  it("reports each failed entry with its reason, without any secret value, and stores rule matches in the vault", async () => {
    const result = await importJson(JSON.stringify({
      mcpServers: {
        ok: { command: "node", args: ["server.js"], env: { API_KEY: "test-dummy-env-secret", LOG_LEVEL: "debug" } },
        bad: { transport_type: "websocket", url: "ws://127.0.0.1:8765/mcp", headers: { Authorization: "Bearer test-dummy-header-secret" } },
        empty: {},
        both: { url: "http://127.0.0.1:9000/mcp", token: "test-dummy-token-secret", headers: { authorization: "Basic test-dummy-basic-secret" } },
      },
    }));

    expect(result).toMatchObject({ success: false, message: "Import complete. Imported: 1, Failed: 3", importedCount: 1, failedCount: 3 });
    expect(result.failures).toEqual([
      { serverId: "bad", reason: "Invalid 'transport_type' string 'websocket' for server 'bad'. Valid types are: stdio, streamable_http." },
      { serverId: "empty", reason: "Config for server 'empty' needs 'command' (stdio) or 'url' (streamable_http), or an explicit 'transport_type'." },
      { serverId: "both", reason: expect.stringContaining("sets both 'token' and an 'Authorization' header; use one of them.") },
    ]);
    expect(result.storedSecrets).toEqual([{ serverId: "ok", field: "env:API_KEY" }]);
    expect(result.needsSecret).toEqual([]);
    expect(JSON.stringify(result)).not.toMatch(DUMMY_SECRET);
    const stored = await storedFile();
    expect(Object.keys(stored.mcpServers)).toEqual(["ok"]);
    expect(stored.mcpServers.ok.env).toEqual({ API_KEY: { vaultSecretId: expect.stringMatching(/^mcp\.[0-9a-f-]{36}$/) }, LOG_LEVEL: "debug" });
    expect(await storedText()).not.toMatch(DUMMY_SECRET);
    await deleteServer("ok");
  });

  it("imports the content of the app's own mcps.json, keeping its own references and marking foreign ones as needing a secret", async () => {
    for (const input of [
      { serverId: "local", transportType: "STDIO", enabled: false, toolNamePrefix: "lc",
        stdioConfig: { command: "node", args: ["server.js", "--flag"], env: [{ name: "DUMMY", secret: false, value: "test-dummy" }], cwd: runtimeRoot } },
      { serverId: "remote-headers", transportType: "STREAMABLE_HTTP", enabled: true, toolNamePrefix: null,
        streamableHttpConfig: { url: "http://127.0.0.1:9000/mcp", token: null, headers: [{ name: "X-Test", secret: false, value: "test-dummy" }] } },
      { serverId: "remote-token", transportType: "STREAMABLE_HTTP", enabled: true, toolNamePrefix: "rt",
        streamableHttpConfig: { url: "http://127.0.0.1:9001/mcp", token: { value: "test-dummy-token-secret" }, headers: [] } },
    ]) {
      await gql("mutation($input: McpServerInput!) { configureMcpServer(input: $input) { savedConfig { __typename } } }", { input });
    }
    const original = await storedFile();
    expect(Object.keys(original.mcpServers).sort()).toEqual(["local", "remote-headers", "remote-token"]);
    expect(JSON.stringify(original)).not.toContain("transport_type");
    expect(JSON.stringify(original)).not.toMatch(DUMMY_SECRET);
    const tokenReference = original.mcpServers["remote-token"].token.vaultSecretId as string;

    // Re-importing while the servers exist: every entry is saved again as it was, the token reference is kept.
    const again = await importJson(JSON.stringify(original));
    expect(again).toEqual({
      success: true, message: "Import complete. Imported: 3, Failed: 0", importedCount: 3, failedCount: 0,
      failures: [], storedSecrets: [], needsSecret: [],
    });
    expect((await storedFile()).mcpServers).toEqual(original.mcpServers);

    // After deleting them, the token's reference is foreign here: the entry imports, its token needs a secret.
    for (const serverId of Object.keys(original.mcpServers)) await deleteServer(serverId);
    expect((await storedFile()).mcpServers).toEqual({});

    const result = await importJson(JSON.stringify(original));

    expect(result).toEqual({
      success: true, message: "Import complete. Imported: 3, Failed: 0", importedCount: 3, failedCount: 0,
      failures: [], storedSecrets: [], needsSecret: [{ serverId: "remote-token", field: "token" }],
    });
    const stored = (await storedFile()).mcpServers;
    const { "remote-token": originalToken, ...plainEntries } = original.mcpServers;
    const { "remote-token": importedToken, ...importedPlain } = stored;
    expect(importedPlain).toEqual(plainEntries);
    expect(importedToken).toEqual({ ...originalToken, token: { vaultSecretId: expect.stringMatching(/^mcp\.[0-9a-f-]{36}$/) } });
    expect(importedToken.token.vaultSecretId).not.toBe(tokenReference);
    const listed = await gql<{ mcpServers: Array<{ serverId: string; tokenState?: string | null }> }>(
      "query { mcpServers { ... on StreamableHttpMcpServerConfig { serverId tokenState } } }");
    expect(listed.mcpServers.find((entry) => entry.serverId === "remote-token")?.tokenState).toBe("MISSING");
  });
});
