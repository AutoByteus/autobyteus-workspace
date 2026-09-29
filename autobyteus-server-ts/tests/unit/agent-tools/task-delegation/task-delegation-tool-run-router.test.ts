import { describe, expect, it, vi } from "vitest";
import { createTeamRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskDelegationToolContext } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { TaskDelegationToolRunRouter } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-run-router.js";

const buildContext = () => {
  const root = createTeamRootExecutionIdentity("root-team-run");
  const calls = {
    delegateTask: vi.fn(async () => ({ target_agent_run_id: "worker-run" })),
  };
  const context: TaskDelegationToolContext = Object.freeze({
    identity: Object.freeze({ root, memberAddress: "/coordinator", agentRunId: "coordinator-run" }),
    commands: Object.freeze({ root, ...calls }),
  });
  return { context, calls };
};

describe("TaskDelegationToolRunRouter", () => {
  it("invokes the selector-free delegate command with the bound sender", async () => {
    const { context, calls } = buildContext();
    const input = { recipient_address: "/worker", description: "Perform the bounded work." };

    await expect(new TaskDelegationToolRunRouter().delegateTask(context, input))
      .resolves.toEqual({ target_agent_run_id: "worker-run" });
    expect(calls.delegateTask).toHaveBeenCalledWith(context.identity, input);
  });
});
