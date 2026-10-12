import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorAdmission } from "../../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorDefinitionCatalog } from "../../../../src/agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { buildInRunPlacements, type CollaboratorRootPort } from "../../../../src/agent-collaboration/collaborators/collaborator-root-port.js";
import { resolveCollaboratorCopySource } from "../../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
import type { CollaboratorIdentityPorts } from "../../../../src/agent-collaboration/collaborators/collaborator-identity-allocator.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import type { CollaboratorEntry, CollaboratorTeamEntry } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/**
 * Admission honors definition defaults for bring-in (AC-004) and catalog copies (AC-001), records
 * per-agent values and sources (REQ-005), returns fallback notes from this admission only
 * (REQ-008), and keeps the recorded snapshot when a definition changes later (AC-008).
 */
const sol = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig: { effort: "high" } };
const agent = (id: string, name: string, defaultLaunchConfig: AgentDefinition["defaultLaunchConfig"] = null) =>
  new AgentDefinition({ id, name, description: name, instructions: "x", ownershipScope: "shared", defaultLaunchConfig });
const definitions = () => ({
  agents: [
    agent("solution_designer", "Solution Designer"),
    agent("implementation_engineer", "Implementation Engineer", sol),
    agent("code_reviewer", "Code Reviewer", sol),
    agent("writer", "Writer", sol),
  ],
  teams: [new AgentTeamDefinition({
    id: "se", name: "Software Engineering Team", description: "SE", instructions: "x", coordinatorMemberName: "solution_designer",
    nodes: ["solution_designer", "implementation_engineer", "code_reviewer"].map((name) => new TeamMember({ memberName: name, ref: name, refScope: "shared" })),
  })],
});
const root = {
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null,
  autoExecuteTools: false, workspaceRootPath: "/work",
};
const port = (collaborators: CollaboratorEntry[] = []): CollaboratorRootPort => ({
  rootKind: "agent_team", isApplicationBound: false,
  rootLaunchConfiguration: () => root,
  ownDefinition: () => ({ kind: "agent_team", definitionId: "pm-team" }),
  inRunPlacementsByDefinition: () => buildInRunPlacements({ configured: [], collaborators }),
  collaborators: () => collaborators,
  addressesInUse: () => new Set(["/project_task_manager", ...collaborators.map((entry) => entry.address)]),
});

const setup = (codexEnabled = true) => {
  const state = definitions();
  const catalog: CollaboratorDefinitionCatalog = {
    listAgentDefinitions: async () => state.agents,
    listTeamDefinitions: async () => state.teams,
    getAgentDefinition: async (id) => state.agents.find((item) => item.id === id) ?? null,
    getTeamDefinition: async (id) => state.teams.find((item) => item.id === id) ?? null,
  };
  const validator = {
    validate: vi.fn(),
    validateMany: vi.fn(async (inputs: readonly { selection: { llmModelIdentifier: string } }[]) =>
      inputs.map(({ selection }) => ({ kind: "valid" as const, selection: { llmModelIdentifier: selection.llmModelIdentifier, llmConfig: null } }))),
  } as unknown as RunModelSelectionValidator;
  const availability = {
    getRuntimeAvailability: vi.fn(async (runtimeKind: RuntimeKind) => ({
      runtimeKind, enabled: runtimeKind !== RuntimeKind.CODEX_APP_SERVER || codexEnabled,
      reason: runtimeKind === RuntimeKind.CODEX_APP_SERVER && !codexEnabled ? "Codex App Server command 'codex' is not available." : null,
    })),
  };
  let next = 0;
  const identities: CollaboratorIdentityPorts = {
    agentRuns: { allocateForAgentDefinition: async (id) => `${id}-run-${++next}` },
    taskTeams: { create: async ({ source }) => ({ teamNode: { ...source, teamRunId: `team-${++next}`,
      children: source.children.map((child) => child.kind === "agent" ? { ...child, agentRunId: `${child.agentDefinitionId}-run-${++next}` } : child) } }) },
  };
  const added: CollaboratorEntry[] = [];
  return {
    state, added, identities, validator,
    admission: createCollaboratorAdmission(catalog, validator, availability),
    addEntries: async (entries: readonly CollaboratorEntry[]) => { added.push(...entries); },
  };
};
const codexLaunch = { ...sol, autoExecuteTools: false, workspaceRootPath: "/work" };

