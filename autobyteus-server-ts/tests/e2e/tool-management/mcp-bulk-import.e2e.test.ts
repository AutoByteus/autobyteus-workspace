/**
 * MCP bulk import through the real Studio GraphQL server (mcp-bulk-import-errors, autobyteus-190).
 *
 * Purpose:
 *   - a mixed import reports each failed entry with its server id and reason, and no env, header or token value
 *     appears anywhere in the result (AC-001);
 *   - importing the content of the app's own `mcps.json` (entries without `transport_type`) imports every entry and
 *     saves the same entries again (AC-002).
 * Prerequisites: none (in-process server, test-owned data directory). No MCP server is started: import only saves.
 * Values: dummy only.
 * Command: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-bulk-import.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

type ImportResult = {
  success: boolean;
  message: string;
  importedCount: number;
  failedCount: number;
  failures: Array<{ serverId: string; reason: string }>;
};

describe("MCP bulk import through GraphQL", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;

  const gql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const res = await fetch(new URL("/graphql", url), { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }) });
    const body = await res.json() as { data?: T; errors?: unknown[] };
    if (!body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const importJson = async (json: string) => (await gql<{ importMcpServerConfigs: ImportResult }>(
    "mutation($json: String!) { importMcpServerConfigs(jsonString: $json) { success message importedCount failedCount failures { serverId reason } } }",
    { json })).importMcpServerConfigs;
  const storedFile = async () =>
    JSON.parse(await fs.readFile(path.join(dataDir, "mcps.json"), "utf8")) as { mcpServers: Record<string, unknown> };
  const deleteServer = async (serverId: string) =>
    gql("mutation($id: String!) { deleteMcpServer(serverId: $id) { success } }", { id: serverId });

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "mcp-bulk-import-e2e-")));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
  }, 120_000);

  afterAll(async () => {
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("reports each failed entry with its reason, without any secret value, and imports the rest", async () => {
    const result = await importJson(JSON.stringify({
      mcpServers: {
        ok: { command: "node", args: ["server.js"], env: { API_KEY: "test-dummy-env-secret" } },
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
    expect(JSON.stringify(result)).not.toMatch(/test-dummy-[a-z]+-secret/);
    expect(Object.keys((await storedFile()).mcpServers)).toEqual(["ok"]);
    await deleteServer("ok");
  });

  it("imports the content of the app's own mcps.json and saves the same entries again", async () => {
    for (const input of [
      { serverId: "local", transportType: "STDIO", enabled: false, toolNamePrefix: "lc",
        stdioConfig: { command: "node", args: ["server.js", "--flag"], env: { DUMMY: "test-dummy" }, cwd: dataDir } },
      { serverId: "remote-headers", transportType: "STREAMABLE_HTTP", enabled: true, toolNamePrefix: null,
        streamableHttpConfig: { url: "http://127.0.0.1:9000/mcp", token: null, headers: { "X-Test": "test-dummy" } } },
      { serverId: "remote-token", transportType: "STREAMABLE_HTTP", enabled: true, toolNamePrefix: "rt",
        streamableHttpConfig: { url: "http://127.0.0.1:9001/mcp", token: "test-dummy", headers: null } },
    ]) {
      await gql("mutation($input: McpServerInput!) { configureMcpServer(input: $input) { savedConfig { __typename } } }", { input });
    }
    const original = await storedFile();
    expect(Object.keys(original.mcpServers).sort()).toEqual(["local", "remote-headers", "remote-token"]);
    expect(JSON.stringify(original)).not.toContain("transport_type");
    for (const serverId of Object.keys(original.mcpServers)) await deleteServer(serverId);
    expect((await storedFile()).mcpServers).toEqual({});

    const result = await importJson(JSON.stringify(original));

    expect(result).toEqual({ success: true, message: "Import complete. Imported: 3, Failed: 0", importedCount: 3, failedCount: 0, failures: [] });
    expect((await storedFile()).mcpServers).toEqual(original.mcpServers);
  });
});
