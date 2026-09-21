import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentOrgDefinition, AgentOrgMember } from "../../../src/agent-org-definition/domain/agent-org-definition.js";
import { AgentOrgRunService } from "../../../src/agent-org-execution/services/agent-org-run-service.js";

describe("AgentOrgRunService history ordering", () => {
  it("initializes derived history before publishing the first current Org package", async () => {
    const definition = new AgentOrgDefinition({
      id: "org-1", name: "Org One", description: "", instructions: "",
      members: [new AgentOrgMember({ memberName: "lead", ref: "agent-1", refType: "agent", refScope: "shared" })],
    });
    let historyInitialized = false;
    const recordCreated = vi.fn();
    const recordRunSummary = vi.fn(async () => undefined);
    const managerCreate = vi.fn(async (tree) => {
      expect(historyInitialized).toBe(true);
      return { orgRunId: tree.rootOrg.orgRunId, getExecutionTreeSnapshot: () => tree };
    });
    const service = new AgentOrgRunService({
      manager: { create: managerCreate },
      admission: { requireAvailable: async () => ({ definition }) },
      agentDefinitions: { getFreshAgentDefinitionById: async () => ({ id: "agent-1" }) },
      teamDefinitions: { getFreshDefinitionById: async () => null },
      agentIdentities: { allocateForAgentDefinition: async () => "agent-run-1" },
      teamIdentities: { allocateForTeamDefinitionName: () => "team-run-1" },
      workspaces: { ensureWorkspaceByRootPath: async () => ({ getBasePath: () => "/tmp/workspace" }) },
      modelSelectionValidator: { validate: async ({ selection }) => ({ kind: "valid", selection }) },
      history: {
        initialize: async () => { historyInitialized = true; },
        recordCreated,
        recordRestored: async () => undefined,
        recordTerminated: async () => undefined,
        recordRunSummary,
      },
    } as never);

    const run = await service.create({
      agentOrgDefinitionId: "org-1",
      rootConfiguration: {
        runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.6-sol", llmConfig: null,
        autoExecuteTools: false, skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
        workspaceRootPath: "/tmp/workspace",
      },
    });

    expect(run.orgRunId).toContain("org_one_");
    expect(managerCreate).toHaveBeenCalledOnce();
    expect(recordCreated).toHaveBeenCalledOnce();
    await service.recordRunActivity(run as never, { summary: "First accepted input" });
    expect(recordRunSummary).toHaveBeenCalledWith({ orgRunId: run.orgRunId, summary: "First accepted input" });
  });
});
