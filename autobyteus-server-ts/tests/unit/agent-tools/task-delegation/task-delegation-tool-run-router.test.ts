import { describe, expect, it, vi } from "vitest";
import { createTeamRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskDelegationToolContext } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { TaskDelegationToolRunRouter } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-run-router.js";

const buildContext = () => {
  const root = createTeamRootExecutionIdentity("root-team-run");
  const calls = {
    delegateTask: vi.fn(async () => ({ task_id: "task-1", status: "active" as const, target_agent_run_id: "worker-run" })),
    submitTaskResult: vi.fn(async () => ({ accepted: true as const })),
    reviewTaskResult: vi.fn(async () => ({ accepted: true as const })),
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
      .resolves.toMatchObject({ task_id: "task-1", target_agent_run_id: "worker-run" });
    expect(calls.delegateTask).toHaveBeenCalledWith(context.identity, input);
  });

  it("invokes submit and review without resolving or inferring a root", async () => {
    const { context, calls } = buildContext();
    const router = new TaskDelegationToolRunRouter();
    const submit = { task_id: "task-1", summary: "Done." };
    const review = { task_id: "task-1", accepted: true };

    await router.submitTaskResult(context, submit);
    await router.reviewTaskResult(context, review);

    expect(calls.submitTaskResult).toHaveBeenCalledWith(context.identity, submit);
    expect(calls.reviewTaskResult).toHaveBeenCalledWith(context.identity, review);
    expect(context).not.toHaveProperty("rootResolver");
  });
});
