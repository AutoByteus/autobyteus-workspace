import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentOrgDefinition, AgentOrgMember } from "../../../src/agent-org-definition/domain/agent-org-definition.js";
import { AgentOrgRunService } from "../../../src/agent-org-execution/services/agent-org-run-service.js";

describe("AgentOrgRunService history ordering", () => {
  it("creates the current Org package before recording its index-only history row", async () => {
    const definition = new AgentOrgDefinition({
      id: "org-1", name: "Org One", description: "", instructions: "",
      members: [new AgentOrgMember({ memberName: "lead", ref: "agent-1", refType: "agent", refScope: "shared" })],
    });
    const order: string[] = [];
    const recordCreated = vi.fn(async () => { order.push("history"); });
    const recordRunSummary = vi.fn(async () => undefined);
    const managerCreate = vi.fn(async (tree) => {
      order.push("manager");
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
    expect(order).toEqual(["manager", "history"]);
    await service.recordRunActivity(run as never, { summary: "First accepted input" });
    expect(recordRunSummary).toHaveBeenCalledWith({ orgRunId: run.orgRunId, summary: "First accepted input" });
  });

  it("delegates stored archive and delete through the AgentOrg history owner without activation", async () => {
    const archiveStored = vi.fn(async (orgRunId: string) => ({ success: true, message: `archived ${orgRunId}` }));
    const deleteStored = vi.fn(async (orgRunId: string) => ({ success: true, message: `deleted ${orgRunId}` }));
    const manager = { restore: vi.fn(), create: vi.fn(), terminate: vi.fn() };
    const service = new AgentOrgRunService({
      manager,
      history: { archiveStored, deleteStored },
    } as never);

    await expect(service.archiveStoredRun(" org-run ")).resolves.toEqual({ success: true, message: "archived org-run" });
    await expect(service.deleteStoredRun(" org-run ")).resolves.toEqual({ success: true, message: "deleted org-run" });
    expect(archiveStored).toHaveBeenCalledExactlyOnceWith("org-run");
    expect(deleteStored).toHaveBeenCalledExactlyOnceWith("org-run");
    expect(manager.restore).not.toHaveBeenCalled();
    expect(manager.create).not.toHaveBeenCalled();
    expect(manager.terminate).not.toHaveBeenCalled();
  });

});
