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
// Gated: RUN_GROK_E2E=1 and a working Grok command (`GROK_BUILD_COMMAND` or `grok`).
const grokCommand = process.env.GROK_BUILD_COMMAND?.trim() || "grok";
const grokReady = spawnSync(grokCommand, ["--version"], { stdio: "ignore" }).status === 0;
const userGrokAuth = path.join(process.env.GROK_HOME?.trim() || path.join(os.homedir(), ".grok"), "auth.json");
const describeLive = process.env.RUN_GROK_E2E === "1" && grokReady ? describe : describe.skip;
const STEP_TIMEOUT_MS = Number(process.env.GROK_E2E_STEP_TIMEOUT_MS || 180_000);
const filler = (records: number) => Array.from({ length: records }, (_, i) =>
  `Record ${i}: the quick brown fox ${i * 7} jumps over lazy dog ${i * 13}; checksum ${(i * 2654435761) % 1000003}.`).join("\n");

type WsMessage = { type: string; payload: Record<string, unknown> };
type MemoryView = { rawTraces: Array<{ traceType: string; toolResult: Record<string, unknown> | null }> | null;
  rawTraceFiles: Array<{ kind: string }> | null };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describeLive("Grok Build compaction (live E2E, temporary GROK_HOME)", () => {
  const previousGrokHome = process.env.GROK_HOME;
  let root = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  let runId = "";
  let definitionId = "";
  let socket: WebSocket | null = null;

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
      "[cli]\nauto_update = false\n\n[session]\nauto_compact_threshold_percent = 10\n");
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
    if (previousGrokHome === undefined) delete process.env.GROK_HOME; else process.env.GROK_HOME = previousGrokHome;
    if (root) await fs.rm(root, { recursive: true, force: true }); // removes the symlink, never its target
  }, 60_000);

  it("closes an interrupted automatic compaction as failed, then archives automatic and manual compactions", async () => {
    const model = process.env.GROK_E2E_MODEL?.trim() || "grok-4.7";
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: path.join(root, "data", "workspace"),
        llmModelIdentifier: model, llmConfig: { reasoning_effort: process.env.GROK_E2E_REASONING_EFFORT?.trim() || "low" },
        autoExecuteTools: true, runtimeKind: "grok_build" } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    runId = created.createAgentRun.runId!;
    socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
    const messages: WsMessage[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object"
          && !Array.isArray(parsed.payload) ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* Ignore malformed diagnostic rows only. */ }
    });
    await new Promise<void>((resolve, reject) => { socket!.once("open", () => resolve()); socket!.once("error", reject); });
    const waitFor = async (from: number, predicate: (m: WsMessage) => boolean, label: string): Promise<WsMessage> => {
      const deadline = Date.now() + STEP_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const found = messages.slice(from).find(predicate);
        if (found) return found;
        await wait(100);
      }
      throw new Error(`Timed out waiting for ${label}: ${messages.slice(from).slice(-20).map((m) => m.type).join(",")}`);
    };
    const turnEnded = (m: WsMessage) => m.type === "TURN_COMPLETED" || m.type === "TURN_INTERRUPTED";
    const compaction = (status: string) => (m: WsMessage) => m.type === "COMPACTION_STATUS" && m.payload.status === status;
    const send = (content: string) => { sendE2eSendMessageCommand(socket!, { agent_run_id: runId, content }); };

    // 1. Data dump A.
    let from = messages.length;
    send(`Data dump A. Do not analyze. Reply with exactly: OK A\n${filler(350)}`);
    await waitFor(from, turnEnded, "dump turn end");
    expect(messages.slice(from).some((m) => m.type === "COMPACTION_STATUS")).toBe(false);

    // 2. Data dump B: automatic compaction starts; interrupt it.
    from = messages.length;
    send(`Data dump B. Do not analyze. Reply with exactly: OK B\n${filler(350)}`);
    const started = await waitFor(from, compaction("compacting"), "automatic compaction start");
    expect(started.payload).toMatchObject({ provider: "grok", runtime_kind: "GROK_BUILD", trigger: "auto", rotation_eligible: false });
    await wait(3_000);
    socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: `interrupt-${randomUUID()}` } }));
    const failed = await waitFor(from, compaction("failed"), "failed close");
    const interrupted = await waitFor(from, turnEnded, "interrupted turn end");
    expect(messages.slice(from).some(compaction("compacted")), "compaction finished before the interrupt; rerun").toBe(false);
    expect(failed.payload).toMatchObject({ source_surface: "grok.compaction_abandoned",
      provider_event_id: started.payload.provider_event_id, rotation_eligible: false });
    expect(messages.indexOf(failed)).toBeLessThan(messages.indexOf(interrupted));

    // 3. Automatic compaction runs again and completes.
    from = messages.length;
    send("Reply with exactly: OK C");
    const autoStart = await waitFor(from, compaction("compacting"), "second automatic compaction start");
    const autoDone = await waitFor(from, compaction("compacted"), "automatic compaction completion");
    await waitFor(from, turnEnded, "third turn end");
    expect(autoDone.payload).toMatchObject({ provider_event_id: autoStart.payload.provider_event_id, trigger: "auto",
      rotation_eligible: true, pre_tokens: expect.any(Number), post_tokens: expect.any(Number), duration_ms: expect.any(Number) });

    // 4. Manual /compact (native in Grok; completion only).
    from = messages.length;
    send("/compact");
    const manual = await waitFor(from, compaction("compacted"), "manual compaction completion");
    await waitFor(from, turnEnded, "manual compaction turn end");
    expect(messages.slice(from).some(compaction("compacting"))).toBe(false);
    expect(manual.payload).toMatchObject({ trigger: "manual", rotation_eligible: true, pre_tokens: expect.any(Number) });

    // Memory: two archive segments; the abandoned compaction never rotated.
    const deadline = Date.now() + 15_000;
    let view = await memoryView("files");
    while (Date.now() < deadline && (view.rawTraceFiles ?? []).filter((file) => file.kind === "segment").length < 2) {
      await wait(250);
      view = await memoryView("files");
    }
    expect((view.rawTraceFiles ?? []).filter((file) => file.kind === "segment")).toHaveLength(2);
    const markers = ((await memoryView("corpus")).rawTraces ?? []).filter((trace) => trace.traceType === "provider_compaction_boundary")
      .map((trace) => trace.toolResult ?? {});
    expect(markers.map((marker) => marker.status)).toEqual(["compacting", "failed", "compacting", "compacted", "compacted"]);
  }, STEP_TIMEOUT_MS * 5);
});
