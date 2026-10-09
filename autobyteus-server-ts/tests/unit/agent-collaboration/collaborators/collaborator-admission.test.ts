import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { DAILY_ASSISTANT_AGENT_DEFINITION_ID, MEMORY_COMPACTOR_AGENT_DEFINITION_ID } from "../../../../src/built-in-agents/built-in-agent-registry.js";
import { collaboratorSegmentForName } from "../../../../src/agent-collaboration/collaborators/catalog-address-map.js";
import { createCollaboratorAdmission } from "../../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorDefinitionCatalog } from "../../../../src/agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { buildInRunPlacements, type CollaboratorRootPort } from "../../../../src/agent-collaboration/collaborators/collaborator-root-port.js";
import { composeCollaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { resolveCollaboratorCopySource } from "../../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
import type { CollaboratorIdentityPorts } from "../../../../src/agent-collaboration/collaborators/collaborator-identity-allocator.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import type { CollaboratorEntry } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { createHash } from "node:crypto";

const hash6 = (id: string): string => createHash("sha256").update(id).digest("hex").slice(0, 6);

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
  listTeamDefinitions: async () => definitions.teams,
  getAgentDefinition: async (id) => definitions.agents.find((item) => item.id === id) ?? null,
  getTeamDefinition: async (id) => definitions.teams.find((item) => item.id === id) ?? null,
};
const launch = {
  runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt", llmConfig: { effort: "high" },
  autoExecuteTools: false, workspaceRootPath: "/work",
};

const port = (input: {
  collaborators?: CollaboratorEntry[];
  configuredAgents?: string[];
  addresses?: string[];
  applicationBound?: boolean;
} = {}): CollaboratorRootPort => ({
  rootKind: "agent_team",
  isApplicationBound: input.applicationBound ?? false,
  rootLaunchConfiguration: () => launch,
  ownDefinition: () => ({ kind: "agent_team", definitionId: "se-team" }),
  inRunPlacementsByDefinition: () => buildInRunPlacements({
    configured: (input.configuredAgents ?? []).map((id) => ({ ref: { kind: "agent" as const, definitionId: id }, address: `/${id}` as never })),
    collaborators: input.collaborators ?? [],
  }),
  collaborators: () => input.collaborators ?? [],
  addressesInUse: () => new Set([...(input.addresses ?? ["/coordinator"]), ...(input.collaborators ?? []).map((entry) => entry.address)]),
});

/** Records every step so the admission order can be asserted. */
const harness = (options: { invalid?: boolean; addFails?: boolean } = {}) => {
  const steps: string[] = [];
  const validator: RunModelSelectionValidator = {
    validate: vi.fn(),
    validateMany: vi.fn(async (inputs) => {
      steps.push(`validate:${inputs.length}`);
      return inputs.map(() => options.invalid ? { kind: "model_unavailable" as const } : { kind: "valid" as const, selection: { llmModelIdentifier: "gpt", llmConfig: null } });
    }),
  } as unknown as RunModelSelectionValidator;
  let next = 0;
  const identities: CollaboratorIdentityPorts = {
    agentRuns: { allocateForAgentDefinition: async (id) => { steps.push(`allocate:${id}`); return `${id}-run-${++next}`; } },
    taskTeams: {
      create: async ({ source }) => {
        steps.push(`allocate-team:${source.teamDefinitionId}`);
        return { teamNode: { ...source, teamRunId: `${source.teamDefinitionId}-team-${++next}`,
          children: source.children.map((child) => child.kind === "agent" ? { ...child, agentRunId: `${child.agentDefinitionId}-run-${++next}` } : child) } };
      },
    },
  };
  const added: CollaboratorEntry[] = [];
  const addEntries = async (entries: readonly CollaboratorEntry[]) => {
    steps.push(`add:${entries.length}`);
    if (options.addFails) throw new Error("disk full");
    added.push(...entries);
  };
  return { steps, added, admission: createCollaboratorAdmission(catalog, validator), identities, addEntries };
};

