import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorDefinitionCatalog } from "../../../src/agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { standaloneRootCollaboratorPortFor } from "../../../src/standalone-agent-run-root/services/standalone-root-collaborators.js";
import { emptyStandaloneRootTree, type StandaloneRootTreeSnapshot } from "../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import type { CollaboratorEntry } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";
import type { RunModelSelectionValidator } from "../../../src/llm-management/services/run-model-selection-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const agent = (id: string, name: string) => new AgentDefinition({ id, name, description: `${name} description`, instructions: "x" });
const agents = [agent("pm", "Project Task Manager"), agent("reviewer", "Code Reviewer"), agent("lead", "Lead"), agent("designer", "Designer")];
const teams = [new AgentTeamDefinition({
  id: "product", name: "Product Team", description: "Product Team description", instructions: "x",
  nodes: [new TeamMember({ memberName: "lead", ref: "lead", refScope: "shared" }), new TeamMember({ memberName: "designer", ref: "designer", refScope: "shared" })],
  coordinatorMemberName: "lead",
  handoffs: [],
})];
const catalog: CollaboratorDefinitionCatalog = {
  listAgentDefinitions: async () => agents,
  listTeamDefinitions: async () => teams,
  getAgentDefinition: async (id) => agents.find((item) => item.id === id) ?? null,
  getTeamDefinition: async (id) => teams.find((item) => item.id === id) ?? null,
};
const runnable = {
  validate: vi.fn(),
  validateMany: async (inputs: readonly unknown[]) => inputs.map(() => ({ kind: "valid" as const, selection: { llmModelIdentifier: "m", llmConfig: null } })),
} as unknown as RunModelSelectionValidator;
const launch = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/work" };

const HOST = "pm-run";
const CHILD = "reviewer-copy-run";

const treeOf = (host: { address: string; agentDefinitionId: string }, collaborators: readonly CollaboratorEntry[] = []): StandaloneRootTreeSnapshot => ({
  ...emptyStandaloneRootTree({ host: { address: host.address as never, agentRunId: HOST, agentDefinitionId: host.agentDefinitionId }, createdAt: "2026-10-09T00:00:00.000Z" }),
  collaborators,
});
const pmTree = (collaborators: readonly CollaboratorEntry[] = []) => treeOf({ address: "/project_task_manager", agentDefinitionId: "pm" }, collaborators);

