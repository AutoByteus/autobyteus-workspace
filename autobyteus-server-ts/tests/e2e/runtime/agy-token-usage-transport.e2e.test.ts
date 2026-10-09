import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rootPrismaClient } from "repository_prisma";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// AGY token usage through the real server (REQ-002, AC-002, server side of AC-003). The fake AGY CLI
// (tests/fixtures/agy-failure-cli.mjs, case usage_report) replays, one per user turn, the 11 `result` events of
// a verbatim AGY 1.2.16 recording: cumulative usage per process, `input_tokens` without the cache reads,
// `total_tokens = input + output`. The Token Meter must count gross input = input + cache read and the
// cache miss = input, on the WebSocket deltas and on the persisted run record read through GraphQL.
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
type Summary = {
  grossInputTokens: number; standardInputTokens: number; cacheMissInputTokens: number; cacheReadInputTokens: number;
  outputTokens: number; totalTokens: number; cacheReadInputTokenRate: number | null; cacheState: string;
  apiCostStatus: string; estimatedApiTotalCost: number | null; latestRuntimeKind: string | null;
  latestModelIdentifier: string | null; usageReportCount: number;
};
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The recording has 11 turns with two automatic AGY compactions (turns 5 and 9). Cumulative usage of
// turns 1-3 (input excludes cache reads), asserted frame by frame:
//   turn 1: input  91,684  cache read       0
//   turn 2: input 173,199  cache read  90,059
//   turn 3: input 256,802  cache read 257,920  (more cache reads than uncached input)
// Turn 11 (final): input 696,661, cache read 904,704, output 43. Under the pre-fix basis
// (standard = max(0, input - cache read)) every turn after the first has a lower standard input than turn 1
// (83,140, then 0), so the fold rejected them as regressed; under the fix every field only grows.
const recordedTurnCount = 11;
const expectedTurnDeltas = [
  { gross: 91_684, miss: 91_684, read: 0, output: 4 },
  { gross: 81_515 + 90_059, miss: 81_515, read: 90_059, output: 4 },
  { gross: 83_603 + 167_861, miss: 83_603, read: 167_861, output: 4 },
];

suite("AGY token usage counts cache reads in gross input through the real server", () => {
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
  const summary = async (): Promise<Summary> => (await graphql<{ getAgentRunTokenUsageSummary: Summary }>(
    `query($runId: String!) { getAgentRunTokenUsageSummary(runId: $runId) { grossInputTokens standardInputTokens
      cacheMissInputTokens cacheReadInputTokens outputTokens totalTokens cacheReadInputTokenRate cacheState
      apiCostStatus estimatedApiTotalCost latestRuntimeKind latestModelIdentifier usageReportCount } }`,
    { runId })).getAgentRunTokenUsageSummary;

  beforeAll(async () => {
    process.env["AGY_FAKE_CASE"] = "usage_report";
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-token-usage-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-token-usage-" + randomUUID(), role: "assistant", description: "usage probe",
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
    if (runId) await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId } }).catch(() => undefined);
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    delete process.env["AGY_FAKE_CASE"];
  });

  it("streams per-turn deltas and persists gross = input + cache read, miss = input (AE-001)", async () => {
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
    const usageFrames = () => messages.filter((m) => m.type === "TOKEN_USAGE_UPDATED");
    const until = async (predicate: () => boolean, label: string, ms = 20_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !predicate()) await wait(50);
      expect(predicate(), `${label}: ${JSON.stringify(messages.map((m) => m.type))}`).toBe(true);
    };

    for (let index = 0; index < recordedTurnCount; index++) {
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: `Turn ${index + 1}.` });
      await until(() => messages.filter((m) => m.type === "TURN_COMPLETED").length === index + 1
        && usageFrames().length === index + 1, `turn ${index + 1}`);
      const frame = usageFrames()[index]!.payload;
      expect(frame["quality_flags"], `turn ${index + 1} flags`).not.toContain("cumulative_snapshot_regressed");
      const expected = expectedTurnDeltas[index];
      if (!expected) continue;
      expect(frame, `turn ${index + 1} usage frame`).toMatchObject({
        runtime_kind: "antigravity_cli",
        input_token_semantic: "base_excludes_cache",
        accounting_input_tokens: expected.gross,
        standard_input_tokens: expected.miss,
        cache_miss_input_tokens: expected.miss,
        cache_read_input_tokens: expected.read,
        accounting_output_tokens: expected.output,
        cache_state: index === 0 ? "zero_reported" : "positive",
      });
    }
    expect(messages.some((m) => m.type === "ERROR")).toBe(false);

    // Persisted run record through the public read path (what the Token Meter loads).
    await wait(250);
    const persisted = await summary();
    expect(persisted).toMatchObject({
      grossInputTokens: 696_661 + 904_704,
      standardInputTokens: 696_661,
      cacheMissInputTokens: 696_661,
      cacheReadInputTokens: 904_704,
      outputTokens: 43,
      totalTokens: 696_661 + 904_704 + 43,
      cacheState: "positive",
      // AGY model ids are not in the catalog (out of scope): no cost, unchanged.
      apiCostStatus: "price_missing",
      estimatedApiTotalCost: null,
      latestRuntimeKind: "antigravity_cli",
      latestModelIdentifier: "gemini-3.8-flash-low",
      usageReportCount: recordedTurnCount,
    });
    // AC-003 on the server side: gross covers the cache reads and the hit stays below 100% with uncached input.
    expect(persisted.grossInputTokens).toBeGreaterThanOrEqual(persisted.cacheReadInputTokens);
    expect(persisted.cacheReadInputTokenRate).toBeCloseTo(904_704 / (696_661 + 904_704), 9);
    expect(persisted.cacheReadInputTokenRate!).toBeLessThan(1);

    const row = await rootPrismaClient.tokenUsageRunRecord.findUnique({ where: { runId } });
    expect(row).not.toBeNull();
    expect(JSON.parse(row!.qualityFlagsJson)).not.toContain("cumulative_snapshot_regressed");
  }, 90_000);
});
