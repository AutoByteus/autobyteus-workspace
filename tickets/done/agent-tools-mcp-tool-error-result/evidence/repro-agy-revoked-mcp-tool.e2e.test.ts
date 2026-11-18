/**
 * TEMPORARY reproduction probe (autobyteus-232); not committed in the test tree.
 * Scripted AGY agent calls a configured remote MCP tool whose token was revoked; the agent must read the
 * credential-free HTTP reason, not JSON-RPC "Internal error".
 * Command: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/zz-probe-agy-revoked-mcp-tool.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { AUTH_PROBE_TOOL, startAuthRequiredMcpServer, type AuthRequiredMcpServer } from "../helpers/auth-required-mcp-server.js";

const DUMMY = "test-dummy";
const TOK_TOOL = `tok_${AUTH_PROBE_TOOL}`;
const REVOKED_TOOL_RESULT = "HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" && Boolean(process.env["ANTIGRAVITY_CLI_COMMAND"]);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

(enabled ? describe : describe.skip)("probe: AGY agent, revoked token on a configured MCP tool", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  let tok: AuthRequiredMcpServer;
  const sockets: WebSocket[] = [];
  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "agy-revoked-mcp-e2e-")));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    tok = await startAuthRequiredMcpServer({ requiredAuthorization: `Bearer ${DUMMY}`, marker: "MARKER-TOK-7732" });
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    await graphql(`mutation($input: McpServerInput!) { configureMcpServer(input: $input) { savedConfig { __typename } } }`,
      { input: { serverId: "tok", transportType: "STREAMABLE_HTTP", enabled: true, toolNamePrefix: "tok",
        streamableHttpConfig: { url: tok.url, token: DUMMY, headers: null } } });
    const discovered = await graphql<{ discoverAndRegisterMcpServerTools: { success: boolean } }>(
      `mutation($serverId: String!) { discoverAndRegisterMcpServerTools(serverId: $serverId) { success } }`, { serverId: "tok" });
    expect(discovered.discoverAndRegisterMcpServerTools.success).toBe(true);
  }, 240_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    await app?.close();
    await tok?.close();
    delete process.env["AGY_FAKE_CASE"];
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  it("the agent reads the HTTP reason of the failed tool call", async () => {
    tok.setRequiredAuthorization("Bearer test-rotated");
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    const workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace, { recursive: true });
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `agy-revoked-${randomUUID()}`, role: "assistant", category: "runtime-e2e",
        description: "Calls a revoked remote MCP tool.", instructions: "Call the tool.", toolNames: [TOK_TOOL] } });
    const run = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: created.createAgentDefinition.id, workspaceRootPath: workspace,
        llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null, autoExecuteTools: true, runtimeKind: RuntimeKind.ANTIGRAVITY_CLI } });
    expect(run.createAgentRun.success, run.createAgentRun.message).toBe(true);
    const runId = run.createAgentRun.runId!;
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
    sockets.push(socket);
    const messages: Array<{ type: string; payload: unknown }> = [];
    socket.on("message", (raw: unknown) => { try { const p = JSON.parse(String(raw)); if (typeof p.type === "string") messages.push(p); } catch { /* ignore */ } });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    sendE2eSendMessageCommand(socket, { agent_run_id: runId,
      content: `CALL_TOOLS:${JSON.stringify([{ name: TOK_TOOL, arguments: {} }])}` });
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline && !messages.some((m) => m.type === "TURN_COMPLETED" || m.type === "ERROR")) await wait(100);
    const preview = messages.slice(-25).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 300)}`).join(" | ");
    const wire = JSON.stringify(messages);
    console.log(`[PROBE] last events: ${preview}`);
    expect(wire).not.toContain(DUMMY);
    expect(messages.some((m) => m.type === "ERROR"), preview).toBe(false);
    expect(wire, preview).toContain(REVOKED_TOOL_RESULT);
  }, 180_000);
});
