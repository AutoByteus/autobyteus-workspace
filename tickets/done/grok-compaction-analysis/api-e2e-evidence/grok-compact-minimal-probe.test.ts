import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../e2e/helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../e2e/helpers/websocket-command-helpers.js";

// Live Grok Build compaction through the real Studio server and the host's `grok` CLI (REQ-G1–G3).
// Grok runs with a temporary GROK_HOME: a symlink to the user's auth.json and a config with
// `auto_compact_threshold_percent = 10`. Grok checks the threshold with the incoming prompt
// included, so the second ~14K-token dump opens its turn with an automatic compaction (probe G13).
// The user's ~/.grok is only read through that symlink, never written. One run, four turns, to
// keep the credit use small:
//   1. data dump A (no compaction yet)
//   2. data dump B: automatic compaction starts → interrupt → failed close, no archive
//   3. short turn: automatic compaction runs again → completed, one archive
//   4. `/compact` (manual) → completed, a second archive
// Then (no or few credits): reopened history via GraphQL, and terminate → restore → one short turn,
// where the session/load replay must record no compaction again (REQ-G4).
// Gated: RUN_GROK_E2E=1 and a working Grok command (`GROK_BUILD_COMMAND` or `grok`).
const grokCommand = process.env.GROK_BUILD_COMMAND?.trim() || "grok";
const grokReady = spawnSync(grokCommand, ["--version"], { stdio: "ignore" }).status === 0;
const userGrokAuth = path.join(process.env.GROK_HOME?.trim() || path.join(os.homedir(), ".grok"), "auth.json");
const describeLive = process.env.RUN_GROK_E2E === "1" && grokReady ? describe : describe.skip;
const STEP_TIMEOUT_MS = Number(process.env.GROK_E2E_STEP_TIMEOUT_MS || 180_000);
/** Optional: on failure, keep the run's memory folder and Grok session files (never auth.json) here. */
const EVIDENCE_DIR = process.env.GROK_E2E_EVIDENCE_DIR?.trim() || "";
const filler = (records: number) => Array.from({ length: records }, (_, i) =>
  `Record ${i}: the quick brown fox ${i * 7} jumps over lazy dog ${i * 13}; checksum ${(i * 2654435761) % 1000003}.`).join("\n");

