import { describe, expect, it } from "vitest";
import { TaskDelegationAddressBuilder } from "../../../src/agent-team-execution/task-delegation/task-delegation-address-builder.js";
import type { TaskTeamInstanceIdentity } from "../../../src/agent-team-execution/domain/task-team-instance.js";

const taskTeamInstance = (overrides: Partial<TaskTeamInstanceIdentity> = {}): TaskTeamInstanceIdentity => ({
  taskTeamInstanceId: "task_team_parent",
  taskTeamRunId: "task-team-run",
  parentTeamRunId: "root-run",
  taskId: "task_0001",
  logicalTeam: {
    memberName: "design_team",
    memberPath: ["design_team"],
    memberRouteKey: "design_team",
    templateMemberRunId: "template-design-team",
    teamDefinitionId: "team-def-design",
    coordinatorMemberRouteKey: "team_lead",
  },
  ingress: {
    memberName: "team_lead",
    memberPath: ["team_lead"],
    memberRouteKey: "team_lead",
    memberRunId: "run-team-lead",
  },
  createdAt: "2026-07-02T00:00:00.000Z",
  ...overrides,
});

describe("TaskDelegationAddressBuilder", () => {
  it("builds team-target receiver addresses as the actual task-team ingress inbox", () => {
    const builder = new TaskDelegationAddressBuilder();

    expect(builder.buildTaskTeamIngressAddress(taskTeamInstance())).toEqual({
      segments: [
        { kind: "member", memberRouteKey: "design_team" },
        { kind: "task_team", taskTeamRunId: "task-team-run" },
        { kind: "member", memberRouteKey: "team_lead" },
      ],
    });
  });

  it("prefixes child task-team local delegation addresses with the root-visible parent chain", () => {
    const parentTaskTeam = taskTeamInstance({
      taskTeamInstanceId: "task_team_parent",
      taskTeamRunId: "parent-task-team-run",
      taskId: "task_0000",
      logicalTeam: {
        memberName: "implementation_team",
        memberPath: ["implementation_team"],
        memberRouteKey: "implementation_team",
        templateMemberRunId: "template-implementation-team",
        teamDefinitionId: "team-def-implementation",
        coordinatorMemberRouteKey: "coordinator",
      },
      ingress: {
        memberName: "coordinator",
        memberPath: ["coordinator"],
        memberRouteKey: "coordinator",
        memberRunId: "run-coordinator",
      },
    });
    const childTaskTeam = taskTeamInstance({
      taskTeamRunId: "child-task-team-run",
      logicalTeam: {
        memberName: "design_team",
        memberPath: ["design_team"],
        memberRouteKey: "design_team",
        templateMemberRunId: "template-design-team",
        teamDefinitionId: "team-def-design",
        coordinatorMemberRouteKey: "team_lead",
      },
    });
    const builder = new TaskDelegationAddressBuilder(parentTaskTeam);

    expect(builder.buildTaskTeamIngressAddress(childTaskTeam)).toEqual({
      segments: [
        { kind: "member", memberRouteKey: "implementation_team" },
        { kind: "task_team", taskTeamRunId: "parent-task-team-run" },
        { kind: "member", memberRouteKey: "design_team" },
        { kind: "task_team", taskTeamRunId: "child-task-team-run" },
        { kind: "member", memberRouteKey: "team_lead" },
      ],
    });
  });
});
