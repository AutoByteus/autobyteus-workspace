import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { InternalAgentVisibility } from "../../../../src/agent-definition/services/internal-agent-visibility.js";
import {
  createCollaboratorAdmission, createCollaboratorDefinitionCatalog,
} from "../../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { NodeCatalogPort } from "../../../../src/agent-collaboration/collaborators/node-catalog-port.js";
import { RemoteCatalogLister } from "../../../../src/remote-collaboration/inbound/remote-catalog-lister.js";
import type { RunModelSelectionValidator } from "../../../../src/llm-management/services/run-model-selection-service.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { MODEL_ROUTER_AGENT_DEFINITION_ID } from "../../../../src/built-in-agents/built-in-agent-registry.js";

/**
 * autobyteus-308 REQ-005 / AC-003, AC-005: an internal agent is not a collaborator while "Show internal agents" is
 * off: `list_available_agents`, `@` candidates, `@` by ID, catalog delegation (whose refusal is "not an available
 * agent") and a peer's available-agents answer all derive from `isEligibleAgent`. With the setting on, it behaves like
 * any other agent. Synthesized definitions only. autobyteus-455 REQ-002 / QR-001: the real Model Router stays out with
 * the setting on too, by its own registry mark, not by the internal rule.
 */
const launch = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt", llmConfig: null };
const agents = [
  new AgentDefinition({ id: "reviewer", name: "Code Reviewer", description: "Reviews", instructions: "x", defaultLaunchConfig: launch }),
  new AgentDefinition({ id: "router", name: "Model Router", description: "Routes", instructions: "x", defaultLaunchConfig: launch, internal: true }),
  new AgentDefinition({ id: MODEL_ROUTER_AGENT_DEFINITION_ID, name: "Built-in Model Router", description: "Routes", instructions: "x",
    defaultLaunchConfig: launch, internal: true }),
];

const setup = () => {
  let shown = false;
  const visibility = new InternalAgentVisibility({
    definitions: { getAgentDefinitionsWithTeamLocal: async () => agents },
    readShowInternalAgents: () => shown,
  });
  const catalog = createCollaboratorDefinitionCatalog({
    agents: { getAllAgentDefinitions: async () => agents, getAgentDefinitionById: async (id) => agents.find((agent) => agent.id === id) ?? null },
    teams: { getAllDefinitions: async () => [], getDefinitionById: async () => null },
    visibility,
  });
  const admission = createCollaboratorAdmission(catalog, { validate: vi.fn(), validateMany: vi.fn() } as unknown as RunModelSelectionValidator,
    { getRuntimeAvailability: async (runtimeKind) => ({ runtimeKind, enabled: true, reason: null }) });
  const port = new NodeCatalogPort("/data/temp_workspace");
  return { admission, port, show: (value: boolean) => { shown = value; }, lister: new RemoteCatalogLister({ policy: () => admission.policy, catalogPort: port }) };
};

describe("internal agents and collaboration eligibility (autobyteus-308)", () => {
  it("while hidden: not listed, not an `@` candidate, `@` by ID fails, no catalog address to delegate to, not offered to peers (AC-003)", async () => {
    const { admission, port, lister } = setup();
    expect((await admission.policy.listEligible(port)).map((entry) => entry.name)).toEqual(["Code Reviewer"]);
    expect((await admission.policy.listCandidates(port)).candidates.map((candidate) => candidate.definitionId)).toEqual(["reviewer"]);
    await expect(admission.policy.requireEligible(port, { kind: "agent", definitionId: "router" }))
      .rejects.toMatchObject({ code: "COLLABORATOR_MENTION_INVALID" });
    // No catalog address: every root then refuses delegate_task with "not the address of an available agent or agent team".
    await expect(admission.catalogDefinitionAt(port, "/model_router")).resolves.toBeNull();
    await expect(lister.list()).resolves.toEqual({ accepted: true, agents: [
      { name: "Code Reviewer", kind: "agent", address: "/code_reviewer", description: "Reviews" },
    ] });
  });

  it("once shown (no restart): listed, an `@` candidate, delegable and offered to peers like other agents (AC-005)", async () => {
    const { admission, port, lister, show } = setup();
    expect(await admission.catalogDefinitionAt(port, "/model_router")).toBeNull();
    show(true);
    expect((await admission.policy.listEligible(port)).map((entry) => entry.name)).toEqual(["Code Reviewer", "Model Router"]);
    expect((await admission.policy.listCandidates(port)).candidates.map((candidate) => candidate.definitionId)).toEqual(["reviewer", "router"]);
    await expect(admission.policy.requireEligible(port, { kind: "agent", definitionId: "router" })).resolves.toMatchObject({ kind: "agent" });
    await expect(admission.catalogDefinitionAt(port, "/model_router")).resolves.toMatchObject({ kind: "agent" });
    expect((await lister.list()).agents.map((entry) => entry.address)).toEqual(["/code_reviewer", "/model_router"]);
  });

  it("the built-in Model Router is never a collaborator, also with internal agents shown (autobyteus-455 AC-001, QR-001)", async () => {
    const { admission, port, lister, show } = setup();
    for (const shown of [false, true]) {
      show(shown);
      expect((await admission.policy.listEligible(port)).map((entry) => entry.address), `shown=${shown}`).not.toContain("/built_in_model_router");
      expect((await admission.policy.listCandidates(port)).candidates.map((candidate) => candidate.definitionId)).not.toContain(MODEL_ROUTER_AGENT_DEFINITION_ID);
      await expect(admission.policy.requireEligible(port, { kind: "agent", definitionId: MODEL_ROUTER_AGENT_DEFINITION_ID }))
        .rejects.toMatchObject({ code: "COLLABORATOR_MENTION_INVALID" });
      await expect(admission.catalogDefinitionAt(port, "/built_in_model_router")).resolves.toBeNull();
      expect((await lister.list()).agents.map((entry) => entry.address)).not.toContain("/built_in_model_router");
    }
  });
});