describe("admission honors definition launch defaults", () => {
  it("AC-001 / AC-015: a catalog Team copy runs its configured members on their defaults and the rest on the root's", async () => {
    const run = setup();
    const copy = await run.admission.catalogTaskSource(port(), { address: "/software_engineering_team", senderRunId: "pm" });
    expect(copy?.launchNotes).toEqual([]);
    expect(copy?.source).toMatchObject({
      kind: "agent_team", defaultLaunchConfiguration: root, defaultLaunchSource: { origin: "inherited", fallbacks: [] },
      members: [
        { address: "/software_engineering_team/solution_designer", agentDefinitionId: "solution_designer" },
        { address: "/software_engineering_team/implementation_engineer", launchConfiguration: codexLaunch, launchSource: { origin: "agent_default" } },
        { address: "/software_engineering_team/code_reviewer", launchConfiguration: codexLaunch, launchSource: { origin: "agent_default" } },
      ],
    });
    expect(copy?.source.kind === "agent_team" && "launchConfiguration" in copy.source.members[0]!).toBe(false);
  });

  it("AC-005: when the configured runtime is unavailable, the copy starts on the root's launch and returns one note per skipped agent", async () => {
    const run = setup(false);
    const copy = await run.admission.catalogTaskSource(port(), { address: "/software_engineering_team", senderRunId: "pm" });
    expect(copy?.launchNotes).toEqual(["implementation_engineer", "code_reviewer"].map((name) =>
      `${name}: its agent default codex_app_server / sol-6.1 could not be used (Codex App Server command 'codex' is not available); it runs on claude_agent_sdk / opus (inherited from the run).`));
    expect(copy?.source.kind === "agent_team" && copy.source.members[1]).toEqual({
      address: "/software_engineering_team/implementation_engineer", agentDefinitionId: "implementation_engineer",
      launchSource: { origin: "inherited", fallbacks: [{ layer: "agent_default", runtimeKind: "codex_app_server", llmModelIdentifier: "sol-6.1",
        reason: "runtime_unavailable", detail: "Codex App Server command 'codex' is not available." }] },
    });
  });

  it("AC-004: a bring-in records per-member values and returns this admission's notes; re-using it returns none", async () => {
    const run = setup(false);
    const result = await run.admission.ensure(port(), {
      senderRunId: "pm", definitions: [{ kind: "agent", definitionId: "writer" }, { kind: "agent", definitionId: "solution_designer" }],
      identities: run.identities, addEntries: run.addEntries,
    });
    expect(result.admitted && result.launchNotes).toEqual([
      "Writer: its agent default codex_app_server / sol-6.1 could not be used (Codex App Server command 'codex' is not available); it runs on claude_agent_sdk / opus (inherited from the run).",
    ]);
    expect(run.added).toMatchObject([
      { kind: "agent", agentDefinitionId: "writer", launchConfiguration: root, launchSource: { origin: "inherited", fallbacks: [{ reason: "runtime_unavailable" }] } },
      { kind: "agent", agentDefinitionId: "solution_designer", launchConfiguration: root, launchSource: { origin: "inherited", fallbacks: [] } },
    ]);
    const again = await run.admission.ensure(port(run.added), {
      senderRunId: "pm", definitions: [{ kind: "agent", definitionId: "writer" }], identities: run.identities, addEntries: run.addEntries,
    });
    expect(again).toMatchObject({ admitted: true, launchNotes: [] });
  });

  it("AC-004 / AC-007: a collaborator Team is hosted with each member's own launch and extra copies reuse it", async () => {
    const run = setup();
    await run.admission.ensure(port(), {
      senderRunId: "pm", definitions: [{ kind: "agent_team", definitionId: "se" }], identities: run.identities, addEntries: run.addEntries,
    });
    const team = run.added[0] as CollaboratorTeamEntry;
    expect(team.members.map((member) => member.launchConfiguration?.runtimeKind ?? "team")).toEqual(["team", "codex_app_server", "codex_app_server"]);
    const copy = resolveCollaboratorCopySource(run.added, "/software_engineering_team");
    expect(copy?.kind === "agent_team" && copy.node.children.map((child) => child.kind === "agent" && child.runtimeKind))
      .toEqual([RuntimeKind.CLAUDE_AGENT_SDK, RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CODEX_APP_SERVER]);
  });

  it("AC-008: a recorded copy keeps its values after the definition changes; a new copy uses the new default", async () => {
    const run = setup();
    await run.admission.ensure(port(), {
      senderRunId: "pm", definitions: [{ kind: "agent_team", definitionId: "se" }], identities: run.identities, addEntries: run.addEntries,
    });
    run.state.agents.find((item) => item.id === "implementation_engineer")!.defaultLaunchConfig =
      { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "local-model", llmConfig: null };
    expect(resolveCollaboratorCopySource(run.added, "/software_engineering_team/implementation_engineer")?.node)
      .toMatchObject({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1" });
    const fresh = await run.admission.catalogTaskSource(port(), { address: "/implementation_engineer", senderRunId: "pm" });
    expect(fresh?.source).toMatchObject({ kind: "agent", launchConfiguration: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "local-model" } });
  });
});
