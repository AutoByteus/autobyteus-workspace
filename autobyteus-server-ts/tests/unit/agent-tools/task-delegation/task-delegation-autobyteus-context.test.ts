import { describe, expect, it } from "vitest";
import { buildAutoByteusManagedTeamContext } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-managed-team-context-builder.js";
import { MemberTeamContext } from "../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { buildTaskDelegationToolContextFromNativeContext } from "../../../../src/agent-tools/task-delegation/task-delegation-autobyteus-context.js";

const createContext = () => new MemberTeamContext({
  teamRunId: "delivery-team-run-1",
  teamDefinitionId: "delivery-team-def",
  teamName: "Delivery Team",
  teamBackendKind: TeamBackendKind.MIXED,
  memberName: "program_manager",
  memberPath: ["program_manager"],
  memberRouteKey: "program_manager",
  memberRunId: "run-program-manager",
  coordinatorMemberRouteKey: "program_manager",
  collaboration: {
    addressing: {
      rootTeamRunId: "delivery-team-run-1",
      memberAddress: "/program_manager",
      memberPath: ["program_manager"],
      immediateTeamAddress: "/",
      immediateTeamPath: [],
    },
  },
});

describe("buildTaskDelegationToolContextFromNativeContext", () => {
  it("projects only primitive caller addressing without a parallel member roster", () => {
    const managed = buildAutoByteusManagedTeamContext(createContext());

    expect(managed).toEqual(expect.objectContaining({
      teamRunId: "delivery-team-run-1",
      currentMemberName: "program_manager",
      currentMemberPath: ["program_manager"],
      currentMemberRouteKey: "program_manager",
      addressing: {
        rootTeamRunId: "delivery-team-run-1",
        memberAddress: "/program_manager",
        memberPath: ["program_manager"],
        immediateTeamAddress: "/",
        immediateTeamPath: [],
      },
    }));
    expect(managed).not.toHaveProperty("members");
    expect(managed).not.toHaveProperty("allowedRecipientNames");

    expect(buildTaskDelegationToolContextFromNativeContext({
      config: { name: "program_manager" },
      customData: { teamContext: managed },
    })).toEqual(expect.objectContaining({
      teamRunId: "delivery-team-run-1",
      caller: expect.objectContaining({
        memberName: "program_manager",
        memberRouteKey: "program_manager",
        logicalAddress: "/program_manager",
      }),
      addressing: expect.objectContaining({
        memberAddress: "/program_manager",
        immediateTeamAddress: "/",
      }),
    }));
  });

  it("clones addressing rather than exposing the MemberTeamContext arrays", () => {
    const source = createContext();
    const managed = buildAutoByteusManagedTeamContext(source);

    expect(() => {
      managed.addressing.memberPath[0] = "mutated";
    }).toThrow(/read only property/);
    expect(source.collaboration.addressing.memberPath).toEqual(["program_manager"]);
  });

  it("rejects a native context without collaboration addressing", () => {
    expect(() => buildTaskDelegationToolContextFromNativeContext({
      config: { name: "program_manager" },
      customData: { teamContext: {
        teamRunId: "delivery-team-run-1",
        currentMemberName: "program_manager",
        currentMemberPath: ["program_manager"],
        currentMemberRouteKey: "program_manager",
        currentMemberRunId: "run-program-manager",
      } },
    })).toThrow(/active Team collaboration context/);
  });

  it("rejects inconsistent member and immediate-Team addressing", () => {
    const managed = buildAutoByteusManagedTeamContext(createContext());
    expect(() => buildTaskDelegationToolContextFromNativeContext({
      customData: { teamContext: {
        ...managed,
        addressing: {
          ...managed.addressing,
          memberPath: ["nested", "program_manager"],
          immediateTeamPath: [],
        },
      } },
    })).toThrow(/direct child of its immediate Team path/);
  });
});
