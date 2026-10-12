import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// Live proof that a Codex automatic compaction updates the Token Meter with Codex's own
// post-compaction context size (token-meter-accuracy REQ-006, AC-006, D-6, D-9): the update is a
// reading-only save (no model call, no tokens, revision + 1), never 0 and never suppressed.
// Real Studio server (public GraphQL + agent WebSocket) and real Codex app server. The app server
// runs with a temporary CODEX_HOME whose config.toml only sets model_auto_compact_token_limit=20000
// and whose auth.json is a symlink to ~/.codex/auth.json; ~/.codex is never written by the test.
// Gated: RUN_CODEX_E2E=1 (uses Codex quota: three turns, ~250K input tokens). Optional CODEX_E2E_TOOL_MODEL.
// Run: RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-compaction-token-reading.e2e.test.ts --no-watch
const codexReady = spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const suite = codexReady && process.env.RUN_CODEX_E2E === "1" ? describe : describe.skip;
const MODEL = process.env.CODEX_E2E_TOOL_MODEL?.trim() || "gpt-5.6-luna";
const dump = (label: string) => `Data dump ${label}. Do not analyze. Reply with exactly: OK ${label}\n` +
  Array.from({ length: 2000 }, (_, i) =>
    `Record ${i}: the quick brown fox ${i * 7} jumps over lazy dog ${i * 13}; checksum ${(i * 2654435761) % 1000003}.`).join("\n");
type Frame = { type: string; payload: Record<string, any> };

suite("Codex compaction token reading (live E2E)", () => {
  let url: URL;
  let close: (() => Promise<void>) | null = null;
  let root = "";
  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-compaction-reading-"));
    const codexHome = path.join(root, "codex-home");
    await fs.mkdir(codexHome, { recursive: true });
    await fs.symlink(path.join(os.homedir(), ".codex", "auth.json"), path.join(codexHome, "auth.json"));
    await fs.writeFile(path.join(codexHome, "config.toml"), "model_auto_compact_token_limit = 20000\n");
    vi.stubEnv("CODEX_HOME", codexHome);
    const appData = path.join(root, "app-data");
    await fs.mkdir(appData, { recursive: true });
    await fs.writeFile(path.join(appData, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(appData);
    const started = await startStudioE2eRuntimeServer();
    url = started.mainUrl;
    close = () => started.fastify.close();
  }, 120_000);
  afterAll(async () => {
    if (close) await close();
    vi.unstubAllEnvs();
    if (root) await fs.rm(root, { recursive: true, force: true });
  });
  const gql = async (query: string, variables?: Record<string, unknown>) => {
    const response = await fetch(new URL("/graphql", url), { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: any; errors?: unknown };
    if (body.errors || !body.data) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  it("stores each post-compaction reading as a reading-only update: no call, no tokens, revision + 1", async () => {
    const workspaceRootPath = path.join(root, "workspace");
    await fs.mkdir(workspaceRootPath, { recursive: true });
    const definitionId = (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `codex-compaction-reading-${randomUUID().slice(0, 8)}`, role: "assistant", description: "compaction reading",
        instructions: "Reply exactly as asked. Do not use tools.", category: "runtime-e2e", toolNames: [], skillNames: [] } })).createAgentDefinition.id;
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath, llmModelIdentifier: MODEL,
        autoExecuteTools: false, runtimeKind: "codex_app_server", llmConfig: { reasoning_effort: "low" } } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    const socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`);
    const frames: Frame[] = [];
    socket.on("message", (raw) => { try { frames.push(JSON.parse(String(raw)) as Frame); } catch { /* ignore */ } });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    const until = async (predicate: () => boolean, label: string, ms = 300_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline) { if (predicate()) return; await new Promise((r) => setTimeout(r, 200)); }
      throw new Error(`Timed out waiting for ${label}: ${frames.slice(-20).map((f) => f.type).join(",")}`);
    };
    const summary = async () => (await gql(`query($runId: String!) { getAgentRunTokenUsageSummary(runId: $runId) {
      usageReportCount revision totalTokens latestPromptTokens effectiveContextWindowTokens } }`, { runId })).getAgentRunTokenUsageSummary;
    const turn = async (content: string) => {
      const completed = frames.filter((f) => f.type === "TURN_COMPLETED").length;
      sendE2eSendMessageCommand(socket, { content });
      await until(() => frames.filter((f) => f.type === "TURN_COMPLETED").length > completed, `turn "${content.slice(0, 24)}"`);
    };
    try {
      await until(() => frames.some((f) => f.type === "CONNECTED"), "CONNECTED", 20_000);
      await turn(dump("ONE"));
      await turn(dump("TWO"));
      await turn("Reply with exactly: OK THREE");
      await new Promise((r) => setTimeout(r, 1500));

      const relevant = frames.filter((f) => f.type === "TOKEN_USAGE_UPDATED" || f.type === "COMPACTION_STATUS");
      const usage = relevant.filter((f) => f.type === "TOKEN_USAGE_UPDATED");
      console.info("[codex compaction reading]", JSON.stringify(relevant.map((f) => f.type === "COMPACTION_STATUS"
        ? { compaction: f.payload.status }
        : { call: f.payload.reports_model_call, delta: f.payload.meter_delta_total_tokens, prompt: f.payload.latest_prompt_tokens,
          count: f.payload.run_summary_after_event?.usage_report_count, revision: f.payload.run_summary_after_event?.revision,
          total: f.payload.run_summary_after_event?.total_tokens })));
      expect(relevant.some((f) => f.type === "COMPACTION_STATUS" && f.payload.status === "compacted")).toBe(true);

      // Every model call: Codex's own last-call context size over its window.
      const calls = usage.filter((f) => f.payload.reports_model_call === true);
      expect(calls.length).toBeGreaterThanOrEqual(3);
      for (const call of calls) {
        expect(call.payload.latest_prompt_tokens).toBeGreaterThan(0);
        expect(call.payload.effective_context_window_tokens).toBeGreaterThan(0);
      }
      // Every compaction update: the post-compaction size, stored without a call or tokens (AC-006).
      const readings = usage.filter((f) => f.payload.reports_model_call === false);
      expect(readings.length).toBeGreaterThanOrEqual(1);
      for (const reading of readings) {
        const previous = usage[usage.indexOf(reading) - 1]!;
        expect(reading.payload.meter_delta_total_tokens ?? 0).toBe(0);
        expect(reading.payload.latest_prompt_tokens).toBeGreaterThan(0);
        expect(reading.payload.latest_prompt_tokens).toBeLessThan(previous.payload.latest_prompt_tokens);
        const before = previous.payload.run_summary_after_event;
        const after = reading.payload.run_summary_after_event;
        expect(after).toMatchObject({
          usage_report_count: before.usage_report_count,
          total_tokens: before.total_tokens,
          revision: before.revision + 1,
          latest_prompt_tokens: reading.payload.latest_prompt_tokens,
        });
      }
      // The persisted summary is what the live stream ended with.
      const last = usage.at(-1)!.payload.run_summary_after_event;
      expect(await summary()).toMatchObject({ usageReportCount: last.usage_report_count, revision: last.revision,
        totalTokens: last.total_tokens, latestPromptTokens: last.latest_prompt_tokens });
    } finally {
      socket.close();
      await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined);
    }
  }, 900_000);
});
