import { describe, expect, it } from "vitest";
import { ClaudeBackgroundTaskRegistry } from "../../../../../../src/agent-execution/backends/claude/session/claude-background-task-registry.js";
import {
  ClaudeTurnTracker,
  classifyClaudeFrame,
  type ClaudeTurnSettlement,
  type ClaudeTurnTrackerListener,
} from "../../../../../../src/agent-execution/backends/claude/session/claude-turn-tracker.js";

// Frame builders mirror the unfiltered probe captures (probe-evidence/probe{E,F,J,M,O,P,Q}.log).
const SID = "f7d36746-0000-4000-8000-000000000000";
const init = () => ({ type: "system", subtype: "init", session_id: SID, capabilities: ["interrupt_cancel_queued_v1"] });
const lifecycle = (state: string) => ({ type: "command_lifecycle", state, session_id: SID });
const assistant = (text = "…") => ({ type: "assistant", session_id: SID, message: { id: "m", role: "assistant", content: [{ type: "text", text }] } });
const toolUse = () => ({ type: "assistant", session_id: SID, message: { id: "t", role: "assistant", content: [{ type: "tool_use", id: "toolu", name: "Bash", input: {} }] } });
const toolResult = (content = "ok") => ({ type: "user", session_id: SID, message: { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu", content }] } });
const interruptedText = () => ({ type: "user", session_id: SID, message: { role: "user", content: [{ type: "text", text: "[Request interrupted by user for tool use]" }] } });
const success = (answers: string[], extra: Record<string, unknown> = {}) => ({ type: "result", subtype: "success", session_id: SID, user_message_uuids: answers, terminal_reason: "completed", ...extra });
const aborted = (answers: string[]) => ({ type: "result", subtype: "error_during_execution", session_id: SID, user_message_uuids: answers, terminal_reason: "aborted_tools", is_error: true });
const bgChanged = (tasks: Array<[string, string]>) => ({ type: "system", subtype: "background_tasks_changed", session_id: SID, tasks: tasks.map(([task_id, description]) => ({ task_id, task_type: "local_bash", description })) });
const taskStarted = (taskId: string, isBackgrounded: boolean, description?: string) => ({ type: "system", subtype: "task_started", session_id: SID, task_id: taskId, ...(description ? { description } : {}), task_type: "local_bash", is_backgrounded: isBackgrounded });
const taskUpdated = (taskId: string) => ({ type: "system", subtype: "task_updated", session_id: SID, task_id: taskId, patch: {} });
const taskNotification = (taskId: string, status = "completed") => ({ type: "system", subtype: "task_notification", session_id: SID, task_id: taskId, status, output_file: `/tmp/${taskId}.out`, summary: "s" });

type Recorded =
  | ["started", string, string]
  | ["notice", string, string]
  | ["content", string, string]
  | ["result", string, boolean]
  | ["settled", string, ClaudeTurnSettlement["kind"]]
  | ["anomaly", string];

const createTracker = () => {
  const log: Recorded[] = [];
  let uuidSequence = 0;
  let turnSequence = 0;
  const listener: ClaudeTurnTrackerListener = {
    turnStarted: (turnId, origin) => log.push(["started", turnId, origin]),
    notice: (turnId, content) => log.push(["notice", turnId, content]),
    turnContent: (turnId, frame) => log.push(["content", turnId, String(frame.type)]),
    turnResult: (turnId, _frame, isError) => log.push(["result", turnId, isError]),
    turnSettled: (turnId, settlement) => log.push(["settled", turnId, settlement.kind]),
    anomaly: (frameKind) => log.push(["anomaly", frameKind]),
  };
  const registry = new ClaudeBackgroundTaskRegistry();
  const tracker = new ClaudeTurnTracker({
    runId: "run-1",
    listener,
    registry,
    createUuid: () => `u${++uuidSequence}`,
    createTurnId: () => `t${++turnSequence}`,
  });
  const feed = (...frames: unknown[]) => frames.forEach((frame) => tracker.observe(frame));
  const start = () => {
    const registration = tracker.registerInput({ kind: "start_turn" });
    if (!registration.accepted) throw new Error(registration.code);
    return registration;
  };
  const append = (turnId: string) => {
    const registration = tracker.registerInput({ kind: "append_to_active_turn", turnId });
    if (!registration.accepted) throw new Error(registration.code);
    return registration;
  };
  const sendAndStart = () => {
    const registration = start();
    tracker.markSent(registration.uuid);
    return registration;
  };
  const lifecycleOnly = () => log.filter((entry) => entry[0] === "started" || entry[0] === "settled" || entry[0] === "notice");
  return { tracker, registry, log, feed, start, append, sendAndStart, lifecycleOnly };
};

/** I-1: every TURN_STARTED has exactly one settle, in order. */
const expectEveryStartSettledOnce = (log: Recorded[]) => {
  const started = log.filter((entry) => entry[0] === "started").map((entry) => entry[1]);
  const settled = log.filter((entry) => entry[0] === "settled").map((entry) => entry[1]);
  expect(settled).toEqual(started);
};

describe("classifyClaudeFrame", () => {
  it("classifies every captured frame kind; only system/init opens and unknown kinds are ignored", () => {
    expect(classifyClaudeFrame("system/init")).toBe("opener");
    expect(classifyClaudeFrame("result")).toBe("terminal");
    for (const kind of ["assistant", "user", "stream_event", "system/compact_boundary", "system/status", "system/thinking_tokens", "tool_progress", "tool_use_summary"]) {
      expect(classifyClaudeFrame(kind)).toBe("content");
    }
    for (const kind of ["system/background_tasks_changed", "system/task_started", "system/task_updated", "system/task_progress", "system/task_notification"]) {
      expect(classifyClaudeFrame(kind)).toBe("task");
    }
    for (const kind of ["command_lifecycle", "rate_limit_event", "system/session_state_changed", "system/notification", "system/api_retry", "auth_status", "system/hook_started", "brand_new_kind"]) {
      expect(classifyClaudeFrame(kind)).toBe("ignored");
    }
  });
});

describe("ClaudeTurnTracker (probe frame sequences)", () => {
  it("settles an input turn on the result that answers its uuid (probe P READY)", () => {
    const { feed, sendAndStart, log } = createTracker();
    const { uuid, turnId } = sendAndStart();

    feed(lifecycle("queued"), lifecycle("started"), init(), assistant(), assistant("READY."), success([uuid]), lifecycle("completed"));

    expect(log).toEqual([
      ["started", turnId, "input"],
      ["content", turnId, "assistant"],
      ["content", turnId, "assistant"],
      ["result", turnId, false],
      ["settled", turnId, "completed"],
    ]);
  });

  it("merges mid-turn input into one result (probe E-S2) and spans consecutive CLI turns (probe M)", () => {
    const merged = createTracker();
    const first = merged.sendAndStart();
    merged.feed(init(), toolUse());
    const second = merged.append(first.turnId);
    merged.tracker.markSent(second.uuid);
    merged.feed(toolResult(), assistant(), { ...success([first.uuid]), user_message_uuids: [first.uuid, second.uuid] });
    expect(merged.lifecycleOnly()).toEqual([["started", "t1", "input"], ["settled", "t1", "completed"]]);

    const split = createTracker();
    const one = split.sendAndStart();
    const two = split.append(one.turnId);
    split.tracker.markSent(two.uuid);
    split.feed(init(), assistant(), success([one.uuid]));
    expect(split.tracker.activeTurnId).toBe("t1");
    split.feed(init(), assistant(), success([two.uuid]));
    expect(split.lifecycleOnly()).toEqual([["started", "t1", "input"], ["settled", "t1", "completed"]]);
  });

  it("falls back to user_message_uuid when the uuid list is absent", () => {
    const { feed, sendAndStart, lifecycleOnly } = createTracker();
    const { uuid } = sendAndStart();
    feed(init(), { type: "result", subtype: "success", session_id: SID, user_message_uuid: uuid });
    expect(lifecycleOnly().at(-1)).toEqual(["settled", "t1", "completed"]);
  });

  it("opens a provider-initiated turn with a notice after a background completion while idle (probe E-S1)", () => {
    const { feed, sendAndStart, lifecycleOnly, log } = createTracker();
    const { uuid } = sendAndStart();
    feed(init(), assistant(), toolUse(), bgChanged([["bg1", "Sleep then write marker"]]), taskStarted("bg1", true), toolResult("Command running in background"), assistant("STARTED"), success([uuid]));
    feed(bgChanged([]), taskUpdated("bg1"), taskNotification("bg1"), init(), assistant("NOTIFIED"), success([], { origin: { kind: "task-notification" } }));

    expect(lifecycleOnly()).toEqual([
      ["started", "t1", "input"],
      ["settled", "t1", "completed"],
      ["started", "t2", "provider"],
      ["notice", "t2", "Background task completed: Sleep then write marker (completed)"],
      ["settled", "t2", "completed"],
    ]);
    expect(log.filter((entry) => entry[0] === "anomaly")).toEqual([]);
  });

  it("consumes a completion absorbed mid-turn by a tool_result then an assistant frame (probe J)", () => {
    const { feed, sendAndStart, registry, lifecycleOnly } = createTracker();
    const { uuid } = sendAndStart();
    feed(init(), toolUse(), toolUse(), bgChanged([["bg", "Background sleep"]]), taskStarted("bg", true), toolResult("Command running in background"), taskStarted("fg", false));
    feed(bgChanged([]), taskUpdated("bg"), taskNotification("bg"), taskNotification("fg"));
    expect(registry.pendingCount).toBe(1);
    feed(toolResult("FG_DONE"), assistant(), assistant("The background command completed earlier"), success([uuid]));

    expect(registry.pendingCount).toBe(0);
    expect(lifecycleOnly()).toEqual([["started", "t1", "input"], ["settled", "t1", "completed"]]);
  });

  it("keeps a completion that arrived during the final reply for the CLI's own turn (probe Q)", () => {
    const { feed, sendAndStart, lifecycleOnly } = createTracker();
    const { uuid } = sendAndStart();
    feed(init(), assistant(), toolUse(), bgChanged([["bllagc0fh", "History of lighthouses"]]), taskStarted("bllagc0fh", true), toolResult(), assistant());
    feed(bgChanged([]), taskUpdated("bllagc0fh"), taskNotification("bllagc0fh"), assistant("# The History of Lighthouses"), success([uuid]));
    feed(init(), assistant(), assistant("NOTED"), success([], { origin: { kind: "task-notification" } }));

    expect(lifecycleOnly()).toEqual([
      ["started", "t1", "input"],
      ["settled", "t1", "completed"],
      ["started", "t2", "provider"],
      ["notice", "t2", "Background task completed: History of lighthouses (completed)"],
      ["settled", "t2", "completed"],
    ]);
  });

  it("announces 'started on its own' when a provider turn opens without a pending completion", () => {
    const { feed, lifecycleOnly } = createTracker();
    feed(init(), assistant(), success([]));
    expect(lifecycleOnly()).toEqual([
      ["started", "t1", "provider"],
      ["notice", "t1", "Claude started a turn on its own."],
      ["settled", "t1", "completed"],
    ]);
  });

  it("treats a completion delivered by a notification-origin continuation CLI turn as consumed", () => {
    const { feed, tracker, sendAndStart, registry, append } = createTracker();
    const first = sendAndStart();
    feed(init(), bgChanged([["bg", "Lint"]]), assistant(), success([first.uuid]));
    const next = sendAndStart();
    feed(taskNotification("bg"), init(), assistant(), success([], { origin: { kind: "task-notification" } }));
    expect(registry.pendingCount).toBe(0);
    feed(init(), assistant(), success([next.uuid]));
    expect(tracker.activeTurnId).toBeNull();
    expect(() => append("t2")).toThrow("CLAUDE_APPEND_TURN_MISMATCH");
  });

  it("drops content and results that arrive while idle, logging anomalies (I-2)", () => {
    const { feed, log } = createTracker();
    feed(assistant("stray"), toolResult(), success(["unknown"]), { type: "brand_new_kind" });
    expect(log).toEqual([["anomaly", "assistant"], ["anomaly", "user"], ["anomaly", "result"]]);
  });

  it("classifies a non-interrupt error result as a turn error after the remaining input is answered", () => {
    const { feed, sendAndStart, append, tracker, lifecycleOnly } = createTracker();
    const first = sendAndStart();
    const second = append(first.turnId);
    tracker.markSent(second.uuid);
    feed(init(), { type: "result", subtype: "error_max_turns", session_id: SID, user_message_uuids: [first.uuid], is_error: true });
    expect(tracker.activeTurnId).toBe("t1");
    feed(init(), assistant(), success([second.uuid]));
    expect(lifecycleOnly().at(-1)).toEqual(["settled", "t1", "error"]);
  });

  it("settles an active turn exactly once on process exit and on close (I-1, I-3)", () => {
    const exited = createTracker();
    exited.sendAndStart();
    exited.feed(init(), toolUse());
    exited.tracker.processExited({ code: "CLAUDE_PROCESS_EXITED", message: "SIGKILL" });
    exited.tracker.processExited({ code: "CLAUDE_PROCESS_EXITED", message: "again" });
    exited.feed(success(["u1"]));
    expectEveryStartSettledOnce(exited.log);
    expect(exited.lifecycleOnly().at(-1)).toEqual(["settled", "t1", "error"]);

    const closed = createTracker();
    closed.sendAndStart();
    closed.tracker.close();
    closed.tracker.close();
    expectEveryStartSettledOnce(closed.log);
    expect(closed.lifecycleOnly().at(-1)).toEqual(["settled", "t1", "interrupted"]);
  });

  it("fails the turn when an input fails before send and nothing else of the turn is live", () => {
    const { tracker, start, lifecycleOnly } = createTracker();
    const { uuid } = start();
    tracker.failInput(uuid, { code: "CLAUDE_RUNTIME_TURN_FAILED", message: "open failed" }, false);
    expect(lifecycleOnly()).toEqual([["started", "t1", "input"], ["settled", "t1", "error"]]);
    expect(tracker.isSendCancelled(uuid)).toBe(true);
  });

  it("accounts a failed appended input without failing a turn the CLI is still running (I-3)", () => {
    const { tracker, feed, sendAndStart, append, lifecycleOnly } = createTracker();
    const first = sendAndStart();
    feed(init(), toolUse());
    const second = append(first.turnId);
    tracker.failInput(second.uuid, { code: "X", message: "image build failed" }, true);
    expect(tracker.activeTurnId).toBe("t1");
    feed(toolResult(), assistant(), success([first.uuid]));
    expect(lifecycleOnly()).toEqual([["started", "t1", "input"], ["settled", "t1", "completed"]]);
  });
});

describe("ClaudeTurnTracker interrupt (SPINE-5, IC-1)", () => {
  it("cancels a queued uuid through cancelQueued and settles interrupted on the aborted result (probe P cq)", () => {
    const { tracker, feed, sendAndStart, append, lifecycleOnly } = createTracker();
    const a = sendAndStart();
    feed(init(), toolUse(), taskStarted("fg", false));
    const b = append(a.turnId);
    tracker.markSent(b.uuid);

    expect(tracker.requestInterrupt(a.turnId)).toEqual({ sdkInterruptRequired: true });
    tracker.applyInterruptResponse(a.turnId, [b.uuid, "internal-cron-uuid"]);
    expect(tracker.activeTurnId).toBe("t1");
    feed(taskNotification("fg", "stopped"), toolResult("The user doesn't want to proceed"), interruptedText(), aborted([a.uuid]), lifecycle("cancelled"));

    expect(lifecycleOnly()).toEqual([["started", "t1", "input"], ["settled", "t1", "interrupted"]]);
    expect(() => tracker.registerInput({ kind: "append_to_active_turn", turnId: "t1" })).not.toThrow();
  });

  it("settles completed when the interrupt reached the CLI before it read the input (probe P-prewait)", () => {
    const { tracker, feed, sendAndStart, lifecycleOnly } = createTracker();
    const a = sendAndStart();
    expect(tracker.requestInterrupt(a.turnId).sdkInterruptRequired).toBe(true);
    tracker.applyInterruptResponse(a.turnId, []);
    feed(init(), assistant("A."), success([a.uuid]));
    expect(lifecycleOnly().at(-1)).toEqual(["settled", "t1", "completed"]);
  });

  it("settles interrupted on an interrupt with an aborted result and no cancelled uuid (probe F)", () => {
    const { tracker, feed, sendAndStart, lifecycleOnly } = createTracker();
    const a = sendAndStart();
    feed(init(), toolUse(), taskStarted("fg", false));
    tracker.requestInterrupt(a.turnId);
    tracker.applyInterruptResponse(a.turnId, []);
    feed(taskNotification("fg", "stopped"), toolResult("rejected"), interruptedText(), aborted([a.uuid]));
    expect(lifecycleOnly().at(-1)).toEqual(["settled", "t1", "interrupted"]);
  });

  it("cancels only-unsent input locally without an SDK call (ARCH-F-008)", () => {
    const { tracker, start, lifecycleOnly } = createTracker();
    const a = start();
    expect(tracker.requestInterrupt(a.turnId)).toEqual({ sdkInterruptRequired: false });
    expect(lifecycleOnly()).toEqual([["started", "t1", "input"], ["settled", "t1", "interrupted"]]);
    expect(tracker.isSendCancelled(a.uuid)).toBe(true);
  });

  it("requires the SDK interrupt for a provider-initiated turn with no input of ours (IC-1)", () => {
    const { tracker, feed, lifecycleOnly } = createTracker();
    feed(init(), assistant());
    expect(tracker.requestInterrupt("t1")).toEqual({ sdkInterruptRequired: true });
    expect(tracker.activeTurnId).toBe("t1");
    tracker.applyInterruptResponse("t1", []);
    feed({ type: "result", subtype: "error_during_execution", session_id: SID, user_message_uuids: [], terminal_reason: "aborted_streaming" });
    expect(lifecycleOnly().at(-1)).toEqual(["settled", "t1", "interrupted"]);
  });

  it("requires the SDK interrupt when a start_turn raced into a provider turn with an unsent uuid (IC-1)", () => {
    const { tracker, feed, start, lifecycleOnly } = createTracker();
    feed(init(), assistant());
    const raced = start();
    expect(raced.turnId).toBe("t1");

    expect(tracker.requestInterrupt("t1")).toEqual({ sdkInterruptRequired: true });
    expect(tracker.isSendCancelled(raced.uuid)).toBe(true);
    expect(tracker.activeTurnId).toBe("t1");
    tracker.applyInterruptResponse("t1", []);
    feed(aborted([]));
    expect(lifecycleOnly().at(-1)).toEqual(["settled", "t1", "interrupted"]);
  });

  it("requires the SDK interrupt once any uuid of the turn was sent, even between CLI turns", () => {
    const { tracker, feed, sendAndStart, append } = createTracker();
    const a = sendAndStart();
    append(a.turnId);
    feed(init(), assistant(), success([a.uuid]));
    expect(tracker.requestInterrupt(a.turnId)).toEqual({ sdkInterruptRequired: true });
  });

  it("rejects appends and joining starts while an interrupt is pending, and foreign interrupt turn ids", () => {
    const { tracker, feed, sendAndStart } = createTracker();
    const a = sendAndStart();
    feed(init());
    tracker.requestInterrupt(a.turnId);
    expect(tracker.registerInput({ kind: "append_to_active_turn", turnId: a.turnId })).toMatchObject({ accepted: false, code: "CLAUDE_APPEND_TURN_MISMATCH" });
    expect(tracker.registerInput({ kind: "start_turn" })).toMatchObject({ accepted: false });
    expect(() => tracker.requestInterrupt("t-other")).toThrow("Claude active turn is 't1', not 't-other'.");
  });

  it("resolves whenSettled for the interrupted turn and immediately for a settled one", async () => {
    const { tracker, feed, sendAndStart } = createTracker();
    const a = sendAndStart();
    feed(init());
    const settled = tracker.whenSettled(a.turnId);
    tracker.requestInterrupt(a.turnId);
    feed(aborted([a.uuid]));
    await expect(settled).resolves.toBeUndefined();
    await expect(tracker.whenSettled(a.turnId)).resolves.toBeUndefined();
  });
});

describe("ClaudeBackgroundTaskRegistry consumption and carry-over (SPINE-3, ARCH-F-007, IC-2)", () => {
  it("does not count abort-generated frames after Stop as consumption (J + O shape)", () => {
    const { tracker, feed, sendAndStart, registry, lifecycleOnly } = createTracker();
    const a = sendAndStart();
    feed(init(), toolUse(), toolUse(), bgChanged([["bg", "Nightly tests"]]), taskStarted("bg", true), toolResult("running in background"), taskStarted("fg", false));
    feed(bgChanged([]), taskNotification("bg"));
    tracker.requestInterrupt(a.turnId);
    tracker.applyInterruptResponse(a.turnId, []);
    feed(taskNotification("fg", "stopped"), toolResult("The user doesn't want to proceed"), interruptedText(), assistant("late"), aborted([a.uuid]));

    expect(lifecycleOnly()).toEqual([
      ["started", "t1", "input"],
      ["notice", "t1", "Background task completed: Nightly tests (completed) — Claude was stopped before reporting it"],
      ["settled", "t1", "interrupted"],
    ]);
    expect(registry.peekCarryOver().notes).toEqual([
      "[System note: background task bg (Nightly tests) finished with status completed while you were stopped; its output is at /tmp/bg.out.]",
    ]);
    registry.clearCarryOver(["bg"]);
    expect(registry.peekCarryOver().notes).toEqual([]);
  });

  it("keeps a completion recorded after the Stop pending for the CLI's own turn instead of carrying it over (IC-2)", () => {
    const { tracker, feed, sendAndStart, registry, lifecycleOnly } = createTracker();
    const a = sendAndStart();
    feed(init(), toolUse(), bgChanged([["bg", "Build"]]), taskStarted("bg", true), toolResult("running in background"));
    tracker.requestInterrupt(a.turnId);
    feed(bgChanged([]), taskNotification("bg"));
    tracker.applyInterruptResponse(a.turnId, []);
    feed(aborted([a.uuid]));

    expect(registry.peekCarryOver().notes).toEqual([]);
    expect(registry.pendingCount).toBe(1);
    feed(init(), assistant("I see the build finished"), success([], { origin: { kind: "task-notification" } }));
    expect(lifecycleOnly()).toEqual([
      ["started", "t1", "input"],
      ["settled", "t1", "interrupted"],
      ["started", "t2", "provider"],
      ["notice", "t2", "Background task completed: Build (completed)"],
      ["settled", "t2", "completed"],
    ]);
  });

  it("clears pending completions and carry-over when the process exits", () => {
    const { feed, registry, tracker } = createTracker();
    feed(bgChanged([["bg", "x"]]), taskNotification("bg"));
    expect(registry.pendingCount).toBe(1);
    tracker.processExited({ code: "CLAUDE_PROCESS_EXITED", message: "gone" });
    expect(registry.pendingCount).toBe(0);
  });
});
