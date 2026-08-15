import { describe, expect, it, vi } from "vitest";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode, TeamRunConfig, TeamRunNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { MemberTeamContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testAgentTeamNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const buildBuilder = (definitions: Record<string, { name?: string; instructions?: string }> = {}) =>
  new MemberTeamContextBuilder({
    getDefinitionById: vi.fn(async (id: string) => definitions[id] ?? null),
  } as never);

const findTeam = (root: TeamRunAgentTeamNode, address: string): TeamRunAgentTeamNode => {
  if (root.address === address) return root;
  const visit = (node: TeamRunNode): TeamRunAgentTeamNode | null => {
    if (node.kind === "agent") return null;
    if (node.address === address) return node;
    for (const child of node.children) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  const found = visit(root);
  if (!found) throw new Error(`missing Team node '${address}'`);
  return found;
};

const buildContext = (input: {
  config: TeamRunConfig;
  teamRunId: string;
  teamAddress: string;
  agentNode: TeamRunAgentNode;
}) => new TeamRunContext({
  rootTeamRunId: input.config.rootTeam.teamRunId,
  teamRunId: input.teamRunId,
  teamBackendKind: TeamBackendKind.MIXED,
  teamNode: findTeam(input.config.rootTeam, input.teamAddress),
  handoffs: input.config.handoffs,
  runtimeContext: new MixedTeamRunContext({
    memberContexts: [new MixedAgentMemberContext({
      address: input.agentNode.address,
      agentRunId: input.agentNode.agentRunId,
      runtimeKind: input.agentNode.runtimeKind,
      platformAgentRunId: null,
    })],
  }),
});

describe("MemberTeamContextBuilder", () => {
  it("builds one root-canonical execution identity and filters outgoing handoffs", async () => {
    const deliverInterAgentMessage = vi.fn().mockResolvedValue({ accepted: true });
    const productManager = testAgentNode("/product_manager", { agentRunId: "run-product-manager" });
    const researchLead = testAgentNode("/research_team/research_lead", { agentRunId: "run-research-lead" });
    const effectiveHandoffs = [
      { from: "/product_manager", to: "/research_team", rules: ["When research is needed."] },
      { from: "/research_team/research_lead", to: "/product_manager", rules: ["When research is ready."] },
    ];
    const config = testTeamRunConfig({
      rootTeamRunId: "team-1",
      rootTeamDefinitionId: "team-def-1",
      coordinatorAddress: "/product_manager",
      handoffs: effectiveHandoffs,
      children: [
        productManager,
        testAgentTeamNode({
          address: "/research_team",
          coordinatorAddress: "/research_team/research_lead",
          teamDefinitionId: "research-def",
          teamRunId: "research-run",
          children: [researchLead],
        }),
      ],
    });

    const result = await buildBuilder({
      "team-def-1": { name: "Product Team", instructions: "Coordinate carefully." },
    }).build({
      teamContext: buildContext({ config, teamRunId: "team-1", teamAddress: "/", agentNode: productManager }),
      agentNode: productManager,
      deliverInterAgentMessage,
    });

    expect(result.authoredTeamInstruction).toBe("Coordinate carefully.");
    expect(result.identity).toEqual({
      rootTeamRunId: "team-1",
      memberAddress: "/product_manager",
      agentRunId: "run-product-manager",
    });
    expect(result.collaboration.outgoingHandoffs).toEqual([effectiveHandoffs[0]]);
    expect(result.collaboration.deliverInterAgentMessage).toBe(deliverInterAgentMessage);
    expect(Object.isFrozen(result.identity)).toBe(true);
    expect(Object.keys(result.identity).sort()).toEqual(["agentRunId", "memberAddress", "rootTeamRunId"]);
    expect(Object.isFrozen(result.collaboration.outgoingHandoffs)).toBe(true);
    expect(result).not.toHaveProperty("executionAddress");
  });

  it("uses the exact root-visible child address with the local AgentRun ID", async () => {
    const interviewer = testAgentNode("/research_team/field_team/interviewer", {
      agentRunId: "run-interviewer",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    });
    const fieldTeam = testAgentTeamNode({
      address: "/research_team/field_team",
      coordinatorAddress: interviewer.address,
      teamDefinitionId: "field-team-def",
      teamRunId: "field-team-run",
      children: [interviewer],
    });
    const researchLead = testAgentNode("/research_team/research_lead");
    const config = testTeamRunConfig({
      rootTeamRunId: "root-run",
      coordinatorAddress: "/root_lead",
      handoffs: [{ from: interviewer.address, to: researchLead.address, rules: ["When the report is ready."] }],
      children: [
        testAgentNode("/root_lead"),
        testAgentTeamNode({
          address: "/research_team",
          coordinatorAddress: researchLead.address,
          teamRunId: "research-run",
          children: [researchLead, fieldTeam],
        }),
      ],
    });

    const result = await buildBuilder({ "field-team-def": { name: "Field Team" } }).build({
      teamContext: buildContext({ config, teamRunId: "field-team-run", teamAddress: "/research_team/field_team", agentNode: interviewer }),
      agentNode: interviewer,
    });

    expect(result.identity).toEqual({
      rootTeamRunId: "root-run",
      memberAddress: "/research_team/field_team/interviewer",
      agentRunId: "run-interviewer",
    });
    expect(result.collaboration.outgoingHandoffs).toHaveLength(1);
    expect(result.collaboration.deliverInterAgentMessage).toBeNull();
  });

  it("keeps delivery enabled with no configured outgoing handoffs", async () => {
    const solo = testAgentNode("/solo", { agentRunId: "run-solo" });
    const config = testTeamRunConfig({ rootTeamRunId: "team-solo", coordinatorAddress: solo.address, children: [solo] });
    const deliverInterAgentMessage = vi.fn();
    const result = await buildBuilder().build({
      teamContext: buildContext({ config, teamRunId: "team-solo", teamAddress: "/", agentNode: solo }),
      agentNode: solo,
      deliverInterAgentMessage,
    });

    expect(result.collaboration.outgoingHandoffs).toEqual([]);
    expect(result.collaboration.deliverInterAgentMessage).toBe(deliverInterAgentMessage);
  });

  it("keeps cloned identity and handoffs unchanged after source mutation", async () => {
    const researchLead = testAgentNode("/research_team/research_lead", { agentRunId: "run-research-lead" });
    const fieldLead = testAgentNode("/research_team/field_team/field_lead");
    const rules = ["When field research is required."];
    const handoffs = [{ from: researchLead.address, to: "/research_team/field_team", rules }];
    const config = testTeamRunConfig({
      rootTeamRunId: "root-run",
      coordinatorAddress: "/root_lead",
      handoffs,
      children: [
        testAgentNode("/root_lead"),
        testAgentTeamNode({
          address: "/research_team",
          coordinatorAddress: researchLead.address,
          teamDefinitionId: "research-def",
          teamRunId: "research-run",
          children: [
            researchLead,
            testAgentTeamNode({
              address: "/research_team/field_team",
              coordinatorAddress: fieldLead.address,
              children: [fieldLead],
            }),
          ],
        }),
      ],
    });
    const result = await buildBuilder().build({
      teamContext: buildContext({ config, teamRunId: "research-run", teamAddress: "/research_team", agentNode: researchLead }),
      agentNode: researchLead,
    });

    rules[0] = "mutated";
    handoffs[0]!.to = "/mutated";

    expect(result.identity.memberAddress).toBe("/research_team/research_lead");
    expect(result.collaboration.outgoingHandoffs).toEqual([{
      from: "/research_team/research_lead",
      to: "/research_team/field_team",
      rules: ["When field research is required."],
    }]);
  });
});
