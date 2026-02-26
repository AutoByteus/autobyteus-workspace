import { describe, expect, it } from "vitest";
import type { AgentTeamDefinition as PrismaAgentTeamDefinition } from "@prisma/client";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { PrismaAgentTeamDefinitionConverter } from "../../../src/agent-team-definition/converters/prisma-converter.js";

describe("PrismaAgentTeamDefinitionConverter", () => {
  it("ignores legacy placement hints from persisted JSON", () => {
    const prismaRecord = {
      id: 42,
      name: "Dist Team",
      description: "Distributed team",
      role: "orchestrator",
      avatarUrl: null,
      coordinatorMemberName: "leader",
      syncId: null,
      syncRevision: null,
      nodes: JSON.stringify([
        {
          member_name: "leader",
          reference_id: "agent-1",
          reference_type: "AGENT",
          home_node_id: "embedded-local",
          required_node_id: "embedded-local",
          preferred_node_id: "remote-node-1",
        },
        {
          member_name: "helper",
          reference_id: "agent-2",
          reference_type: "AGENT",
        },
      ]),
    } satisfies PrismaAgentTeamDefinition;

    const domain = PrismaAgentTeamDefinitionConverter.toDomain(prismaRecord);

    expect(domain.nodes[0]?.homeNodeId).toBe("embedded-local");
    expect(domain.nodes[1]?.homeNodeId).toBe("embedded-local");
  });

  it("serializes only ownership node metadata to snake_case JSON payload", () => {
    const definition = new AgentTeamDefinition({
      name: "Dist Team",
      description: "Distributed team",
      role: "orchestrator",
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
          homeNodeId: "node-worker-1",
        }),
      ],
    });

    const createInput = PrismaAgentTeamDefinitionConverter.toCreateInput(definition);
    const parsedNodes = JSON.parse(createInput.nodes as string) as Array<Record<string, unknown>>;

    expect(parsedNodes[0]?.home_node_id).toBe("embedded-local");
    expect(parsedNodes[0]).not.toHaveProperty("required_node_id");
    expect(parsedNodes[0]).not.toHaveProperty("preferred_node_id");
    expect(parsedNodes[1]?.home_node_id).toBe("node-worker-1");
    expect(parsedNodes[1]).not.toHaveProperty("required_node_id");
    expect(parsedNodes[1]).not.toHaveProperty("preferred_node_id");
  });
});
