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
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// Deterministic AGY MCP call steps through the real server (fake AGY transport: tests/fixtures/agy-failure-cli.mjs,
// case "mcp_calls"; step shapes follow AGY 1.2.14).
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
// Optional: AGY_MCP_EVIDENCE_DIR=<dir> writes the observed events and history projection.
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
type Projection = { conversation: Array<Record<string, unknown>>; activities: Array<Record<string, unknown>> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const FAILURE = "PROBE-FAILURE-9920: deliberate failure";
// Files entries inside the workspace are reported workspace-relative.
const IMAGE_NAME = "mcp-blue-dog.png";
const BROWSER = { tab_id: "browser-7318", status: "opened", url: "about:blank", title: "AGY probe" };
const OPEN_ARGS = { url: "about:blank", reuse_existing: false };

suite("AGY MCP tool calls through app WebSocket, history and Files", () => {
  let dataDir = "";
  let workspace = "";
  let imagePath = "";
  let app: FastifyInstance;
  let url: URL;
  let definitionId = "";
  let runId = "";
  let socket: WebSocket | null = null;
  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const terminate = async () => (await graphql<{ terminateAgentRun: { success: boolean } }>(
    "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
    { agentRunId: runId })).terminateAgentRun.success;

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "agy-mcp-call-e2e-")));
    workspace = path.join(dataDir, "workspace");
    imagePath = path.join(workspace, IMAGE_NAME);
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-mcp-call-" + randomUUID(), role: "assistant", description: "MCP call presentation probe",
        instructions: "Use tools when asked.", category: "runtime-e2e", toolNames: [] } });
    definitionId = created.createAgentDefinition.id;
  });
  afterAll(async () => {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      if (runId) await terminate().catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
    }
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    delete process.env["AGY_FAKE_CASE"];
    delete process.env["AGY_FAKE_MCP_IMAGE_PATH"];
  });

  it("presents each MCP call as the real tool with its own arguments, live and in reopened history", async () => {
    process.env["AGY_FAKE_CASE"] = "mcp_calls";
    process.env["AGY_FAKE_MCP_IMAGE_PATH"] = imagePath;
    const started = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace,
        llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null,
        autoExecuteTools: true, runtimeKind: "antigravity_cli" } });
    expect(started.createAgentRun.success, started.createAgentRun.message).toBe(true);
    runId = started.createAgentRun.runId!;
    socket = new WebSocket("ws://" + url.hostname + ":" + url.port + "/ws/agent/" + runId);
    const messages: Wire[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type,
          payload: parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
            ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* Ignore only malformed diagnostic transport rows. */ }
    });
    await new Promise<void>((resolve, reject) => { socket!.once("open", resolve); socket!.once("error", reject); });
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Delegate, call the MCP tools and make an image." });
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && !messages.some((m) => m.type === "TURN_COMPLETED")) await wait(50);
    expect(messages.some((m) => m.type === "TURN_COMPLETED"), JSON.stringify(messages)).toBe(true);
    await wait(300);

    const toolEvents = messages.filter((m) => m.type.startsWith("TOOL_"));
    const starts = toolEvents.filter((m) => m.type === "TOOL_EXECUTION_STARTED");
    const terminalOf = (start: Wire) => toolEvents.filter((m) => m.type !== "TOOL_EXECUTION_STARTED"
      && m.payload["invocation_id"] === start.payload["invocation_id"]);
    // One start and one terminal event per provider step, in provider order, under these names.
    expect(starts.map((m) => m.payload["tool_name"])).toEqual(["view_file", "delegate_task",
      "mcp__shape-test__echo_args", "mcp__shape-test__json_result", "mcp__shape-test__always_fails",
      "call_mcp_tool", "generate_image", "open_tab", "open_tab", "mcp__shape-test__open_tab",
      "open_tab", "list_tabs", "open_tab", "open_tab"]);
    expect(new Set(starts.map((m) => m.payload["invocation_id"])).size).toBe(starts.length);
    const expected: Array<{ type: string; toolName: string; args: Record<string, unknown>; result: unknown }> = [
      // A native tool keeps its name and parameters; its JSON-looking output stays text.
      { type: "TOOL_EXECUTION_SUCCEEDED", toolName: "view_file",
        args: { AbsolutePath: "/agy/mcp/autobyteus_agent_tools/delegate_task.json" },
        result: { provider_state: "DONE", output: "{\"lines\": 1}" } },
      // AutoByteus agent tool: bare canonical name, own arguments, JSON object text as structured output.
      { type: "TOOL_EXECUTION_SUCCEEDED", toolName: "delegate_task",
        args: { description: "Summarise the report.", recipient_address: "/researcher" },
        result: { provider_state: "DONE", output: { target_agent_run_id: "run-7318", message: "Task delegated." } } },
      // Third-party server: server-qualified name, nested arguments, non-JSON output unchanged.
      { type: "TOOL_EXECUTION_SUCCEEDED", toolName: "mcp__shape-test__echo_args",
        args: { note: "hello", options: { count: 2, tags: ["a", "b"] } },
        result: { provider_state: "DONE", output: "ECHO:{\"note\": \"hello\"}" } },
      // No arguments: an empty object.
      { type: "TOOL_EXECUTION_SUCCEEDED", toolName: "mcp__shape-test__json_result", args: {},
        result: { provider_state: "DONE", output: { marker: "JSON-MARKER-4471", nested: { ok: true } } } },
      // Failure: real name and arguments with the provider's error text.
      { type: "TOOL_EXECUTION_FAILED", toolName: "mcp__shape-test__always_fails", args: { reason: "probe" },
        result: { provider_state: "ERROR", output: FAILURE } },
      // Wrapper without a server name: presented as the provider reported it, and the turn continues.
      { type: "TOOL_EXECUTION_SUCCEEDED", toolName: "call_mcp_tool",
        args: { Arguments: { content: "no server name" }, ToolName: "send_message_to" },
        result: { provider_state: "DONE", output: "{\"accepted\": true}" } },
      // AutoByteus media tool through MCP: never AGY's native image result.
      { type: "TOOL_EXECUTION_SUCCEEDED", toolName: "generate_image",
        args: { prompt: "blue dog", output_file_path: imagePath },
        result: { provider_state: "DONE", output: { file_path: imagePath } } },
      // Actual AGY JSON output and MCP content envelopes both cross the wire without the AGY wrapper.
      { type: "TOOL_EXECUTION_SUCCEEDED", toolName: "open_tab", args: OPEN_ARGS, result: BROWSER },
      { type: "TOOL_EXECUTION_SUCCEEDED", toolName: "open_tab",
        args: { url: "about:blank", reuse_existing: true }, result: { ...BROWSER, status: "reused" } },
      // Same spelling is not sufficient: third-party and native tools retain their original wrappers.
      { type: "TOOL_EXECUTION_SUCCEEDED", toolName: "mcp__shape-test__open_tab", args: OPEN_ARGS,
        result: { provider_state: "DONE", output: BROWSER } },
      { type: "TOOL_EXECUTION_SUCCEEDED", toolName: "open_tab", args: { url: "about:blank" },
        result: { provider_state: "DONE", output: BROWSER } },
      { type: "TOOL_EXECUTION_SUCCEEDED", toolName: "list_tabs", args: {},
        result: { provider_state: "DONE", output: { tabs: [BROWSER] } } },
      { type: "TOOL_EXECUTION_FAILED", toolName: "open_tab", args: OPEN_ARGS,
        result: { provider_state: "ERROR", output: null } },
      { type: "TOOL_EXECUTION_SUCCEEDED", toolName: "open_tab", args: OPEN_ARGS, result: null },
    ];
    starts.forEach((start, index) => {
      const want = expected[index]!;
      expect(start.payload["arguments"]).toEqual(want.args);
      const terminal = terminalOf(start);
      expect(terminal.map((m) => m.type)).toEqual([want.type]);
      expect(terminal[0]!.payload).toMatchObject({ tool_name: want.toolName, arguments: want.args,
        turn_id: start.payload["turn_id"],
        provider_state: want.type === "TOOL_EXECUTION_FAILED" ? "ERROR" : "DONE" });
      expect(terminal[0]!.payload["result"]).toEqual(want.result);
    });
    const failed = toolEvents.find((m) => m.type === "TOOL_EXECUTION_FAILED")!;
    expect(failed.payload).toMatchObject({ error: FAILURE, reason: FAILURE });
    expect(messages.some((m) => m.type === "ERROR")).toBe(false);
    expect(messages.filter((m) => m.type === "SEGMENT_CONTENT").map((m) => m.payload["delta"]).join(""))
      .toContain("MCP_DONE");

    // DEC-005: the MCP generate_image call is a generated-output tool and adds exactly one Files entry.
    const imageInvocationId = starts[6]!.payload["invocation_id"];
    const fileChanges = () => messages.filter((m) => m.type === "FILE_CHANGE");
    for (let count = 0; count < 20 && !fileChanges().some((m) => m.payload["status"] === "available"); count++) await wait(100);
    expect(fileChanges().map((m) => ({ path: m.payload["path"], sourceTool: m.payload["sourceTool"],
      sourceInvocationId: m.payload["sourceInvocationId"], status: m.payload["status"] })))
      .toEqual([{ path: IMAGE_NAME, sourceTool: "generated_output", sourceInvocationId: imageInvocationId, status: "available" }]);

    const observe = async () => {
      const projection = (await graphql<{ getRunProjection: Projection }>(
        "query($runId: String!) { getRunProjection(runId: $runId) { conversation activities } }", { runId })).getRunProjection;
      const files = (await graphql<{ getRunFileChanges: Array<Record<string, unknown>> }>(
        "query($runId: String!) { getRunFileChanges(runId: $runId) { path sourceTool sourceInvocationId status } }",
        { runId })).getRunFileChanges;
      return { projection, files };
    };
    const expectHistory = async () => {
      const { projection, files } = await observe();
      const calls = projection.conversation.filter((row) => row["kind"] === "tool_call");
      expect(calls.map((row) => row["toolName"])).toEqual(expected.map((want) => want.toolName));
      expect(projection.activities.map((row) => row["toolName"])).toEqual(expected.map((want) => want.toolName));
      starts.forEach((start, index) => {
        const want = expected[index]!;
        const invocationId = start.payload["invocation_id"];
        expect(calls.find((row) => row["invocationId"] === invocationId)).toMatchObject({
          toolName: want.toolName, toolArgs: want.args });
        expect(calls.find((row) => row["invocationId"] === invocationId)?.["toolResult"]).toEqual(want.result);
        expect(projection.activities.find((row) => row["invocationId"] === invocationId)?.["result"]).toEqual(want.result);
        expect(projection.activities.find((row) => row["invocationId"] === invocationId)).toMatchObject({
          toolName: want.toolName, arguments: want.args, result: want.result,
          status: want.type === "TOOL_EXECUTION_FAILED" ? "error" : "success" });
      });
      expect(files).toEqual([{ path: IMAGE_NAME, sourceTool: "generated_output",
        sourceInvocationId: imageInvocationId, status: "available" }]);
    };
    await expectHistory();
    expect(await terminate()).toBe(true);
    await expectHistory();

    // Existing persisted opaque values must remain directly readable, with no migration.
    // Add a representative pre-fix record ONLY to this terminated test-owned run.
    const tracePath = path.join(dataDir, "memory", "agents", runId, "raw_traces_active.jsonl");
    const oldResult = { provider_state: "DONE", output: { ...BROWSER, tab_id: "old-saved-tab" } };
    const oldInvocation = "saved-open-before-canonicalization";
    const rows = (await fs.readFile(tracePath, "utf8")).trim().split("\n")
      .map((line) => JSON.parse(line) as { seq?: number });
    const seq = Math.max(...rows.map((row) => row.seq ?? 0)) + 1;
    const common = { turn_id: "saved-old-turn", tool_name: "open_tab",
      tool_call_id: oldInvocation, ts: Date.now() / 1000 };
    await fs.appendFile(tracePath, [
      { ...common, trace_type: "tool_call", seq, tool_args: OPEN_ARGS },
      { ...common, trace_type: "tool_result", seq: seq + 1, tool_result: oldResult, tool_error: null },
    ].map((row) => JSON.stringify(row)).join("\n") + "\n");
    const bytesBeforeRead = await fs.readFile(tracePath, "utf8");
    const retained = await observe();
    const oldCall = retained.projection.conversation.find((row) => row["invocationId"] === oldInvocation);
    expect(oldCall?.["toolResult"]).toEqual(oldResult);
    expect(retained.projection.activities.find((row) => row["invocationId"] === oldInvocation))
      .toMatchObject({ toolName: "open_tab", result: oldResult, status: "success" });
    // New values remain canonical alongside the old value, and reading performs no disk rewrite.
    expect(retained.projection.conversation.find((row) =>
      row["invocationId"] === starts[7]!.payload["invocation_id"])?.["toolResult"]).toEqual(BROWSER);
    expect(await fs.readFile(tracePath, "utf8")).toBe(bytesBeforeRead);

    const evidenceDir = process.env["AGY_MCP_EVIDENCE_DIR"];
    if (evidenceDir) {
      await fs.mkdir(evidenceDir, { recursive: true });
      await fs.writeFile(path.join(evidenceDir, "agy-mcp-tool-call-transport.json"),
        JSON.stringify({ runId, toolEvents, fileChanges: fileChanges(), reopened: await observe() }, null, 2));
    }
  }, 60_000);
});