describe("collaborator policy and admission", () => {
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
    const reviewerEntry = { kind: "agent", address: "/reviewer_in_run", agentDefinitionId: "reviewer" } as unknown as CollaboratorEntry;
    const result = await run.admission.resolveMentions(port({ collaborators: [reviewerEntry] }),
      [{ kind: "agent", definitionId: "reviewer" }, { kind: "agent_team", definitionId: "product" }]);
    // An in-run definition resolves to its entry's address and is marked; any other to its catalog address.
    expect(result).toEqual({ admitted: true, collaborators: [
      { name: "Code Reviewer", kind: "agent", address: "/reviewer_in_run", presence: "in_run" },
      { name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" },
    ] });
    // Runnability is checked when the agent delegates, not here; nothing is allocated or added.
    expect(run.steps).toEqual([]);
    expect(run.added).toEqual([]);
    const note = composeCollaboratorMentionNote("please review", result.admitted ? result.collaborators : []);
    expect(note).toContain("[Mentioned collaborators]\n- Code Reviewer (Agent) at /reviewer_in_run, already in this run\n- Product Team (Agent Team) at /product_team\n");
    expect(note).toContain("delegate_task");
    expect(note).toContain("messaged directly with send_message_to at its address");
    await expect(run.admission.resolveMentions(port(), [])).resolves.toEqual({ admitted: true, collaborators: [] });
  });

  it("`@` of the run's own definition fails, like an ineligible one", async () => {
    const run = harness();
    const ownReviewer = { ...port(), ownDefinition: () => ({ kind: "agent" as const, definitionId: "reviewer" }) };
    await expect(run.admission.resolveMentions(ownReviewer, [{ kind: "agent", definitionId: "reviewer" }]))
      .resolves.toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Code Reviewer",
        message: "Code Reviewer is this run's own definition." });
  });

  it("`@` of an ineligible definition fails with its name and adds nothing", async () => {
    const run = harness();
    await expect(run.admission.resolveMentions(port(), [{ kind: "agent", definitionId: "local" }]))
      .resolves.toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "local" });
    expect(run.steps).toEqual([]);
  });

  it("bring-in validates, allocates and commits, in that order", async () => {
    const run = harness();
    const result = await run.admission.ensure(port(), {
      senderRunId: "focused",
      definitions: [{ kind: "agent", definitionId: "reviewer" }, { kind: "agent_team", definitionId: "product" }],
      identities: run.identities, addEntries: run.addEntries,
    });
    expect(run.steps).toEqual(["validate:3", "allocate:reviewer", "allocate-team:product", "add:2"]);
    expect(result).toEqual({
      admitted: true,
      collaborators: [
        { name: "Code Reviewer", kind: "agent", address: "/code_reviewer", presence: "not_in_run" },
        { name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" },
      ],
    });
    expect(run.added).toEqual([
      expect.objectContaining({ kind: "agent", address: "/code_reviewer", agentRunId: "reviewer-run-1", platformAgentRunId: null }),
      expect.objectContaining({
        kind: "agent_team", address: "/product_team", teamRunId: "product-team-2", taskExecutions: [],
        members: [
          { address: "/product_team/lead", agentDefinitionId: "lead", agentRunId: "lead-run-3", platformAgentRunId: null },
          { address: "/product_team/designer", agentDefinitionId: "designer", agentRunId: "designer-run-4", platformAgentRunId: null },
        ],
      }),
    ]);
  });

  it("rejects the whole send when a placement cannot run, before allocating or writing", async () => {
    const run = harness({ invalid: true });
    const result = await run.admission.ensure(port(), {
      senderRunId: "focused", definitions: [{ kind: "agent_team", definitionId: "product" }],
      identities: run.identities, addEntries: run.addEntries,
    });
    expect(result).toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Product Team" });
    expect(!result.admitted && result.message).toContain("not available");
    expect(run.steps).toEqual(["validate:2"]);
  });

  it("returns COLLABORATOR_ADD_FAILED when the root cannot commit the entries", async () => {
    const run = harness({ addFails: true });
    const result = await run.admission.ensure(port(), {
      senderRunId: "focused", definitions: [{ kind: "agent", definitionId: "reviewer" }],
      identities: run.identities, addEntries: run.addEntries,
    });
    expect(result).toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Code Reviewer", message: "disk full" });
  });

  it("reuses the entry of an already-added definition: no validation, allocation or write", async () => {
    const first = harness();
    await first.admission.ensure(port(), {
      senderRunId: "a", definitions: [{ kind: "agent", definitionId: "reviewer" }],
      identities: first.identities, addEntries: first.addEntries,
    });
    const again = harness();
    const result = await again.admission.ensure(port({ collaborators: first.added }), {
      senderRunId: "b", definitions: [{ kind: "agent", definitionId: "reviewer" }],
      identities: again.identities, addEntries: again.addEntries,
    });
    expect(again.steps).toEqual([]);
    expect(result).toMatchObject({ admitted: true, collaborators: [{ name: "Code Reviewer", kind: "agent", address: "/code_reviewer" }] });
  });

  it("`@` addresses an in-run configured member or collaborator-Team member; bring-in never admits a second instance (REQ-002, AC-006)", async () => {
    const run = harness();
    await run.admission.ensure(port(), {
      senderRunId: "f", definitions: [{ kind: "agent_team", definitionId: "product" }],
      identities: run.identities, addEntries: run.addEntries,
    });
    const inRun = port({ collaborators: run.added, configuredAgents: ["reviewer"] });
    expect((await admission.policy.listCandidates(inRun)).candidates.map((candidate) => candidate.definitionId))
      .toEqual(["reviewer", "lead", "designer", "product"]);
    await expect(admission.resolveMentions(inRun, [{ kind: "agent", definitionId: "reviewer" }, { kind: "agent", definitionId: "lead" }]))
      .resolves.toEqual({ admitted: true, collaborators: [
        { name: "Code Reviewer", kind: "agent", address: "/reviewer", presence: "in_run" },
        { name: "Lead", kind: "agent", address: "/product_team/lead", presence: "in_run" },
      ] });
    // Bring-in keeps the in-run rule: a configured member or a collaborator-Team member is not added again.
    await expect(admission.policy.requireAdmissible(inRun, { kind: "agent", definitionId: "reviewer" }))
      .rejects.toMatchObject({ code: "COLLABORATOR_MENTION_UNAVAILABLE", message: "Code Reviewer is already in this run." });
    await expect(admission.policy.requireAdmissible(inRun, { kind: "agent", definitionId: "lead" }))
      .rejects.toMatchObject({ message: "Lead is already in this run." });
    // A collaborator entry stays admissible: admission reuses it.
    await expect(admission.policy.requireAdmissible(inRun, { kind: "agent_team", definitionId: "product" })).resolves.toMatchObject({ kind: "agent_team" });
    const failed = harness({ invalid: true });
    await failed.admission.ensure(port(), {
      senderRunId: "f", definitions: [{ kind: "agent_team", definitionId: "product" }],
      identities: failed.identities, addEntries: failed.addEntries,
    });
    const stillOffered = await admission.policy.listCandidates(port());
    expect(stillOffered.candidates.map((candidate) => candidate.definitionId)).toContain("product");
  });

  it("plans entries with the root settings, rebased Team layout and handoffs", async () => {
    const plan = await admission.plan(port({ addresses: ["/code_reviewer"] }), {
      senderRunId: "focused",
      definitions: [{ kind: "agent", definitionId: "reviewer" }, { kind: "agent_team", definitionId: "product" }],
      now: "2026-09-30T00:00:00.000Z",
    });
    // `/code_reviewer` is in use, so the catalog address map suffixes the definition ID's hash.
    expect(plan.newPlans).toEqual([
      { kind: "agent", name: "Code Reviewer", address: `/code_reviewer_${hash6("reviewer")}`, agentDefinitionId: "reviewer", launchConfiguration: launch, addedAt: "2026-09-30T00:00:00.000Z", addedViaAgentRunId: "focused" },
      {
        kind: "agent_team", name: "Product Team", address: "/product_team", teamDefinitionId: "product", coordinatorAddress: "/product_team/lead",
        members: [{ address: "/product_team/lead", agentDefinitionId: "lead" }, { address: "/product_team/designer", agentDefinitionId: "designer" }],
        handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["When UI work is needed."] }],
        defaultLaunchConfiguration: launch, addedAt: "2026-09-30T00:00:00.000Z", addedViaAgentRunId: "focused",
      },
    ]);
  });

  it("projects an extra copy from an entry with the entry's settings and pending identities (REQ-013)", async () => {
    const run = harness();
    await run.admission.ensure(port(), {
      senderRunId: "f", definitions: [{ kind: "agent_team", definitionId: "product" }],
      identities: run.identities, addEntries: run.addEntries,
    });
    expect(resolveCollaboratorCopySource(run.added, "/product_team")).toMatchObject({
      kind: "agent_team",
      node: { address: "/product_team", coordinatorAddress: "/product_team/lead", children: [
        { kind: "agent", address: "/product_team/lead", agentRunId: "collaborator-copy", runtimeKind: RuntimeKind.CODEX_APP_SERVER, workspaceRootPath: "/work" },
        { address: "/product_team/designer" },
      ] },
      handoffs: [{ from: "/product_team/lead", to: "/product_team/designer" }],
    });
    expect(resolveCollaboratorCopySource(run.added, "/product_team/designer")).toMatchObject({
      kind: "agent", node: { address: "/product_team/designer", agentDefinitionId: "designer", agentRunId: "collaborator-copy" },
    });
    expect(resolveCollaboratorCopySource(run.added, "/nobody")).toBeNull();
  });

  it("rejects the whole send when any mention is ineligible or already configured", async () => {
    const admit = (mentions: { kind: "agent" | "agent_team"; definitionId: string }[], input = {}) => {
      const run = harness();
      return run.admission.ensure(port(input), {
        senderRunId: "f", definitions: mentions, identities: run.identities, addEntries: run.addEntries,
      });
    };
    const failed = { admitted: false, code: "COLLABORATOR_ADD_FAILED" };
    await expect(admit([{ kind: "agent", definitionId: "reviewer" }, { kind: "agent", definitionId: DAILY_ASSISTANT_AGENT_DEFINITION_ID }])).resolves.toMatchObject(failed);
    await expect(admit([{ kind: "agent", definitionId: "local" }])).resolves.toMatchObject(failed);
    await expect(admit([{ kind: "agent_team", definitionId: "se-team" }])).resolves.toMatchObject(failed);
    await expect(admit([{ kind: "agent", definitionId: "lead" }], { configuredAgents: ["lead"] }))
      .resolves.toMatchObject({ ...failed, collaboratorName: "Lead", message: "Lead is already in this run." });
    await expect(admit([{ kind: "agent", definitionId: "reviewer" }], { applicationBound: true })).resolves.toMatchObject(failed);
  });

  it("derives address segments from names", () => {
    expect(collaboratorSegmentForName("Product Team")).toBe("product_team");
    expect(collaboratorSegmentForName("  Café—Reviewer v2 ")).toBe("cafe_reviewer_v2");
    expect(collaboratorSegmentForName("产品")).toBe("collaborator");
  });

  it("lists every eligible definition once at its in-run or catalog address, with the `@` exclusions (Q-2, AR-002)", async () => {
    const run = harness();
    await run.admission.ensure(port(), {
      senderRunId: "f", definitions: [{ kind: "agent_team", definitionId: "product" }],
      identities: run.identities, addEntries: run.addEntries,
    });
    const listed = await admission.policy.listEligible(port({ configuredAgents: ["reviewer"], collaborators: run.added }));
    expect(listed).toEqual([
      { name: "Code Reviewer", kind: "agent", address: "/reviewer", description: "Code Reviewer description" },
      { name: "Lead", kind: "agent", address: "/product_team/lead", description: "Lead description" },
      { name: "Designer", kind: "agent", address: "/product_team/designer", description: "Designer description" },
      { name: "Product Team", kind: "agent_team", address: "/product_team", description: "Product Team description" },
    ]);
    expect(listed.some((entry) => "inRun" in entry)).toBe(false);
    expect(await admission.policy.listEligible(port({ applicationBound: true }))).toEqual([]);
  });

  it("a catalog task source snapshots the definition and root settings without identities or an entry (Q-1)", async () => {
    const run = harness();
    const source = await run.admission.catalogTaskSource(port(), { address: "/product_team", senderRunId: "pm" });
    expect(source).toEqual({ name: "Product Team", source: {
      kind: "agent_team", teamDefinitionId: "product", coordinatorAddress: "/product_team/lead",
      members: [{ address: "/product_team/lead", agentDefinitionId: "lead" }, { address: "/product_team/designer", agentDefinitionId: "designer" }],
      handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["When UI work is needed."] }],
      defaultLaunchConfiguration: launch,
    } });
    expect(run.steps).toEqual(["validate:2"]);
    expect(run.added).toEqual([]);
    expect(await run.admission.catalogTaskSource(port(), { address: "/nobody", senderRunId: "pm" })).toBeNull();
    await expect(harness({ invalid: true }).admission.catalogTaskSource(port(), { address: "/code_reviewer", senderRunId: "pm" }))
      .rejects.toMatchObject({ code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Code Reviewer" });
  });
});
