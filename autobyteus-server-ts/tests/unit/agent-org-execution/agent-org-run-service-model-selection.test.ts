import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentOrgDefinition, AgentOrgMember } from "../../../src/agent-org-definition/domain/agent-org-definition.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { AgentOrgRunService } from "../../../src/agent-org-execution/services/agent-org-run-service.js";
import { RunModelSelectionService } from "../../../src/llm-management/services/run-model-selection-service.js";
import { AgyDiscoveryError } from "../../../src/runtime-management/antigravity-cli-capability.js";

const harness = (large = false) => {
  const definition = new AgentOrgDefinition({
    id: "org-1", name: "Org One", description: "", instructions: "",
    members: large ? [
      ...["direct-one", "direct-two"].map((name) => new AgentOrgMember({ memberName: name, ref: `${name}-def`, refType: "agent", refScope: "shared" })),
      ...["team-one", "team-two", "team-three"].map((name) => new AgentOrgMember({ memberName: name, ref: "team-def", refType: "agent_team", refScope: "shared" })),
    ] : [
      new AgentOrgMember({ memberName: "direct", ref: "direct-def", refType: "agent", refScope: "shared" }),
      new AgentOrgMember({ memberName: "team", ref: "team-def", refType: "agent_team", refScope: "shared" }),
    ],
  });
  const team = new AgentTeamDefinition({
    id: "team-def", name: "Flat Team", description: "", instructions: "",
    coordinatorMemberName: "lead",
    nodes: (large ? ["lead", "worker-one", "worker-two", "worker-three"] : ["lead"])
      .map((name) => new TeamMember({ memberName: name, ref: `${name}-def`, refScope: "shared" })),
  });
  const catalog = { listLlmModels: vi.fn(async (_runtime: string, _workspace: string) => ["root-model", "team-model", "agent-model"].map(model_identifier => ({
    model_identifier, config_schema: { properties: { effort: { type: "string", enum: ["low", "high"] } } },
  }))) };
  const capacity = { resolveMany: vi.fn() };
  const create = vi.fn(async (tree) => ({ orgRunId: tree.rootOrg.orgRunId, getExecutionTreeSnapshot: () => tree }));
  let identitySequence = 0;
  const allocate = vi.fn(async (id: string) => `run-${id}-${++identitySequence}`);
  const validator = new RunModelSelectionService(catalog as never, capacity);
  const service = new AgentOrgRunService({
    manager: { create },
    admission: { requireAvailable: async () => ({ definition }) },
    agentDefinitions: { getFreshAgentDefinitionById: async (id: string) => ({ id }) },
    teamDefinitions: { getFreshDefinitionById: async () => team },
    agentIdentities: { allocateForAgentDefinition: allocate },
    teamIdentities: { allocateForTeamDefinitionName: () => `team-run-${++identitySequence}` },
    workspaces: { ensureWorkspaceByRootPath: async (path: string) => ({ getBasePath: () => path }) },
    modelSelectionValidator: validator,
    history: { recordCreated: vi.fn() },
  } as never);
  return { service, catalog, capacity, create, allocate, validator };
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
  it("validates all 18 equivalent AGY root, Team and Agent placements with one request-local catalog discovery", async () => {
    const h = harness(true);
    const validateMany = vi.spyOn(h.validator, "validateMany");
    const input = { agentOrgDefinitionId: "org-1", rootConfiguration: {
      ...command().rootConfiguration, runtimeKind: "antigravity_cli", workspaceRootPath: "/workspace/shared",
    } };
    const run = await h.service.create(input);
    expect(validateMany).toHaveBeenCalledOnce();
    expect(validateMany.mock.calls[0]![0]).toHaveLength(18);
    expect(h.catalog.listLlmModels).toHaveBeenCalledExactlyOnceWith("antigravity_cli", "/workspace/shared");
    const members = run.getExecutionTreeSnapshot().rootOrg.members;
    expect(members).toHaveLength(5);
    expect(members.filter((member) => "members" in member).flatMap((team) => "members" in team ? team.members : [])).toHaveLength(12);
    expect(h.create).toHaveBeenCalledOnce();
  });

  it("keeps different AGY workspaces as independent validation contexts", async () => {
    const h = harness(true);
    await h.service.create({ agentOrgDefinitionId: "org-1", rootConfiguration: {
      ...command().rootConfiguration, runtimeKind: "antigravity_cli", workspaceRootPath: "/workspace/shared",
    }, teamOverrides: [{ address: "/team-two", configuration: { workspaceRootPath: "/workspace/other" } }] });
    expect(h.catalog.listLlmModels.mock.calls).toEqual([
      ["antigravity_cli", "/workspace/shared"], ["antigravity_cli", "/workspace/other"],
    ]);
  });

  it("keeps a different runtime in the same workspace as a separate catalog context", async () => {
    const h = harness(true);
    await h.service.create({ agentOrgDefinitionId: "org-1", rootConfiguration: {
      ...command().rootConfiguration, runtimeKind: "antigravity_cli", workspaceRootPath: "/workspace/shared",
    }, agentOverrides: [{ address: "/direct-one", configuration: { runtimeKind: "codex_app_server" } }] });
    expect(h.catalog.listLlmModels.mock.calls).toEqual([
      ["antigravity_cli", "/workspace/shared"], ["codex_app_server", "/workspace/shared"],
    ]);
  });

  it("preserves a safe AGY discovery diagnostic at the first affected address", async () => {
    const h = harness();
    h.catalog.listLlmModels.mockImplementation(async (_runtime: string, workspace: string) => {
      if (workspace === "/workspace/team") throw new AgyDiscoveryError("AGY_MODEL_DISCOVERY_TIMEOUT");
      return ["root-model", "team-model", "agent-model"].map(model_identifier => ({
        model_identifier, config_schema: { properties: { effort: { type: "string", enum: ["low", "high"] } } },
      }));
    });
    const input = command();
    input.rootConfiguration.runtimeKind = "antigravity_cli";
    input.teamOverrides[0]!.configuration.llmModelIdentifier = "root-model";
    await expect(h.service.create(input)).rejects.toThrow(
      "Invalid configuration for '/team': Antigravity model discovery timed out; check the CLI and retry.",
    );
    expect(h.create).not.toHaveBeenCalled();
  });

  it("distinguishes an unexpected AGY catalog exception from a valid missing model", async () => {
    const input = command();
    input.rootConfiguration.runtimeKind = "antigravity_cli";
    const failed = harness();
    failed.catalog.listLlmModels.mockRejectedValue(new Error("secret /private/credential-path"));
    await expect(failed.service.create(input)).rejects.toThrow(
      "Invalid configuration for '/': Antigravity model discovery failed; check authentication or network and retry.",
    );
    const missing = harness();
    missing.catalog.listLlmModels.mockResolvedValue([]);
    await expect(missing.service.create(input)).rejects.toThrow(
      "Invalid configuration for '/': The selected model is unavailable.",
    );
  });

  it("rejects an incomplete batch at its first missing placement address", async () => {
    const h = harness();
    vi.spyOn(h.validator, "validateMany").mockResolvedValue([{ kind: "valid", selection: {
      llmModelIdentifier: "root-model", llmConfig: null,
    } }]);
    await expect(h.service.create(command())).rejects.toThrow(
      "Invalid configuration for '/team': Model validation returned an incomplete result.",
    );
    expect(h.create).not.toHaveBeenCalled();
  });

  it("validates complete root, mounted Team and exact Agent scopes without treating launch as stopped replacement", async () => {
    const h = harness();
    const run = await h.service.create(command());
    expect(h.catalog.listLlmModels.mock.calls).toEqual([
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
    else if (address === "/team") Object.assign(input.teamOverrides[0]!.configuration, invalid);
    else if (address === "/direct") Object.assign(input.agentOverrides[0]!.configuration, invalid);
    else input.agentOverrides.push({ address, configuration: invalid } as never);
    await expect(h.service.create(input)).rejects.toThrow(`Invalid configuration for '${address}'`);
    expect(h.allocate).not.toHaveBeenCalled();
    expect(h.create).not.toHaveBeenCalled();
    expect(h.capacity.resolveMany).not.toHaveBeenCalled();
  });
});
