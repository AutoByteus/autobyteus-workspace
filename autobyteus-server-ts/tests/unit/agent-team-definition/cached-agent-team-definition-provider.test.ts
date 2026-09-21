import { beforeEach, describe, expect, it, vi } from "vitest";
import { CachedAgentTeamDefinitionProvider } from "../../../src/agent-team-definition/providers/cached-agent-team-definition-provider.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";

describe("CachedAgentTeamDefinitionProvider", () => {
  let persistenceProvider: {
    getAll: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const sampleDefs = [
    new AgentTeamDefinition({
      id: "1",
      name: "Team1",
      description: "Desc1",
      instructions: "Coordinate.",
      nodes: [
        new TeamMember({
          memberName: "coord1",
          ref: "agent1",
          refScope: "shared",
        }),
      ],
      coordinatorMemberName: "coord1",
    }),
    new AgentTeamDefinition({
      id: "2",
      name: "Team2",
      description: "Desc2",
      instructions: "Coordinate.",
      nodes: [
        new TeamMember({
          memberName: "coord2",
          ref: "agent2",
          refScope: "shared",
        }),
      ],
      coordinatorMemberName: "coord2",
    }),
  ];

  beforeEach(() => {
    persistenceProvider = {
      getAll: vi.fn(async () => sampleDefs),
      create: vi.fn(async (definition: AgentTeamDefinition) => definition),
      update: vi.fn(async (definition: AgentTeamDefinition) => definition),
      delete: vi.fn(async () => true),
    };
  });

  it("populates cache on first getAll and reuses it", async () => {
    const provider = new CachedAgentTeamDefinitionProvider(persistenceProvider as never);

    const result1 = await provider.getAll();
    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
    expect(result1).toEqual(sampleDefs);

    const result2 = await provider.getById("1");
    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
    expect(result2?.id).toBe("1");
  });

  it("populates cache on first getById", async () => {
    const provider = new CachedAgentTeamDefinitionProvider(persistenceProvider as never);

    const result = await provider.getById("1");
    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
    expect(result?.name).toBe("Team1");

    await provider.getById("2");
    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
  });

  it("returns null for missing id", async () => {
    const provider = new CachedAgentTeamDefinitionProvider(persistenceProvider as never);

    await provider.getAll();
    const result = await provider.getById("999");

    expect(result).toBeNull();
    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
  });

  it("updates cache on create", async () => {
    const provider = new CachedAgentTeamDefinitionProvider(persistenceProvider as never);
    await provider.getAll();

    const newDef = new AgentTeamDefinition({
      id: "3",
      name: "New Team",
      description: "New",
      instructions: "Coordinate.",
      nodes: [new TeamMember({ memberName: "coord3", ref: "agent3", refScope: "shared" })],
      coordinatorMemberName: "coord3",
    });
    persistenceProvider.create.mockResolvedValue(newDef);

    await provider.create(newDef);
    const updated = await provider.getAll();

    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
    expect(updated).toHaveLength(3);
    expect(updated.find((item) => item.id === "3")).toBeTruthy();
  });

  it("updates cache on update", async () => {
    const provider = new CachedAgentTeamDefinitionProvider(persistenceProvider as never);
    await provider.getAll();

    const updatedDef = new AgentTeamDefinition({
      id: "1",
      name: "Updated",
      description: "Updated Desc",
      instructions: "Coordinate.",
      nodes: [new TeamMember({ memberName: "coord1", ref: "agent1", refScope: "shared" })],
      coordinatorMemberName: "coord1",
    });
    persistenceProvider.update.mockResolvedValue(updatedDef);

    await provider.update(updatedDef);
    const result = await provider.getById("1");

    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
    expect(result?.name).toBe("Updated");
  });

  it("removes items from cache on delete", async () => {
    const provider = new CachedAgentTeamDefinitionProvider(persistenceProvider as never);
    await provider.getAll();

    persistenceProvider.delete.mockResolvedValue(true);

    const success = await provider.delete("1");
    expect(success).toBe(true);

    const list = await provider.getAll();
    expect(list).toHaveLength(1);
    expect(list.find((item) => item.id === "1")).toBeUndefined();

    const missing = await provider.getById("1");
    expect(missing).toBeNull();
  });
  it("reads owned identities without populating catalog, preserves null/error, and retries without negative caching", async () => {
    const id = "agent-org-owned-team:org:squad";
    const getById = vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("read failed")).mockResolvedValue({ ...sampleDefs[0], id, ownershipScope: "agent_org_owned" });
    const provider = new CachedAgentTeamDefinitionProvider({ ...persistenceProvider, getById } as never);
    expect(await provider.getById(id)).toBeNull();
    await expect(provider.getById(id)).rejects.toThrow("read failed");
    expect(await provider.getById(id)).toMatchObject({ id });
    expect(persistenceProvider.getAll).not.toHaveBeenCalled();
    await provider.refresh();
    expect(await provider.getById(id)).toMatchObject({ id });
    expect((await provider.getAll()).map(definition => definition.id)).not.toContain(id);
    expect(getById).toHaveBeenCalledTimes(4);
  });

});
