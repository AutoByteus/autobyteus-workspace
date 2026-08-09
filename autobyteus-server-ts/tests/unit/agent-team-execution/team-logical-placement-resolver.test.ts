import { describe, expect, it } from "vitest";
import { createMemberLogicalAddressContext } from "../../../src/agent-team-execution/domain/member-logical-address-context.js";
import { TeamRecipientResolver } from "../../../src/agent-team-execution/services/team-recipient-resolver.js";
import { TeamRunTreeIndex } from "../../../src/agent-team-execution/services/team-run-tree-index.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const buildIndex = (): TeamRunTreeIndex => {
  const fieldTeam = testAgentTeamNode({
    address: "/research_team/field_team",
    coordinatorAddress: "/research_team/field_team/field_lead",
    children: [
      testAgentNode("/research_team/field_team/field_lead"),
      testAgentNode("/research_team/field_team/team_lead"),
      testAgentNode("/research_team/field_team/interviewer"),
    ],
  });
  const researchTeam = testAgentTeamNode({
    address: "/research_team",
    coordinatorAddress: "/research_team/research_lead",
    children: [
      testAgentNode("/research_team/research_lead"),
      fieldTeam,
    ],
  });
  const designTeam = testAgentTeamNode({
    address: "/design_team",
    coordinatorAddress: "/design_team/team_lead",
    children: [testAgentNode("/design_team/team_lead")],
  });
  const config = testTeamRunConfig({
    rootTeamRunId: "root-run",
    coordinatorAddress: "/product_manager",
    children: [testAgentNode("/product_manager"), researchTeam, designTeam],
  });
  return new TeamRunTreeIndex(config.rootTeam);
};

const rootCaller = createMemberLogicalAddressContext({
  rootTeamRunId: "root-run",
  memberAddress: "/product_manager",
});

const nestedCaller = createMemberLogicalAddressContext({
  rootTeamRunId: "root-run",
  memberAddress: "/research_team/field_team/interviewer",
});

describe("TeamRecipientResolver", () => {
  it("returns identical coordinate-only Agent recipients for relative and absolute expressions", () => {
    const resolver = new TeamRecipientResolver();
    const index = buildIndex();

    const relative = resolver.resolve(index, "./research_team/field_team/interviewer", rootCaller);
    const absolute = resolver.resolve(index, "/research_team/field_team/interviewer", rootCaller);

    expect(relative).toEqual(absolute);
    expect(relative).toEqual({
      kind: "agent",
      address: "/research_team/field_team/interviewer",
    });
    expect(Object.isFrozen(relative)).toBe(true);
    expect(Object.keys(relative).sort()).toEqual(["address", "kind"]);
  });

  it("preserves an AgentTeam subject and its exact configured coordinator", () => {
    const recipient = new TeamRecipientResolver().resolve(
      buildIndex(),
      "./field_team",
      createMemberLogicalAddressContext({
        rootTeamRunId: "root-run",
        memberAddress: "/research_team/research_lead",
      }),
    );

    expect(recipient).toEqual({
      kind: "agent_team",
      address: "/research_team/field_team",
      coordinatorAddress: "/research_team/field_team/field_lead",
    });
    expect(Object.keys(recipient).sort()).toEqual(["address", "coordinatorAddress", "kind"]);
  });

  it("resolves the immediate AgentTeam and collaboration root without synthetic identity", () => {
    const resolver = new TeamRecipientResolver();
    const index = buildIndex();

    expect(resolver.resolve(index, "./", nestedCaller)).toEqual({
      kind: "agent_team",
      address: "/research_team/field_team",
      coordinatorAddress: "/research_team/field_team/field_lead",
    });
    expect(resolver.resolve(index, "/", nestedCaller)).toEqual({
      kind: "agent_team",
      address: "/",
      coordinatorAddress: "/product_manager",
    });
  });

  it("independently resolves duplicate leaf names by canonical address", () => {
    const resolver = new TeamRecipientResolver();
    const index = buildIndex();

    const fieldLead = resolver.resolve(index, "/research_team/field_team/team_lead", nestedCaller);
    const designLead = resolver.resolve(index, "/design_team/team_lead", nestedCaller);

    expect(fieldLead.address).toBe("/research_team/field_team/team_lead");
    expect(designLead.address).toBe("/design_team/team_lead");
    expect(fieldLead).not.toEqual(designLead);
  });

  it.each([
    ["team_lead", "COLLABORATION_ADDRESS_INVALID"],
    ["../team_lead", "COLLABORATION_ADDRESS_INVALID"],
    ["/design_team//team_lead", "COLLABORATION_ADDRESS_INVALID"],
    ["/design_team/", "COLLABORATION_ADDRESS_INVALID"],
    ["/design_team\\team_lead", "COLLABORATION_ADDRESS_INVALID"],
    ["/missing", "COLLABORATION_TARGET_NOT_FOUND"],
    ["/product_manager/child", "COLLABORATION_TRAVERSAL_INVALID"],
  ])("rejects %s with typed code %s", (recipientAddress, code) => {
    expect(() => new TeamRecipientResolver().resolve(
      buildIndex(),
      recipientAddress,
      nestedCaller,
    )).toThrow(expect.objectContaining({ code }));
  });
});
