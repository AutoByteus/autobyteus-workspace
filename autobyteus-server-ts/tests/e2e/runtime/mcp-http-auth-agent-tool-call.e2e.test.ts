/**
 * Agents on each runtime call tools of credential-protected remote (streamable HTTP) MCP servers.
 *
 * Purpose: an agent whose `toolNames` select tools of two remote MCP servers, one configured with a fixed
 * `Authorization` header (Basic) and one with the token (sent as Bearer), calls both through the AutoByteus server,
 * and each remote server sees its credential on the `tools/call` request itself. Native AutoByteus runs the
 * registry MCP tool directly; AGY, Codex and Claude reach it through the run's `autobyteus_agent_tools` endpoint.
 * Gates (each runtime runs only when its gate is set; a skip is not a pass):
 *   - AGY, scripted (no model): RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
 *   - Native AutoByteus with a local LM Studio model: RUN_LMSTUDIO_E2E=1 (optional LMSTUDIO_TARGET_TEXT_MODEL)
 *   - Codex App Server (live, signed-in `codex`, real HOME/USER/LOGNAME): RUN_CODEX_E2E=1 (optional CODEX_E2E_TOOL_MODEL)
 *   - Claude Agent SDK (live, signed-in `claude`, real HOME/USER/LOGNAME): RUN_CLAUDE_E2E=1 (optional CLAUDE_E2E_TOOL_MODEL)
 * Values: dummy only (`test-dummy`). The local MCP servers record only whether `Authorization` was expected,
 * another value or missing. Optional: MCP_AUTH_E2E_EVIDENCE_DIR=<dir> writes value-free per-runtime summaries.
 * Command: <gates> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { AUTH_PROBE_TOOL, startAuthRequiredMcpServer, type AuthRequiredMcpServer } from "../helpers/auth-required-mcp-server.js";

type Wire = { type: string; payload: Record<string, unknown> };
type RuntimeCase = {
  key: "agy" | "native" | "codex" | "claude";
  runtimeKind: RuntimeKind;
  enabled: boolean;
  llmConfig: Record<string, unknown> | null;
};

const DUMMY = "test-dummy";
const HDR_TOOL = `hdr_${AUTH_PROBE_TOOL}`;
const TOK_TOOL = `tok_${AUTH_PROBE_TOOL}`;
const evidenceDir = process.env["MCP_AUTH_E2E_EVIDENCE_DIR"]?.trim() || null;
const binaryReady = (command: string, args = ["--version"]) =>
  Boolean(command) && spawnSync(command, args, { stdio: "ignore" }).status === 0;

const RUNTIMES: RuntimeCase[] = [
  { key: "agy", runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, llmConfig: null,
    enabled: process.env["RUN_AGY_FAILURE_E2E"] === "1" && binaryReady(process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "") },
  { key: "native", runtimeKind: RuntimeKind.AUTOBYTEUS, llmConfig: { temperature: 0 },
    enabled: process.env["RUN_LMSTUDIO_E2E"] === "1" },
  { key: "codex", runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmConfig: { reasoning_effort: "low" },
    enabled: process.env["RUN_CODEX_E2E"] === "1" && binaryReady("codex") },
  { key: "claude", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmConfig: null,
    enabled: process.env["RUN_CLAUDE_E2E"] === "1" && binaryReady("claude") },
];
const suite = RUNTIMES.some((runtime) => runtime.enabled) ? describe : describe.skip;

const INSTRUCTIONS = [
  "You are a tool-calling test agent.",
  "When asked to call tools, call exactly the named tools, each exactly once, with empty arguments.",
  "Do not call any other tool and do not explore the environment.",
  "After the calls, reply with the exact text each tool returned, nothing else.",
].join("\n");
const LIVE_PROMPT = `Call the tool ${HDR_TOOL} once and the tool ${TOK_TOOL} once, both with no arguments. Then reply with the exact text each tool returned.`;
const AGY_PROMPT = `CALL_TOOLS:${JSON.stringify([{ name: HDR_TOOL, arguments: {} }, { name: TOK_TOOL, arguments: {} }])}`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("Agents call tools of credential-protected remote MCP servers", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  let hdr: AuthRequiredMcpServer;
  let tok: AuthRequiredMcpServer;
  const definitionIds: string[] = [];
  const runIds: string[] = [];
  const sockets: WebSocket[] = [];

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  const pickModel = async (runtime: RuntimeCase): Promise<string> => {
    if (runtime.key === "agy") return "gemini-3.8-flash-low";
    if (runtime.key === "native") {
      const catalog = await graphql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string }> } }>(
        `mutation($providerId: String!, $runtimeKind: String) {
          ensureProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }`,
        { providerId: "LMSTUDIO", runtimeKind: RuntimeKind.AUTOBYTEUS });
      const models = catalog.ensureProviderModelCatalog.llmModels.map((model) => model.modelIdentifier);
      const fragment = process.env["LMSTUDIO_TARGET_TEXT_MODEL"]?.trim() || "qwen3.6-35b-a3b";
      const model = models.find((each) => each.includes(fragment));
      if (!model) throw new Error(`No LM Studio model matching '${fragment}' in ${JSON.stringify(models)}`);
      return model;
    }
    const snapshots = await graphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      `query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }`,
      { runtimeKind: runtime.runtimeKind });
    const models = snapshots.providerModelCatalogSnapshots.flatMap((provider) => provider.llmModels.map((model) => model.modelIdentifier));
    const preferred = runtime.key === "codex"
      ? [process.env["CODEX_E2E_TOOL_MODEL"]?.trim(), "gpt-5.4-mini", "gpt-5.5"]
      : [process.env["CLAUDE_E2E_TOOL_MODEL"]?.trim(), "haiku", "sonnet"];
    const model = preferred.find((each) => each && models.includes(each)) ?? models[0];
    if (!model) throw new Error(`No ${runtime.key} model in ${JSON.stringify(models)}`);
    return model;
  };

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "mcp-http-auth-agent-e2e-")));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    hdr = await startAuthRequiredMcpServer({ requiredAuthorization: `Basic ${DUMMY}`, marker: "MARKER-HDR-7731" });
    tok = await startAuthRequiredMcpServer({ requiredAuthorization: `Bearer ${DUMMY}`, marker: "MARKER-TOK-7732" });
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    for (const [serverId, target, credentials] of [
      ["hdr", hdr, { token: null, headers: { Authorization: `Basic ${DUMMY}` } }],
      ["tok", tok, { token: DUMMY, headers: null }],
    ] as const) {
      await graphql(`mutation($input: McpServerInput!) { configureMcpServer(input: $input) { savedConfig { __typename } } }`,
        { input: { serverId, transportType: "STREAMABLE_HTTP", enabled: true, toolNamePrefix: serverId,
          streamableHttpConfig: { url: target.url, ...credentials } } });
      const discovered = await graphql<{ discoverAndRegisterMcpServerTools: { success: boolean; message: string; discoveredTools: Array<{ name: string }> } }>(
        `mutation($serverId: String!) { discoverAndRegisterMcpServerTools(serverId: $serverId) { success message discoveredTools { name } } }`,
        { serverId });
      expect(discovered.discoverAndRegisterMcpServerTools.success, discovered.discoverAndRegisterMcpServerTools.message).toBe(true);
      expect(discovered.discoverAndRegisterMcpServerTools.discoveredTools.map((tool) => tool.name)).toEqual([`${serverId}_${AUTH_PROBE_TOOL}`]);
    }
  }, 240_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (app) {
      for (const runId of runIds) {
        await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
          { agentRunId: runId }).catch(() => undefined);
      }
      for (const id of definitionIds) {
        await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }).catch(() => undefined);
      }
      await app.close();
    }
    await hdr?.close();
    await tok?.close();
    delete process.env["AGY_FAKE_CASE"];
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  for (const runtime of RUNTIMES) {
    it.skipIf(!runtime.enabled)(`${runtime.key}: the agent's tool calls reach both servers with their credentials`, async () => {
      // The scripted AGY CLI answers `CALL_TOOLS:` in its `linked_skills` case.
      if (runtime.key === "agy") process.env["AGY_FAKE_CASE"] = "linked_skills";
      const model = await pickModel(runtime);
      const workspace = path.join(dataDir, `workspace-${runtime.key}`);
      await fs.mkdir(workspace, { recursive: true });
      const created = await graphql<{ createAgentDefinition: { id: string } }>(
        "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
        { input: { name: `mcp-http-auth-${runtime.key}-${randomUUID()}`, role: "assistant", category: "runtime-e2e",
          description: "Calls credential-protected remote MCP tools.", instructions: INSTRUCTIONS, toolNames: [HDR_TOOL, TOK_TOOL] } });
      definitionIds.push(created.createAgentDefinition.id);
      const run = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
        "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
        { input: { agentDefinitionId: created.createAgentDefinition.id, workspaceRootPath: workspace,
          llmModelIdentifier: model, llmConfig: runtime.llmConfig, autoExecuteTools: true, runtimeKind: runtime.runtimeKind } });
      expect(run.createAgentRun.success, run.createAgentRun.message).toBe(true);
      const runId = run.createAgentRun.runId!;
      runIds.push(runId);

      const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
      sockets.push(socket);
      const messages: Wire[] = [];
      socket.on("message", (raw: unknown) => {
        try {
          const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
          if (typeof parsed.type === "string") messages.push({ type: parsed.type,
            payload: parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
              ? parsed.payload as Record<string, unknown> : {} });
        } catch { /* Ignore malformed diagnostic rows. */ }
      });
      await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });

      const hdrMark = hdr.toolCalls().length;
      const tokMark = tok.toolCalls().length;
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: runtime.key === "agy" ? AGY_PROMPT : LIVE_PROMPT });
      const deadline = Date.now() + 300_000;
      const finished = () => messages.some((m) => m.type === "TURN_COMPLETED" || m.type === "ERROR");
      while (Date.now() < deadline && !finished()) await wait(100);
      const preview = messages.slice(-25).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 200)}`).join(" | ");
      expect(messages.some((m) => m.type === "ERROR"), preview).toBe(false);
      expect(messages.some((m) => m.type === "TURN_COMPLETED"), preview).toBe(true);

      // The remote servers saw the credential on the tool call itself.
      const hdrCalls = hdr.toolCalls().slice(hdrMark);
      const tokCalls = tok.toolCalls().slice(tokMark);
      expect(hdrCalls.length, preview).toBeGreaterThanOrEqual(1);
      expect(tokCalls.length, preview).toBeGreaterThanOrEqual(1);
      expect(new Set(hdrCalls.map((entry) => entry.auth))).toEqual(new Set(["expected"]));
      expect(new Set(tokCalls.map((entry) => entry.auth))).toEqual(new Set(["expected"]));
      // And the agent received each server's result.
      const wire = JSON.stringify(messages);
      expect(wire).toContain(hdr.marker);
      expect(wire).toContain(tok.marker);
      expect(wire).not.toContain(DUMMY);

      if (evidenceDir) {
        await fs.mkdir(evidenceDir, { recursive: true });
        const toolEvents = messages.filter((m) => m.type.startsWith("TOOL_"))
          .map((m) => ({ type: m.type, tool_name: m.payload["tool_name"] ?? null }));
        await fs.writeFile(path.join(evidenceDir, `${runtime.key}.json`), JSON.stringify({
          runtime: runtime.runtimeKind, model, toolNamesSelected: [HDR_TOOL, TOK_TOOL], toolEvents,
          remoteToolCalls: { hdr: hdrCalls, tok: tokCalls },
          markersReceived: { hdr: wire.includes(hdr.marker), tok: wire.includes(tok.marker) },
          dummyValueOnAgentWire: wire.includes(DUMMY),
        }, null, 2));
      }
    }, 360_000);
  }
});
