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

// AGY automatic compaction (checkpoint DONE step) through the real server: WebSocket, memory and history
// (REQ-A01/A02, AC-A01b). Fake AGY transport tests/fixtures/agy-failure-cli.mjs, case auto_compaction
// (reports CLI 1.2.16; turn 2 streams user_input → checkpoint DONE → reply → result).
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
type TraceRow = { traceType: string; content: string | null; toolResult: Record<string, unknown> | null };
type MemoryView = { rawTraces: TraceRow[] | null; rawTraceFiles: Array<{ fileName: string; kind: string }> | null };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("AGY automatic compaction through app WebSocket, memory and history", () => {
  let dataDir = "";
  let workspace = "";
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
  const memoryView = async (includeArchive: boolean): Promise<MemoryView> => (await graphql<{ getAgentRunMemoryView: MemoryView }>(
    `query($runId: String!, $includeArchive: Boolean!) { getAgentRunMemoryView(runId: $runId, includeWorkingContext: false,
      includeEpisodic: false, includeSemantic: false, includeRawTraces: true, includeRawTraceFiles: true,
      includeArchive: $includeArchive) { rawTraces { traceType content toolResult } rawTraceFiles { fileName kind } } }`,
    { runId, includeArchive })).getAgentRunMemoryView;
  const projection = async () => (await graphql<{ getRunProjection: { conversation: Array<Record<string, unknown>> } }>(
    "query($runId: String!) { getRunProjection(runId: $runId) { conversation } }", { runId })).getRunProjection;

  beforeAll(async () => {
    // Set before the first run so the server's cached version probe reads the 1.2.16 fake.
    process.env["AGY_FAKE_CASE"] = "auto_compaction";
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-compaction-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-compaction-" + randomUUID(), role: "assistant", description: "compaction probe",
        instructions: "Reply briefly.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
  });
  afterAll(async () => {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      if (runId) await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
        { agentRunId: runId }).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
    }
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    delete process.env["AGY_FAKE_CASE"];
  });

  it("shows one completed compaction, rotates raw traces once and reopens history at the boundary", async () => {
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
    const until = async (predicate: () => boolean | Promise<boolean>, label: string, ms = 20_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !(await predicate())) await wait(50);
      expect(await predicate(), `${label}: ${JSON.stringify(messages.map((m) => m.type))}`).toBe(true);
    };
    const completedTurns = () => messages.filter((m) => m.type === "TURN_COMPLETED").length;

    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "First message before compaction." });
    await until(() => completedTurns() === 1, "first turn");
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Second message; AGY compacts here." });
    await until(() => completedTurns() === 2, "compacting turn");

    const compactions = messages.filter((m) => m.type === "COMPACTION_STATUS");
    expect(compactions).toHaveLength(1);
    const conversationId = String(compactions[0]!.payload["provider_session_id"]);
    expect(compactions[0]!.payload).toMatchObject({
      kind: "provider_compaction_boundary", runtime_kind: "ANTIGRAVITY", provider: "antigravity",
      source_surface: "antigravity.checkpoint", boundary_key: `agy:${conversationId}:checkpoint:4`,
      provider_event_id: "checkpoint:4", status: "compacted", trigger: "auto", rotation_eligible: true, duration_ms: 7293,
    });
    const turnStarts = messages.filter((m) => m.type === "TURN_STARTED");
    expect(compactions[0]!.payload["turn_id"]).toBe(turnStarts[1]!.payload["turn_id"]);
    const index = (m: Wire) => messages.indexOf(m);
    const secondTurnText = messages.filter((m) => m.type === "SEGMENT_CONTENT" && m.payload["delta"] === "AFTER_COMPACTION_REPLY");
    expect(index(compactions[0]!)).toBeLessThan(index(secondTurnText[0]!));

    // Memory: one archive segment holding the pre-compaction work; the marker opens the active segment.
    await until(async () => ((await memoryView(true)).rawTraceFiles ?? []).some((file) => file.kind === "segment"),
      "archive segment written");
    const full = await memoryView(true);
    expect((full.rawTraceFiles ?? []).filter((file) => file.kind === "segment")).toHaveLength(1);
    const markers = (full.rawTraces ?? []).filter((trace) => trace.traceType === "provider_compaction_boundary");
    expect(markers).toHaveLength(1);
    expect(markers[0]!.toolResult).toMatchObject({ provider: "antigravity", status: "compacted",
      duration_ms: 7293, rotation_eligible: true });
    const active = await memoryView(false);
    expect(active.rawTraces?.[0]?.traceType).toBe("provider_compaction_boundary");
    expect(JSON.stringify(active.rawTraces)).not.toContain("BEFORE_COMPACTION_REPLY");
    expect(JSON.stringify(active.rawTraces)).toContain("AFTER_COMPACTION_REPLY");

    // Reopened history shows work since the compaction (BEH-A4).
    const history = JSON.stringify(await projection());
    expect(history).toContain("AFTER_COMPACTION_REPLY");
    expect(history).not.toContain("BEFORE_COMPACTION_REPLY");

    // A later turn adds no compaction.
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Third message." });
    await until(() => completedTurns() === 3, "later turn");
    expect(messages.filter((m) => m.type === "COMPACTION_STATUS")).toHaveLength(1);
    expect(messages.some((m) => m.type === "ERROR")).toBe(false);
  }, 60_000);
});
