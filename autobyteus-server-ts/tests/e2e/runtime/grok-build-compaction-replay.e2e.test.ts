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
import { createFakeGrokCommand, grokAcpFixturePath, overrideEnv, type FakeGrokCommand } from "../helpers/grok-fake-cli.js";

// Zero-cost Grok Build compaction coverage through the real Studio server (GraphQL, agent WebSocket,
// AgentRunManager, ACP backend, memory recorder, run-history projection). `GROK_BUILD_COMMAND` points at
// the recorded-fixture fake CLI, which replays real Grok 1.0.46 compaction traffic
// (tests/fixtures/grok-acp/compaction-*.jsonl). The fake waits for each client method in order, so
// prompts and the user's Stop (session/cancel) are driven through the real WebSocket (REQ-G1–G3).

type WsMessage = { type: string; payload: Record<string, unknown> };
type MemoryView = { rawTraces: Array<{ traceType: string; toolResult: Record<string, unknown> | null }> | null;
  rawTraceFiles: Array<{ kind: string }> | null };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Grok Build compaction over GraphQL/WebSocket (recorded Grok 1.0.46 replay)", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  let fakeGrok: FakeGrokCommand;
  let restoreEnv: (() => void) | null = null;
  let definitionId = "";
  const runIds: string[] = [];
  const sockets: WebSocket[] = [];

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  /** File listing (selected-file mode) or the complete raw-trace corpus (active plus archive segments). */
  const memoryView = async (runId: string, mode: "files" | "corpus"): Promise<MemoryView> =>
    (await graphql<{ getAgentRunMemoryView: MemoryView }>(
      `query($runId: String!, $files: Boolean!, $corpus: Boolean!) { getAgentRunMemoryView(runId: $runId,
        includeWorkingContext: false, includeEpisodic: false, includeSemantic: false, includeRawTraces: true,
        includeRawTraceFiles: $files, includeArchive: $corpus) { rawTraces { traceType toolResult } rawTraceFiles { kind } } }`,
      { runId, files: mode === "files", corpus: mode === "corpus" })).getAgentRunMemoryView;
  const segments = async (runId: string) =>
    ((await memoryView(runId, "files")).rawTraceFiles ?? []).filter((file) => file.kind === "segment").length;
  const markerStatuses = async (runId: string) => ((await memoryView(runId, "corpus")).rawTraces ?? [])
    .filter((trace) => trace.traceType === "provider_compaction_boundary").map((trace) => trace.toolResult?.status);
  const history = async (runId: string) => (await graphql<{ getRunProjection: {
    conversation: unknown[]; activities: Array<Record<string, unknown>> } }>(
    "query($runId: String!) { getRunProjection(runId: $runId) { conversation activities } }", { runId })).getRunProjection;

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "grok-compaction-replay-e2e-"));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    fakeGrok = await createFakeGrokCommand();
    restoreEnv = overrideEnv({
      GROK_BUILD_COMMAND: fakeGrok.command, FAKE_GROK_VERSION: "1.0.46", FAKE_ACP_FIXTURE: undefined,
      FAKE_ACP_EXIT_AT_END: undefined, FAKE_ACP_STOP_BEFORE: undefined, FAKE_ACP_RECORD: undefined,
      // Standalone runs attach Agent Tools MCP; the recordings predate that, so the fake reports it ready.
      FAKE_ACP_REPORT_MCP_READY: "1",
    });
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `grok-compaction-replay-${randomUUID()}`, role: "assistant", description: "Grok compaction replay",
        instructions: "Reply exactly as asked.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
  }, 60_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (app) {
      for (const runId of runIds) {
        await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
          { agentRunId: runId }).catch(() => undefined);
      }
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
      await app.close();
    }
    restoreEnv?.();
    if (fakeGrok) await fs.rm(fakeGrok.dir, { recursive: true, force: true });
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  });

  /** Starts a Grok run replaying `fixture` and opens its agent socket. */
  const startRun = async (fixture: string) => {
    const workspace = await fs.mkdtemp(path.join(dataDir, "workspace-"));
    const restore = overrideEnv({ FAKE_ACP_FIXTURE: grokAcpFixturePath(fixture) });
    try {
      const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
        "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
        { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: "grok-4.7",
          llmConfig: { reasoning_effort: "low" }, autoExecuteTools: true, runtimeKind: "grok_build" } });
      expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
      const runId = created.createAgentRun.runId!;
      runIds.push(runId);
      const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
      sockets.push(socket);
      const messages: WsMessage[] = [];
      socket.on("message", (raw: unknown) => {
        try {
          const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
          if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: parsed.payload
            && typeof parsed.payload === "object" && !Array.isArray(parsed.payload) ? parsed.payload as Record<string, unknown> : {} });
        } catch { /* Ignore malformed diagnostic rows only. */ }
      });
      await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
      const waitFor = async (from: number, predicate: (message: WsMessage) => boolean, label: string): Promise<WsMessage> => {
        const deadline = Date.now() + 20_000;
        while (Date.now() < deadline) {
          const found = messages.slice(from).find(predicate);
          if (found) return found;
          await wait(50);
        }
        throw new Error(`Timed out waiting for ${label}; seen: ${messages.slice(from).map((m) => m.type).join(",")}`);
      };
      const turnEnded = (message: WsMessage) => message.type === "TURN_COMPLETED" || message.type === "TURN_INTERRUPTED";
      /** Sends one prompt and resolves with the index where its events start, once its turn ended. */
      const turn = async (content: string) => {
        const from = messages.length;
        sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
        await waitFor(from, turnEnded, `turn end for "${content.slice(0, 20)}"`);
        return from;
      };
      return { runId, socket, messages, waitFor, turnEnded, turn, restore };
    } catch (error) {
      restore();
      throw error;
    }
  };
  const compactions = (messages: WsMessage[], from = 0) =>
    messages.slice(from).filter((message) => message.type === "COMPACTION_STATUS").map((message) => message.payload);

  it("pairs three automatic compactions and archives one segment per completion (REQ-G1, REQ-G2)", async () => {
    const run = await startRun("compaction-auto");
    try {
      for (const content of ["Data dump 1", "Data dump 2", "Data dump 3", "Reply with exactly: OK"]) await run.turn(content);
      const events = compactions(run.messages);
      expect(events.map((event) => event.status)).toEqual(["compacting", "compacted", "compacting", "compacted", "compacting", "compacted"]);
      for (let index = 0; index < events.length; index += 2) {
        expect(events[index + 1]).toMatchObject({ provider: "grok", runtime_kind: "GROK_BUILD", trigger: "auto",
          source_surface: "grok.auto_compact_completed", rotation_eligible: true, provider_event_id: events[index]!.provider_event_id,
          pre_tokens: expect.any(Number), post_tokens: expect.any(Number), duration_ms: expect.any(Number) });
        expect(events[index]).toMatchObject({ rotation_eligible: false, trigger: "auto", source_surface: "grok.auto_compact_started" });
      }
      await wait(300);
      expect(await segments(run.runId)).toBe(3);
      expect(await markerStatuses(run.runId)).toEqual(["compacting", "compacted", "compacting", "compacted", "compacting", "compacted"]);
      const reopened = await history(run.runId);
      const rows = reopened.activities.filter((activity) => activity.kind === "compaction");
      expect(rows.map((activity) => activity.phase)).toEqual(["completed"]);
      expect(rows[0]).toMatchObject({ providerEventId: events[4]!.provider_event_id });
      expect(run.messages.some((message) => message.type === "ERROR")).toBe(false);
    } finally {
      run.restore();
    }
  }, 60_000);

  it("closes an automatic compaction stopped by the user as failed, then pairs the next one (REQ-G3)", async () => {
    const run = await startRun("compaction-cancel-auto");
    try {
      await run.turn("Data dump A");
      const from = run.messages.length;
      sendE2eSendMessageCommand(run.socket, { agent_run_id: run.runId, content: "Data dump B" });
      const started = await run.waitFor(from, (m) => m.type === "COMPACTION_STATUS" && m.payload.status === "compacting", "start");
      run.socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: `interrupt-${randomUUID()}` } }));
      const failed = await run.waitFor(from, (m) => m.type === "COMPACTION_STATUS" && m.payload.status === "failed", "failed close");
      const ended = await run.waitFor(from, run.turnEnded, "interrupted turn end");
      expect(failed.payload).toMatchObject({ source_surface: "grok.compaction_abandoned", rotation_eligible: false,
        provider_event_id: started.payload.provider_event_id, error_message: expect.any(String) });
      expect(run.messages.indexOf(failed)).toBeLessThan(run.messages.indexOf(ended));
      await wait(300);
      expect(await segments(run.runId)).toBe(0);

      const next = await run.turn("Reply with exactly: OK");
      const pair = compactions(run.messages, next);
      expect(pair.map((event) => event.status)).toEqual(["compacting", "compacted"]);
      expect(pair[1]).toMatchObject({ provider_event_id: pair[0]!.provider_event_id, rotation_eligible: true, trigger: "auto" });
      expect(pair[0]!.provider_event_id).not.toBe(started.payload.provider_event_id);
      await wait(300);
      expect(await segments(run.runId)).toBe(1);
      expect(await markerStatuses(run.runId)).toEqual(["compacting", "failed", "compacting", "compacted"]);
      const rows = (await history(run.runId)).activities.filter((activity) => activity.kind === "compaction");
      expect(rows.map((activity) => activity.phase)).toEqual(["completed"]);
    } finally {
      run.restore();
    }
  }, 60_000);

  it("records a manual /compact as one completed compaction with no start (REQ-G1, REQ-G2, REQ-G4)", async () => {
    const run = await startRun("compaction-manual");
    try {
      await run.turn("Data dump A");
      await run.turn("Data dump B");
      const compactTurn = await run.turn("/compact");
      const events = compactions(run.messages, compactTurn);
      expect(events.map((event) => event.status)).toEqual(["compacted"]);
      expect(events[0]).toMatchObject({ trigger: "manual", rotation_eligible: true, pre_tokens: expect.any(Number),
        post_tokens: expect.any(Number) });
      await run.turn("Reply with exactly: OK");
      await wait(300);
      expect(await segments(run.runId)).toBe(1);
      expect(await markerStatuses(run.runId)).toEqual(["compacted"]);
      const reopened = await history(run.runId);
      expect(reopened.activities.filter((activity) => activity.kind === "compaction").map((activity) => activity.phase))
        .toEqual(["completed"]);
      expect(JSON.stringify(reopened.conversation)).not.toContain("Data dump A");
    } finally {
      run.restore();
    }
  }, 60_000);
});
