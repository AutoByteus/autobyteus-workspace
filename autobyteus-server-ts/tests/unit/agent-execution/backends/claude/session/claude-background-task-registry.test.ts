import { describe, expect, it } from "vitest";
import { ClaudeBackgroundTaskRegistry } from "../../../../../../src/agent-execution/backends/claude/session/claude-background-task-registry.js";
import type { AgentBackgroundTask } from "../../../../../../src/agent-execution/domain/agent-background-task.js";

const SID = "session-1";
const STARTED_AT = "2026-09-29T16:48:20.000Z";

const bgChanged = (tasks: Array<[string, string, string?]>) => ({
  type: "system", subtype: "background_tasks_changed", session_id: SID,
  tasks: tasks.map(([task_id, description, task_type = "local_bash"]) => ({ task_id, task_type, description })),
});
const taskStarted = (taskId: string, isBackgrounded: boolean, extra: Record<string, unknown> = {}) => ({
  type: "system", subtype: "task_started", session_id: SID, task_id: taskId, description: `desc ${taskId}`,
  task_type: "local_bash", is_backgrounded: isBackgrounded, ...extra,
});
const taskUpdated = (taskId: string, patch: Record<string, unknown>) => ({
  type: "system", subtype: "task_updated", session_id: SID, task_id: taskId, patch,
});
const taskProgress = (taskId: string) => ({
  type: "system", subtype: "task_progress", session_id: SID, task_id: taskId, description: "progress",
  usage: { total_tokens: 1, tool_uses: 1, duration_ms: 1 }, summary: "halfway",
});
const taskNotification = (taskId: string, status = "completed", summary = "Background command completed (exit code 0)") => ({
  type: "system", subtype: "task_notification", session_id: SID, task_id: taskId, status,
  output_file: `/tmp/${taskId}.out`, summary,
});

const createRegistry = () => {
  const emitted: AgentBackgroundTask[] = [];
  const registry = new ClaudeBackgroundTaskRegistry((task) => emitted.push(task), () => new Date(STARTED_AT));
  const feed = (...frames: Record<string, unknown>[]) => frames.forEach((frame) => registry.observeTaskFrame(frame));
  return { registry, emitted, feed };
};

const running = (taskId: string, description: string, kind: AgentBackgroundTask["kind"] = "shell"): AgentBackgroundTask => ({
  taskId, kind, description, status: "running", summary: null, startedAt: STARTED_AT,
});

