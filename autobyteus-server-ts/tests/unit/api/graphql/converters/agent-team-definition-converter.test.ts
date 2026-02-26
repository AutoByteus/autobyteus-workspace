import { describe, expect, it } from "vitest";
import { AgentTeamDefinitionConverter } from "../../../../../src/api/graphql/converters/agent-team-definition-converter.js";
import { AgentTeamDefinition, TeamMember } from "../../../../../src/agent-team-definition/domain/models.js";
import { NodeType } from "../../../../../src/agent-team-definition/domain/enums.js";

describe("AgentTeamDefinitionConverter", () => {
  it("maps ownership node metadata to GraphQL fields", () => {
    const domainDefinition = new AgentTeamDefinition({
      id: "7",
      name: "Distributed Team",
      description: "Team with explicit placement",
      coordinatorMemberName: "leader",
      nodes: [
        new TeamMember({
          memberName: "leader",
          referenceId: "agent-1",
          referenceType: NodeType.AGENT,
          homeNodeId: "embedded-local",
        }),
        new TeamMember({
          memberName: "helper",
          referenceId: "agent-2",
          referenceType: NodeType.AGENT,
        }),
      ],
    });

    const graphqlDefinition = AgentTeamDefinitionConverter.toGraphql(domainDefinition);

    expect(graphqlDefinition.nodes[0]?.homeNodeId).toBe("embedded-local");
    expect(graphqlDefinition.nodes[1]?.homeNodeId).toBeNull();
  });
});
