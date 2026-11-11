import { afterEach, describe, expect, it, vi } from "vitest";
import { bindTaskRunControl, TaskRunControl, unbindTaskRunControl } from "../../../../src/agent-collaboration/execution/task/task-run-control.js";
import { TaskWorkerStatusNotice } from "../../../../src/agent-collaboration/execution/task/task-worker-status-notice.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";

/**
 * autobyteus-461: a delegated run tells the Task side when its own status may have changed, so its Tasks' worker
 * status (the Projects page) stays live, as the hosting root's task lifecycle told it before.
 */
const bound = () => {
  const tasks = { taskExecutionsStatusChanged: vi.fn(), isOpen: () => false };
  const control = new TaskRunControl({ agentRuns: {} as never, teamRuns: {} as never, tasks: () => tasks });
  bindTaskRunControl(control);
  return { tasks, release: () => unbindTaskRunControl(control) };
};
let release: (() => void) | null = null;
afterEach(() => { release?.(); release = null; });

describe("TaskWorkerStatusNotice", () => {
  it("tells the Task side each status change of an agent run's agent, and its stop", () => {
    const h = bound(); release = h.release;
    let listener: ((event: unknown) => void) | null = null;
    const unsubscribe = vi.fn();
    const agentRun = { subscribeToEvents: vi.fn((next: (event: unknown) => void) => { listener = next; return unsubscribe; }) };
    const notice = new TaskWorkerStatusNotice({ agentRunId: "image" });
    notice.watch(agentRun as never);
    notice.watch(agentRun as never);
    expect(agentRun.subscribeToEvents).toHaveBeenCalledOnce();
    listener!({ eventType: AgentRunEventType.AGENT_STATUS, payload: { status: "running" } });
    listener!({ eventType: AgentRunEventType.SEGMENT_CONTENT, payload: {} });
    notice.stopped();
    expect(unsubscribe).toHaveBeenCalledOnce();
    // Watch, one status change, the stop; the segment event is not a status change.
    expect(h.tasks.taskExecutionsStatusChanged).toHaveBeenCalledTimes(3);
    expect(h.tasks.taskExecutionsStatusChanged).toHaveBeenCalledWith([{ agentRunId: "image" }]);
  });

  it("tells a team run's member status changes only", () => {
    const h = bound(); release = h.release;
    const notice = new TaskWorkerStatusNotice({ teamRunId: "eng" });
    notice.onTeamEvent({ eventSourceType: TeamRunEventSourceType.AGENT, payload: { eventType: "AGENT_STATUS", details: { status: "idle" } } } as never);
    notice.onTeamEvent({ eventSourceType: TeamRunEventSourceType.AGENT, payload: { eventType: "SEGMENT_CONTENT", details: {} } } as never);
    notice.onTeamEvent({ eventSourceType: TeamRunEventSourceType.COMMUNICATION } as never);
    expect(h.tasks.taskExecutionsStatusChanged).toHaveBeenCalledExactlyOnceWith([{ teamRunId: "eng" }]);
  });

  it("does nothing where the Task side is not composed", () => {
    expect(() => new TaskWorkerStatusNotice({ agentRunId: "image" }).stopped()).not.toThrow();
  });
});
