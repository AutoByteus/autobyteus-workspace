import { describe, expect, it } from "vitest";
import { buildAutoByteusManagedTeamContext } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-managed-team-context-builder.js";
import { buildTaskDelegationToolContextFromNativeContext } from "../../../../src/agent-tools/task-delegation/task-delegation-autobyteus-context.js";
import { testMemberTeamContext } from "../../../fixtures/current-team-run-fixtures.js";

const createContext = () => testMemberTeamContext({
  rootTeamRunId: "delivery-team-run-1",
  memberAddress: "/program_manager",
  agentRunId: "run-program-manager",
});

describe("buildTaskDelegationToolContextFromNativeContext", () => {
  it("projects and parses only the exact current execution identity", () => {
    const managed = buildAutoByteusManagedTeamContext(createContext());

    expect(managed).toEqual({
      rootTeamRunId: "delivery-team-run-1",
      memberAddress: "/program_manager",
      agentRunId: "run-program-manager",
    });
    expect(Object.keys(managed).sort()).toEqual(["agentRunId", "memberAddress", "rootTeamRunId"]);
    expect(buildTaskDelegationToolContextFromNativeContext({
      customData: { teamContext: managed },
    })).toEqual({ identity: managed });
  });

  it("clones and freezes the exact identity value", () => {
    const source = createContext();
    const managed = buildAutoByteusManagedTeamContext(source);

    expect(managed).not.toBe(source.identity);
    expect(Object.isFrozen(managed)).toBe(true);
    expect(() => {
      (managed as { memberAddress: string }).memberAddress = "/mutated";
    }).toThrow(/read only property/);
    expect(source.identity.memberAddress).toBe("/program_manager");
  });

  it("rejects a native context without the exact Team execution identity", () => {
    expect(() => buildTaskDelegationToolContextFromNativeContext({
      customData: { teamContext: {
        rootTeamRunId: "delivery-team-run-1",
        memberAddress: "/program_manager",
      } },
    })).toThrow(/rootTeamRunId, memberAddress, and agentRunId/);
  });

  it("rejects removed derived addressing fields instead of accepting a compatibility shape", () => {
    const managed = buildAutoByteusManagedTeamContext(createContext());
    expect(() => buildTaskDelegationToolContextFromNativeContext({
      customData: { teamContext: {
        ...managed,
        memberPath: ["nested", "program_manager"],
      } },
    })).toThrow(/accepts only rootTeamRunId, memberAddress, and agentRunId/);
  });
});
