import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { MixedTaskTeamMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.js";
import { MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import type { StartTaskTeamInstanceRequest, TaskTeamInstanceIdentity } from "../../../src/agent-team-execution/domain/task-team-instance.js";
import { TaskTeamActiveRunDirectory } from "../../../src/agent-team-execution/task-delegation/task-team-active-run-directory.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const identity: TaskTeamInstanceIdentity = {
  taskTeamInstanceId: "task-team-instance-1",
  taskTeamRunId: "task-team-run-1",
  parentTeamRunId: "parent-team-run-1",
  taskId: "task_0001",
  logicalTeam: {
    memberName: "design_team",
    memberPath: ["design_team"],
    memberRouteKey: "design_team",
    templateMemberRunId: "design-team-template-run",
    teamDefinitionId: "design-team-def",
    coordinatorMemberRouteKey: "team_lead",
  },
  ingress: {
    memberName: "team_lead",
    memberPath: ["team_lead"],
    memberRouteKey: "team_lead",
    memberRunId: "team-lead-template-run",
  },
  createdAt: "2026-07-04T00:00:00.000Z",
};

const buildParentContext = () => new TeamRunContext({
  runId: "parent-team-run-1",
  teamBackendKind: TeamBackendKind.MIXED,
  coordinatorMemberRouteKey: "coordinator",
  config: new TeamRunConfig({
    teamDefinitionId: "parent-team-def",
    teamBackendKind: TeamBackendKind.MIXED,
    memberConfigs: [
      {
        memberKind: "agent_team",
        memberName: "design_team",
        memberPath: ["design_team"],
        memberRouteKey: "design_team",
        memberRunId: "design-team-template-run",
        teamDefinitionId: "design-team-def",
        coordinatorMemberRouteKey: "team_lead",
        childTeamRunId: "design-team-template-run",
        memberConfigs: [
          {
            memberKind: "agent",
            memberName: "team_lead",
            memberPath: ["team_lead"],
            memberRouteKey: "team_lead",
            memberRunId: "team-lead-template-run",
            agentDefinitionId: "agent-team-lead",
            llmModelIdentifier: "model-1",
            autoExecuteTools: false,
            skillAccessMode: SkillAccessMode.NONE,
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          },
        ],
      },
    ],
  }),
  runtimeContext: new MixedTeamRunContext({
    coordinatorMemberRouteKey: "coordinator",
    memberContexts: [],
  }),
});

const buildHandle = () => {
  const publish = vi.fn();
  const directory = new TaskTeamActiveRunDirectory();
  const request: StartTaskTeamInstanceRequest = {
    identity,
    message: new AgentInputUserMessage("start task team"),
    teamConfig: new TeamRunConfig({
      teamDefinitionId: "design-team-def",
      teamBackendKind: TeamBackendKind.MIXED,
      memberConfigs: [],
    }),
  } as never;
  const handle = new MixedTaskTeamMemberHandle({
    parentContext: buildParentContext(),
    request,
    subTeamRunFactory: {} as never,
    taskTeamActiveRunDirectory: directory,
    publish,
    deliverInterAgentMessage: vi.fn(),
  });
  return { handle, publish, directory };
};

describe("MixedTaskTeamMemberHandle termination", () => {
  it("disposes without publishing an aggregate team-status fallback", async () => {
    const { handle, publish } = buildHandle();

    await expect(handle.terminate()).resolves.toEqual({ accepted: true });

    expect(publish).not.toHaveBeenCalled();
  });

  it("does not publish offline or dispose the child run when child termination rejects", async () => {
    const { handle, publish } = buildHandle();
    const childRun = {
      runId: "task-team-run-1",
      isActive: () => true,
      terminate: vi.fn(async () => ({
        accepted: false,
        code: "CHILD_TERMINATION_REJECTED",
        message: "child still active",
      })),
    };
    (handle as any).childRun = childRun;

    await expect(handle.terminate()).resolves.toEqual({
      accepted: false,
      code: "CHILD_TERMINATION_REJECTED",
      message: "child still active",
    });

    expect(childRun.terminate).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
    expect((handle as any).childRun).toBe(childRun);
  });
});
