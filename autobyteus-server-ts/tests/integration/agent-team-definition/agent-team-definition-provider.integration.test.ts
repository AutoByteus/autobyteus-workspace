import { describe, expect, it } from "vitest";
import { SqlAgentTeamDefinitionProvider } from "../../../src/agent-team-definition/providers/sql-agent-team-definition-provider.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";

const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const buildTeamDefinition = (): AgentTeamDefinition =>
  new AgentTeamDefinition({
    name: uniqueName("Agent Team"),
    description: "A test team",
    role: "Tester",
    nodes: [
      new TeamMember({
        memberName: "coord1",
        referenceId: "agent1",
        referenceType: NodeType.AGENT,
      }),
      new TeamMember({
        memberName: "subteam2",
        referenceId: "sub_team_1",
        referenceType: NodeType.AGENT_TEAM,
      }),
    ],
    coordinatorMemberName: "coord1",
  });

describe("SqlAgentTeamDefinitionProvider", () => {
  it("handles CRUD operations", async () => {
    const provider = new SqlAgentTeamDefinitionProvider();
    const definition = buildTeamDefinition();

    const created = await provider.create(definition);
    expect(created.id).toBeTruthy();
    expect(created.nodes[0]).toBeInstanceOf(TeamMember);

    const retrieved = await provider.getById(created.id ?? "");
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.name).toBe(definition.name);

    retrieved!.description = "Updated Description";
    const updated = await provider.update(retrieved!);
    expect(updated.description).toBe("Updated Description");

    const deleted = await provider.delete(updated.id ?? "");
    expect(deleted).toBe(true);
    const missing = await provider.getById(updated.id ?? "");
    expect(missing).toBeNull();
  });
});
