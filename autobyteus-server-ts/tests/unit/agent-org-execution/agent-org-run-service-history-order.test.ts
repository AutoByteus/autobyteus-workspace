import { noWorkGuard, noEpisodicCatalog } from "../../helpers/no-delegations.js";
import { describe, expect, it, vi } from "vitest";
import { AgentOrgDefinition, AgentOrgMember } from "../../../src/agent-org-definition/domain/agent-org-definition.js";
import { AgentOrgRunService } from "../../../src/agent-org-execution/services/agent-org-run-service.js";
import { liveOrgOfPlan } from "../../helpers/org-container-plan-tree.js";

describe("AgentOrgRunService history ordering", () => {
  it("creates the current Org package before recording its index-only history row", async () => {
    const definition = new AgentOrgDefinition({
      id: "org-1", name: "Org One", description: "", instructions: "",
      members: [new AgentOrgMember({ memberName: "lead", ref: "agent-1", refType: "agent", refScope: "shared" })],
    });
    const order: string[] = [];
    const recordCreated = vi.fn(async () => { order.push("history"); });
    const recordRunSummary = vi.fn(async () => undefined);
    const managerCreate = vi.fn(async (input) => {
      order.push("manager");
      return liveOrgOfPlan(input);
    });
    const service = new AgentOrgRunService({ workGuard: noWorkGuard(), episodicCatalog: noEpisodicCatalog(),
      manager: { createContainer: managerCreate },
      admission: { requireAvailable: async () => ({ definition }) },
      agentDefinitions: { getAgentDefinitionById: async () => ({ id: "agent-1" }) },
      teamDefinitions: { getDefinitionById: async () => null },
      agentIdentities: { allocateForAgentDefinition: async () => "agent-run-1" },
      teamIdentities: { allocateForTeamDefinitionName: () => "team-run-1" },
      workspaces: { ensureWorkspaceByRootPath: async () => ({ getBasePath: () => "/tmp/workspace" }) },
      modelSelectionValidator: { validateMany: async (inputs: readonly { selection: { llmModelIdentifier: string; llmConfig: unknown } }[]) =>
        inputs.map(({ selection }) => ({ kind: "valid", selection })) },
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
        autoExecuteTools: false,
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
    const adHocTasks = { deleteAdHocTasksDelegatedFrom: vi.fn(async () => undefined) };
    const service = new AgentOrgRunService({ workGuard: noWorkGuard(), episodicCatalog: noEpisodicCatalog(),
      manager,
      history: { archiveStored, deleteStored },
      adHocTasks,
    } as never);

    await expect(service.archiveStoredRun(" org-run ")).resolves.toEqual({ success: true, message: "archived org-run" });
    expect(adHocTasks.deleteAdHocTasksDelegatedFrom).not.toHaveBeenCalled();
    await expect(service.deleteStoredRun(" org-run ")).resolves.toEqual({ success: true, message: "deleted org-run" });
    // A committed permanent delete also removes the ad-hoc Tasks this root hosted (REQ-009).
    expect(adHocTasks.deleteAdHocTasksDelegatedFrom).toHaveBeenCalledExactlyOnceWith({ rootSubjectKind: "agent_org", rootRunId: "org-run" });
    deleteStored.mockResolvedValueOnce({ success: false, message: "active" });
    await expect(service.deleteStoredRun("org-run")).resolves.toEqual({ success: false, message: "active" });
    expect(adHocTasks.deleteAdHocTasksDelegatedFrom).toHaveBeenCalledTimes(1);
    expect(archiveStored).toHaveBeenCalledExactlyOnceWith("org-run");
    expect(deleteStored).toHaveBeenNthCalledWith(1, "org-run");
    expect(manager.restore).not.toHaveBeenCalled();
    expect(manager.create).not.toHaveBeenCalled();
    expect(manager.terminate).not.toHaveBeenCalled();
  });

});
