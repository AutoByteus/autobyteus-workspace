import { describe, expect, it, vi } from "vitest";
import { createTeamRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskDelegationToolContext } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { TaskDelegationToolRunRouter } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-run-router.js";
import { DelegateTaskResultSchema } from "../../../../src/agent-team-execution/task-delegation/task-delegation-result-contract.js";

const buildContext = () => {
  const root = createTeamRootExecutionIdentity("root-team-run");
  const calls = {
    delegateToNewCopy: vi.fn(async () => ({ delegated: true as const, copy: { kind: "agent" as const, agentRunId: "worker-run" } })),
    assignToExistingCopy: vi.fn(async () => ({ delegated: true as const,
      copy: { kind: "team" as const, teamRunId: "team-run", teamCoordinatorAgentRunId: "coordinator-of-team" } })),
  };
  const context: TaskDelegationToolContext = Object.freeze({
    identity: Object.freeze({ root, memberAddress: "/coordinator", agentRunId: "coordinator-run" }),
    commands: Object.freeze({ root, ...calls }),
  });
  return { context, calls };
};

describe("TaskDelegationToolRunRouter", () => {
  it("routes an address to the new-copy command and names an Agent copy by target_agent_run_id", async () => {
    const { context, calls } = buildContext();
    const input = { recipient_address: "/worker", description: "Perform the bounded work." };

    const result = await new TaskDelegationToolRunRouter().delegateTask(context, { subject: "new_copy", input });
    expect(result).toEqual({ delegated: true, target_kind: "agent", target_agent_run_id: "worker-run" });
    expect(DelegateTaskResultSchema.parse(result)).toEqual(result);
    expect(calls.delegateToNewCopy).toHaveBeenCalledWith(context.identity, input);
    expect(calls.assignToExistingCopy).not.toHaveBeenCalled();
  });

  it("routes a copy ID to the existing-copy command and names a Team copy and its coordinator (AC-001)", async () => {
    const { context, calls } = buildContext();
    const input = { copy: { teamRunId: "team-run" }, taskId: "task-B" };

    const result = await new TaskDelegationToolRunRouter().delegateTask(context, { subject: "existing_copy", input });
    expect(result).toEqual({ delegated: true, target_kind: "team", target_team_run_id: "team-run",
      target_team_coordinator_agent_run_id: "coordinator-of-team" });
    expect(result).not.toHaveProperty("target_agent_run_id");
    expect(DelegateTaskResultSchema.parse(result)).toEqual(result);
    expect(calls.assignToExistingCopy).toHaveBeenCalledWith(context.identity, input);
  });

  it("serializes a failure with its reason and no copy ID", async () => {
    const { context, calls } = buildContext();
    calls.delegateToNewCopy.mockResolvedValueOnce({ delegated: false, message: "Target not found." } as never);
    const result = await new TaskDelegationToolRunRouter().delegateTask(context,
      { subject: "new_copy", input: { recipient_address: "/x", description: "d" } });
    expect(result).toEqual({ delegated: false, message: "Target not found." });
    expect(DelegateTaskResultSchema.parse(result)).toEqual(result);
  });
});