describe("ClaudeBackgroundTaskRegistry background-task view (DS-002)", () => {
  it("lists a background shell task as running, then completed with the reported summary (probe J/O frame order)", () => {
    const { emitted, feed } = createRegistry();

    feed(bgChanged([["bg1", "Sleep 20 then write marker"]]), taskStarted("bg1", true), taskProgress("bg1"));
    expect(emitted).toEqual([running("bg1", "Sleep 20 then write marker")]);

    feed(bgChanged([]), taskUpdated("bg1", { status: "completed", end_time: 1 }), taskNotification("bg1"));
    expect(emitted.slice(1)).toEqual([
      { ...running("bg1", "Sleep 20 then write marker"), status: "completed", summary: null },
      { ...running("bg1", "Sleep 20 then write marker"), status: "completed", summary: "Background command completed (exit code 0)" },
    ]);
  });

  it("never lists foreground tasks, even though they emit the same task frames (REQ-008, AC-010)", () => {
    const { emitted, feed } = createRegistry();

    feed(
      taskStarted("fg", false, { task_type: "local_agent" }),
      taskProgress("fg"),
      taskUpdated("fg", { status: "completed" }),
      taskNotification("fg"),
    );

    expect(emitted).toEqual([]);
  });

  it("adds a task moved from the foreground to the background", () => {
    const { emitted, feed } = createRegistry();

    feed(taskStarted("agent-1", false, { task_type: "local_agent", description: "Review the diff" }));
    feed(taskUpdated("agent-1", { is_backgrounded: true }));

    expect(emitted).toEqual([running("agent-1", "Review the diff", "subagent")]);
  });

  it("lists a task started directly in the background without a background_tasks_changed frame", () => {
    const { emitted, feed } = createRegistry();

    feed(taskStarted("wf-1", true, { task_type: "local_workflow", description: "spec workflow" }));

    expect(emitted).toEqual([running("wf-1", "spec workflow", "workflow")]);
  });

  it.each([
    ["local_bash", "shell"],
    ["local_agent", "subagent"],
    ["local_workflow", "workflow"],
    ["monitor_mcp", "monitor"],
    ["monitor_ws", "monitor"],
    ["mcp_task", "other"],
    ["remote_agent", "other"],
    ["dream", "other"],
  ] as const)("maps raw task_type %s to kind %s", (taskType, kind) => {
    const { emitted, feed } = createRegistry();

    feed(bgChanged([["t", "task", taskType]]));

    expect(emitted[0]?.kind).toBe(kind);
  });

  it("does not end a task because it left the background set; a terminal frame does", () => {
    const { emitted, feed } = createRegistry();

    feed(bgChanged([["bg1", "one"]]), bgChanged([]));

    expect(emitted.map((task) => task.status)).toEqual(["running"]);
  });

  it.each([
    [{ status: "failed", error: "exit 3" }, "failed", "exit 3"],
    [{ status: "killed" }, "stopped", null],
  ] as const)("maps a terminal task_updated patch %o to %s", (patch, status, summary) => {
    const { emitted, feed } = createRegistry();

    feed(bgChanged([["bg1", "one"]]), taskUpdated("bg1", patch));

    expect(emitted.at(-1)).toEqual({ ...running("bg1", "one"), status, summary });
  });

  it.each([
    ["completed", "completed"],
    ["failed", "failed"],
    ["stopped", "stopped"],
  ] as const)("finishes a running task from task_notification status %s", (notificationStatus, status) => {
    const { emitted, feed } = createRegistry();

    feed(bgChanged([["bg1", "one"]]), taskNotification("bg1", notificationStatus, "summary text"));

    expect(emitted.at(-1)).toEqual({ ...running("bg1", "one"), status, summary: "summary text" });
  });

  it("emits a terminal task only once when its summary is already known", () => {
    const { emitted, feed } = createRegistry();

    feed(bgChanged([["bg1", "one"]]), taskNotification("bg1"), taskNotification("bg1"), taskUpdated("bg1", { status: "completed" }));

    expect(emitted.map((task) => task.status)).toEqual(["running", "completed"]);
  });

  it("fills an empty description once the CLI reports one", () => {
    const { emitted, feed } = createRegistry();

    feed(taskUpdated("bg1", { is_backgrounded: true }), bgChanged([["bg1", "Late description"]]));

    expect(emitted).toEqual([
      { ...running("bg1", ""), kind: "other" },
      { ...running("bg1", "Late description"), kind: "other" },
    ]);
  });

  it("changes only the finished task when two run concurrently (AC-012)", () => {
    const { emitted, feed } = createRegistry();

    feed(bgChanged([["a", "first"], ["b", "second"]]), taskNotification("b"));

    expect(emitted.map((task) => [task.taskId, task.status])).toEqual([["a", "running"], ["b", "running"], ["b", "completed"]]);
  });

  it("marks running tasks stopped when the process ends, then forgets them (REQ-009, AC-011)", () => {
    const { registry, emitted, feed } = createRegistry();
    feed(bgChanged([["a", "first"], ["b", "second"]]), taskNotification("a"));
    emitted.length = 0;

    registry.clear();
    feed(taskNotification("b"));

    expect(emitted).toEqual([{ ...running("b", "second"), status: "stopped" }]);
  });

  it("keeps the completion notice queue working alongside the view (BEH-006)", () => {
    const { registry, feed } = createRegistry();

    feed(bgChanged([["bg1", "Nightly tests"]]), taskStarted("bg1", true, { description: "Nightly tests" }), taskNotification("bg1"));

    expect(registry.pendingCount).toBe(1);
    expect(registry.drainForProviderTurn()).toBe("Background task completed: Nightly tests (completed)");
  });
});
