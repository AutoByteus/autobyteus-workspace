import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { DAILY_ASSISTANT_AGENT_DEFINITION_ID, MEMORY_COMPACTOR_AGENT_DEFINITION_ID } from "../../../../src/built-in-agents/built-in-agent-registry.js";
import { collaboratorSegmentForName } from "../../../../src/agent-collaboration/collaborators/catalog-address-map.js";
import { createCollaboratorAdmission } from "../../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorDefinitionCatalog } from "../../../../src/agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { buildInRunPlacements, type CollaboratorRootPort } from "../../../../src/agent-collaboration/collaborators/collaborator-root-port.js";
import { composeCollaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";


const agent = (id: string, name: string, ownershipScope: AgentDefinition["ownershipScope"] = "shared") => new AgentDefinition({
  id, name, description: `${name} description`, instructions: "x", ownershipScope,
});
const team = (id: string, name: string, members: readonly [string, string][], coordinator: string) => new AgentTeamDefinition({
  id, name, description: `${name} description`, instructions: "x",
  nodes: members.map(([memberName, ref]) => new TeamMember({ memberName, ref, refScope: "shared" })),
  coordinatorMemberName: coordinator,
  handoffs: [{ from: "/lead", to: "/designer", rules: ["When UI work is needed."] }],
});

const definitions = {
  agents: [
    agent(DAILY_ASSISTANT_AGENT_DEFINITION_ID, "Daily Assistant"),
    agent(MEMORY_COMPACTOR_AGENT_DEFINITION_ID, "Memory Compactor"),
    agent("reviewer", "Code Reviewer"),
    agent("lead", "Lead"),
    agent("designer", "Designer"),
    agent("local", "Team Local", "team_local"),
    agent("app", "App Agent", "application_owned"),
  ],
  teams: [team("product", "Product Team", [["lead", "lead"], ["designer", "designer"]], "lead")],
};
const catalog: CollaboratorDefinitionCatalog = {
  listAgentDefinitions: async () => definitions.agents,
  isAgentHidden: () => false,
  listTeamDefinitions: async () => definitions.teams,
  getAgentDefinition: async (id) => definitions.agents.find((item) => item.id === id) ?? null,
  getTeamDefinition: async (id) => definitions.teams.find((item) => item.id === id) ?? null,
};
const launch = {
  runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt", llmConfig: { effort: "high" },
  autoExecuteTools: false, workspaceRootPath: "/work",
};

const port = (input: {
  configuredAgents?: string[];
  addresses?: string[];
  applicationBound?: boolean;
} = {}): CollaboratorRootPort => ({
  isApplicationBound: input.applicationBound ?? false,
  launchBase: () => ({ kind: "inherited", launch }),
  ownDefinition: () => ({ kind: "agent_team", definitionId: "se-team" }),
  inRunPlacementsByDefinition: () => buildInRunPlacements({
    configured: (input.configuredAgents ?? []).map((id) => ({ ref: { kind: "agent" as const, definitionId: id }, address: `/${id}` as never })),
  }),
  addressesInUse: () => new Set(input.addresses ?? ["/coordinator"]),
});

/** Records every step so the order can be asserted. */
const harness = (options: { invalid?: boolean } = {}) => {
  const steps: string[] = [];
  const validator: RunModelSelectionValidator = {
    validate: vi.fn(),
    validateMany: vi.fn(async (inputs) => {
      steps.push(`validate:${inputs.length}`);
      return inputs.map(() => options.invalid ? { kind: "model_unavailable" as const } : { kind: "valid" as const, selection: { llmModelIdentifier: "gpt", llmConfig: null } });
    }),
  } as unknown as RunModelSelectionValidator;
  return { steps, admission: createCollaboratorAdmission(catalog, validator, { getRuntimeAvailability: async (runtimeKind) => ({ runtimeKind, enabled: true, reason: null }) }) };
};

const other = { relation: () => "other" as const, ownTeam: null };

describe("catalog policy and mention resolution", () => {
  const admission = harness().admission;

  it("offers shared Agents then shared Teams, in the run or not, minus built-ins, non-shared and the run's own definition (REQ-001)", async () => {
    const list = await admission.policy.listCandidates(port({ configuredAgents: ["lead"] }));
    expect(list.availability).toBe("AVAILABLE");
    // `lead` is a configured member: it is still offered (AC-002).
    expect(list.candidates.map((candidate) => `${candidate.kind}:${candidate.definitionId}`))
      .toEqual(["agent:reviewer", "agent:lead", "agent:designer", "agent_team:product"]);
    expect(list.candidates[3]).toMatchObject({ memberCount: 2, coordinatorName: "lead" });
    const ownReviewer = { ...port(), ownDefinition: () => ({ kind: "agent" as const, definitionId: "reviewer" }) };
    expect((await admission.policy.listCandidates(ownReviewer)).candidates.map((candidate) => candidate.definitionId))
      .toEqual(["lead", "designer", "product"]);
    expect(await admission.policy.listCandidates(port({ applicationBound: true })))
      .toEqual({ availability: "UNAVAILABLE_APPLICATION_ROOT", candidates: [] });
  });

  it("`@` resolves addresses without validating, allocating or adding; the caller composes the delegate_task note (REQ-001/002)", async () => {
    const run = harness({ invalid: true });
    const result = await run.admission.resolveMentions(port({ configuredAgents: ["reviewer"] }),
      [{ kind: "agent", definitionId: "reviewer" }, { kind: "agent_team", definitionId: "product" }], other);
    // An in-run definition resolves to its configured placement's address and is marked; any other to its catalog address.
    expect(result).toEqual({ admitted: true, launchNotes: [], collaborators: [
      { name: "Code Reviewer", kind: "agent", address: "/reviewer", presence: "in_run" },
      { name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" },
    ] });
    // Runnability is checked when the agent delegates, not here; nothing is allocated or added.
    expect(run.steps).toEqual([]);
    const note = composeCollaboratorMentionNote("please review", result.admitted ? result.collaborators : []);
    expect(note).toContain("[Mentioned agents]\n- Code Reviewer (agent) at /reviewer: talk with it using send_message_to, or delegate a task to it with delegate_task; that creates a new task agent and returns its run id to follow up with.");
    expect(note).toContain("- Product Team (agent team) at /product_team: delegate the task to it with delegate_task; it returns a run id to follow up with.");
    await expect(run.admission.resolveMentions(port(), [], other)).resolves.toEqual({ admitted: true, launchNotes: [], collaborators: [] });
  });

  it("`@` decides each in-run mention for the agent the user is talking to: itself, its own team, or another unit (AC-006)", async () => {
    const inRun = port({ configuredAgents: ["reviewer", "lead", "designer"] });
    const relation = (address: string) => address === "/reviewer" ? "self" as const : address === "/lead" ? "own_team" as const : "other" as const;
    await expect(admission.resolveMentions(inRun, [
      { kind: "agent", definitionId: "reviewer" }, { kind: "agent", definitionId: "lead" },
      { kind: "agent", definitionId: "designer" }, { kind: "agent_team", definitionId: "product" },
    ], { relation, ownTeam: null })).resolves.toEqual({ admitted: true, launchNotes: [], collaborators: [
      { name: "Code Reviewer", kind: "agent", address: "/reviewer", presence: "self" },
      { name: "Lead", kind: "agent", address: "/lead", presence: "own_team" },
      { name: "Designer", kind: "agent", address: "/designer", presence: "in_run" },
      { name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" },
    ] });
  });

  it("`@` checks the focused agent's own team first, by definition: a member of a task agent team is \"in your team\", not a catalog agent (SR-011, AC-006)", async () => {
    // A standalone run: the team's members are not configured placements, only the host is.
    const standalone = port();
    const ownTeam = {
      selfAddress: "/software_team/designer", teamAddress: "/software_team", teamDefinitionId: "product",
      members: [
        { address: "/software_team/designer", definitionId: "designer" },
        { address: "/software_team/reviewer", definitionId: "reviewer" },
      ],
    } as never;
    const viewer = { relation: () => "other" as const, ownTeam };
    await expect(admission.resolveMentions(standalone, [
      { kind: "agent", definitionId: "reviewer" }, { kind: "agent", definitionId: "designer" },
      { kind: "agent_team", definitionId: "product" }, { kind: "agent", definitionId: "lead" },
    ], viewer)).resolves.toEqual({ admitted: true, launchNotes: [], collaborators: [
      { name: "Code Reviewer", kind: "agent", address: "/software_team/reviewer", presence: "own_team" },
      { name: "Designer", kind: "agent", address: "/software_team/designer", presence: "self" },
      { name: "Product Team", kind: "agent_team", address: "/software_team", presence: "own_team" },
      { name: "Lead", kind: "agent", address: "/lead", presence: "not_in_run" },
    ] });
    const note = composeCollaboratorMentionNote("ask", [
      { name: "Code Reviewer", kind: "agent", address: "/software_team/reviewer", presence: "own_team" },
    ]);
    expect(note).toContain("- Code Reviewer (agent) at /software_team/reviewer, in your team: talk with it using send_message_to; don't delegate to it.");
  });

  it("`@` of the run's own definition fails, like an ineligible one", async () => {
    const run = harness();
    const ownReviewer = { ...port(), ownDefinition: () => ({ kind: "agent" as const, definitionId: "reviewer" }) };
    await expect(run.admission.resolveMentions(ownReviewer, [{ kind: "agent", definitionId: "reviewer" }], other))
      .resolves.toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Code Reviewer",
        message: "Code Reviewer is this run's own definition." });
  });

  it("`@` of an ineligible definition fails with its name and adds nothing", async () => {
    const run = harness();
    await expect(run.admission.resolveMentions(port(), [{ kind: "agent", definitionId: "local" }], other))
      .resolves.toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "local" });
    expect(run.steps).toEqual([]);
  });

  it("`@` addresses an in-run configured member; delegation never admits a second instance of it (REQ-002, AC-006)", async () => {
    const inRun = port({ configuredAgents: ["reviewer", "lead"] });
    expect((await admission.policy.listCandidates(inRun)).candidates.map((candidate) => candidate.definitionId))
      .toEqual(["reviewer", "lead", "designer", "product"]);
    await expect(admission.resolveMentions(inRun, [{ kind: "agent", definitionId: "reviewer" }, { kind: "agent", definitionId: "lead" }], other))
      .resolves.toEqual({ admitted: true, launchNotes: [], collaborators: [
        { name: "Code Reviewer", kind: "agent", address: "/reviewer", presence: "in_run" },
        { name: "Lead", kind: "agent", address: "/lead", presence: "in_run" },
      ] });
    // A catalog copy is never made of a definition that is already in the run.
    await expect(admission.policy.requireAdmissible(inRun, { kind: "agent", definitionId: "reviewer" }))
      .rejects.toMatchObject({ code: "COLLABORATOR_MENTION_UNAVAILABLE", message: "Code Reviewer is already in this run." });
    await expect(admission.policy.requireAdmissible(inRun, { kind: "agent_team", definitionId: "product" })).resolves.toMatchObject({ kind: "agent_team" });
    await expect(admission.policy.requireAdmissible(port({ applicationBound: true }), { kind: "agent", definitionId: "reviewer" })).rejects.toBeDefined();
    await expect(admission.policy.requireAdmissible(port(), { kind: "agent", definitionId: "local" })).rejects.toBeDefined();
    await expect(admission.policy.requireAdmissible(port(), { kind: "agent", definitionId: DAILY_ASSISTANT_AGENT_DEFINITION_ID })).rejects.toBeDefined();
  });

  it("derives address segments from names", () => {
    expect(collaboratorSegmentForName("Product Team")).toBe("product_team");
    expect(collaboratorSegmentForName("  Café—Reviewer v2 ")).toBe("cafe_reviewer_v2");
    expect(collaboratorSegmentForName("产品")).toBe("collaborator");
  });

  it("lists every eligible definition once at its in-run or catalog address, with the `@` exclusions (Q-2, AR-002)", async () => {
    const listed = await admission.policy.listEligible(port({ configuredAgents: ["reviewer"] }));
    expect(listed).toEqual([
      { name: "Code Reviewer", kind: "agent", address: "/reviewer", description: "Code Reviewer description" },
      { name: "Lead", kind: "agent", address: "/lead", description: "Lead description" },
      { name: "Designer", kind: "agent", address: "/designer", description: "Designer description" },
      { name: "Product Team", kind: "agent_team", address: "/product_team", description: "Product Team description" },
    ]);
    expect(listed.some((entry) => "inRun" in entry)).toBe(false);
    expect(await admission.policy.listEligible(port({ applicationBound: true }))).toEqual([]);
  });

  it("a catalog task source snapshots the definition and root settings without identities (Q-1)", async () => {
    const run = harness();
    const source = await run.admission.catalogTaskSource(port(), { address: "/product_team", senderRunId: "pm" });
    expect(source).toEqual({ name: "Product Team", launchNotes: [], source: {
      kind: "agent_team", teamDefinitionId: "product", coordinatorAddress: "/product_team/lead",
      members: [
        { address: "/product_team/lead", agentDefinitionId: "lead", launchConfiguration: launch, followsTeam: true },
        { address: "/product_team/designer", agentDefinitionId: "designer", launchConfiguration: launch, followsTeam: true },
      ],
      handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["When UI work is needed."] }],
      defaultLaunchConfiguration: launch,
      defaultLaunchSource: { origin: "inherited", fallbacks: [] },
    } });
    expect(run.steps).toEqual(["validate:1"]);
    expect(await run.admission.catalogTaskSource(port(), { address: "/nobody", senderRunId: "pm" })).toBeNull();
    await expect(harness({ invalid: true }).admission.catalogTaskSource(port(), { address: "/code_reviewer", senderRunId: "pm" }))
      .rejects.toMatchObject({ code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Code Reviewer" });
  });
});
