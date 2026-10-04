import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { AgentRunMemoryRecorder } from "../../../src/agent-memory/services/agent-run-memory-recorder.js";
import { AgentRunViewProjectionService } from "../../../src/run-history/services/agent-run-view-projection-service.js";
import type { RunProjection } from "../../../src/run-history/projection/run-projection-types.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  resolveClaudeCliExecutableCandidates,
  type ClaudeCliExecutableCandidate,
} from "../../helpers/claude-cli-executable-candidates.js";
import {
  LIVE_CLAUDE_TURN_TIMEOUT_MS,
  closeClaudeLiveAgentHarness,
  createClaudeLiveAgentHarness,
  findClaudeCliProcessIds,
  useStandaloneClaudeCli,
  waitForCondition,
  waitForStreamMessage,
  type ClaudeLiveAgentHarness,
  type StreamMessage,
} from "../helpers/claude-live-agent-harness.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// Live proof of Claude compaction detection and raw-trace rotation (REQ-022..025, AC-022c,
// AC-023, AC-024, AC-025, BEH-011) through the real AgentRun, Claude backend/session, SDK,
// CLI, websocket, memory recorder and run-history reader. `/compact` is sent as a normal user
// message (investigation E64).
// Gated: RUN_CLAUDE_E2E=1 runs the manual, Stop and process-exit cases on every installed Claude CLI (a few
// cents per case with haiku). RUN_CLAUDE_AUTO_COMPACTION_E2E=1 additionally runs the auto
// compaction case (~300K haiku input tokens) on the first CLI.
const cliCandidates = resolveClaudeCliExecutableCandidates();
const describeLiveClaudeRuntime =
  process.env.RUN_CLAUDE_E2E === "1" && cliCandidates.length > 0 ? describe : describe.skip;
const cliCases = cliCandidates.map((candidate) => [candidate.label, candidate] as const);
const itAutoCompaction = process.env.RUN_CLAUDE_AUTO_COMPACTION_E2E === "1" ? it : it.skip;

const isType = (type: string) => (message: StreamMessage) => message.type === type;
const isTurnSettled = (message: StreamMessage) =>
  message.type === "TURN_COMPLETED" || message.type === "TURN_INTERRUPTED";

const sendAndAwaitTurn = async (harness: ClaudeLiveAgentHarness, content: string): Promise<number> => {
  const startIndex = harness.messages.length;
  sendE2eSendMessageCommand(harness.socket, { content });
  await waitForStreamMessage(harness, isType("TURN_COMPLETED"), `TURN_COMPLETED for "${content.slice(0, 40)}"`, {
    fromIndex: startIndex,
  });
  return startIndex;
};

const compactionPayloads = (harness: ClaudeLiveAgentHarness, fromIndex = 0, toIndex?: number) =>
  harness.messages
    .slice(fromIndex, toIndex)
    .filter(isType("COMPACTION_STATUS"))
    .map((message) => message.payload ?? {});

const listMarkers = (store: RunMemoryFileStore) =>
  [...store.listArchiveTurnRawTracesOrdered(), ...store.listTurnRawTracesOrdered()]
    .filter((trace) => trace.traceType === "provider_compaction_boundary")
    .map((trace) => trace.toolResult as Record<string, unknown>);

/**
 * Reopens the run through the production run-history service (local active-trace reader plus
 * the projection dedupe every GraphQL history path applies), as the web does on reopen.
 */
const reopenHistory = (memoryDir: string, runId: string, workspaceRoot: string): Promise<RunProjection> =>
  new AgentRunViewProjectionService(path.dirname(memoryDir)).getProjectionFromMetadata({
    runId,
    metadata: {
      runId,
      agentDefinitionId: "agent-claude-live-e2e",
      workspaceRootPath: workspaceRoot,
      memoryDir,
      llmModelIdentifier: "haiku",
      llmConfig: null,
      autoExecuteTools: true,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      platformAgentRunId: null,
    } satisfies AgentRunMetadata,
  });

const conversationText = (projection: RunProjection): string =>
  projection.conversation.map((entry) => entry.content ?? "").join("\n");

