import { describe, expect, it, vi } from "vitest";
import { TaskRunControl } from "../../../../src/agent-collaboration/execution/task/task-run-control.js";

/** autobyteus-461 DS-5 (contract T-1, T-3): what the Task side asks of a run by its own identity. */
const control = (input: { agentStopped?: boolean; teamStopped?: boolean; agentStatus?: string | null; teamStatuses?: string[] | null } = {}) => {
  const agentRuns = { stopForTaskClosure: vi.fn(async () => input.agentStopped ?? true),
    getAgentRun: vi.fn(() => input.agentStatus === undefined || input.agentStatus === null ? null : { getStatusSnapshot: () => ({ status: input.agentStatus }) }) };
  const teamRuns = { stopForTaskClosure: vi.fn(async () => input.teamStopped ?? true),
    getActiveTeamRun: vi.fn(() => input.teamStatuses ? { getLeafAgentStatusSnapshots: () => input.teamStatuses!.map((status) => ({ details: { status } })) } : null) };
  return { agentRuns, teamRuns, control: new TaskRunControl({ agentRuns: agentRuns as never, teamRuns: teamRuns as never }) };
};

describe("TaskRunControl", () => {
  it("a closed Task's run stops through its own run service, by its own identity", async () => {
    const h = control();
    await expect(h.control.stopForTaskClosure({ agentRunId: "image" })).resolves.toEqual({ execution: { agentRunId: "image" }, stopped: true });
    await expect(h.control.stopForTaskClosure({ teamRunId: "eng" })).resolves.toEqual({ execution: { teamRunId: "eng" }, stopped: true });
    expect(h.agentRuns.stopForTaskClosure).toHaveBeenCalledWith("image");
    expect(h.teamRuns.stopForTaskClosure).toHaveBeenCalledWith("eng");
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
