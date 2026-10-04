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

// Real AGY automatic compaction through the real server (REQ-A01, AC-A01c). AGY 1.2.16 compacts after
// ~340K accumulated input; this sends ~90K-token data dumps (one per turn) until a checkpoint arrives
// (expected on turn 5; capped at 8), then one short turn. Opt-in: uses the local `agy` login and quota
// (about 1–2 minutes on gemini-3.8-flash-low).
// Run: RUN_AGY_COMPACTION_E2E=1 pnpm exec vitest run tests/e2e/runtime/agy-compaction-rotation-live.e2e.test.ts --no-watch
const live = process.env["RUN_AGY_COMPACTION_E2E"] === "1" && !process.env["ANTIGRAVITY_CLI_COMMAND"] &&
  spawnSync("agy", ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = live ? describe : describe.skip;
const MODEL = "gemini-3.8-flash-low";
const MAX_DUMP_TURNS = 8;
const TURN_TIMEOUT_MS = 180_000;
type Wire = { type: string; payload: Record<string, unknown> };
type TraceRow = { traceType: string; content: string | null; toolResult: Record<string, unknown> | null };
type MemoryView = { rawTraces: TraceRow[] | null; rawTraceFiles: Array<{ fileName: string; kind: string }> | null };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** ~179K characters (~90K tokens), the probe's data dump (investigation A15/A17). */
const dataDump = (turn: number) => `Data dump ${turn}. Do not analyze. Reply with exactly: OK DUMP${turn}\n` +
  Array.from({ length: 2200 }, (_, i) =>
    `Record ${i}: the quick brown fox ${i * 7} jumps over lazy dog ${i * 13}; checksum ${(i * 2654435761) % 1000003}.`).join("\n");

suite("real AGY automatic compaction rotates AutoByteus raw traces", () => {
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

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-compaction-live-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-compaction-live-" + randomUUID(), role: "assistant", description: "compaction live probe",
        instructions: "Reply exactly as asked. Do not use tools.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
  }, 60_000);
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
  }, 60_000);

  it("records one completed compaction and one archive segment per AGY checkpoint", async () => {
    const started = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: MODEL,
        llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" } });
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
    const settledTurns = () => messages.filter((m) => m.type === "TURN_COMPLETED" || m.type === "ERROR").length;
    const sendTurn = async (content: string) => {
      const before = settledTurns();
      sendE2eSendMessageCommand(socket!, { agent_run_id: runId, content });
      const deadline = Date.now() + TURN_TIMEOUT_MS;
      while (Date.now() < deadline && settledTurns() === before) await wait(250);
      expect(settledTurns(), `turn settled: ${JSON.stringify(messages.map((m) => m.type).slice(-20))}`).toBe(before + 1);
      expect(messages.some((m) => m.type === "ERROR"), JSON.stringify(messages.filter((m) => m.type === "ERROR"))).toBe(false);
    };
    const compactions = () => messages.filter((m) => m.type === "COMPACTION_STATUS");

    for (let turn = 1; turn <= MAX_DUMP_TURNS && compactions().length === 0; turn += 1) await sendTurn(dataDump(turn));
    expect(compactions().length, "AGY compacted within the dump turns").toBeGreaterThanOrEqual(1);
    await sendTurn("Reply with exactly: OK AFTER");

    for (const compaction of compactions()) {
      expect(compaction.payload).toMatchObject({ kind: "provider_compaction_boundary", runtime_kind: "ANTIGRAVITY",
        provider: "antigravity", source_surface: "antigravity.checkpoint", status: "compacted", trigger: "auto",
        rotation_eligible: true });
      expect(String(compaction.payload["boundary_key"])).toMatch(/^agy:[^:]+:checkpoint:\d+$/);
      expect(compaction.payload["duration_ms"]).toEqual(expect.any(Number));
    }
    const segments = async () => ((await memoryView(true)).rawTraceFiles ?? []).filter((file) => file.kind === "segment");
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline && (await segments()).length < compactions().length) await wait(250);
    expect(await segments()).toHaveLength(compactions().length);
    const active = (await memoryView(false)).rawTraces ?? [];
    expect(active[0]?.traceType).toBe("provider_compaction_boundary");
    expect(JSON.stringify(active)).toContain("OK AFTER");
  }, MAX_DUMP_TURNS * TURN_TIMEOUT_MS);
});