type WsMessage = { type: string; payload: Record<string, unknown> };
type MemoryView = { rawTraces: Array<{ traceType: string; toolResult: Record<string, unknown> | null }> | null;
  rawTraceFiles: Array<{ kind: string }> | null };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describeLive("TEMPORARY API/E2E probe: Grok /compact rotation, history and restore (minimal credits)", () => {
  const previousGrokHome = process.env.GROK_HOME;
  let root = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  let runId = "";
  let definitionId = "";
  let socket: WebSocket | null = null;
  let passed = false;

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  /** File listing (selected-file mode) or the complete raw-trace corpus, active plus archive segments. */
  const memoryView = async (mode: "files" | "corpus"): Promise<MemoryView> => (await graphql<{ getAgentRunMemoryView: MemoryView }>(
    `query($runId: String!, $files: Boolean!, $corpus: Boolean!) { getAgentRunMemoryView(runId: $runId,
      includeWorkingContext: false, includeEpisodic: false, includeSemantic: false, includeRawTraces: true,
      includeRawTraceFiles: $files, includeArchive: $corpus) { rawTraces { traceType toolResult } rawTraceFiles { kind } } }`,
    { runId, files: mode === "files", corpus: mode === "corpus" })).getAgentRunMemoryView;

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "grok-compaction-live-"));
    const grokHome = path.join(root, "grok-home");
    await fs.mkdir(grokHome);
    await fs.symlink(userGrokAuth, path.join(grokHome, "auth.json"));
    await fs.writeFile(path.join(grokHome, "config.toml"),
      "[cli]\nauto_update = false\n");
    process.env.GROK_HOME = grokHome; // inherited by every grok process the server starts
    const dataDir = path.join(root, "data");
    await fs.mkdir(path.join(dataDir, "workspace"), { recursive: true });
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `grok-compaction-${randomUUID()}`, role: "assistant", description: "Grok compaction live e2e",
        instructions: "Reply exactly as asked. Do not use tools.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
  }, 120_000);

  afterAll(async () => {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    if (app) {
      if (runId) await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
        { agentRunId: runId }).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
      await app.close();
    }
    if (!passed && EVIDENCE_DIR && root) {
      await fs.mkdir(EVIDENCE_DIR, { recursive: true });
      await fs.cp(path.join(root, "data", "memory"), path.join(EVIDENCE_DIR, "memory"), { recursive: true }).catch(() => undefined);
      await fs.cp(path.join(root, "grok-home"), path.join(EVIDENCE_DIR, "grok-home"), { recursive: true,
        filter: (source) => path.basename(source) !== "auth.json" }).catch(() => undefined);
    }
    if (previousGrokHome === undefined) delete process.env.GROK_HOME; else process.env.GROK_HOME = previousGrokHome;
    if (root) await fs.rm(root, { recursive: true, force: true }); // removes the symlink, never its target
  }, 60_000);

  it("rotates on /compact, reopens at the boundary and records nothing again on restore", async () => {
    const model = process.env.GROK_E2E_MODEL?.trim() || "grok-4.7";
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: path.join(root, "data", "workspace"),
        llmModelIdentifier: model, llmConfig: { reasoning_effort: "low" }, autoExecuteTools: true, runtimeKind: "grok_build" } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    runId = created.createAgentRun.runId!;
    const messages: WsMessage[] = [];
    const connect = async () => {
      socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
      socket.on("message", (raw: unknown) => {
        try {
          const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
          if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object"
            && !Array.isArray(parsed.payload) ? parsed.payload as Record<string, unknown> : {} });
        } catch { /* ignore */ }
      });
      await new Promise<void>((resolve, reject) => { socket!.once("open", () => resolve()); socket!.once("error", reject); });
    };
    await connect();
    const waitFor = async (from: number, predicate: (m: WsMessage) => boolean, label: string): Promise<WsMessage> => {
      const deadline = Date.now() + STEP_TIMEOUT_MS;
      while (Date.now() < deadline) { const found = messages.slice(from).find(predicate); if (found) return found; await wait(100); }
      throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(messages.filter((m) => m.type === "COMPACTION_STATUS").map((m) => m.payload))}`);
    };
    const turnEnded = (m: WsMessage) => m.type === "TURN_COMPLETED" || m.type === "TURN_INTERRUPTED";
    const send = (content: string) => { sendE2eSendMessageCommand(socket!, { agent_run_id: runId, content }); };
    const log: Record<string, unknown> = {};
    try {
      let from = messages.length;
      send("Reply with exactly: OK ONE");
      await waitFor(from, turnEnded, "turn 1");
      from = messages.length;
      send("/compact");
      const manual = await waitFor(from, (m) => m.type === "COMPACTION_STATUS" && m.payload.status === "compacted", "manual completion");
      await waitFor(from, turnEnded, "compact turn");
      log.manual = manual.payload;
      expect(manual.payload).toMatchObject({ provider: "grok", runtime_kind: "GROK_BUILD", trigger: "manual", rotation_eligible: true,
        source_surface: "grok.auto_compact_completed", pre_tokens: expect.any(Number), post_tokens: expect.any(Number) });
      expect(messages.slice(from).some((m) => m.type === "COMPACTION_STATUS" && m.payload.status === "compacting")).toBe(false);
      await wait(1_000);
      const files = (await memoryView("files")).rawTraceFiles ?? [];
      const corpus = ((await memoryView("corpus")).rawTraces ?? []).filter((t) => t.traceType === "provider_compaction_boundary").map((t) => t.toolResult ?? {});
      log.segments = files.filter((f) => f.kind === "segment").length; log.markers = corpus.map((m) => m.status);
      expect(files.filter((f) => f.kind === "segment")).toHaveLength(1);
      expect(corpus.map((m) => m.status)).toEqual(["compacted"]);
      const history = (await graphql<{ getRunProjection: { conversation: unknown[]; activities: Array<Record<string, unknown>> } }>(
        "query($runId: String!) { getRunProjection(runId: $runId) { conversation activities } }", { runId })).getRunProjection;
      const rows = history.activities.filter((a) => a.kind === "compaction");
      log.historyRows = rows.map((a) => a.phase); log.historyHasOne = JSON.stringify(history.conversation).includes("OK ONE");
      expect(rows.map((a) => a.phase)).toEqual(["completed"]);
      expect(JSON.stringify(history.conversation)).not.toContain("OK ONE");
      // Restore: the session/load replay (which contains the completion notification) must record nothing.
      const seen = new Set(messages.filter((m) => m.type === "COMPACTION_STATUS").map((m) => m.payload.provider_event_id));
      socket!.close();
      expect((await graphql<{ terminateAgentRun: { success: boolean } }>(
        "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId })).terminateAgentRun.success).toBe(true);
      const restored = (await graphql<{ restoreAgentRun: { success: boolean; message: string } }>(
        "mutation($agentRunId: String!) { restoreAgentRun(agentRunId: $agentRunId) { success message } }", { agentRunId: runId })).restoreAgentRun;
      expect(restored.success, restored.message).toBe(true);
      await connect();
      from = messages.length;
      send("Reply with exactly: OK TWO");
      await waitFor(from, turnEnded, "restored turn");
      const after = messages.slice(from).filter((m) => m.type === "COMPACTION_STATUS");
      log.afterRestore = after.map((m) => m.payload.status);
      for (const event of after) expect(seen.has(event.payload.provider_event_id)).toBe(false);
      await wait(1_000);
      const segmentsAfter = ((await memoryView("files")).rawTraceFiles ?? []).filter((f) => f.kind === "segment").length;
      log.segmentsAfterRestore = segmentsAfter;
      expect(segmentsAfter).toBe(1 + after.filter((m) => m.payload.status === "compacted").length);
      passed = true;
    } finally {
      log.events = messages.filter((m) => m.type === "COMPACTION_STATUS" || turnEnded(m)).map((m) => m.type === "COMPACTION_STATUS" ? m.payload : m.type);
      if (EVIDENCE_DIR) { await fs.mkdir(EVIDENCE_DIR, { recursive: true }); await fs.writeFile(path.join(EVIDENCE_DIR, "probe-log.json"), JSON.stringify(log, null, 1)); }
    }
  }, STEP_TIMEOUT_MS * 4);
});
