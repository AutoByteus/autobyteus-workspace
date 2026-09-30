import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgyBackgroundTaskMonitor } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-background-task-monitor.js";
import type { AgyTaskExitMessageScan } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-task-exit-message-reader.js";
import type { AgentBackgroundTask } from "../../../../../src/agent-execution/domain/agent-background-task.js";

const conversation = "4e9ce167-65fe-4808-8472-494eae8e7a80";
const STARTED_AT = "2026-09-29T16:48:20.000Z";
const EMPTY: AgyTaskExitMessageScan = { settledFiles: [], exits: [], problem: null };
const daemon = { stepIndex: 2, toolName: "run_command", commandLine: "sleep 20; echo done > marker" };

const setup = () => {
  const emitted: AgentBackgroundTask[][] = [];
  const scans: AgyTaskExitMessageScan[] = [];
  const scanExitMessages = vi.fn((_skip: ReadonlySet<string>) => scans.shift() ?? EMPTY);
  const monitor = new AgyBackgroundTaskMonitor({
    runId: "run-1", conversationId: conversation, emit: (tasks) => emitted.push([...tasks]),
    scanExitMessages, pollIntervalMs: 2_000, now: () => new Date(STARTED_AT),
  });
  return { monitor, emitted, scans, scanExitMessages };
};

const running: AgentBackgroundTask = {
  taskId: `${conversation}/task-2`, kind: "shell", description: daemon.commandLine,
  status: "running", summary: null, startedAt: STARTED_AT,
};

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("AgyBackgroundTaskMonitor (DS-003)", () => {
  it("lists a daemon left open at turn end as a running shell task", () => {
    const { monitor, emitted } = setup();

    monitor.track([daemon, { stepIndex: 4, toolName: "browser_subagent", commandLine: null }]);

    expect(emitted).toEqual([[running, { ...running, taskId: `${conversation}/task-4`, kind: "other", description: "browser_subagent" }]]);
  });

  it("marks the task completed when AGY writes exit code 0, without another turn (AC-013a)", async () => {
    const { monitor, emitted, scans } = setup();
    monitor.track([daemon]);
    await vi.advanceTimersByTimeAsync(0);
    expect(emitted).toHaveLength(1);

    scans.push({ settledFiles: ["m.json"], exits: [{ stepIndex: 2, exitCode: 0, summary: "The command exited with code 0." }], problem: null });
    await vi.advanceTimersByTimeAsync(2_000);

    expect(emitted[1]).toEqual([{ ...running, status: "completed", summary: "The command exited with code 0." }]);
  });

  it("marks the task failed for a non-zero exit code (AC-013b)", async () => {
    const { monitor, emitted, scans } = setup();
    scans.push({ settledFiles: ["m.json"], exits: [{ stepIndex: 2, exitCode: 3, summary: "The command exited with code 3." }], problem: null });

    monitor.track([daemon]);
    await vi.advanceTimersByTimeAsync(0);

    expect(emitted[1]).toEqual([{ ...running, status: "failed", summary: "The command exited with code 3." }]);
  });

  it("stops polling once no task is running", async () => {
    const { monitor, scans, scanExitMessages } = setup();
    scans.push({ settledFiles: ["m.json"], exits: [{ stepIndex: 2, exitCode: 0, summary: null }], problem: null });
    monitor.track([daemon]);
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(20_000);

    expect(scanExitMessages).toHaveBeenCalledTimes(1);
  });

  it("does not re-read settled files and matches an exit seen before its step was tracked", async () => {
    const { monitor, emitted, scans, scanExitMessages } = setup();
    monitor.track([{ ...daemon, stepIndex: 1 }]);
    scans.push({ settledFiles: ["early.json"], exits: [{ stepIndex: 2, exitCode: 0, summary: "early" }], problem: null });
    await vi.advanceTimersByTimeAsync(0);

    monitor.track([daemon]);
    await vi.advanceTimersByTimeAsync(0);

    expect(emitted.at(-1)).toEqual([{ ...running, status: "completed", summary: "early" }]);
    expect([...scanExitMessages.mock.calls[1]![0]]).toEqual(["early.json"]);
  });

  it("keeps a task running while messages are unreadable, logs once, and marks it stopped when AGY stops (fail-safe)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { monitor, emitted, scans } = setup();
    scans.push({ ...EMPTY, problem: "LIST_FAILED:EACCES" }, { ...EMPTY, problem: "LIST_FAILED:EACCES" });
    monitor.track([daemon]);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(emitted).toEqual([[running]]);
    expect(warn).toHaveBeenCalledTimes(1);

    monitor.stopAll();

    expect(emitted[1]).toEqual([{ ...running, status: "stopped" }]);
  });

  it("emits nothing after stopAll and ignores later tracking (AC-013c)", async () => {
    const { monitor, emitted, scans, scanExitMessages } = setup();
    monitor.track([daemon]);
    monitor.stopAll();
    scans.push({ settledFiles: ["m.json"], exits: [{ stepIndex: 2, exitCode: 0, summary: null }], problem: null });

    await vi.advanceTimersByTimeAsync(10_000);
    monitor.track([{ ...daemon, stepIndex: 9 }]);
    monitor.stopAll();

    expect(emitted).toEqual([[running], [{ ...running, status: "stopped" }]]);
    expect(scanExitMessages).not.toHaveBeenCalled();
  });

  it("treats a throwing scanner as unreadable rather than failing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { monitor, emitted, scanExitMessages } = setup();
    scanExitMessages.mockImplementation(() => { throw new Error("boom"); });

    monitor.track([daemon]);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(emitted).toEqual([[running]]);
  });
});
