import { describe, expect, it, vi } from "vitest";
import { TaskWorkerStatusNotice } from "../../../../src/agent-collaboration/execution/task/task-worker-status-notice.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";

/**
 * autobyteus-461: a delegated run tells the Task side when its own status may have changed, so its Tasks' worker
 * status (the Projects page) stays live, as the hosting root's task lifecycle told it before.
 */
/** The run side's Task records the notice is given (SR-053). */
const records = () => ({ tasks: { statusChanged: vi.fn(), isOpen: () => false } });

describe("TaskWorkerStatusNotice", () => {
  it("tells the Task side each status change of an agent run's agent, and its stop", () => {
    const h = records();
    let listener: ((event: unknown) => void) | null = null;
    const unsubscribe = vi.fn();
    const agentRun = { subscribeToEvents: vi.fn((next: (event: unknown) => void) => { listener = next; return unsubscribe; }) };
    const notice = new TaskWorkerStatusNotice({ agentRunId: "image" }, h.tasks);
    notice.watch(agentRun as never);
    notice.watch(agentRun as never);
    expect(agentRun.subscribeToEvents).toHaveBeenCalledOnce();
    listener!({ eventType: AgentRunEventType.AGENT_STATUS, payload: { status: "running" } });
    listener!({ eventType: AgentRunEventType.SEGMENT_CONTENT, payload: {} });
    notice.stopped();
    expect(unsubscribe).toHaveBeenCalledOnce();
    // Watch, one status change, the stop; the segment event is not a status change.
    expect(h.tasks.statusChanged).toHaveBeenCalledTimes(3);
    expect(h.tasks.statusChanged).toHaveBeenCalledWith({ agentRunId: "image" });
  });

  it("tells a team run's member status changes only", () => {
    const h = records();
    const notice = new TaskWorkerStatusNotice({ teamRunId: "eng" }, h.tasks);
    notice.onTeamEvent({ eventSourceType: TeamRunEventSourceType.AGENT, payload: { eventType: "AGENT_STATUS", details: { status: "idle" } } } as never);
    notice.onTeamEvent({ eventSourceType: TeamRunEventSourceType.AGENT, payload: { eventType: "SEGMENT_CONTENT", details: {} } } as never);
    notice.onTeamEvent({ eventSourceType: TeamRunEventSourceType.COMMUNICATION } as never);
    expect(h.tasks.statusChanged).toHaveBeenCalledExactlyOnceWith({ teamRunId: "eng" });
  });

});
