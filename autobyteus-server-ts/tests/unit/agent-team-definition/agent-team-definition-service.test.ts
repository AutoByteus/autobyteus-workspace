import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgentTeamDefinition,
  AgentTeamDefinitionUpdate,
  TeamMember,
} from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";

const agent = (memberName: string, ref = `agent-${memberName}`) => new TeamMember({
  memberName,
  ref,
  refScope: "shared",
});

const definition = (input: {
  id?: string | null;
  revision?: string | null;
  handoffs?: AgentTeamDefinition["handoffs"];
} = {}) => new AgentTeamDefinition({
  id: input.id,
  revision: input.revision,
  name: "Delivery Team",
  description: "Ships approved work.",
  instructions: "Coordinate carefully.",
  category: "coordination",
  nodes: [agent("coordinator"), agent("reviewer")],
  coordinatorMemberName: "coordinator",
  handoffs: input.handoffs ?? [{ from: "/coordinator", to: "/reviewer", rules: ["Review ready work."] }],
  defaultLaunchConfig: {
    runtimeKind: "autobyteus",
    llmModelIdentifier: "gpt-5.4-mini",
    llmConfig: { reasoning_effort: "medium" },
  },
});

describe("AgentTeamDefinitionService flat Team authority", () => {
  let stored: AgentTeamDefinition | null;
  let provider: {
    create: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    getTemplates: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let agents: { getAgentDefinitionById: ReturnType<typeof vi.fn>; getFreshAgentDefinitionById: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    stored = definition({ id: "team-1", revision: "rev-1" });
    provider = {
      create: vi.fn(async (candidate: AgentTeamDefinition) => definition({ id: "team-created", revision: "rev-created", handoffs: candidate.handoffs })),
      getById: vi.fn(async (id: string) => id === stored?.id ? stored : null),
      getAll: vi.fn(async () => stored ? [stored] : []),
      getTemplates: vi.fn(async () => []),
      update: vi.fn(async (candidate: AgentTeamDefinition) => {
        stored = new AgentTeamDefinition({ ...candidate, revision: "rev-2" });
        return stored;
      }),
      delete: vi.fn(async () => { stored = null; return true; }),
    };
    const lookup = vi.fn(async (id: string) => id.startsWith("agent-") ? { id } : null);
    agents = { getAgentDefinitionById: lookup, getFreshAgentDefinitionById: lookup };
  });

  const service = () => new AgentTeamDefinitionService({ provider, agentDefinitionService: agents });

  it("creates an Agent-only Team after validating every referenced Agent", async () => {
    const candidate = definition();
    const created = await service().createDefinition(candidate);

    expect(provider.create).toHaveBeenCalledWith(candidate);
    expect(agents.getFreshAgentDefinitionById).toHaveBeenCalledWith("agent-coordinator");
    expect(agents.getFreshAgentDefinitionById).toHaveBeenCalledWith("agent-reviewer");
    expect(created.id).toBe("team-created");
  });

  it("rejects create with an existing id, missing Agent, or invalid coordinator", async () => {
    await expect(service().createDefinition(definition({ id: "existing" })))
      .rejects.toThrow("already has an ID");

    const missing = definition();
    missing.nodes[1]!.ref = "missing";
    await expect(service().createDefinition(missing)).rejects.toThrow("references missing agent");

    const invalidCoordinator = definition();
    invalidCoordinator.coordinatorMemberName = "missing";
    await expect(service().createDefinition(invalidCoordinator)).rejects.toThrow("Coordinator member name");
    expect(provider.create).not.toHaveBeenCalled();
  });

  it("reads current definitions, lists the catalog, and returns null for a miss", async () => {
    const current = await service().getDefinitionById("team-1");
    expect(current).toBe(stored);
    expect(await service().getDefinitionById("missing")).toBeNull();
    expect(await service().getAllDefinitions()).toEqual([stored]);
  });

  it("requires compare-and-swap revision evidence before update", async () => {
    await expect(service().updateDefinition("team-1", new AgentTeamDefinitionUpdate({
      description: "Changed.",
    }))).rejects.toThrow("expectedRevision is required");

    await expect(service().updateDefinition("team-1", new AgentTeamDefinitionUpdate({
      description: "Changed.",
      expectedRevision: "stale",
    }))).rejects.toMatchObject({ code: "DEFINITION_REVISION_CONFLICT" });
    expect(provider.update).not.toHaveBeenCalled();
  });

  it("atomically validates, persists, and detaches a valid update", async () => {
    const previous = stored!;
    const handoffs = [{ from: "/reviewer", to: "/coordinator", rules: ["First.", "Second."] }];
    const updated = await service().updateDefinition("team-1", new AgentTeamDefinitionUpdate({
      description: "Updated description.",
      handoffs,
      expectedRevision: "rev-1",
    }));

    expect(updated.description).toBe("Updated description.");
    expect(updated.handoffs).toEqual(handoffs);
    expect(updated.revision).toBe("rev-2");
    expect(previous.description).toBe("Ships approved work.");
    expect(previous.handoffs).not.toEqual(handoffs);
    expect(provider.update).toHaveBeenCalledOnce();
  });

  it("preserves handoff/rule order and rejects invalid endpoints before persistence", async () => {
    const before = structuredClone(stored);
    await expect(service().updateDefinition("team-1", new AgentTeamDefinitionUpdate({
      handoffs: [{ from: "/coordinator", to: "/missing", rules: ["Do not persist."] }],
      expectedRevision: "rev-1",
    }))).rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND" });

    expect(provider.update).not.toHaveBeenCalled();
    expect(stored).toEqual(before);
  });

  it("clears explicit launch defaults and preserves them when omitted", async () => {
    const cleared = await service().updateDefinition("team-1", new AgentTeamDefinitionUpdate({
      defaultLaunchConfig: null,
      expectedRevision: "rev-1",
    }));
    expect(cleared.defaultLaunchConfig).toBeNull();

    const preserved = await service().updateDefinition("team-1", new AgentTeamDefinitionUpdate({
      description: "Updated again.",
      expectedRevision: "rev-2",
    }));
    expect(preserved.defaultLaunchConfig).toBeNull();
  });

  it("deletes only an existing shared Team", async () => {
    await expect(service().deleteDefinition("missing")).rejects.toThrow("not found");
    await expect(service().deleteDefinition("team-1")).resolves.toBe(true);
    expect(provider.delete).toHaveBeenCalledWith("team-1");
  });

  it("rejects deletion of Org-owned and application-owned Team definitions", async () => {
    for (const ownershipScope of ["agent_org_owned", "application_owned"] as const) {
      stored = definition({ id: "team-1", revision: "rev-1" });
      stored.ownershipScope = ownershipScope;
      await expect(service().deleteDefinition("team-1")).rejects.toThrow("not supported");
    }
    expect(provider.delete).not.toHaveBeenCalled();
  });
});
