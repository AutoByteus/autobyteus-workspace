import { describe, expect, it, vi } from "vitest";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { MemberTeamContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";

const buildBuilder = (definition: { name?: string; instructions?: string } = {}) =>
  new MemberTeamContextBuilder({
    getDefinitionById: vi.fn().mockResolvedValue(definition),
  } as never);

describe("MemberTeamContextBuilder", () => {
  it("builds one root-canonical collaboration binding and filters outgoing handoffs", async () => {
    const deliverInterAgentMessage = vi.fn().mockResolvedValue({ accepted: true });
    const effectiveHandoffs = [
      {
        from: "/product_manager",
        to: "/research_team",
        rules: ["When research is needed."],
      },
      {
        from: "/research_team/research_lead",
        to: "/product_manager",
        rules: ["When research is ready."],
      },
    ];

    const result = await buildBuilder({
      name: "Product Team",
      instructions: "Coordinate carefully.",
    }).build({
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      teamBackendKind: TeamBackendKind.MIXED,
      currentMemberName: "product_manager",
      currentMemberPath: ["product_manager"],
      currentMemberRouteKey: "product_manager",
      currentMemberRunId: "run-product-manager",
      collaborationRootTeamRunId: "team-1",
      teamMountPath: [],
      effectiveHandoffs,
      deliverInterAgentMessage,
    });

    expect(result.teamName).toBe("Product Team");
    expect(result.teamInstruction).toBe("Coordinate carefully.");
    expect(result.collaboration.addressing).toEqual({
      rootTeamRunId: "team-1",
      memberAddress: "/product_manager",
      memberPath: ["product_manager"],
      immediateTeamAddress: "/",
      immediateTeamPath: [],
    });
    expect(result.collaboration.outgoingHandoffs).toEqual([effectiveHandoffs[0]]);
    expect(result.collaboration.deliverInterAgentMessage).toBe(deliverInterAgentMessage);
    expect(result.sendMessageToEnabled).toBe(true);
    expect(result.tokenUsageExecutionScope).toEqual({
      rootTeamRunId: "team-1",
      teamScopeAddress: { segments: [] },
      currentRunAddress: { segments: [{ kind: "member", memberRouteKey: "product_manager" }] },
    });
    expect(Object.isFrozen(result.collaboration.addressing)).toBe(true);
    expect(Object.isFrozen(result.collaboration.outgoingHandoffs)).toBe(true);
  });

  it("rebases a child-local member path under its collaboration mount", async () => {
    const result = await buildBuilder({ name: "Field Team" }).build({
      teamRunId: "field-team-run",
      teamDefinitionId: "field-team-def",
      teamBackendKind: TeamBackendKind.MIXED,
      currentMemberName: "interviewer",
      currentMemberPath: ["interviewer"],
      currentMemberRouteKey: "interviewer",
      currentMemberRunId: "run-interviewer",
      coordinatorMemberRouteKey: "field_lead",
      collaborationRootTeamRunId: "root-run",
      teamMountPath: ["research_team", "field_team"],
      effectiveHandoffs: [{
        from: "/research_team/field_team/interviewer",
        to: "/research_team/research_lead",
        rules: ["When the report is ready."],
      }],
    });

    expect(result.memberPath).toEqual(["interviewer"]);
    expect(result.collaboration.addressing).toEqual({
      rootTeamRunId: "root-run",
      memberAddress: "/research_team/field_team/interviewer",
      memberPath: ["research_team", "field_team", "interviewer"],
      immediateTeamAddress: "/research_team/field_team",
      immediateTeamPath: ["research_team", "field_team"],
    });
    expect(result.collaboration.outgoingHandoffs).toHaveLength(1);
    expect(result.sendMessageToEnabled).toBe(false);
  });

  it("keeps delivery enabled for an Agent with no configured outgoing handoffs", async () => {
    const deliverInterAgentMessage = vi.fn();
    const result = await buildBuilder().build({
      teamRunId: "team-solo",
      teamDefinitionId: "team-def-solo",
      teamBackendKind: TeamBackendKind.MIXED,
      currentMemberName: "solo",
      currentMemberRouteKey: "solo",
      currentMemberRunId: "run-solo",
      collaborationRootTeamRunId: "team-solo",
      effectiveHandoffs: [],
      deliverInterAgentMessage,
    });

    expect(result.collaboration.outgoingHandoffs).toEqual([]);
    expect(result.collaboration.deliverInterAgentMessage).toBe(deliverInterAgentMessage);
    expect(result.sendMessageToEnabled).toBe(true);
  });

  it("clones address and handoff arrays so later source mutation cannot change the binding", async () => {
    const currentMemberPath = ["research_lead"];
    const teamMountPath = ["research_team"];
    const rules = ["When field research is required."];
    const handoffs = [{
      from: "/research_team/research_lead",
      to: "/research_team/field_team",
      rules,
    }];
    const result = await buildBuilder().build({
      teamRunId: "research-run",
      teamDefinitionId: "research-def",
      teamBackendKind: TeamBackendKind.MIXED,
      currentMemberName: "research_lead",
      currentMemberPath,
      currentMemberRouteKey: "research_lead",
      currentMemberRunId: "run-research-lead",
      collaborationRootTeamRunId: "root-run",
      teamMountPath,
      effectiveHandoffs: handoffs,
    });

    currentMemberPath[0] = "mutated";
    teamMountPath[0] = "mutated";
    rules[0] = "mutated";
    handoffs[0]!.to = "/mutated";

    expect(result.collaboration.addressing.memberAddress).toBe("/research_team/research_lead");
    expect(result.collaboration.outgoingHandoffs).toEqual([{
      from: "/research_team/research_lead",
      to: "/research_team/field_team",
      rules: ["When field research is required."],
    }]);
  });
});
