import { describe, expect, it } from "vitest";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { TaskDelegationAddressBuilder } from "../../../src/agent-team-execution/task-delegation/task-delegation-address-builder.js";

describe("TaskDelegationAddressBuilder", () => {
  it("builds a task AgentTeam ingress from the exact task execution and configured coordinator", () => {
    const builder = new TaskDelegationAddressBuilder(createTeamExecutionAddress({
      rootTeamRunId: "root-run",
      taskTeamRunIds: [],
      memberAddress: "/teacher",
    }));
    const taskRunAddress = createTeamExecutionAddress({
      rootTeamRunId: "root-run",
      taskTeamRunIds: ["task-team-run"],
      memberAddress: "/design_team",
    });

    expect(builder.buildTaskTeamIngressAddress(
      taskRunAddress,
      "/design_team/team_lead",
    )).toEqual(createTeamExecutionAddress({
      rootTeamRunId: "root-run",
      taskTeamRunIds: ["task-team-run"],
      memberAddress: "/design_team/team_lead",
    }));
  });

  it("preserves the full parent chain when building a nested task AgentTeam ingress", () => {
    const builder = new TaskDelegationAddressBuilder(createTeamExecutionAddress({
      rootTeamRunId: "root-run",
      taskTeamRunIds: ["parent-task-team-run"],
      memberAddress: "/implementation_team/coordinator",
    }));
    const taskRunAddress = createTeamExecutionAddress({
      rootTeamRunId: "root-run",
      taskTeamRunIds: ["parent-task-team-run", "child-task-team-run"],
      memberAddress: "/implementation_team/design_team",
    });

    expect(builder.buildTaskTeamIngressAddress(
      taskRunAddress,
      "/implementation_team/design_team/team_lead",
    )).toEqual(createTeamExecutionAddress({
      rootTeamRunId: "root-run",
      taskTeamRunIds: ["parent-task-team-run", "child-task-team-run"],
      memberAddress: "/implementation_team/design_team/team_lead",
    }));
  });

  it("rejects a task execution binding that does not match the delegated target", () => {
    const builder = new TaskDelegationAddressBuilder(createTeamExecutionAddress({
      rootTeamRunId: "root-run",
      memberAddress: "/teacher",
    }));
    const target = builder.buildTargetAddress({
      address: assertAgentTeamAddress("/student"),
      kind: "agent",
    });

    expect(() => builder.buildTaskRunAddress({
      kind: "task_agent",
      taskId: "task-1",
      executionAddress: createTeamExecutionAddress({
        rootTeamRunId: "foreign-root",
        memberAddress: "/student",
        taskAgentRunId: "task-agent-run",
      }),
    }, target)).toThrow("does not match the delegated target address");
  });
});
