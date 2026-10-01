import { describe, expect, it } from "vitest";
import { resolveMemberCollaborationScope } from "../../../../src/agent-collaboration/execution/domain/member-instance-scope.js";
import type { AgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";

const a = (value: string) => value as AgentTeamAddress;
const root = {
  configuredRootAddresses: ["/coordinator"],
  handoffs: [{ from: "/coordinator", to: "/writer", rules: ["Root rule."] }],
  definition: { kind: "agent_team" as const, definitionId: "root-team" },
};
const copy = {
  address: "/product_team", teamDefinitionId: "product-team",
  handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["Copy rule."] }],
};

describe("resolveMemberCollaborationScope (CR-001)", () => {
  it("1. a member of its non-root hosting Team instance gets that instance's handoffs and Team instruction", () => {
    expect(resolveMemberCollaborationScope({ memberAddress: a("/product_team/lead"), hostTeam: copy, root })).toEqual({
      outgoingHandoffs: copy.handoffs, instructionDefinition: { kind: "agent_team", definitionId: "product-team" },
    });
    expect(resolveMemberCollaborationScope({ memberAddress: a("/product_team/designer"), hostTeam: copy, root }))
      .toEqual({ outgoingHandoffs: [], instructionDefinition: { kind: "agent_team", definitionId: "product-team" } });
  });

  it("2. a configured root placement (or a copy at its address) gets the root scope, also when hosted by the root TeamRun", () => {
    const expected = { outgoingHandoffs: root.handoffs, instructionDefinition: root.definition };
    expect(resolveMemberCollaborationScope({ memberAddress: a("/coordinator"), root })).toEqual(expected);
    expect(resolveMemberCollaborationScope({ memberAddress: a("/coordinator"), hostTeam: { address: "/", teamDefinitionId: "root-team", handoffs: [] }, root }))
      .toEqual(expected);
  });

  it("3. anything else gets no handoffs and no instruction", () => {
    const none = { outgoingHandoffs: [], instructionDefinition: null };
    // A catalog Agent copy or collaborator Agent at root level, in a Team root.
    expect(resolveMemberCollaborationScope({ memberAddress: a("/code_reviewer"), hostTeam: { address: "/", teamDefinitionId: "root-team", handoffs: root.handoffs }, root })).toEqual(none);
    // A copy hosted by a Team it is not a member of.
    expect(resolveMemberCollaborationScope({ memberAddress: a("/code_reviewer"), hostTeam: copy, root })).toEqual(none);
    // An Agent-root child outside any Team instance.
    expect(resolveMemberCollaborationScope({ memberAddress: a("/writer"), root: { configuredRootAddresses: [], handoffs: [], definition: null } })).toEqual(none);
  });
});
