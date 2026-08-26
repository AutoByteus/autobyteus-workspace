import { describe, expect, it, vi } from "vitest";
import { createTaskExecutionIdentityCapabilities } from "../../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";

const source = Object.freeze({
  kind: "agent_team" as const,
  address: "/workers" as const,
  teamRunId: "configured-team",
  teamDefinitionId: "worker-team",
  coordinatorMemberAddress: "/workers/worker" as const,
  applicationBinding: null,
  children: Object.freeze([Object.freeze({
    kind: "agent" as const,
    address: "/workers/worker" as const,
    agentRunId: "configured-agent",
    agentDefinitionId: "worker-agent",
    runtimeKind: "autobyteus" as const,
    platformAgentRunId: null,
    launchConfiguration: null,
  })]),
});

describe("task execution identity capabilities", () => {
  it("retains one allocator identity for Agent and derived task-Team allocation", async () => {
    const allocateForAgentDefinition = vi.fn(async (id: string) => `task-${id}`);
    const agentRuns = { allocateForAgentDefinition };
    const capabilities = createTaskExecutionIdentityCapabilities(agentRuns);

    expect(capabilities.agentRuns).toBe(agentRuns);
    expect(Object.isFrozen(capabilities)).toBe(true);
    expect(Object.keys(capabilities).sort()).toEqual(["agentRuns", "taskTeams"]);
    const materialized = await capabilities.taskTeams.create({ source, taskId: "task-1" });
    expect(materialized.teamNode.children[0]).toMatchObject({
      agentRunId: "task-worker-agent",
    });
    expect(allocateForAgentDefinition).toHaveBeenCalledWith("worker-agent");
    expect("manager" in capabilities).toBe(false);
  });

  it.each(["omitted", null, undefined] as const)("rejects %s allocator", (value) => {
    const args = value === "omitted" ? [] : [value];
    expect(() => Reflect.apply(createTaskExecutionIdentityCapabilities, null, args)).toThrow(
      "Task Agent-run identity allocator is required.",
    );
  });
});
