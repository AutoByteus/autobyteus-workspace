import { describe, expect, it } from "vitest";
import { SqlAgentTeamDefinitionRepository } from "../../../src/agent-team-definition/repositories/sql/agent-team-definition-repository.js";

const buildNodesPayload = () =>
  JSON.stringify([
    {
      member_name: "member1",
      reference_id: "agent1",
      reference_type: "AGENT",
    },
  ]);

const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe("SqlAgentTeamDefinitionRepository", () => {
  it("creates and finds agent team definitions", async () => {
    const repo = new SqlAgentTeamDefinitionRepository();
    const created = await repo.createDefinition({
      name: uniqueName("SQL Agent Team"),
      description: "Test",
      role: "Tester",
      nodes: buildNodesPayload(),
      coordinatorMemberName: "member1",
    });

    expect(created.id).toBeDefined();
    expect(created.description).toBe("Test");

    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe(created.name);
    const nodes = JSON.parse(found?.nodes ?? "[]") as Array<{ member_name?: string }>;
    expect(nodes[0]?.member_name).toBe("member1");
  });

  it("updates agent team definitions", async () => {
    const repo = new SqlAgentTeamDefinitionRepository();
    const created = await repo.createDefinition({
      name: uniqueName("Update SQL Team"),
      description: "Original",
      nodes: buildNodesPayload(),
      coordinatorMemberName: "member1",
    });

    const updated = await repo.updateDefinition({
      id: created.id,
      data: { description: "Updated" },
    });

    expect(updated.description).toBe("Updated");
  });

  it("deletes agent team definitions", async () => {
    const repo = new SqlAgentTeamDefinitionRepository();
    const created = await repo.createDefinition({
      name: uniqueName("Delete SQL Team"),
      description: "To delete",
      nodes: buildNodesPayload(),
      coordinatorMemberName: "member1",
    });

    const deleted = await repo.deleteById(created.id);
    expect(deleted).toBe(true);

    const found = await repo.findById(created.id);
    expect(found).toBeNull();
  });
});
