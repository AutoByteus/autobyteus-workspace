import { describe, expect, it } from "vitest";
import { buildAutoByteusManagedTeamContext } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-managed-team-context-builder.js";
import { MemberTeamContext } from "../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TaskDelegationInputResolver } from "../../../../src/agent-team-execution/task-delegation/task-delegation-input-resolver.js";
import { TaskDelegationLedger } from "../../../../src/agent-team-execution/task-delegation/task-delegation-ledger.js";
import { buildTaskDelegationToolContextFromNativeContext } from "../../../../src/agent-tools/task-delegation/task-delegation-autobyteus-context.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const teamRunId = "delivery-team-run-1";

const memberAddress = (memberPath: string[], memberRouteKey: string) => ({
  teamRunId,
  memberPath,
  memberRouteKey,
});

const createContextWithBuildSquad = () =>
  new MemberTeamContext({
    teamRunId,
    teamDefinitionId: "delivery-team-def",
    teamName: "Delivery Team",
    teamBackendKind: TeamBackendKind.MIXED,
    memberName: "program_manager",
    memberPath: ["program_manager"],
    memberRouteKey: "program_manager",
    memberRunId: "run-program-manager",
    coordinatorMemberRouteKey: "program_manager",
    members: [
      {
        memberKind: "agent",
        memberName: "program_manager",
        memberPath: ["program_manager"],
        memberRouteKey: "program_manager",
        memberRunId: "run-program-manager",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        role: "Program manager",
        description: "Coordinates delivery.",
        address: memberAddress(["program_manager"], "program_manager"),
      },
      {
        memberKind: "agent_team",
        memberName: "BuildSquad",
        memberPath: ["BuildSquad"],
        memberRouteKey: "BuildSquad",
        memberRunId: "run-build-squad-template",
        teamDefinitionId: "build-squad-def",
        childTeamRunId: null,
        coordinatorMemberRouteKey: "BuildSquad/review_lead",
        representative: {
          memberKind: "agent",
          memberName: "review_lead",
          memberPath: ["BuildSquad", "review_lead"],
          memberRouteKey: "BuildSquad/review_lead",
          memberRunId: "run-build-squad-review-lead",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          role: "Review lead",
          description: "Coordinates the build squad.",
        },
        role: "Build team",
        description: "Implements delegated work.",
        address: memberAddress(["BuildSquad"], "BuildSquad"),
      },
    ],
  });

describe("buildTaskDelegationToolContextFromNativeContext", () => {
  it("preserves BuildSquad as an agent_team so native delegate_task can resolve the team target", () => {
    const managedTeamContext = buildAutoByteusManagedTeamContext(createContextWithBuildSquad());

    expect(managedTeamContext.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberKind: "agent_team",
          memberName: "BuildSquad",
          memberRouteKey: "BuildSquad",
          teamDefinitionId: "build-squad-def",
          coordinatorMemberRouteKey: "BuildSquad/review_lead",
          ingress: expect.objectContaining({
            memberName: "review_lead",
            memberRouteKey: "BuildSquad/review_lead",
            memberRunId: "run-build-squad-review-lead",
          }),
        }),
      ]),
    );

    const delegationContext = buildTaskDelegationToolContextFromNativeContext({
      config: { name: "program_manager" },
      customData: { teamContext: managedTeamContext },
    });
    const resolver = new TaskDelegationInputResolver(
      teamRunId,
      new TaskDelegationLedger(teamRunId),
    );

    expect(() => resolver.assertContext(delegationContext)).not.toThrow();
    const createInput = resolver.buildCreateInput(delegationContext, {
      target: { kind: "team", name: "BuildSquad" },
      description: "Build the real UI validation path.",
      reference_files: [],
    });

    expect(createInput.target).toEqual({
      kind: "team",
      team: expect.objectContaining({
        memberKind: "agent_team",
        memberName: "BuildSquad",
        memberRouteKey: "BuildSquad",
        teamDefinitionId: "build-squad-def",
        ingress: expect.objectContaining({
          memberName: "review_lead",
          memberRouteKey: "BuildSquad/review_lead",
        }),
      }),
    });
  });

  it("rejects a team row whose memberKind was dropped instead of downgrading it to an agent", () => {
    const managedTeamContext = buildAutoByteusManagedTeamContext(createContextWithBuildSquad());
    const malformedTeamContext = {
      ...managedTeamContext,
      members: managedTeamContext.members.map((member) =>
        member.memberName === "BuildSquad"
          ? { ...member, memberKind: undefined }
          : member,
      ),
    };

    expect(() =>
      buildTaskDelegationToolContextFromNativeContext({
        config: { name: "program_manager" },
        customData: { teamContext: malformedTeamContext as any },
      }),
    ).toThrow(/members\[1\]\.memberKind/);
  });

  it("rejects an agent_team row missing its team definition id", () => {
    const managedTeamContext = buildAutoByteusManagedTeamContext(createContextWithBuildSquad());
    const malformedTeamContext = {
      ...managedTeamContext,
      members: managedTeamContext.members.map((member) =>
        member.memberName === "BuildSquad"
          ? { ...member, teamDefinitionId: "", ingress: null }
          : member,
      ),
    };

    expect(() =>
      buildTaskDelegationToolContextFromNativeContext({
        config: { name: "program_manager" },
        customData: { teamContext: malformedTeamContext as any },
      }),
    ).toThrow(/members\[1\]\.teamDefinitionId/);
  });

  it("rejects an agent_team row missing ingress identity", () => {
    const managedTeamContext = buildAutoByteusManagedTeamContext(createContextWithBuildSquad());
    const malformedTeamContext = {
      ...managedTeamContext,
      members: managedTeamContext.members.map((member) =>
        member.memberName === "BuildSquad"
          ? { ...member, ingress: null }
          : member,
      ),
    };

    expect(() =>
      buildTaskDelegationToolContextFromNativeContext({
        config: { name: "program_manager" },
        customData: { teamContext: malformedTeamContext as any },
      }),
    ).toThrow(/members\[1\]\.ingress/);
  });
});
