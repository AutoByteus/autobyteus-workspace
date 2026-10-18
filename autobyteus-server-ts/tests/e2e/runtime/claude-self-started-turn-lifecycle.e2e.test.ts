/**
 * Live E2E: Claude continues on its own after its background task finishes, and AutoByteus keeps
 * every turn's text, reports the run as running while Claude works, and records the text in run
 * memory (segment-lifecycle-error-flood SCN-001, AC-001/AC-003 under real CLI timing).
 *
 * With two background tasks that finish together, the real Claude CLI usually runs a task-notification
 * turn and then starts another turn by itself right after it. When that happens before AutoByteus
 * has processed the queued events, the run's lifecycle state used to let the runtime's live turn
 * end the newer turn, so its text became one "An Error Occurred" card per event and status read
 * idle. Whether the run's dispatch queue lags the CLI depends on the server's load, so each CLI
 * runs twice: "idle" (no added latency) and "loaded" (every pipeline batch of the run takes
 * LOADED_BATCH_DELAY_MS longer, as slow processing or I/O under load does; the Claude frames stay
 * real). The loaded variant fails on the code before the fix (8 lifecycle notices, no text of the
 * self-started turn). The scripted regression test
 * `tests/unit/agent-execution/backends/claude/claude-provider-turn-race.test.ts` forces the same burst.
 *
 * Stack: real Claude CLI + Agent SDK -> ClaudeSession -> ClaudeAgentRunBackend -> AgentRun ->
 * agent WebSocket, with the production run-memory recorder.
 * Gate: RUN_CLAUDE_E2E=1 (signed-in `claude`; runs idle and loaded once per installed CLI, haiku,
 * a few cents per case). Run with a clean environment that keeps the real HOME, USER and LOGNAME:
 *   env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" RUN_CLAUDE_E2E=1 \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-self-started-turn-lifecycle.e2e.test.ts --no-watch
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefaultAgentRunEventPipeline } from "../../../src/agent-execution/events/default-agent-run-event-pipeline.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { AgentRunMemoryRecorder } from "../../../src/agent-memory/services/agent-run-memory-recorder.js";
import { resolveClaudeCliExecutableCandidates } from "../../helpers/claude-cli-executable-candidates.js";
import {
  LIVE_CLAUDE_TURN_TIMEOUT_MS,
  assistantTextSince,
  closeClaudeLiveAgentHarness,
  createClaudeLiveAgentHarness,
  useStandaloneClaudeCli,
  waitForCondition,
  waitForStreamMessage,
  type StreamMessage,
} from "../helpers/claude-live-agent-harness.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const cliCandidates = resolveClaudeCliExecutableCandidates();
const describeLiveClaudeRuntime =
  process.env.RUN_CLAUDE_E2E === "1" && cliCandidates.length > 0 ? describe : describe.skip;
const LOADED_BATCH_DELAY_MS = 25;
const cases = cliCandidates.flatMap((candidate) => [
  [`${candidate.label}, idle`, candidate, 0] as const,
  [`${candidate.label}, loaded`, candidate, LOADED_BATCH_DELAY_MS] as const,
]);
const BACKGROUND_COMMAND_SECONDS = 10;

const isLifecycleNotice = (message: StreamMessage) =>
  message.type === "ERROR" && message.payload?.code === "AGENT_SEGMENT_LIFECYCLE_INVALID";

describeLiveClaudeRuntime("Claude self-started turn after a background task (live E2E)", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup().catch(() => undefined);
    }
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each(cases)(
    "shows and records the text of the turn Claude starts on its own, with status running and no lifecycle notice (%s)",
    async (label, candidate, batchDelayMs) => {
      useStandaloneClaudeCli(candidate);
      if (batchDelayMs > 0) {
        const pipeline = getDefaultAgentRunEventPipeline();
        const processBatch = pipeline.process.bind(pipeline);
        vi.spyOn(pipeline, "process").mockImplementation(async (input) => {
          await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
          return processBatch(input);
        });
      }
      const rejectionLogLines: unknown[][] = [];
      const originalWarn = console.warn.bind(console);
      vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
        if (String(args[0]).startsWith("[AgentSegmentLifecycleRejected")) rejectionLogLines.push(args);
        originalWarn(...args);
      });

      const root = await fs.mkdtemp(path.join(os.tmpdir(), "claude-self-started-"));
      cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
      const workspaceRoot = path.join(root, "workspace");
      const memoryDir = path.join(root, "memory");
      await fs.mkdir(workspaceRoot, { recursive: true });
      const harness = await createClaudeLiveAgentHarness({
        runId: `claude-self-started-${randomUUID()}`,
        workspaceRoot,
        memoryDir,
      });
      cleanups.push(() => closeClaudeLiveAgentHarness(harness));
      const detachRecorder = new AgentRunMemoryRecorder().attachToRun(harness.agentRun);
      cleanups.push(async () => detachRecorder());

      // The run status at the moment each piece of agent text reaches the client.
      const statusAtText: Array<{ turnId: unknown; status: string }> = [];
      harness.socket.on("message", (data) => {
        const message = JSON.parse(data.toString()) as StreamMessage;
        if (message.type === "SEGMENT_CONTENT" && message.payload?.segment_type === "text") {
          statusAtText.push({ turnId: message.payload.turn_id, status: harness.agentRun.getStatusSnapshot().status });
        }
      });
      // When AgentRun dispatched each turn boundary (evidence of how closely the turns followed).
      const turnBoundaryMs: string[] = [];
      const startedAt = performance.now();
      const unsubscribe = harness.agentRun.subscribeToEvents((event) => {
        const eventType = (event as { eventType?: string }).eventType;
        if (eventType === "TURN_STARTED" || eventType === "TURN_COMPLETED") {
          turnBoundaryMs.push(`${eventType}@${(performance.now() - startedAt).toFixed(1)}ms`);
        }
      });
      cleanups.push(async () => unsubscribe());

      // Two background tasks that finish together, as in the reported run: the CLI can then run a
      // task-notification turn and starts another turn on its own right after it.
      const marker = `READY_${randomUUID().slice(0, 8)}`;
      const nonce = `FINISHED_${randomUUID().slice(0, 8)}`;
      const markerA = path.join(workspaceRoot, "marker-a.txt");
      const markerB = path.join(workspaceRoot, "marker-b.txt");
      sendE2eSendMessageCommand(harness.socket, {
        content: [
          "In one reply, make two Bash tool calls in parallel, both with run_in_background set to true, to run these exact commands:",
          `1. sleep ${String(BACKGROUND_COMMAND_SECONDS)}; echo ${marker}-A > ${markerA}`,
          `2. sleep ${String(BACKGROUND_COMMAND_SECONDS)}; echo ${marker}-B > ${markerB}`,
          "Do not wait for them. Reply only STARTED and end your turn.",
          "When you are later notified that they finished, first write one short sentence saying you are checking the results,",
          `then run \`cat ${markerA} ${markerB}\` with the Bash tool, then reply with one sentence that contains the word ${nonce} and the file contents.`,
        ].join("\n"),
      });

      const firstCompleted = await waitForStreamMessage(
        harness,
        (message) => message.type === "TURN_COMPLETED",
        "first TURN_COMPLETED",
      );
      const backgroundTasks = new Set(harness.messages
        .filter((message) => message.type === "BACKGROUND_TASK_UPDATED")
        .map((message) => message.payload?.task_id));
      expect(backgroundTasks.size, "setup: Claude started the two background commands in its first turn").toBe(2);
      const noticeIndex = await waitForStreamMessage(
        harness,
        (message, index) => index > firstCompleted && message.type === "SYSTEM_TASK_NOTIFICATION",
        "background completion notice",
      );
      // The self-started turn is the one in which Claude reads the marker: wait for a tool call
      // after the notice, then for that turn to complete.
      const toolIndex = await waitForStreamMessage(
        harness,
        (message, index) => index > noticeIndex && message.type === "TOOL_EXECUTION_SUCCEEDED",
        "tool call of the self-started turn",
      );
      const selfStartedCompleted = await waitForStreamMessage(
        harness,
        (message, index) => index > toolIndex && message.type === "TURN_COMPLETED",
        "self-started TURN_COMPLETED",
      );
      const selfStartedTurnId = harness.messages[selfStartedCompleted]!.payload?.turn_id;
      await waitForCondition(() => harness.agentRun.getStatusSnapshot().status === "idle", "run idle after the self-started turn");
      const textOfTurn = (turnId: unknown) => harness.messages
        .filter((message) => message.type === "SEGMENT_CONTENT" && message.payload?.segment_type === "text" && message.payload?.turn_id === turnId)
        .map((message) => String(message.payload?.delta ?? ""))
        .join("");

      // Turn shape after the notice, for the evidence log (task-notification turn + self-started turn).
      const turnsAfterNotice = harness.messages
        .slice(firstCompleted + 1)
        .filter((message) => message.type === "TURN_STARTED" || message.type === "TURN_COMPLETED" || message.type === "SYSTEM_TASK_NOTIFICATION")
        .map((message) => `${message.type}:${String(message.payload?.turn_id ?? "")}${
          message.type === "SYSTEM_TASK_NOTIFICATION" ? ` "${String(message.payload?.content ?? "")}"` : ""}`);
      const lifecycleNotices = harness.messages.filter(isLifecycleNotice);
      console.info("[claude-self-started-turn-shape]", JSON.stringify({
        label, selfStartedTurnId, turnsAfterNotice, turnBoundaryMs, lifecycleNotices: lifecycleNotices.length, statusAtText,
        rejectionLogLines: rejectionLogLines.length,
      }));

      // AC-001: no lifecycle notice anywhere in the run; the self-started turn's text arrived.
      expect(lifecycleNotices).toEqual([]);
      const selfStartedText = textOfTurn(selfStartedTurnId);
      expect(selfStartedText).toContain(nonce);
      expect(selfStartedText).toContain(marker);
      expect(assistantTextSince(harness, noticeIndex)).toContain(nonce);
      // AC-003: the run reported running whenever text of the self-started turn reached the client.
      const selfStartedSamples = statusAtText.filter((sample) => sample.turnId === selfStartedTurnId);
      expect(selfStartedSamples.length).toBeGreaterThan(0);
      expect(selfStartedSamples.every((sample) => sample.status === "running")).toBe(true);
      expect(harness.agentRun.getStatusSnapshot().status).toBe("idle");
      // AC-001: the text is in run memory.
      await waitForCondition(
        () => new RunMemoryFileStore(memoryDir).listTurnRawTracesOrdered()
          .some((trace) => trace.traceType === "assistant" && String(trace.content).includes(nonce)),
        "self-started turn text recorded in run memory",
      );
      // REQ-004 normal case: nothing was rejected, so nothing is logged.
      expect(rejectionLogLines).toEqual([]);
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS * 2,
  );
});
