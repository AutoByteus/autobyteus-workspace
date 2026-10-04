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

// AGY compaction detection gate (REQ-A04, AC-A04) through the real server. The fake AGY CLI
// (tests/fixtures/agy-failure-cli.mjs, case auto_compaction) streams the same checkpoint DONE step as the
// compaction transport test, but reports CLI version 1.2.15 (AGY_FAKE_VERSION), below the proven 1.2.16.
// The checkpoint must be ignored exactly as before: no COMPACTION_STATUS, no marker, no rotation.
// Separate file because the server caches the CLI version for its process.
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
type TraceRow = { traceType: string; content: string | null };
type MemoryView = { rawTraces: TraceRow[] | null; rawTraceFiles: Array<{ fileName: string; kind: string }> | null };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("AGY compaction detection stays off below CLI 1.2.16", () => {
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
  const memoryView = async (): Promise<MemoryView> => (await graphql<{ getAgentRunMemoryView: MemoryView }>(
    `query($runId: String!) { getAgentRunMemoryView(runId: $runId, includeWorkingContext: false,
      includeEpisodic: false, includeSemantic: false, includeRawTraces: true, includeRawTraceFiles: true,
      includeArchive: true) { rawTraces { traceType content } rawTraceFiles { fileName kind } } }`,
    { runId })).getAgentRunMemoryView;

  beforeAll(async () => {
    // Set before the first run so the server's cached version probe reads the older fake version.
    process.env["AGY_FAKE_CASE"] = "auto_compaction";
    process.env["AGY_FAKE_VERSION"] = "1.2.15";
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-compaction-gate-off-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-compaction-gate-off-" + randomUUID(), role: "assistant", description: "gate probe",
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
    delete process.env["AGY_FAKE_VERSION"];
  });

  it("ignores the checkpoint step: no compaction event, no marker, no archive, full history", async () => {
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
    const completedTurns = () => messages.filter((m) => m.type === "TURN_COMPLETED").length;
    const until = async (predicate: () => boolean, label: string, ms = 20_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !predicate()) await wait(50);
      expect(predicate(), `${label}: ${JSON.stringify(messages.map((m) => m.type))}`).toBe(true);
    };

    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "First message." });
    await until(() => completedTurns() === 1, "first turn");
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Second message; the fake CLI streams a checkpoint." });
    await until(() => completedTurns() === 2, "checkpoint turn");
    // Give the recorder time to persist the second turn before reading memory.
    await wait(500);

    expect(messages.filter((m) => m.type === "COMPACTION_STATUS")).toHaveLength(0);
    expect(messages.some((m) => m.type === "ERROR")).toBe(false);
    expect(messages.some((m) => m.type === "SEGMENT_CONTENT" && m.payload["delta"] === "AFTER_COMPACTION_REPLY")).toBe(true);
    const view = await memoryView();
    expect((view.rawTraceFiles ?? []).filter((file) => file.kind === "segment")).toHaveLength(0);
    expect((view.rawTraces ?? []).filter((trace) => trace.traceType === "provider_compaction_boundary")).toHaveLength(0);
    const traces = JSON.stringify(view.rawTraces);
    expect(traces).toContain("BEFORE_COMPACTION_REPLY");
    expect(traces).toContain("AFTER_COMPACTION_REPLY");
    const history = JSON.stringify((await graphql<{ getRunProjection: { conversation: unknown[] } }>(
      "query($runId: String!) { getRunProjection(runId: $runId) { conversation } }", { runId })).getRunProjection);
    expect(history).toContain("BEFORE_COMPACTION_REPLY");
    expect(history).toContain("AFTER_COMPACTION_REPLY");
  }, 60_000);
});
