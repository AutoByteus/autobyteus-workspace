import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentOrgDefinition, AgentOrgMember } from "../../../src/agent-org-definition/domain/agent-org-definition.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { AgentOrgRunService } from "../../../src/agent-org-execution/services/agent-org-run-service.js";
import { RunModelSelectionService } from "../../../src/llm-management/services/run-model-selection-service.js";

const harness = () => {
  const definition = new AgentOrgDefinition({
    id: "org-1", name: "Org One", description: "", instructions: "",
    members: [
      new AgentOrgMember({ memberName: "direct", ref: "direct-def", refType: "agent", refScope: "shared" }),
      new AgentOrgMember({ memberName: "team", ref: "team-def", refType: "agent_team", refScope: "shared" }),
    ],
  });
  const team = new AgentTeamDefinition({
    id: "team-def", name: "Flat Team", description: "", instructions: "",
    coordinatorMemberName: "lead",
    nodes: [new TeamMember({ memberName: "lead", ref: "lead-def", refScope: "shared" })],
  });
  const catalog = { listLlmModels: vi.fn(async () => ["root-model", "team-model", "agent-model"].map(model_identifier => ({
    model_identifier, config_schema: { properties: { effort: { type: "string", enum: ["low", "high"] } } },
  }))) };
  const capacity = { resolveMany: vi.fn() };
  const create = vi.fn(async (tree) => ({ orgRunId: tree.rootOrg.orgRunId, getExecutionTreeSnapshot: () => tree }));
  const allocate = vi.fn(async (id) => `run-${id}`);
  const service = new AgentOrgRunService({
    manager: { create },
    admission: { requireAvailable: async () => ({ definition }) },
    agentDefinitions: { getFreshAgentDefinitionById: async (id) => ({ id }) },
    teamDefinitions: { getFreshDefinitionById: async () => team },
    agentIdentities: { allocateForAgentDefinition: allocate },
    teamIdentities: { allocateForTeamDefinitionName: () => "team-run" },
    workspaces: { ensureWorkspaceByRootPath: async (path) => ({ getBasePath: () => path }) },
    modelSelectionValidator: new RunModelSelectionService(catalog as never, capacity),
    history: { initialize: vi.fn(), recordCreated: vi.fn() },
  } as never);
  return { service, catalog, capacity, create, allocate };
};
const command = () => ({
  agentOrgDefinitionId: "org-1",
  rootConfiguration: {
    runtimeKind: "codex_app_server", llmModelIdentifier: "root-model", llmConfig: null,
    autoExecuteTools: false, skillAccessMode: SkillAccessMode.PRELOADED_ONLY, workspaceRootPath: "/workspace/root",
  },
  teamOverrides: [{ address: "/team", configuration: { llmModelIdentifier: "team-model", workspaceRootPath: "/workspace/team" } }],
  agentOverrides: [{ address: "/direct", configuration: { llmModelIdentifier: "agent-model", llmConfig: { effort: "high" } } }],
});

describe("AgentOrg launch with the integrated RunModelSelectionService", () => {
  it("validates complete root, mounted Team and exact Agent scopes without treating launch as stopped replacement", async () => {
    const h = harness();
    const run = await h.service.create(command());
    expect(h.catalog.listLlmModels.mock.calls).toEqual([
      ["codex_app_server", "/workspace/root"], ["codex_app_server", "/workspace/team"],
      ["codex_app_server", "/workspace/root"], ["codex_app_server", "/workspace/team"],
    ]);
    expect(h.capacity.resolveMany).not.toHaveBeenCalled();
    const tree = run.getExecutionTreeSnapshot();
    expect(tree.rootOrg.defaultLaunchConfiguration.llmModelIdentifier).toBe("root-model");
    expect(tree.rootOrg.members[0]).toMatchObject({ address: "/direct",
      launchConfiguration: { llmModelIdentifier: "agent-model", llmConfig: { effort: "high" } } });
    expect(tree.rootOrg.members[1]).toMatchObject({ address: "/team",
      defaultLaunchConfiguration: { llmModelIdentifier: "team-model", workspaceRootPath: "/workspace/team" },
      members: [{ address: "/team/lead", launchConfiguration: { llmModelIdentifier: "team-model", workspaceRootPath: "/workspace/team" } }],
    });
    expect(h.create).toHaveBeenCalledOnce();
  });

  it.each(["/", "/team", "/direct", "/team/lead"])("rejects invalid schema at %s before allocation or activation", async (address) => {
    const h = harness();
    const input = command();
    const invalid = { llmConfig: { effort: "unsupported" } };
    if (address === "/") Object.assign(input.rootConfiguration, invalid);
    else if (address === "/team") Object.assign(input.teamOverrides[0].configuration, invalid);
    else if (address === "/direct") Object.assign(input.agentOverrides[0].configuration, invalid);
    else input.agentOverrides.push({ address, configuration: invalid } as never);
    await expect(h.service.create(input)).rejects.toThrow(`Invalid configuration for '${address}'`);
    expect(h.allocate).not.toHaveBeenCalled();
    expect(h.create).not.toHaveBeenCalled();
    expect(h.capacity.resolveMany).not.toHaveBeenCalled();
  });
});
