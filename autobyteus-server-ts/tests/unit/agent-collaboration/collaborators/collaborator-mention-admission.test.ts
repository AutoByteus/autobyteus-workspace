import { describe, expect, it } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { DAILY_ASSISTANT_AGENT_DEFINITION_ID, MEMORY_COMPACTOR_AGENT_DEFINITION_ID } from "../../../../src/built-in-agents/built-in-agent-registry.js";
import { allocateCollaboratorAddress, collaboratorSegmentForName } from "../../../../src/agent-collaboration/collaborators/collaborator-address-allocator.js";
import { createCollaboratorMentionAdmission } from "../../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorDefinitionCatalog } from "../../../../src/agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { CollaboratorRootPort } from "../../../../src/agent-collaboration/collaborators/collaborator-root-port.js";
import { projectCollaboratorSource } from "../../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
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
  running?: string[];
  configuredAgents?: string[];
  addresses?: string[];
  applicationBound?: boolean;
} = {}): CollaboratorRootPort => ({
  rootKind: "agent_team",
  isApplicationBound: input.applicationBound ?? false,
  rootLaunchConfiguration: () => launch,
  configuredDefinitionIds: () => ({ agentDefinitionIds: new Set(input.configuredAgents ?? []), teamDefinitionIds: new Set(["se-team"]) }),
  collaborators: () => input.collaborators ?? [],
  hasTaskExecutionAt: (address) => (input.running ?? []).includes(address),
  addressesInUse: () => new Set(input.addresses ?? ["/coordinator"]),
});

describe("collaborator policy and admission", () => {
  const admission = createCollaboratorMentionAdmission(catalog);

  it("offers shared Agents then shared Teams, minus built-ins, non-shared and configured definitions", async () => {
    const list = await admission.policy.listCandidates(port({ configuredAgents: ["lead"] }));
    expect(list.availability).toBe("AVAILABLE");
    expect(list.candidates.map((candidate) => `${candidate.kind}:${candidate.definitionId}`))
      .toEqual(["agent:reviewer", "agent:designer", "agent_team:product"]);
    expect(list.candidates[2]).toMatchObject({ memberCount: 2, coordinatorName: "lead" });
    expect(await admission.policy.listCandidates(port({ applicationBound: true })))
      .toEqual({ availability: "UNAVAILABLE_APPLICATION_ROOT", candidates: [] });
  });

  it("counts a collaborator as in the run only once it has a task execution (AR-004)", async () => {
    const plan = await admission.plan(port(), { focusedAgentRunId: "focused", mentions: [{ kind: "agent_team", definitionId: "product" }], now: "2026-09-30T00:00:00.000Z" });
    const [entry] = plan.newEntries;
    expect(entry).toMatchObject({ kind: "agent_team", address: "/product_team", coordinatorAddress: "/product_team/lead" });
    const notYet = await admission.policy.listCandidates(port({ collaborators: [entry!] }));
    expect(notYet.candidates.map((candidate) => candidate.definitionId)).toContain("product");
    const running = await admission.policy.listCandidates(port({ collaborators: [entry!], running: ["/product_team"] }));
    expect(running.candidates.map((candidate) => candidate.definitionId)).toEqual(["reviewer"]);
  });

  it("reuses the entry for an already-added definition and allocates no new address", async () => {
    const first = await admission.plan(port(), { focusedAgentRunId: "a", mentions: [{ kind: "agent", definitionId: "reviewer" }], now: "2026-09-30T00:00:00.000Z" });
    const again = await admission.plan(port({ collaborators: [...first.newEntries], running: ["/code_reviewer"] }), {
      focusedAgentRunId: "b", mentions: [{ kind: "agent", definitionId: "reviewer" }], now: "2026-09-30T00:00:01.000Z",
    });
    expect(again.newEntries).toEqual([]);
    expect(again.resolved).toEqual([{ name: "Code Reviewer", kind: "agent", address: "/code_reviewer" }]);
  });

  it("builds entries with the root settings, rebased Team layout and handoffs, and no run identity", async () => {
    const plan = await admission.plan(port({ addresses: ["/code_reviewer"] }), {
      focusedAgentRunId: "focused",
      mentions: [{ kind: "agent", definitionId: "reviewer" }, { kind: "agent_team", definitionId: "product" }],
      now: "2026-09-30T00:00:00.000Z",
    });
    expect(plan.newEntries).toEqual([
      { kind: "agent", address: "/code_reviewer_2", agentDefinitionId: "reviewer", launchConfiguration: launch, addedAt: "2026-09-30T00:00:00.000Z", addedViaAgentRunId: "focused" },
      {
        kind: "agent_team", address: "/product_team", teamDefinitionId: "product", coordinatorAddress: "/product_team/lead",
        members: [{ address: "/product_team/lead", agentDefinitionId: "lead" }, { address: "/product_team/designer", agentDefinitionId: "designer" }],
        handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["When UI work is needed."] }],
        defaultLaunchConfiguration: launch, addedAt: "2026-09-30T00:00:00.000Z", addedViaAgentRunId: "focused",
      },
    ]);
    expect(projectCollaboratorSource(plan.newEntries[1]!)).toMatchObject({
      kind: "agent_team", address: "/product_team", coordinatorAddress: "/product_team/lead",
      children: [{ kind: "agent", address: "/product_team/lead", runtimeKind: RuntimeKind.CODEX_APP_SERVER, workspaceRootPath: "/work" }, { address: "/product_team/designer" }],
    });
  });

  it("rejects the whole plan when any mention is ineligible or already configured", async () => {
    const plan = (mentions: { kind: "agent" | "agent_team"; definitionId: string }[], input = {}) =>
      admission.plan(port(input), { focusedAgentRunId: "f", mentions, now: "2026-09-30T00:00:00.000Z" });
    await expect(plan([{ kind: "agent", definitionId: "reviewer" }, { kind: "agent", definitionId: DAILY_ASSISTANT_AGENT_DEFINITION_ID }]))
      .rejects.toMatchObject({ code: "COLLABORATOR_MENTION_INVALID" });
    await expect(plan([{ kind: "agent", definitionId: "local" }])).rejects.toMatchObject({ code: "COLLABORATOR_MENTION_INVALID" });
    await expect(plan([{ kind: "agent_team", definitionId: "se-team" }])).rejects.toMatchObject({ code: "COLLABORATOR_MENTION_INVALID" });
    await expect(plan([{ kind: "agent", definitionId: "lead" }], { configuredAgents: ["lead"] }))
      .rejects.toMatchObject({ code: "COLLABORATOR_MENTION_UNAVAILABLE" });
    await expect(plan([{ kind: "agent", definitionId: "reviewer" }], { applicationBound: true }))
      .rejects.toMatchObject({ code: "COLLABORATOR_MENTION_UNAVAILABLE" });
  });

  it("derives address segments from names with deterministic suffixes", () => {
    expect(collaboratorSegmentForName("Product Team")).toBe("product_team");
    expect(collaboratorSegmentForName("  Café—Reviewer v2 ")).toBe("cafe_reviewer_v2");
    expect(collaboratorSegmentForName("产品")).toBe("collaborator");
    expect(allocateCollaboratorAddress("Product Team", ["/Product_Team", "/product_team_2", "/x/product_team_3"])).toBe("/product_team_3");
  });
});
