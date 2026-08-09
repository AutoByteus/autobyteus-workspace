import { describe, expect, it } from "vitest";
import { buildAutoByteusManagedTeamContext } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-managed-team-context-builder.js";
import { buildTaskDelegationToolContextFromNativeContext } from "../../../../src/agent-tools/task-delegation/task-delegation-autobyteus-context.js";
import { testMemberTeamContext } from "../../../fixtures/current-team-run-fixtures.js";

const createContext = () => testMemberTeamContext({
  teamRunId: "delivery-team-run-1",
  rootTeamRunId: "delivery-team-run-1",
  teamDefinitionId: "delivery-team-def",
  teamAddress: "/",
  memberAddress: "/program_manager",
  agentRunId: "run-program-manager",
  coordinatorAddress: "/program_manager",
});

describe("buildTaskDelegationToolContextFromNativeContext", () => {
  it("projects only primitive caller addressing without a parallel member roster", () => {
    const managed = buildAutoByteusManagedTeamContext(createContext());

    expect(managed).toEqual(expect.objectContaining({
      teamRunId: "delivery-team-run-1",
      memberAddress: "/program_manager",
      agentRunId: "run-program-manager",
      executionAddress: {
        rootTeamRunId: "delivery-team-run-1",
        taskTeamRunIds: [],
        memberAddress: "/program_manager",
        taskAgentRunId: null,
      },
      addressing: {
        rootTeamRunId: "delivery-team-run-1",
        memberAddress: "/program_manager",
      },
    }));
    expect(managed).not.toHaveProperty("members");
    expect(managed).not.toHaveProperty("allowedRecipientAddresss");

    expect(buildTaskDelegationToolContextFromNativeContext({
      config: { name: "program_manager" },
      customData: { teamContext: managed },
    })).toEqual(expect.objectContaining({
      teamRunId: "delivery-team-run-1",
      caller: expect.objectContaining({
        agentRunId: "run-program-manager",
        executionAddress: expect.objectContaining({ memberAddress: "/program_manager" }),
      }),
      addressing: expect.objectContaining({
        memberAddress: "/program_manager",
      }),
    }));
    expect(Object.keys(managed.addressing).sort()).toEqual(["memberAddress", "rootTeamRunId"]);
  });

  it("clones and freezes the exact two-field addressing value", () => {
    const source = createContext();
    const managed = buildAutoByteusManagedTeamContext(source);

    expect(managed.addressing).not.toBe(source.collaboration.addressing);
    expect(Object.isFrozen(managed.addressing)).toBe(true);
    expect(() => {
      (managed.addressing as { memberAddress: string }).memberAddress = "/mutated";
    }).toThrow(/read only property/);
    expect(source.collaboration.addressing.memberAddress).toBe("/program_manager");
  });

  it("rejects a native context without collaboration addressing", () => {
    expect(() => buildTaskDelegationToolContextFromNativeContext({
      config: { name: "program_manager" },
      customData: { teamContext: {
        teamRunId: "delivery-team-run-1",
        memberAddress: "/program_manager",
        agentRunId: "run-program-manager",
        executionAddress: {
          rootTeamRunId: "delivery-team-run-1",
          taskTeamRunIds: [],
          memberAddress: "/program_manager",
          taskAgentRunId: null,
        },
      } },
    })).toThrow(/active Team collaboration context/);
  });

  it("rejects removed derived addressing fields instead of accepting a legacy shape", () => {
    const managed = buildAutoByteusManagedTeamContext(createContext());
    expect(() => buildTaskDelegationToolContextFromNativeContext({
      customData: { teamContext: {
        ...managed,
        addressing: {
          ...managed.addressing,
          memberPath: ["nested", "program_manager"],
        },
      } },
    })).toThrow(/accepts only rootTeamRunId and memberAddress/);
  });
});
