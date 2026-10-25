/**
 * Runtime × MCP tool matrix: each agent runtime uses every kind of MCP tool through the AutoByteus server.
 *
 * Purpose: one agent per runtime, with these tools selected, calls each one:
 *   - the project tools `create_task` + `update_task` (Agent Tools MCP, server-owned);
 *   - an external stdio MCP tool (`autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs`, real SDK server; env and cwd
 *     from the saved config must reach it);
 *   - an external streamable HTTP MCP tool (a local server that requires a dummy Bearer token).
 * The Task must be saved and DONE, the stdio tool must report the configured env value and cwd, and the HTTP server must
 * see the credential on the tool call itself. Then the run is terminated, and its stdio server process (pid from
 * MCP_TEST_SERVER_PID_FILE) must be gone within 10 s (autobyteus-193, AC-003). Native AutoByteus runs the registry tools
 * directly; the other runtimes reach them through the run's `autobyteus_agent_tools` MCP endpoint.
 * Gates (a skip is not a pass):
 *   - AGY, scripted (no model): RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
 *   - Native AutoByteus with a local LM Studio model: RUN_LMSTUDIO_E2E=1 (optional LMSTUDIO_TARGET_TEXT_MODEL)
 *   - Claude Agent SDK (signed-in `claude`, real HOME/USER/LOGNAME): RUN_CLAUDE_E2E=1 (optional CLAUDE_E2E_TOOL_MODEL)
 *   - Codex live turn (signed-in `codex`): RUN_CODEX_E2E=1 (optional CODEX_E2E_TOOL_MODEL)
 *   - Codex's own MCP client without a model turn (`mcpServer/tool/call` on a real Codex thread; spends no model usage):
 *     RUN_CODEX_MCP_E2E=1
 *   - Grok (signed-in `grok`, paid inference on the user's plan): RUN_GROK_E2E=1 (optional GROK_E2E_MODEL)
 * Values: dummy only. Optional MCP_MATRIX_E2E_EVIDENCE_DIR=<dir> writes a value-free summary per runtime.
 * Command: <gates> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AGENT_TOOLS_MCP_SERVER_NAME } from "../../../src/agent-tools/mcp/agent-tool-mcp-session.js";
import { getCodexThreadManager } from "../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { AUTH_PROBE_TOOL, startAuthRequiredMcpServer, type AuthRequiredMcpServer } from "../helpers/auth-required-mcp-server.js";

type Wire = { type: string; payload: Record<string, unknown> };
type Runtime = "agy" | "native" | "claude" | "codex" | "grok";
type CallResponse = { content?: Array<{ text?: string }>; isError?: boolean };

const DUMMY = "test-dummy";
const ENV_VALUE = "matrix-env-value";
const STDIO_TOOL = "matrix_stdio_report_env_and_cwd";
const HTTP_TOOL = `matrix_http_${AUTH_PROBE_TOOL}`;
const TOOLS = ["create_task", "update_task", STDIO_TOOL, HTTP_TOOL];
const FIXTURE = fileURLToPath(new URL("../../../../autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs", import.meta.url));
const evidenceDir = process.env["MCP_MATRIX_E2E_EVIDENCE_DIR"]?.trim() || null;
const ready = (command: string) => Boolean(command) && spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const ENABLED: Record<Runtime | "codexMcp", boolean> = {
  agy: process.env["RUN_AGY_FAILURE_E2E"] === "1" && ready(process.env["ANTIGRAVITY_CLI_COMMAND"] ?? ""),
  native: process.env["RUN_LMSTUDIO_E2E"] === "1",
  claude: process.env["RUN_CLAUDE_E2E"] === "1" && ready("claude"),
  codex: process.env["RUN_CODEX_E2E"] === "1" && ready("codex"),
  codexMcp: process.env["RUN_CODEX_MCP_E2E"] === "1" && ready("codex"),
  grok: process.env["RUN_GROK_E2E"] === "1" && ready(process.env["GROK_BUILD_COMMAND"]?.trim() || "grok"),
};
const KIND: Record<Runtime, RuntimeKind> = { agy: RuntimeKind.ANTIGRAVITY_CLI, native: RuntimeKind.AUTOBYTEUS,
  claude: RuntimeKind.CLAUDE_AGENT_SDK, codex: RuntimeKind.CODEX_APP_SERVER, grok: RuntimeKind.GROK_BUILD };
const LLM_CONFIG: Partial<Record<Runtime, Record<string, unknown>>> = { native: { temperature: 0 }, codex: { reasoning_effort: "low" } };
const suite = Object.values(ENABLED).some(Boolean) ? describe : describe.skip;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isAlive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

suite("Runtime × MCP tool matrix: project tools, external stdio and external HTTP", () => {
  let dataDir = "";
  let stdioCwd = "";
  let stdioPidFile = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  let httpServer: AuthRequiredMcpServer;
  let projectId = "";
  const runIds: string[] = [];

  const gql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const res = await fetch(new URL("/graphql", url), { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }) });
    const body = await res.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const taskByDescription = async (description: string) =>
    (await gql<{ projectTasks: Array<{ taskKey: string; description: string; status: string }> }>(
      "query($p: String!) { projectTasks(projectId: $p) { taskKey description status } }", { p: projectId }))
      .projectTasks.find((task) => task.description === description) ?? null;

  const pickModel = async (runtime: Runtime): Promise<string> => {
    if (runtime === "agy") return "gemini-3.8-flash-low";
    if (runtime === "native") {
      const catalog = await gql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string }> } }>(
        "mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier } } }",
        { p: "LMSTUDIO", r: RuntimeKind.AUTOBYTEUS });
      const fragment = process.env["LMSTUDIO_TARGET_TEXT_MODEL"]?.trim() || "qwen3.6-35b-a3b";
      const model = catalog.ensureProviderModelCatalog.llmModels.map((m) => m.modelIdentifier).find((m) => m.includes(fragment));
      if (!model) throw new Error(`No LM Studio model matching '${fragment}'`);
      return model;
    }
    const snapshots = await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }", { r: KIND[runtime] });
    const models = snapshots.providerModelCatalogSnapshots.flatMap((p) => p.llmModels.map((m) => m.modelIdentifier));
    const preferred = { claude: [process.env["CLAUDE_E2E_TOOL_MODEL"], "haiku"], codex: [process.env["CODEX_E2E_TOOL_MODEL"], "gpt-5.6-luna", "gpt-5.4-mini"],
      grok: [process.env["GROK_E2E_MODEL"], "grok-4.7"] }[runtime].map((m) => m?.trim());
    const model = preferred.find((m) => m && models.includes(m)) ?? models[0];
    if (!model) throw new Error(`No ${runtime} model listed`);
    return model;
  };

  const startRun = async (runtime: Runtime, model: string) => {
    const def = await gql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `mcp-matrix-${runtime}-${randomUUID().slice(0, 6)}`, role: "assistant", category: "runtime-e2e",
        description: "Runtime × MCP tool matrix agent.", toolNames: TOOLS,
        instructions: "You are a tool-calling test agent. Follow the user's numbered steps exactly, calling each named tool exactly once with the given arguments, in order. Do not call other tools or explore the environment. Then reply FINISHED." } });
    const workspace = path.join(dataDir, `workspace-${runtime}`);
    await fs.mkdir(workspace, { recursive: true });
    const run = await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: def.createAgentDefinition.id, workspaceRootPath: workspace, llmModelIdentifier: model,
        llmConfig: LLM_CONFIG[runtime] ?? null, autoExecuteTools: true, runtimeKind: KIND[runtime] } });
    expect(run.createAgentRun.success, run.createAgentRun.message).toBe(true);
    runIds.push(run.createAgentRun.runId!);
    return run.createAgentRun.runId!;
  };

  const openSocket = async (runId: string) => {
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
    const messages: Wire[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: (parsed.payload ?? {}) as Record<string, unknown> });
      } catch { /* ignore malformed rows */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    const turn = async (content: string, timeoutMs = 360_000) => {
      const start = messages.length;
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline && !messages.slice(start).some((m) => m.type === "TURN_COMPLETED" || m.type === "ERROR")) await wait(200);
      const tail = messages.slice(-20).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 160)}`).join(" | ");
      expect(messages.slice(start).some((m) => m.type === "ERROR"), tail).toBe(false);
      expect(messages.slice(start).some((m) => m.type === "TURN_COMPLETED"), tail).toBe(true);
    };
    return { socket, messages, turn };
  };

  /** Terminates the run and reports whether its stdio server process (the latest pid written) ended within 10 s. */
  const stdioProcessEndsOnTermination = async (runId: string) => {
    const pid = Number((await fs.readFile(stdioPidFile, "utf8")).trim());
    expect(isAlive(pid)).toBe(true);
    const result = await gql<{ terminateAgentRun: { success: boolean; message: string } }>(
      "mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: runId });
    expect(result.terminateAgentRun.success, result.terminateAgentRun.message).toBe(true);
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline && isAlive(pid)) await wait(100);
    return !isAlive(pid);
  };

  /** The three tool kinds worked: Task saved and DONE, stdio env/cwd delivered, HTTP credential on the tool call. */
  const assertCell = async (runtime: string, description: string, wireText: string, httpMark: number, extra: Record<string, unknown> = {}) => {
    const task = await taskByDescription(description);
    const httpCalls = httpServer.toolCalls().slice(httpMark).map((o) => o.auth);
    const summary = { runtime, taskStatus: task?.status ?? null, stdioEnvDelivered: wireText.includes(ENV_VALUE),
      stdioCwdDelivered: wireText.includes(stdioCwd), httpMarker: wireText.includes(httpServer.marker), httpToolCalls: httpCalls,
      dummyOnWire: wireText.includes(DUMMY), ...extra };
    if (evidenceDir) {
      await fs.mkdir(evidenceDir, { recursive: true });
      await fs.writeFile(path.join(evidenceDir, `${runtime}.json`), JSON.stringify(summary, null, 2));
    }
    expect(summary).toMatchObject({ taskStatus: "DONE", stdioEnvDelivered: true, stdioCwdDelivered: true, httpMarker: true, dummyOnWire: false });
    expect(httpCalls.length).toBeGreaterThanOrEqual(1);
    expect(new Set(httpCalls)).toEqual(new Set(["expected"]));
  };

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "mcp-runtime-matrix-e2e-")));
    stdioCwd = path.join(dataDir, "stdio-cwd");
    stdioPidFile = path.join(dataDir, "stdio-server.pid");
    await fs.mkdir(stdioCwd);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    httpServer = await startAuthRequiredMcpServer({ requiredAuthorization: `Bearer ${DUMMY}`, marker: "MARKER-MATRIX-HTTP-6610" });
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    for (const input of [
      { serverId: "matrix_stdio", transportType: "STDIO", enabled: true, toolNamePrefix: "matrix_stdio",
        stdioConfig: { command: process.execPath, args: [FIXTURE], env: { MATRIX_ENV: ENV_VALUE, MCP_TEST_SERVER_PID_FILE: stdioPidFile }, cwd: stdioCwd } },
      { serverId: "matrix_http", transportType: "STREAMABLE_HTTP", enabled: true, toolNamePrefix: "matrix_http",
        streamableHttpConfig: { url: httpServer.url, token: DUMMY, headers: null } },
    ]) {
      await gql("mutation($input: McpServerInput!) { configureMcpServer(input: $input) { savedConfig { __typename } } }", { input });
      const discovered = await gql<{ discoverAndRegisterMcpServerTools: { success: boolean; message: string } }>(
        "mutation($id: String!) { discoverAndRegisterMcpServerTools(serverId: $id) { success message } }", { id: input.serverId });
      expect(discovered.discoverAndRegisterMcpServerTools.success, discovered.discoverAndRegisterMcpServerTools.message).toBe(true);
    }
    projectId = (await gql<{ createProject: { projectId: string } }>(
      "mutation($input: CreateProjectInput!) { createProject(input: $input) { projectId } }",
      { input: { name: "MCP matrix", description: "Test-owned project for the runtime × MCP matrix." } })).createProject.projectId;
  }, 240_000);

  afterAll(async () => {
    if (app) {
      for (const runId of runIds) {
        await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined);
      }
      await app.close();
    }
    await httpServer?.close();
    delete process.env["AGY_FAKE_CASE"];
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  it.skipIf(!ENABLED.agy)("agy (scripted CLI): all three tool kinds through autobyteus_agent_tools", async () => {
    // The scripted AGY CLI answers `CALL_TOOL:` / `CALL_TOOLS:` in its `linked_skills` case.
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    const runId = await startRun("agy", await pickModel("agy"));
    const { socket, messages, turn } = await openSocket(runId);
    const description = `MCP matrix agy ${randomUUID().slice(0, 8)}`;
    const httpMark = httpServer.toolCalls().length;
    await turn(`CALL_TOOL:${JSON.stringify({ name: "create_task", arguments: { project_id: projectId, title: description, description } })}`);
    const created = await taskByDescription(description);
    expect(created?.status).toBe("TODO");
    await turn(`CALL_TOOLS:${JSON.stringify([
      { name: "update_task", arguments: { task_id: created!.taskKey, status: "DONE" } },
      { name: STDIO_TOOL, arguments: { name: "MATRIX_ENV" } },
      { name: HTTP_TOOL, arguments: {} },
    ])}`);
    socket.close();
    const stdioProcessGone = await stdioProcessEndsOnTermination(runId);
    await assertCell("agy", description, JSON.stringify(messages), httpMark, { stdioProcessGoneAfterTermination: stdioProcessGone });
    expect(stdioProcessGone).toBe(true);
  }, 300_000);

  for (const runtime of ["native", "claude", "codex", "grok"] as const) {
    it.skipIf(!ENABLED[runtime])(`${runtime}: an agent calls all three tool kinds`, async () => {
      const model = await pickModel(runtime);
      const runId = await startRun(runtime, model);
      const { socket, messages, turn } = await openSocket(runId);
      const description = `MCP matrix ${runtime} ${randomUUID().slice(0, 8)}`;
      const httpMark = httpServer.toolCalls().length;
      await turn([
        `1. Call create_task with project_id "${projectId}", title "${description}" and description "${description}".`,
        "2. Call update_task with the task_id that step 1 returned and status \"DONE\".",
        `3. Call ${STDIO_TOOL} with name "MATRIX_ENV".`,
        `4. Call ${HTTP_TOOL} with no arguments.`,
        "Then reply with the single word FINISHED.",
      ].join("\n"));
      socket.close();
      const stdioProcessGone = await stdioProcessEndsOnTermination(runId);
      await assertCell(runtime, description, JSON.stringify(messages), httpMark, { model, stdioProcessGoneAfterTermination: stdioProcessGone });
      expect(stdioProcessGone).toBe(true);
    }, 420_000);
  }

  it.skipIf(!ENABLED.codexMcp)("codex MCP client (no model turn): all three tool kinds through autobyteus_agent_tools", async () => {
    const runId = await startRun("codex", await pickModel("codex"));
    const thread = getCodexThreadManager().getThread(runId);
    expect(thread).toBeTruthy();
    const call = async (tool: string, args: Record<string, unknown>) => {
      const deadline = Date.now() + 60_000;
      for (;;) {
        try {
          return await thread!.client.request<CallResponse>("mcpServer/tool/call",
            { threadId: thread!.threadId, server: AGENT_TOOLS_MCP_SERVER_NAME, tool, arguments: args });
        } catch (error) {
          if (Date.now() > deadline) throw error;
          await wait(500);
        }
      }
    };
    const text = (r: CallResponse) => (r.content ?? []).map((c) => c.text ?? "").join("");
    const description = `MCP matrix codex-mcp ${randomUUID().slice(0, 8)}`;
    const httpMark = httpServer.toolCalls().length;
    const created = await call("create_task", { project_id: projectId, title: description, description });
    const taskId = (JSON.parse(text(created)) as { task: { taskId: string } }).task.taskId;
    const responses = [created, await call("update_task", { task_id: taskId, status: "DONE" }),
      await call(STDIO_TOOL, { name: "MATRIX_ENV" }), await call(HTTP_TOOL, {})];
    expect(responses.map((r) => r.isError ?? false)).toEqual([false, false, false, false]);
    const stdioProcessGone = await stdioProcessEndsOnTermination(runId);
    await assertCell("codex-mcp-client", description, JSON.stringify(responses), httpMark, { stdioProcessGoneAfterTermination: stdioProcessGone });
    expect(stdioProcessGone).toBe(true);
  }, 300_000);
});
