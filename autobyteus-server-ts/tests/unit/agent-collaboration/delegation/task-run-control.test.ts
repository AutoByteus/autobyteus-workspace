import { describe, expect, it, vi } from "vitest";
import { TaskRunControl } from "../../../../src/agent-collaboration/execution/task/task-run-control.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/** autobyteus-461 DS-5 (contract T-1, T-3): what the Task side asks of a run by its own identity. */
const control = (input: { agentStopped?: boolean; teamStopped?: boolean; agentStatus?: string | null; teamStatuses?: string[] | null } = {}) => {
  const agentRuns = { stopForTaskClosure: vi.fn(async () => (input.agentStopped ?? true) ? "stopped" as const : "not_stopped" as const),
    getAgentRun: vi.fn(() => input.agentStatus === undefined || input.agentStatus === null ? null : { getStatusSnapshot: () => ({ status: input.agentStatus }) }) };
  const teamRuns = { stopForTaskClosure: vi.fn(async () => (input.teamStopped ?? true) ? "stopped" as const : "not_stopped" as const),
    getActiveTeamRun: vi.fn(() => input.teamStatuses ? { getLeafAgentStatusSnapshots: () => input.teamStatuses!.map((status) => ({ details: { status } })) } : null) };
  return { agentRuns, teamRuns, control: new TaskRunControl({ agentRuns: agentRuns as never, teamRuns: teamRuns as never }) };
};

describe("TaskRunControl", () => {
  it("a closed Task's run stops through its own run service, by its own identity", async () => {
    const h = control();
    await expect(h.control.stopForTaskClosure({ agentRunId: "image" })).resolves.toEqual({ execution: { agentRunId: "image" }, stopped: true });
    await expect(h.control.stopForTaskClosure({ teamRunId: "eng" })).resolves.toEqual({ execution: { teamRunId: "eng" }, stopped: true });
    expect(h.agentRuns.stopForTaskClosure).toHaveBeenCalledWith("image", expect.any(Function));
    expect(h.teamRuns.stopForTaskClosure).toHaveBeenCalledWith("eng", expect.any(Function));
  });

  it("a running run that did not stop is reported with the reason", async () => {
    const h = control({ teamStopped: false });
    await expect(h.control.stopForTaskClosure({ teamRunId: "eng" })).resolves.toMatchObject({ stopped: false, error: { code: "TASK_AGENT_RESOURCE_STOP_FAILED" } });
  });

  it("the run's own status: its agent's, or its members' folded; null when it is not running", () => {
    expect(control({ agentStatus: "idle" }).control.ownStatus({ agentRunId: "image" })).toBe("idle");
    expect(control().control.ownStatus({ agentRunId: "image" })).toBeNull();
    expect(control({ teamStatuses: ["idle", "running"] }).control.ownStatus({ teamRunId: "eng" })).toBe("running");
    expect(control().control.ownStatus({ teamRunId: "eng" })).toBeNull();
  });
});

/**
 * CR-461-001 (design race table row 1, QR-001): a closure stop that waits while a reopen or a new assignment commits.
 * The run's own service asks `stillClosed` where the run's gate closes; the Task side's `isOpen` answers.
 */
describe("a pending closure stop and a reopen", () => {
  const setup = async () => {
    const tasks = new InMemoryTaskExecutionResources();
    tasks.addTask("T1");
    const M = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/image_maker",
      delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" }, execution: { agentRunId: "image" } });
    await tasks.markStarted({ agentRunId: "image" });
    let reachGate!: () => void;
    const gate = new Promise<void>((resolve) => { reachGate = resolve; });
    const stopped: string[] = [];
    const runService = { stopForTaskClosure: vi.fn(async (runId: string, stillClosed: () => boolean) => {
      await gate;
      if (!stillClosed()) return "kept_open" as const;
      stopped.push(runId);
      return "stopped" as const;
    }) };
    const control = new TaskRunControl({ agentRuns: runService as never, teamRuns: runService as never, tasks: () => tasks });
    return { tasks, control, reachGate, stopped };
  };

  it("a reopen committed before the stop reaches the run's gate keeps the run running", async () => {
    const h = await setup();
    h.tasks.close("T1");
    const pending = h.control.stopForTaskClosure({ agentRunId: "image" });
    h.tasks.tasks.get("T1")!.done = false; // the agent moved the Task back to IN_PROGRESS
    await h.tasks.reopenAssignment({ execution: { agentRunId: "image" }, requestedBy: "manager" });
    h.reachGate();
    await expect(pending).resolves.toMatchObject({ stopped: false, error: { code: "TASK_AGENT_RESOURCE_NOT_CLOSED" } });
    expect(h.stopped).toEqual([]);
    expect(h.tasks.isOpen({ agentRunId: "image" })).toBe(true);
  });

  it("a new assignment to the run committed while the stop waits keeps it running too", async () => {
    const h = await setup();
    h.tasks.close("T1");
    h.tasks.addTask("T2");
    const pending = h.control.stopForTaskClosure({ agentRunId: "image" });
    await h.tasks.assignExistingTaskExecution({ delegatedFrom: { delegatingRun: { rootSubjectKind: "agent", rootRunId: "manager" }, delegatorAgentRunId: "manager" },
      execution: { agentRunId: "image" }, taskId: "T2" });
    h.reachGate();
    await expect(pending).resolves.toMatchObject({ stopped: false });
    expect(h.stopped).toEqual([]);
  });

  it("a stop that reaches the gate first stops the run; the reopen after it leaves the entry open for the next message", async () => {
    const h = await setup();
    h.tasks.close("T1");
    const pending = h.control.stopForTaskClosure({ agentRunId: "image" });
    h.reachGate();
    await expect(pending).resolves.toEqual({ execution: { agentRunId: "image" }, stopped: true });
    h.tasks.tasks.get("T1")!.done = false; // the agent moved the Task back to IN_PROGRESS
    await h.tasks.reopenAssignment({ execution: { agentRunId: "image" }, requestedBy: "manager" });
    expect(h.stopped).toEqual(["image"]);
    expect(h.tasks.isOpen({ agentRunId: "image" })).toBe(true);
  });
});
