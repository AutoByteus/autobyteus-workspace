import { describe, expect, it } from "vitest";
import { resolveMemberCollaborationScope } from "../../../../src/agent-collaboration/execution/domain/member-instance-scope.js";
import type { AgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";

const a = (value: string) => value as AgentTeamAddress;
const teamRoot = {
  configuredRootAddresses: ["/coordinator"],
  configuredRootAgentRunIds: ["run-coordinator"],
  configuredRootRole: "team_member" as const,
  handoffs: [{ from: "/coordinator", to: "/writer", rules: ["Root rule."] }],
  definition: { kind: "agent_team" as const, definitionId: "root-team" },
};
const orgRoot = {
  configuredRootAddresses: ["/project_task_manager"],
  configuredRootAgentRunIds: ["run-ptm"],
  configuredRootRole: "org_agent" as const,
  handoffs: [{ from: "/project_task_manager", to: "/team/lead", rules: ["Org rule."] }],
  definition: { kind: "agent_org" as const, definitionId: "org" },
};
const copy = {
  address: "/product_team", teamDefinitionId: "product-team",
  handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["Copy rule."] }],
};

describe("resolveMemberCollaborationScope (CR-001, collaboration role)", () => {
  it("1. a member of its non-root hosting Team instance is a team member with that instance's handoffs and Team instruction", () => {
    expect(resolveMemberCollaborationScope({ memberAddress: a("/product_team/lead"), agentRunId: "run-lead", hostTeam: copy, root: teamRoot })).toEqual({
      outgoingHandoffs: copy.handoffs, instructionDefinition: { kind: "agent_team", definitionId: "product-team" }, role: "team_member",
    });
    expect(resolveMemberCollaborationScope({ memberAddress: a("/product_team/designer"), agentRunId: "run-designer", hostTeam: copy, root: orgRoot }))
      .toEqual({ outgoingHandoffs: [], instructionDefinition: { kind: "agent_team", definitionId: "product-team" }, role: "team_member" });
  });

  it("2. a configured root agent gets the root scope: a team member in a Team root, an organization agent in an Org root", () => {
    expect(resolveMemberCollaborationScope({ memberAddress: a("/coordinator"), agentRunId: "run-coordinator", root: teamRoot }))
      .toEqual({ outgoingHandoffs: teamRoot.handoffs, instructionDefinition: teamRoot.definition, role: "team_member" });
    expect(resolveMemberCollaborationScope({ memberAddress: a("/coordinator"), agentRunId: "run-coordinator",
      hostTeam: { address: "/", teamDefinitionId: "root-team", handoffs: [] }, root: teamRoot }))
      .toEqual({ outgoingHandoffs: teamRoot.handoffs, instructionDefinition: teamRoot.definition, role: "team_member" });
    expect(resolveMemberCollaborationScope({ memberAddress: a("/project_task_manager"), agentRunId: "run-ptm", root: orgRoot }))
      .toEqual({ outgoingHandoffs: orgRoot.handoffs, instructionDefinition: orgRoot.definition, role: "org_agent" });
  });

  it("2b. a task agent at a configured address is a task agent that keeps the root's handoffs and instruction", () => {
    expect(resolveMemberCollaborationScope({ memberAddress: a("/coordinator"), agentRunId: "run-task-agent", root: teamRoot }))
      .toEqual({ outgoingHandoffs: teamRoot.handoffs, instructionDefinition: teamRoot.definition, role: "task_agent" });
    expect(resolveMemberCollaborationScope({ memberAddress: a("/project_task_manager"), agentRunId: "run-task-agent", root: orgRoot }))
      .toEqual({ outgoingHandoffs: orgRoot.handoffs, instructionDefinition: orgRoot.definition, role: "task_agent" });
  });

  it("3. anything else is a task agent with no handoffs and no instruction", () => {
    const none = { outgoingHandoffs: [], instructionDefinition: null, role: "task_agent" };
    // A catalog Agent copy at root level, in a Team root.
    expect(resolveMemberCollaborationScope({ memberAddress: a("/code_reviewer"), agentRunId: "run-copy",
      hostTeam: { address: "/", teamDefinitionId: "root-team", handoffs: teamRoot.handoffs }, root: teamRoot })).toEqual(none);
    // A copy hosted by a Team it is not a member of.
    expect(resolveMemberCollaborationScope({ memberAddress: a("/code_reviewer"), agentRunId: "run-copy", hostTeam: copy, root: teamRoot })).toEqual(none);
    // An Agent-root child outside any Team instance.
    expect(resolveMemberCollaborationScope({ memberAddress: a("/writer"), agentRunId: "run-child",
      root: { configuredRootAddresses: [], configuredRootAgentRunIds: [], configuredRootRole: "team_member", handoffs: [], definition: null } })).toEqual(none);
  });
});
