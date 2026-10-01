import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import {
  createFakeGrokCommand,
  grokAcpFixturePath,
  overrideEnv,
  type FakeGrokCommand,
} from "../helpers/grok-fake-cli.js";

// Zero-cost Grok Build coverage through the real Studio server (GraphQL, agent WebSocket,
// AgentRunManager, ACP backend, token-usage ledger): `GROK_BUILD_COMMAND` points at the
// recorded-fixture fake CLI, which replays real `grok agent stdio` traffic (Grok CLI 1.0.41).

type WsMessage = { type: string; payload: Record<string, unknown> };
type FixtureRow = { dir: "in" | "out"; msg: Record<string, any> };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readFixture = async (name: string): Promise<FixtureRow[]> =>
  (await fs.readFile(grokAcpFixturePath(name), "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line));

describe("Grok Build runtime over GraphQL/WebSocket (recorded Grok ACP replay)", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  let fakeGrok: FakeGrokCommand;
  let restoreEnv: (() => void) | null = null;
  let definitionId = "";
  const runIds: string[] = [];
  const sockets: WebSocket[] = [];

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "grok-replay-e2e-"));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    fakeGrok = await createFakeGrokCommand();
    restoreEnv = overrideEnv({
      GROK_BUILD_COMMAND: fakeGrok.command,
      FAKE_GROK_VERSION: undefined,
      FAKE_ACP_FIXTURE: grokAcpFixturePath("prompt"),
      FAKE_ACP_EXIT_AT_END: undefined,
      FAKE_ACP_STOP_BEFORE: undefined,
      FAKE_ACP_RECORD: undefined,
      // Every eligible standalone run attaches Agent Tools MCP (always-on send_message_to and
      // delegate_task); these recordings predate that, so the fake reports it ready as Grok does.
      FAKE_ACP_REPORT_MCP_READY: "1",
    });
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `grok-replay-${randomUUID()}`, role: "assistant", description: "Grok replay e2e agent",
        instructions: "GROK-REPLAY-INSTRUCTION: answer briefly.", category: "runtime-e2e", toolNames: [] } },
    );
    definitionId = created.createAgentDefinition.id;
  }, 60_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (app) {
      for (const runId of runIds) {
        await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
          { agentRunId: runId }).catch(() => undefined);
      }
      if (definitionId) {
        await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id: definitionId })
          .catch(() => undefined);
      }
      await app.close();
    }
    restoreEnv?.();
    if (fakeGrok) await fs.rm(fakeGrok.dir, { recursive: true, force: true });
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  });

  const createGrokRun = async (input: { fixture: string; autoExecuteTools: boolean; env?: Record<string, string | undefined> }) => {
    const workspace = await fs.mkdtemp(path.join(dataDir, "workspace-"));
    const recordFile = path.join(workspace, "..", `acp-client-${randomUUID()}.jsonl`);
    const restore = overrideEnv({ FAKE_ACP_FIXTURE: input.fixture, FAKE_ACP_RECORD: recordFile, ...input.env });
    try {
      const started = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
        "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
        { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: "grok-4.7",
          llmConfig: { reasoning_effort: "low" }, autoExecuteTools: input.autoExecuteTools,
          runtimeKind: "grok_build" } },
      );
      expect(started.createAgentRun.success, started.createAgentRun.message).toBe(true);
      const runId = started.createAgentRun.runId!;
      runIds.push(runId);
      const recorded = async (): Promise<Array<Record<string, any>>> => (await fs.readFile(recordFile, "utf8"))
        .split("\n").filter(Boolean).map((line) => JSON.parse(line));
      return { runId, restore, recorded };
    } catch (error) {
      restore();
      throw error;
    }
  };

  const openAgentSocket = async (runId: string): Promise<{ socket: WebSocket; messages: WsMessage[] }> => {
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
    sockets.push(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type !== "string") return;
        messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object"
          && !Array.isArray(parsed.payload) ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* Ignore malformed diagnostic rows only. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await waitFor(messages, (message) => message.type === "CONNECTED", "CONNECTED");
    return { socket, messages };
  };

  const waitFor = async (messages: WsMessage[], predicate: (message: WsMessage) => boolean, label: string,
    timeoutMs = 20_000): Promise<WsMessage> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = messages.find(predicate);
      if (found) return found;
      await wait(50);
    }
    throw new Error(`Timed out waiting for ${label}; seen: ${messages.map((m) => m.type).join(",")}`);
  };

  it("lists the Grok Build catalog from the agent handshake with the reasoning-effort schema (AC-002)", async () => {
    const result = await graphql<{ providerModelCatalogSnapshots: Array<{
      runtimeKind: string;
      llmModels: Array<{ modelIdentifier: string; name: string; runtime: string; maxContextTokens: number | null;
        configSchema: Record<string, unknown> | null }>;
    }> }>(`query($runtimeKind: String) {
      providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
        runtimeKind
        llmModels { modelIdentifier name runtime maxContextTokens configSchema }
      }
    }`, { runtimeKind: "grok_build" });
    const models = result.providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels);
    expect(models.map((model) => model.modelIdentifier)).toEqual(["grok-4.7"]);
    expect(models[0]).toMatchObject({ name: "Grok 4.7", maxContextTokens: 500_000 });
    const schema = JSON.stringify(models[0]!.configSchema);
    expect(schema).toContain("reasoning_effort");
    for (const effort of ["xhigh", "high", "medium", "low"]) expect(schema).toContain(`"${effort}"`);
    expect(schema).toContain("\"high\"");
  }, 60_000);

  it("streams a recorded list_dir turn, records one usage row per Grok model call and exposes them via GraphQL (AC-003, AC-009)", async () => {
    const run = await createGrokRun({ fixture: grokAcpFixturePath("prompt"), autoExecuteTools: true });
    try {
      const { socket, messages } = await openAgentSocket(run.runId);
      sendE2eSendMessageCommand(socket, { agent_run_id: run.runId, content: "List the current directory, then reply briefly." });
      await waitFor(messages, (message) => message.type === "TURN_COMPLETED", "TURN_COMPLETED");
      await wait(300);

      const sessionNew = (await run.recorded()).find((message) => message.method === "session/new");
      // A user-facing standalone run always has send_message_to/delegate_task (REQ-012 of
      // cross-scope-agent-mentions), so Agent Tools MCP is attached even with no configured tools.
      expect(sessionNew?.params.mcpServers).toEqual([
        { type: "http", name: "autobyteus_agent_tools", url: expect.stringContaining("/mcp/agent-tools/"), headers: [] },
      ]);
      expect(Object.keys(sessionNew?.params._meta ?? {}).sort()).toEqual(["rules", "yoloMode"]);
      expect(sessionNew?.params._meta.yoloMode).toBe(true);
      expect(sessionNew?.params._meta.rules).toContain("GROK-REPLAY-INSTRUCTION");

      const started = messages.filter((message) => message.type === "TOOL_EXECUTION_STARTED");
      expect(started.map((message) => message.payload.tool_name)).toEqual(["list_dir"]);
      const invocationId = started[0]!.payload.invocation_id;
      expect(messages.some((message) => message.type === "TOOL_EXECUTION_SUCCEEDED"
        && message.payload.invocation_id === invocationId && message.payload.tool_name === "list_dir")).toBe(true);
      const text = messages.filter((message) => message.type === "SEGMENT_CONTENT")
        .map((message) => String(message.payload.delta ?? "")).join("");
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toMatch(/supergrok|Grok 4\.7 is here|privacy_notice|show_resolved_model/i);
      expect(messages.some((message) => message.type === "ERROR")).toBe(false);

      const usage = messages.filter((message) => message.type === "TOKEN_USAGE_UPDATED");
      expect(usage).toHaveLength(2);
      for (const [index, message] of usage.entries()) {
        expect(message.payload).toMatchObject({
          run_id: run.runId, runtime_kind: "grok_build", ingestion_kind: "grok_acp_call", usage_scope: "per_call",
          model_identifier: "grok-4.7", input_token_semantic: "base_excludes_cache",
        });
        expect(String(message.payload.idempotency_key)).toMatch(new RegExp(`^grok_build:[^:]+:[^:]+:${index + 1}$`));
      }

      let summary: Record<string, unknown> | null = null;
      for (let attempt = 0; attempt < 60 && !summary; attempt++) {
        const result = await graphql<{ getAgentRunTokenUsageSummary: Record<string, unknown> }>(`query($runId: String!) {
          getAgentRunTokenUsageSummary(runId: $runId) {
            usageReportCount grossInputTokens cacheReadInputTokens outputTokens reasoningOutputTokens
            latestRuntimeKind latestModelIdentifier apiCostStatus estimatedApiTotalCost
          }
        }`, { runId: run.runId });
        if (result.getAgentRunTokenUsageSummary.usageReportCount === 2) summary = result.getAgentRunTokenUsageSummary;
        else await wait(250);
      }
      // Sums of the two recorded `response_completed` calls equal Grok's reported turn usage.
      expect(summary).toMatchObject({
        usageReportCount: 2, grossInputTokens: 34_019, cacheReadInputTokens: 18_048, outputTokens: 146,
        reasoningOutputTokens: 109, latestRuntimeKind: "grok_build", latestModelIdentifier: "grok-4.7",
        apiCostStatus: "estimated",
      });
      expect(Number(summary?.estimatedApiTotalCost)).toBeGreaterThan(0);

      const projection = await graphql<{ getRunProjection: { conversation: unknown[] } }>(
        "query($runId: String!) { getRunProjection(runId: $runId) { conversation } }", { runId: run.runId });
      const history = JSON.stringify(projection.getRunProjection.conversation);
      expect(history).toContain("List the current directory");
      expect(history).toContain("list_dir");
    } finally {
      run.restore();
    }
  }, 60_000);

  it("turns a recorded Grok permission request into a run_bash approval answered over the WebSocket (AC-004)", async () => {
    const run = await createGrokRun({ fixture: grokAcpFixturePath("permission"), autoExecuteTools: false });
    try {
      const { socket, messages } = await openAgentSocket(run.runId);
      sendE2eSendMessageCommand(socket, { agent_run_id: run.runId, content: "Run the probe shell command." });
      const approval = await waitFor(messages, (message) => message.type === "TOOL_APPROVAL_REQUESTED", "approval request");
      expect(approval.payload.tool_name).toBe("run_bash");
      expect(JSON.stringify(approval.payload.arguments)).toContain("echo grok-permission-probe");
      const card = messages.find((message) => message.type === "SEGMENT_START"
        && message.payload.id === approval.payload.invocation_id);
      expect(card?.payload.segment_type).toBe("run_bash");

      socket.send(JSON.stringify({ type: "APPROVE_TOOL", payload: { invocation_id: approval.payload.invocation_id } }));
      await waitFor(messages, (message) => message.type === "TURN_COMPLETED", "TURN_COMPLETED");
      const answer = (await run.recorded()).find((message) => !("method" in message) && message.result?.outcome);
      expect(answer?.result.outcome).toEqual({ outcome: "selected", optionId: "allow-once" });
      expect(messages.some((message) => message.type === "TOOL_APPROVED"
        && message.payload.invocation_id === approval.payload.invocation_id)).toBe(true);
      expect(messages.some((message) => message.type === "TOOL_EXECUTION_SUCCEEDED"
        && message.payload.invocation_id === approval.payload.invocation_id)).toBe(true);
    } finally {
      run.restore();
    }
  }, 60_000);

  const writeFixture = async (name: string, rows: FixtureRow[]): Promise<string> => {
    const file = path.join(dataDir, `${name}.jsonl`);
    await fs.writeFile(file, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
    return file;
  };

  it("completes the turn when Grok ends it after a denied run_bash, and the run takes the next message (AC-004)", async () => {
    // Recorded permission turn up to the client's answer; then what Grok 1.0.41 does after
    // reject-once (live-observed): the tool fails and the prompt ends with `cancelled`.
    const rows = await readFixture("permission");
    const answerIndex = rows.findIndex((row) => row.dir === "out" && !("method" in row.msg) && row.msg.result?.outcome);
    const request = rows.find((row) => row.dir === "in" && row.msg.method === "session/request_permission")!;
    const prompt = rows.find((row) => row.dir === "out" && row.msg.method === "session/prompt")!;
    const sessionId = String(request.msg.params.sessionId);
    const update = (value: Record<string, unknown>): FixtureRow => ({ dir: "in",
      msg: { jsonrpc: "2.0", method: "session/update", params: { sessionId, update: value } } });
    const fixture = await writeFixture("permission-denied", [
      ...rows.slice(0, answerIndex + 1),
      update({ sessionUpdate: "tool_call_update", toolCallId: request.msg.params.toolCall.toolCallId, status: "failed" }),
      { dir: "in", msg: { jsonrpc: "2.0", id: prompt.msg.id, result: { stopReason: "cancelled" } } },
      { dir: "out", msg: { jsonrpc: "2.0", id: 99, method: "session/prompt", params: { sessionId } } },
      update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "NEXT-TURN-OK" } }),
      { dir: "in", msg: { jsonrpc: "2.0", id: 99, result: { stopReason: "end_turn" } } },
    ]);
    const run = await createGrokRun({ fixture, autoExecuteTools: false });
    try {
      const { socket, messages } = await openAgentSocket(run.runId);
      sendE2eSendMessageCommand(socket, { agent_run_id: run.runId, content: "Run the probe shell command." });
      const approval = await waitFor(messages, (message) => message.type === "TOOL_APPROVAL_REQUESTED", "approval request");
      expect(approval.payload.tool_name).toBe("run_bash");
      socket.send(JSON.stringify({ type: "DENY_TOOL", payload: { invocation_id: approval.payload.invocation_id, reason: "no" } }));
      const completed = await waitFor(messages, (message) => message.type === "TURN_COMPLETED", "TURN_COMPLETED after denial");
      expect(completed.payload.provider_stop_reason).toBe("cancelled");
      const answer = (await run.recorded()).find((message) => !("method" in message) && message.result?.outcome);
      expect(answer?.result.outcome).toEqual({ outcome: "selected", optionId: "reject-once" });
      expect(messages.some((message) => message.type === "TOOL_DENIED"
        && message.payload.invocation_id === approval.payload.invocation_id)).toBe(true);
      expect(messages.some((message) => message.type === "TURN_INTERRUPTED")).toBe(false);

      const from = messages.length;
      sendE2eSendMessageCommand(socket, { agent_run_id: run.runId, content: "Continue." });
      await waitFor(messages, (message) => messages.indexOf(message) >= from && message.type === "TURN_COMPLETED",
        "next turn TURN_COMPLETED");
      expect(messages.slice(from).filter((message) => message.type === "SEGMENT_CONTENT")
        .map((message) => String(message.payload.delta ?? "")).join("")).toContain("NEXT-TURN-OK");
    } finally {
      run.restore();
    }
  }, 60_000);

  it("fails run creation with Grok's own authentication error text when Grok is not logged in (AC-012)", async () => {
    // Recorded handshake; `session/new` answered with the error real Grok 1.0.41 returns
    // without a login (evidence/api-e2e/ac012-noauth-acp-wire).
    const rows = await readFixture("handshake");
    const sessionNewIndex = rows.findIndex((row) => row.dir === "out" && row.msg.method === "session/new");
    const fixture = await writeFixture("session-new-unauthenticated", [
      ...rows.slice(0, sessionNewIndex + 1),
      { dir: "in", msg: { jsonrpc: "2.0", id: rows[sessionNewIndex]!.msg.id,
        error: { code: -32000, message: "Authentication required", data: "no auth method id provided" } } },
    ]);
    const workspace = await fs.mkdtemp(path.join(dataDir, "workspace-"));
    const restore = overrideEnv({ FAKE_ACP_FIXTURE: fixture, FAKE_ACP_RECORD: undefined });
    try {
      const started = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
        "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
        { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: "grok-4.7",
          llmConfig: null, autoExecuteTools: true, runtimeKind: "grok_build" } },
      );
      expect(started.createAgentRun).toMatchObject({ success: false, runId: null });
      expect(started.createAgentRun.message).toContain("Grok Build: Authentication required: no auth method id provided");
      expect(started.createAgentRun.message).not.toContain(workspace);
    } finally {
      restore();
    }
  }, 60_000);

  it("ends the turn as interrupted with an explicit runtime error when the Grok process exits mid-turn (QR-006)", async () => {
    const rows = await readFixture("prompt");
    const promptIndex = rows.findIndex((row) => row.dir === "out" && row.msg.method === "session/prompt");
    const firstThought = rows.findIndex((row, index) => index > promptIndex
      && row.msg.params?.update?.sessionUpdate === "agent_thought_chunk");
    const truncated = path.join(dataDir, "prompt-exit-mid-turn.jsonl");
    await fs.writeFile(truncated, `${rows.slice(0, firstThought + 1).map((row) => JSON.stringify(row)).join("\n")}\n`);

    const run = await createGrokRun({ fixture: truncated, autoExecuteTools: true, env: { FAKE_ACP_EXIT_AT_END: "1" } });
    try {
      const { socket, messages } = await openAgentSocket(run.runId);
      const sentAt = Date.now();
      sendE2eSendMessageCommand(socket, { agent_run_id: run.runId, content: "Start a turn that the agent will abandon." });
      const error = await waitFor(messages, (message) => message.type === "ERROR", "runtime ERROR", 10_000);
      expect(Date.now() - sentAt).toBeLessThan(10_000);
      // Stdout end and process exit race; the connection reports whichever it observes first.
      expect(["ACP_AGENT_PROCESS_EXITED", "ACP_TRANSPORT_CLOSED"]).toContain(error.payload.code);
      expect(error.payload).toMatchObject({ error_scope: "runtime", error_effect: "terminal" });
      expect(String(error.payload.message)).toContain("Grok Build");
      expect(messages.some((message) => message.type === "TURN_INTERRUPTED")).toBe(true);
      expect(messages.some((message) => message.type === "TURN_COMPLETED")).toBe(false);
    } finally {
      run.restore();
    }
  }, 60_000);
});