const filler = (lines: number): string =>
  Array.from(
    { length: lines },
    (_, i) => `Record ${i}: the quick brown fox ${i * 7} jumps over lazy dog ${i * 13}; checksum ${(i * 2654435761) % 1000003}.`,
  ).join("\n");

describeLiveClaudeRuntime("Claude compaction rotation (live E2E)", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup().catch(() => undefined);
    }
    vi.unstubAllEnvs();
  });

  const startRun = async (candidate: ClaudeCliExecutableCandidate, env: Record<string, string> = {}) => {
    useStandaloneClaudeCli(candidate);
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "claude-live-compaction-"));
    cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
    const workspaceRoot = path.join(root, "workspace");
    const memoryDir = path.join(root, "memory");
    await fs.mkdir(workspaceRoot, { recursive: true });
    const runId = `claude-live-compaction-${randomUUID()}`;
    const harness = await createClaudeLiveAgentHarness({ runId, workspaceRoot, memoryDir });
    cleanups.push(() => closeClaudeLiveAgentHarness(harness));
    const recorder = new AgentRunMemoryRecorder();
    const detachRecorder = recorder.attachToRun(harness.agentRun);
    cleanups.push(async () => detachRecorder());
    return { harness, recorder, runId, workspaceRoot, memoryDir, store: new RunMemoryFileStore(memoryDir) };
  };

  it.each(cliCases)(
    "records one compaction operation, one rotation-eligible marker and one archive segment for /compact, and reopens at the latest segment [%s]",
    async (_label, candidate) => {
      const { harness, recorder, runId, workspaceRoot, memoryDir, store } = await startRun(candidate);

      await sendAndAwaitTurn(harness, "Reply with exactly: OK ONE");
      const compactStart = await sendAndAwaitTurn(harness, "/compact");
      const afterStart = await sendAndAwaitTurn(harness, "Reply with exactly: OK AFTER");
      await recorder.waitForIdle(runId);

      // Live websocket: one operation, started → completed, sharing provider_event_id (AC-023).
      const compactionStatuses = compactionPayloads(harness, compactStart, afterStart);
      expect(compactionStatuses.map((payload) => payload.status)).toEqual(["compacting", "compacted"]);
      expect(new Set(compactionStatuses.map((payload) => payload.provider_event_id)).size).toBe(1);
      expect(compactionStatuses[1]).toMatchObject({
        source_surface: "claude.compact_boundary",
        rotation_eligible: true,
        trigger: "manual",
      });
      expect(compactionPayloads(harness, afterStart)).toEqual([]);
      const operationId = compactionStatuses[0]?.provider_event_id;

      // Raw traces: one archive segment and one marker pair with metadata (AC-022c, AC-024).
      const manifest = store.readRawTraceArchiveManifest();
      expect(manifest.segments).toHaveLength(1);
      expect(manifest.segments[0]).toMatchObject({ boundary_type: "provider_compaction_boundary", status: "complete" });
      const markers = listMarkers(store);
      expect(markers.map((marker) => marker.status)).toEqual(["compacting", "compacted"]);
      const boundary = markers.find((marker) => marker.rotation_eligible === true);
      expect(boundary).toMatchObject({ trigger: "manual", provider_event_id: operationId });
      expect(boundary?.pre_tokens).toEqual(expect.any(Number));
      expect(boundary?.post_tokens).toEqual(expect.any(Number));
      expect(boundary?.duration_ms).toEqual(expect.any(Number));
      expect(store.listTurnRawTracesOrdered()[0]?.traceType).toBe("provider_compaction_boundary");
      const archivedText = store.listArchiveTurnRawTracesOrdered().map((trace) => trace.content ?? "").join("\n");
      expect(archivedText).toContain("OK ONE");

      // Reopened history shows only work since the latest compaction (BEH-011, CONF-001).
      const history = await reopenHistory(memoryDir, runId, workspaceRoot);
      expect(conversationText(history)).toContain("OK AFTER");
      expect(conversationText(history)).not.toContain("OK ONE");
      const compactionActivities = history.activities.filter((activity) => activity.kind === "compaction");
      expect(compactionActivities).toHaveLength(1);
      expect(compactionActivities[0]).toMatchObject({
        phase: "completed",
        providerEventId: operationId,
        trigger: "manual",
        rotationEligible: true,
      });
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS * 4,
  );

  it.each(cliCases)(
    "closes a /compact stopped by the user as one failed operation without rotation, and the run continues [%s]",
    async (_label, candidate) => {
      const { harness, recorder, runId, workspaceRoot, memoryDir, store } = await startRun(candidate);

      await sendAndAwaitTurn(harness, "Reply with exactly: OK ONE");
      const compactStart = harness.messages.length;
      sendE2eSendMessageCommand(harness.socket, { content: "/compact" });
      await waitForStreamMessage(
        harness,
        (message) => message.type === "COMPACTION_STATUS" && message.payload?.status === "compacting",
        "compaction started",
        { fromIndex: compactStart },
      );
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      harness.socket.send(JSON.stringify({
        type: "INTERRUPT_GENERATION",
        payload: { command_id: `client_interrupt_compaction_${randomUUID()}` },
      }));
      const settledIndex = await waitForStreamMessage(harness, isTurnSettled, "compaction turn settled", {
        fromIndex: compactStart,
      });
      const afterStart = await sendAndAwaitTurn(harness, "Reply with exactly: OK AFTER");
      await recorder.waitForIdle(runId);

      const compactionStatuses = compactionPayloads(harness, compactStart, afterStart);
      expect(compactionStatuses.map((payload) => payload.status)).toEqual(["compacting", "failed"]);
      expect(new Set(compactionStatuses.map((payload) => payload.provider_event_id)).size).toBe(1);
      expect(compactionStatuses[1]).toMatchObject({
        source_surface: "claude.compaction_failed",
        rotation_eligible: false,
        error_message: expect.any(String),
      });
      // The operation ends before the turn settles, so no "compacting" state outlives the turn.
      const failedIndex = harness.messages.findIndex(
        (message, index) => index >= compactStart && message.type === "COMPACTION_STATUS" && message.payload?.status === "failed",
      );
      expect(failedIndex).toBeLessThan(settledIndex);
      expect(compactionPayloads(harness, afterStart)).toEqual([]);

      expect(store.readRawTraceArchiveManifest().segments).toHaveLength(0);
      expect(listMarkers(store).map((marker) => marker.status)).toEqual(["compacting", "failed"]);
      expect(listMarkers(store)[1]?.error_message).toEqual(compactionStatuses[1]?.error_message);

      const history = await reopenHistory(memoryDir, runId, workspaceRoot);
      expect(conversationText(history)).toContain("OK ONE");
      expect(conversationText(history)).toContain("OK AFTER");
      const compactionActivities = history.activities.filter((activity) => activity.kind === "compaction");
      expect(compactionActivities).toHaveLength(1);
      expect(compactionActivities[0]).toMatchObject({ phase: "failed", rotationEligible: false });
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS * 4,
  );

  it.each(cliCases)(
    "closes a compaction cut off by a Claude process exit as failed before the turn error, without rotation [%s]",
    async (_label, candidate) => {
      const { harness, recorder, runId, store } = await startRun(candidate);

      await sendAndAwaitTurn(harness, "Reply with exactly: OK ONE");
      const cliPids = findClaudeCliProcessIds(harness.session.sessionId);
      expect(cliPids).toHaveLength(1);
      const compactStart = harness.messages.length;
      sendE2eSendMessageCommand(harness.socket, { content: "/compact" });
      await waitForStreamMessage(
        harness,
        (message) => message.type === "COMPACTION_STATUS" && message.payload?.status === "compacting",
        "compaction started",
        { fromIndex: compactStart },
      );
      process.kill(cliPids[0]!, "SIGKILL");
      const errorIndex = await waitForStreamMessage(harness, isType("ERROR"), "turn-terminal ERROR", {
        fromIndex: compactStart,
      });
      await waitForCondition(() => harness.session.activeTurnId === null, "crashed turn settles");
      await recorder.waitForIdle(runId);

      const compactionStatuses = compactionPayloads(harness, compactStart);
      expect(compactionStatuses.map((payload) => payload.status)).toEqual(["compacting", "failed"]);
      expect(new Set(compactionStatuses.map((payload) => payload.provider_event_id)).size).toBe(1);
      expect(compactionStatuses[1]).toMatchObject({
        source_surface: "claude.compaction_failed",
        rotation_eligible: false,
        error_message: "Claude process exited before the compaction completed.",
      });
      const failedIndex = harness.messages.findIndex(
        (message, index) => index >= compactStart && message.type === "COMPACTION_STATUS" && message.payload?.status === "failed",
      );
      expect(failedIndex).toBeLessThan(errorIndex);
      expect(store.readRawTraceArchiveManifest().segments).toHaveLength(0);
      expect(listMarkers(store).map((marker) => marker.status)).toEqual(["compacting", "failed"]);

      // The run reopens the CLI and continues; no compaction state leaks into the next turn.
      const afterStart = await sendAndAwaitTurn(harness, "Reply with exactly: OK AFTER");
      expect(compactionPayloads(harness, afterStart)).toEqual([]);
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS * 4,
  );

  itAutoCompaction(
    "pairs every auto compaction operation and rotates once per completed operation",
    async () => {
      const candidate = cliCandidates[0]!;
      const { harness, recorder, runId, workspaceRoot, memoryDir, store } = await startRun(candidate, {
        CLAUDE_CODE_AUTO_COMPACT_WINDOW: "60000",
      });

      await sendAndAwaitTurn(harness, `Here is a data dump. Do not analyze it. Reply with exactly: OK DUMP1\n${filler(2200)}`);
      await sendAndAwaitTurn(harness, `More data. Reply with exactly: OK DUMP2\n${filler(2200)}`);
      await sendAndAwaitTurn(harness, "Reply with exactly: OK AFTER");
      await recorder.waitForIdle(runId);

      // Every operation is exactly one start and one terminal event sharing provider_event_id.
      const operations = new Map<string, Array<Record<string, unknown>>>();
      for (const payload of compactionPayloads(harness)) {
        const id = String(payload.provider_event_id);
        operations.set(id, [...(operations.get(id) ?? []), payload]);
      }
      // The CLI decides how many auto compactions run and whether any fails; log what it did.
      console.info(`Claude auto compaction operations: ${JSON.stringify([...operations.values()].map((events) => ({
        statuses: events.map((event) => event.status),
        error: events[1]?.error_message ?? null,
        pre_tokens: events[1]?.pre_tokens ?? null,
        duration_ms: events[1]?.duration_ms ?? null,
      })))}`);
      expect(operations.size).toBeGreaterThan(0);
      for (const events of operations.values()) {
        expect(events.map((event) => event.status)).toEqual([
          "compacting",
          expect.stringMatching(/^(compacted|failed)$/u),
        ]);
        if (events[1]?.status === "failed") {
          expect(events[1]).toMatchObject({ rotation_eligible: false, error_message: expect.any(String) });
        } else {
          expect(events[1]).toMatchObject({ trigger: "auto", rotation_eligible: true });
        }
      }
      const completedCount = [...operations.values()].filter((events) => events[1]?.status === "compacted").length;
      expect(completedCount).toBeGreaterThan(0);

      // One archive segment per completed operation; one marker per event.
      expect(store.readRawTraceArchiveManifest().segments).toHaveLength(completedCount);
      expect(listMarkers(store)).toHaveLength(operations.size * 2);
      for (const boundary of listMarkers(store).filter((marker) => marker.rotation_eligible === true)) {
        expect(boundary).toMatchObject({ trigger: "auto" });
        expect(boundary.pre_tokens).toEqual(expect.any(Number));
        expect(boundary.post_tokens).toEqual(expect.any(Number));
        expect(boundary.duration_ms).toEqual(expect.any(Number));
      }

      const history = await reopenHistory(memoryDir, runId, workspaceRoot);
      expect(conversationText(history)).toContain("OK AFTER");
      expect(conversationText(history)).not.toContain("OK DUMP1");
      expect(history.activities.some(
        (activity) => activity.kind === "compaction" && activity.phase === "completed" && activity.trigger === "auto",
      )).toBe(true);
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS * 4,
  );
});