describe("Agent-root collaborator port per viewer (REQ-001..REQ-003)", () => {
  const admission = createCollaboratorAdmission(catalog, runnable);
  const policy = admission.policy;

  it("the host never offers, resolves or lists itself (preserved host view)", async () => {
    const hostView = standaloneRootCollaboratorPortFor(pmTree(), launch, HOST);
    expect(hostView.ownDefinition()).toEqual({ kind: "agent", definitionId: "pm" });
    expect((await policy.listCandidates(hostView)).candidates.map((candidate) => candidate.definitionId))
      .toEqual(["reviewer", "lead", "designer", "product"]);
    await expect(admission.resolveMentions(hostView, [{ kind: "agent", definitionId: "pm" }]))
      .resolves.toMatchObject({ admitted: false, collaboratorName: "Project Task Manager", message: "Project Task Manager is this run's own definition." });
    expect((await policy.listEligible(hostView)).map((entry) => entry.address))
      .toEqual(["/code_reviewer", "/lead", "/designer", "/product_team"]);
  });

  it("every other agent of the run is offered the host, resolves it as the run agent at its host address and lists it", async () => {
    const childView = standaloneRootCollaboratorPortFor(pmTree(), launch, CHILD);
    expect(childView.ownDefinition()).toBeNull();
    expect((await policy.listCandidates(childView)).candidates.map((candidate) => candidate.definitionId))
      .toEqual(["pm", "reviewer", "lead", "designer", "product"]);
    await expect(admission.resolveMentions(childView, [{ kind: "agent", definitionId: "pm" }, { kind: "agent_team", definitionId: "product" }]))
      .resolves.toEqual({ admitted: true, collaborators: [
        { name: "Project Task Manager", kind: "agent", address: "/project_task_manager", presence: "run_agent" },
        { name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" },
      ] });
    expect(await policy.listEligible(childView)).toEqual([
      { name: "Project Task Manager", kind: "agent", address: "/project_task_manager", description: "Project Task Manager description" },
      { name: "Code Reviewer", kind: "agent", address: "/code_reviewer", description: "Code Reviewer description" },
      { name: "Lead", kind: "agent", address: "/lead", description: "Lead description" },
      { name: "Designer", kind: "agent", address: "/designer", description: "Designer description" },
      { name: "Product Team", kind: "agent_team", address: "/product_team", description: "Product Team description" },
    ]);
  });

  it("the host is never a second instance: not admissible, not a catalog address, so bring-in and catalog copies refuse it (AC-009)", async () => {
    const childView = standaloneRootCollaboratorPortFor(pmTree(), launch, CHILD);
    await expect(policy.requireAdmissible(childView, { kind: "agent", definitionId: "pm" }))
      .rejects.toMatchObject({ code: "COLLABORATOR_MENTION_UNAVAILABLE", message: "Project Task Manager is already in this run." });
    await expect(admission.catalogDefinitionAt(childView, "/project_task_manager")).resolves.toBeNull();
    await expect(admission.catalogTaskSource(childView, { address: "/project_task_manager", senderRunId: CHILD })).resolves.toBeNull();
  });

  it("catalog addresses of every other definition are the same for the host and for other agents (A-03, AR-001 normal case)", async () => {
    // Normal case: the host address segment is the slug of the host definition's name.
    const hostMap = await policy.catalogAddressMap(standaloneRootCollaboratorPortFor(pmTree(), launch, HOST));
    const childMap = await policy.catalogAddressMap(standaloneRootCollaboratorPortFor(pmTree(), launch, CHILD));
    for (const ref of [
      { kind: "agent" as const, definitionId: "reviewer" }, { kind: "agent" as const, definitionId: "lead" },
      { kind: "agent" as const, definitionId: "designer" }, { kind: "agent_team" as const, definitionId: "product" },
    ]) expect(childMap.addressFor(ref)).toBe(hostMap.addressFor(ref));
    expect(childMap.definitionFor("/code_reviewer")).toEqual(hostMap.definitionFor("/code_reviewer"));
  });

  it("the run agent outranks another in-run placement of the same definition", async () => {
    const run = createCollaboratorAdmission(catalog, runnable);
    let next = 0;
    const added: CollaboratorEntry[] = [];
    const leadHost = treeOf({ address: "/lead", agentDefinitionId: "lead" });
    await run.ensure(standaloneRootCollaboratorPortFor(leadHost, launch, HOST), {
      senderRunId: HOST,
      definitions: [{ kind: "agent_team", definitionId: "product" }],
      identities: {
        agentRuns: { allocateForAgentDefinition: async (id) => `${id}-run-${++next}` },
        taskTeams: { create: async ({ source }) => ({ teamNode: { ...source, teamRunId: `team-${++next}`,
          children: source.children.map((child) => child.kind === "agent" ? { ...child, agentRunId: `${child.agentDefinitionId}-run-${++next}` } : child) } }) },
      },
      addEntries: async (entries) => { added.push(...entries); },
    });
    expect(added.map((entry) => entry.address)).toEqual(["/product_team"]);
    const childView = standaloneRootCollaboratorPortFor({ ...leadHost, collaborators: added }, launch, "designer-run-3");
    await expect(run.resolveMentions(childView, [{ kind: "agent", definitionId: "lead" }]))
      .resolves.toEqual({ admitted: true, collaborators: [{ name: "Lead", kind: "agent", address: "/lead", presence: "run_agent" }] });
  });
});
