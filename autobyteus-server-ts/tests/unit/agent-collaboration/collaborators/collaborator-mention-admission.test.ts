import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { DAILY_ASSISTANT_AGENT_DEFINITION_ID, MEMORY_COMPACTOR_AGENT_DEFINITION_ID } from "../../../../src/built-in-agents/built-in-agent-registry.js";
import { allocateCollaboratorAddress, collaboratorSegmentForName } from "../../../../src/agent-collaboration/collaborators/collaborator-address-allocator.js";
import { createCollaboratorMentionAdmission } from "../../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorDefinitionCatalog } from "../../../../src/agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { CollaboratorRootPort } from "../../../../src/agent-collaboration/collaborators/collaborator-root-port.js";
import { resolveCollaboratorCopySource } from "../../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
import type { CollaboratorIdentityPorts } from "../../../../src/agent-collaboration/collaborators/collaborator-identity-allocator.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import type { CollaboratorEntry } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
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
  configuredDefinitionIds: () => ({ agentDefinitionIds: new Set(input.configuredAgents ?? []), teamDefinitionIds: new Set(["se-team"]) }),
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
  return { steps, added, admission: createCollaboratorMentionAdmission(catalog, validator), identities, addEntries };
};

describe("collaborator policy and admission", () => {
  const admission = harness().admission;

  it("offers shared Agents then shared Teams, minus built-ins, non-shared and configured definitions", async () => {
    const list = await admission.policy.listCandidates(port({ configuredAgents: ["lead"] }));
    expect(list.availability).toBe("AVAILABLE");
    expect(list.candidates.map((candidate) => `${candidate.kind}:${candidate.definitionId}`))
      .toEqual(["agent:reviewer", "agent:designer", "agent_team:product"]);
    expect(list.candidates[2]).toMatchObject({ memberCount: 2, coordinatorName: "lead" });
    expect(await admission.policy.listCandidates(port({ applicationBound: true })))
      .toEqual({ availability: "UNAVAILABLE_APPLICATION_ROOT", candidates: [] });
  });

  it("validates, allocates, commits and then composes the note, in that order (DS-001)", async () => {
    const run = harness();
    const result = await run.admission.admit(port(), {
      focusedAgentRunId: "focused", content: "please review",
      mentions: [{ kind: "agent", definitionId: "reviewer" }, { kind: "agent_team", definitionId: "product" }],
      identities: run.identities, addEntries: run.addEntries,
    });
    expect(run.steps).toEqual(["validate:3", "allocate:reviewer", "allocate-team:product", "add:2"]);
    expect(result).toMatchObject({ admitted: true });
    expect(result.admitted && result.content).toContain("[Mentioned collaborators]");
    expect(result.admitted && result.content).toContain("send_message_to");
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
    const result = await run.admission.admit(port(), {
      focusedAgentRunId: "focused", content: "x", mentions: [{ kind: "agent_team", definitionId: "product" }],
      identities: run.identities, addEntries: run.addEntries,
    });
    expect(result).toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Product Team" });
    expect(!result.admitted && result.message).toContain("not available");
    expect(run.steps).toEqual(["validate:2"]);
  });

  it("returns COLLABORATOR_ADD_FAILED when the root cannot commit the entries", async () => {
    const run = harness({ addFails: true });
    const result = await run.admission.admit(port(), {
      focusedAgentRunId: "focused", content: "x", mentions: [{ kind: "agent", definitionId: "reviewer" }],
      identities: run.identities, addEntries: run.addEntries,
    });
    expect(result).toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Code Reviewer", message: "disk full" });
  });

  it("reuses the entry of an already-added definition: no validation, allocation or write", async () => {
    const first = harness();
    await first.admission.admit(port(), {
      focusedAgentRunId: "a", content: "x", mentions: [{ kind: "agent", definitionId: "reviewer" }],
      identities: first.identities, addEntries: first.addEntries,
    });
    const again = harness();
    const result = await again.admission.admit(port({ collaborators: first.added }), {
      focusedAgentRunId: "b", content: "again", mentions: [{ kind: "agent", definitionId: "reviewer" }],
      identities: again.identities, addEntries: again.addEntries,
    });
    expect(again.steps).toEqual([]);
    expect(result).toMatchObject({ admitted: true, collaborators: [{ name: "Code Reviewer", kind: "agent", address: "/code_reviewer" }] });
  });

  it("counts every entry and its Team members as in the run; a failed add is still offered", async () => {
    const run = harness();
    await run.admission.admit(port(), {
      focusedAgentRunId: "f", content: "x", mentions: [{ kind: "agent_team", definitionId: "product" }],
      identities: run.identities, addEntries: run.addEntries,
    });
    const after = await admission.policy.listCandidates(port({ collaborators: run.added }));
    expect(after.candidates.map((candidate) => candidate.definitionId)).toEqual(["reviewer"]);
    const failed = harness({ invalid: true });
    await failed.admission.admit(port(), {
      focusedAgentRunId: "f", content: "x", mentions: [{ kind: "agent_team", definitionId: "product" }],
      identities: failed.identities, addEntries: failed.addEntries,
    });
    const stillOffered = await admission.policy.listCandidates(port());
    expect(stillOffered.candidates.map((candidate) => candidate.definitionId)).toContain("product");
  });

  it("plans entries with the root settings, rebased Team layout and handoffs", async () => {
    const plan = await admission.plan(port({ addresses: ["/code_reviewer"] }), {
      focusedAgentRunId: "focused",
      mentions: [{ kind: "agent", definitionId: "reviewer" }, { kind: "agent_team", definitionId: "product" }],
      now: "2026-09-30T00:00:00.000Z",
    });
    expect(plan.newPlans).toEqual([
      { kind: "agent", name: "Code Reviewer", address: "/code_reviewer_2", agentDefinitionId: "reviewer", launchConfiguration: launch, addedAt: "2026-09-30T00:00:00.000Z", addedViaAgentRunId: "focused" },
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
    await run.admission.admit(port(), {
      focusedAgentRunId: "f", content: "x", mentions: [{ kind: "agent_team", definitionId: "product" }],
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
      return run.admission.admit(port(input), {
        focusedAgentRunId: "f", content: "x", mentions, identities: run.identities, addEntries: run.addEntries,
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

  it("derives address segments from names with deterministic suffixes", () => {
    expect(collaboratorSegmentForName("Product Team")).toBe("product_team");
    expect(collaboratorSegmentForName("  Café—Reviewer v2 ")).toBe("cafe_reviewer_v2");
    expect(collaboratorSegmentForName("产品")).toBe("collaborator");
    expect(allocateCollaboratorAddress("Product Team", ["/Product_Team", "/product_team_2", "/x/product_team_3"])).toBe("/product_team_3");
  });
});
