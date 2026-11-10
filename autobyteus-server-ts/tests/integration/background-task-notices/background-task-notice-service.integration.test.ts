import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { readPlatformInputPreface } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { BackgroundTaskEnd, BackgroundTaskStart } from "autobyteus-ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunPlatformNotices } from "../../../src/agent-execution/domain/agent-run-platform-notices.js";
import type { AgentRunBackendInputDispatch, AgentRunBackendInputDispatchResult } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { BACKGROUND_TASK_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import { createBackgroundTaskNotices, type BackgroundTaskNotices } from "../../../src/background-task-notices/background-task-notices.js";
import { BACKGROUND_TASK_NOTICE_HEADER } from "../../../src/background-task-notices/services/background-task-notice-builder.js";

// DS-004 / DS-006 (autobyteus-338) with the real service and composite, real AgentRuns over a fake native backend whose
// background-task store stands in for the BackgroundProcessManager. Settle period 40 ms instead of 2 s.

const SETTLE_MS = 40;
const closers: Array<() => void> = [];
afterEach(() => { for (const close of closers.splice(0)) close(); });

const endOf = (pid: number, exitCode: number, lastLines = `out ${pid}`): BackgroundTaskEnd => ({
  pid, command: `job ${pid}`, outcome: { exitCode }, durationMs: 134_000, outputFile: `/tmp/call-${pid}.log`, lastLines,
});

const createWorld = (input: { native?: boolean } = {}) => {
  const notices: BackgroundTaskNotices = createBackgroundTaskNotices({ settleMs: SETTLE_MS });
  closers.push(() => notices.close());
  const context = new AgentRunContext({
    runId: "run-1",
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.AUTOBYTEUS, agentDefinitionId: "def", llmModelIdentifier: "m",
      autoExecuteTools: false, workspaceId: null, llmConfig: null, memoryDir: null,
    }),
    runtimeContext: null,
  });
  const store = { ends: [] as BackgroundTaskEnd[], running: [] as BackgroundTaskStart[] };
  let activeTurn: string | null = null, turns = 0, refuseNext = 0;
  const sourceListeners = new Set<(events: readonly AgentRunEvent[]) => void | Promise<void>>();
  const emit = async (event: Omit<AgentRunEvent, "runId" | "statusHint">) => {
    for (const listener of sourceListeners) await listener([{ ...event, runId: "run-1", statusHint: null }]);
  };
  const dispatchUserInput = vi.fn(async (dispatch: AgentRunBackendInputDispatch): Promise<AgentRunBackendInputDispatchResult> => {
    if (refuseNext > 0) {
      refuseNext -= 1;
      return { forwarded: false, delivery: "not_delivered", code: "REFUSED", message: "refused", turnId: null };
    }
    activeTurn = `turn-${++turns}`;
    return { forwarded: true, turnId: activeTurn };
  });
  const backend = {
    runId: "run-1",
    runtimeKind: context.config.runtimeKind,
    compactionRecovery: { kind: "unsupported" } as const,
    backgroundTaskInspection: { kind: "event-stream" } as const,
    backgroundTaskNotices: input.native === false ? { kind: "unsupported" } as const : {
      kind: "platform" as const,
      takeUnreportedEnds: () => store.ends.splice(0),
      listRunning: () => store.running,
    },
    inputCapabilities: { activeTurnAppend: "unsupported" },
    getContext: () => context,
    getPlatformAgentRunId: () => "run-1",
    isActive: () => true,
    getLifecycleSnapshot: () => activeTurn
      ? { availability: "active", phase: "running", currentTurn: { kind: "IDENTIFIED", turnId: activeTurn } }
      : { availability: "active", phase: "idle", currentTurn: { kind: "NONE" } },
    hasRunningBackgroundTasks: () => store.running.length > 0,
    subscribeToSourceEventBatches: (listener: (events: readonly AgentRunEvent[]) => void | Promise<void>) => {
      sourceListeners.add(listener);
      return () => sourceListeners.delete(listener);
    },
    dispatchUserInput,
    approveToolInvocation: vi.fn(),
    interrupt: vi.fn(),
    terminate: vi.fn(),
    applyDefinitionTools: vi.fn(),
    getToolNames: () => ["run_bash"],
  };
  const run = new AgentRun({
    providerInputNormalizer: { normalizeForProvider: (dispatch: AgentRunBackendInputDispatch) => dispatch },
    context,
    backend: backend as never,
    commandObservers: [],
    inputPreface: new AgentRunPlatformNotices([notices.service]),
  });
  const published: AgentRunEvent[] = [];
  run.subscribeToEvents((value) => { published.push(value); });
  /** A background task ended: the store records it, the backend publishes its update (as the native reporter does). */
  const taskEnded = async (end: BackgroundTaskEnd, reportedByRunBash = false) => {
    if (!reportedByRunBash) store.ends.push(end);
    await emit({ eventType: AgentRunEventType.BACKGROUND_TASK_UPDATED, payload: { task_id: String(end.pid), kind: "shell",
      description: end.command, command: end.command, status: "completed", summary: "exit code 0", started_at: "2026-11-10T10:00:00.000Z" } });
  };
  const sentMessages = () => dispatchUserInput.mock.calls.map((call) => (call[0] as AgentRunBackendInputDispatch).message);
  const endTurn = async () => {
    const turnId = activeTurn;
    activeTurn = null;
    await emit({ eventType: AgentRunEventType.TURN_COMPLETED, payload: { turn_id: turnId } });
    await vi.waitFor(() => expect(run.getStatusSnapshot().status).toBe("idle"));
  };
  const startTurn = async (text: string) => {
    await run.postUserMessage(new AgentInputUserMessage(text, SenderType.USER, null, {}));
    await vi.waitFor(() => expect(run.getStatusSnapshot().status).toBe("running"));
  };
  const systemNotices = () => published.filter((event) => event.eventType === AgentRunEventType.SYSTEM_TASK_NOTIFICATION);
  notices.service.runPublished(run, "new");
  return { run, store, notices, taskEnded, sentMessages, endTurn, startTurn, systemNotices, published,
    refuse: (count: number) => { refuseNext = count; } };
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("BackgroundTaskNoticeService", () => {
  it("wakes an idle run with one notice after the settle period, naming how each task ended (AC-002, AC-003)", async () => {
    const world = createWorld();
    world.store.running = [{ pid: 4130, command: "npm run dev", effectiveCwd: "/w", outputFile: "/tmp/call-4130.log",
      startedAt: "2026-11-10T10:02:00.000Z" }];
    await world.taskEnded(endOf(4123, 0, "built\ndone"));
    expect(world.sentMessages()).toHaveLength(0);
    await vi.waitFor(() => expect(world.sentMessages()).toHaveLength(1));
    const message = world.sentMessages()[0]!;
    expect(message.senderType).toBe(SenderType.SYSTEM);
    expect(message.content).toBe([
      BACKGROUND_TASK_NOTICE_HEADER, "",
      "- pid 4123 `job 4123`: exit code 0 after 2m 14s. Output: /tmp/call-4123.log. Last lines:",
      "    built", "    done", "",
      "Still running: pid 4130 `npm run dev` (started 10:02:00 UTC)",
    ].join("\n"));
    expect(readPlatformInputPreface(message.metadata)).toMatchObject({ senderId: BACKGROUND_TASK_NOTICE_SENDER_ID });
    await vi.waitFor(() => expect(world.systemNotices()).toHaveLength(1));
    expect(world.systemNotices()[0]!.payload).toMatchObject({ sender_id: BACKGROUND_TASK_NOTICE_SENDER_ID, turn_id: "turn-1" });
  });

  it("batches ends that arrive within the settle period into exactly one notice (AC-004)", async () => {
    const world = createWorld();
    for (const pid of [1, 2, 3]) { await world.taskEnded(endOf(pid, pid)); await pause(10); }
    await vi.waitFor(() => expect(world.sentMessages()).toHaveLength(1));
    await pause(SETTLE_MS * 3);
    expect(world.sentMessages()).toHaveLength(1);
    expect(world.sentMessages()[0]!.content.match(/^- pid \d+/gm)).toEqual(["- pid 1", "- pid 2", "- pid 3"]);
  });

  it("tells a busy run right after its turn ends, not during it", async () => {
    const world = createWorld();
    await world.startTurn("build it");
    await world.taskEnded(endOf(7, 2));
    await pause(SETTLE_MS * 3);
    expect(world.sentMessages()).toHaveLength(1); // only the user's input
    await world.endTurn();
    await vi.waitFor(() => expect(world.sentMessages()).toHaveLength(2));
    expect(world.sentMessages()[1]!.content).toContain("- pid 7 `job 7`: exit code 2");
  });

  it("an external input during the settle period carries the notice as its preface; no second notice follows", async () => {
    const world = createWorld();
    await world.taskEnded(endOf(5, 0));
    await world.run.postUserMessage(new AgentInputUserMessage("next step", SenderType.USER, null, {}));
    await vi.waitFor(() => expect(world.sentMessages()).toHaveLength(1));
    const message = world.sentMessages()[0]!;
    expect(message.content.startsWith(BACKGROUND_TASK_NOTICE_HEADER)).toBe(true);
    expect(message.content.endsWith("next step")).toBe(true);
    await world.endTurn();
    await pause(SETTLE_MS * 3);
    expect(world.sentMessages()).toHaveLength(1);
    expect(world.systemNotices()).toHaveLength(1);
  });

  it("sends nothing for an end the agent's own run_bash already reported (REQ-015)", async () => {
    const world = createWorld();
    await world.taskEnded(endOf(9, 143), true);
    await pause(SETTLE_MS * 3);
    expect(world.sentMessages()).toHaveLength(0);
  });

  it("keeps the ends of a notice that was not delivered and sends them with the next one", async () => {
    const world = createWorld();
    world.refuse(1);
    await world.taskEnded(endOf(11, 1));
    await vi.waitFor(() => expect(world.sentMessages()).toHaveLength(1));
    await world.taskEnded(endOf(12, 0));
    await vi.waitFor(() => expect(world.sentMessages()).toHaveLength(2));
    expect(world.sentMessages()[1]!.content.match(/^- pid \d+/gm)).toEqual(["- pid 11", "- pid 12"]);
    expect(world.systemNotices()).toHaveLength(1);
  });

  it("a released run gets nothing, and a run without platform notices is not followed", async () => {
    const world = createWorld();
    await world.taskEnded(endOf(13, 0));
    world.notices.service.runReleased(world.run);
    await pause(SETTLE_MS * 3);
    expect(world.sentMessages()).toHaveLength(0);

    const other = createWorld({ native: false });
    await other.taskEnded(endOf(14, 0));
    await pause(SETTLE_MS * 3);
    expect(other.sentMessages()).toHaveLength(0);
  });
});
