import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorAdmission } from "../../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorDefinitionCatalog } from "../../../../src/agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { buildInRunPlacements, type CollaboratorRootPort } from "../../../../src/agent-collaboration/collaborators/collaborator-root-port.js";
import { projectTaskExecutionSource } from "../../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/**
 * Catalog copies honor definition defaults (AC-001), record per-agent values and sources (REQ-005),
 * return fallback notes from this admission only (REQ-008), and keep the recorded snapshot when a
 * definition changes later (AC-008).
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
const port = (): CollaboratorRootPort => ({
  isApplicationBound: false,
  launchBase: () => ({ kind: "inherited", launch: root }),
  ownDefinition: () => ({ kind: "agent_team", definitionId: "pm-team" }),
  inRunPlacementsByDefinition: () => buildInRunPlacements({ configured: [] }),
  addressesInUse: () => new Set(["/project_task_manager"]),
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
  return { state, validator, admission: createCollaboratorAdmission(catalog, validator, availability) };
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
        { address: "/software_engineering_team/solution_designer", agentDefinitionId: "solution_designer", launchConfiguration: root, followsTeam: true },
        { address: "/software_engineering_team/implementation_engineer", launchConfiguration: codexLaunch, followsTeam: false, launchSource: { origin: "agent_default" } },
        { address: "/software_engineering_team/code_reviewer", launchConfiguration: codexLaunch, followsTeam: false, launchSource: { origin: "agent_default" } },
      ],
    });
    // A member on the Team's launch records no own source (it shares the Team's).
    expect(copy?.source.kind === "agent_team" && "launchSource" in copy.source.members[0]!).toBe(false);
  });

  it("AC-005: when the configured runtime is unavailable, the copy starts on the root's launch and returns one note per skipped agent", async () => {
    const run = setup(false);
    const copy = await run.admission.catalogTaskSource(port(), { address: "/software_engineering_team", senderRunId: "pm" });
    expect(copy?.launchNotes).toEqual(["implementation_engineer", "code_reviewer"].map((name) =>
      `${name}: its agent default codex_app_server / sol-6.1 could not be used (Codex App Server command 'codex' is not available); it runs on claude_agent_sdk / opus (inherited from the run).`));
    expect(copy?.source.kind === "agent_team" && copy.source.members[1]).toEqual({
      address: "/software_engineering_team/implementation_engineer", agentDefinitionId: "implementation_engineer",
      launchConfiguration: root, followsTeam: true,
      launchSource: { origin: "inherited", fallbacks: [{ layer: "agent_default", runtimeKind: "codex_app_server", llmModelIdentifier: "sol-6.1",
        reason: "runtime_unavailable", detail: "Codex App Server command 'codex' is not available." }] },
    });
  });

  it("AC-008: a recorded copy keeps its values after the definition changes; a new copy uses the new default", async () => {
    const run = setup();
    const recorded = await run.admission.catalogTaskSource(port(), { address: "/software_engineering_team", senderRunId: "pm" });
    run.state.agents.find((item) => item.id === "implementation_engineer")!.defaultLaunchConfig =
      { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "local-model", llmConfig: null };
    const restored = projectTaskExecutionSource("/software_engineering_team" as never, recorded!.source);
    expect(restored.kind === "agent_team" && restored.node.children.find((child) => child.address === "/software_engineering_team/implementation_engineer"))
      .toMatchObject({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1" });
    const fresh = await run.admission.catalogTaskSource(port(), { address: "/implementation_engineer", senderRunId: "pm" });
    expect(fresh?.source).toMatchObject({ kind: "agent", launchConfiguration: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "local-model" } });
  });
});
