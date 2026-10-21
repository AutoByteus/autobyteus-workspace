import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorDefinitionCatalog } from "../../../src/agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { NodeCatalogPort } from "../../../src/agent-collaboration/collaborators/node-catalog-port.js";
import { BUILT_IN_AGENT_DEFINITIONS } from "../../../src/built-in-agents/built-in-agent-registry.js";
import type { RunModelSelectionValidator } from "../../../src/llm-management/services/run-model-selection-service.js";
import { RemoteDelegationReceiver } from "../../../src/remote-collaboration/inbound/remote-delegation-receiver.js";
import { peerRefusalText } from "../../../src/remote-collaboration/domain/remote-refusals.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/**
 * autobyteus-245 DS-001 on node B: the target is resolved through the real `CollaboratorAdmission` with the node
 * catalog port. AC-201 (an Agent's default, accepted), AC-202 (no default), AC-203 (a default that can't run),
 * AC-204 (not found: unknown, built-in, team-local, application-owned), AC-205 (temp workspace, auto-approve on),
 * the Team refusal (N-201: the name from the eligibility owner), and the refusal texts on A.
 */

const TEMP = "/data/temp_workspace";
const opus = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: { thinking: "on" } };
const sol = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig: null };
const agent = (id: string, name: string, defaultLaunchConfig: AgentDefinition["defaultLaunchConfig"] = null, ownershipScope: AgentDefinition["ownershipScope"] = "shared") =>
  new AgentDefinition({ id, name, description: name, instructions: "x", ownershipScope, defaultLaunchConfig });
const builtIn = BUILT_IN_AGENT_DEFINITIONS[0]!;

const setup = (options: { codexEnabled?: boolean; prepareFails?: string } = {}) => {
  const agents = [
    agent("publisher", "Publisher", opus),
    agent("reviewer", "Reviewer"),
    agent("coder", "Coder", sol),
    agent("drafter", "Drafter", { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: null, llmConfig: null }),
    agent("member-only", "Member Only", opus, "team_local"),
    agent("app-agent", "App Agent", opus, "application_owned"),
    agent(builtIn.id, "Built In", opus),
  ];
  const teams = [new AgentTeamDefinition({
    id: "studio", name: "Studio Team", description: "Studio", instructions: "x", coordinatorMemberName: "publisher",
    nodes: [new TeamMember({ memberName: "publisher", ref: "publisher", refScope: "shared" })],
  })];
  const catalog: CollaboratorDefinitionCatalog = {
    listAgentDefinitions: async () => agents,
    listTeamDefinitions: async () => teams,
    getAgentDefinition: async (id) => agents.find((item) => item.id === id) ?? null,
    getTeamDefinition: async (id) => teams.find((item) => item.id === id) ?? null,
  };
  const validator = {
    validate: vi.fn(),
    validateMany: vi.fn(async (inputs: readonly { selection: { llmModelIdentifier: string } }[]) =>
      inputs.map(({ selection }) => ({ kind: "valid" as const, selection: { llmModelIdentifier: selection.llmModelIdentifier, llmConfig: null } }))),
  } as unknown as RunModelSelectionValidator;
  const availability = {
    getRuntimeAvailability: vi.fn(async (runtimeKind: RuntimeKind) => {
      const off = runtimeKind === RuntimeKind.CODEX_APP_SERVER && options.codexEnabled === false;
      return { runtimeKind, enabled: !off, reason: off ? "Codex App Server command 'codex' is not available." : null };
    }),
  };
  const admission = createCollaboratorAdmission(catalog, validator, availability);
  const prepareAgentRun = vi.fn(async () => {
    if (options.prepareFails) throw new Error(options.prepareFails);
    return { runId: "publisher_7f3a" } as never;
  });
  const receiver = new RemoteDelegationReceiver({ admission: () => admission, catalogPort: new NodeCatalogPort(TEMP), agentRuns: { prepareAgentRun } });
  const start = (address: string) => receiver.start({
    fromNodeId: "srv_node_a", toNodeId: "srv_node_b", address,
    delegator: { agentRunId: "lead_run" }, coordinatingRun: { kind: "agent_team", runId: "team_a" },
  }, { nodeId: "srv_node_a", name: "desktop", baseUrl: "http://a", addedAt: "2026-10-21T00:00:00.000Z" });
  return { start, prepareAgentRun };
};

describe("RemoteDelegationReceiver resolves through the shared catalog admission", () => {
  it("AC-201 / AC-205: prepares a run of the Agent at its catalog address with its default, the temp workspace and auto-approve on", async () => {
    const node = setup();
    await expect(node.start("/publisher")).resolves.toEqual({ accepted: true, agentRunId: "publisher_7f3a" });
    expect(node.prepareAgentRun).toHaveBeenCalledExactlyOnceWith({
      agentDefinitionId: "publisher", workspaceRootPath: TEMP, autoExecuteTools: true,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: { thinking: "on" },
      delegatedFrom: { nodeId: "srv_node_a", coordinatingRun: { kind: "agent_team", runId: "team_a" }, delegatorAgentRunId: "lead_run" },
    });
  });

  it("AC-204: refuses an address with no delegable Agent (unknown, built-in, team-local, application-owned) and prepares nothing", async () => {
    const node = setup();
    for (const address of ["/unknown", "/built_in", "/member_only", "/app_agent"]) {
      await expect(node.start(address), address).resolves.toEqual({ accepted: false, code: "AGENT_NOT_FOUND", message: address });
    }
    expect(node.prepareAgentRun).not.toHaveBeenCalled();
  });

  it("refuses a shared Agent Team by its name, before any launch is resolved (until autobyteus-247)", async () => {
    const node = setup();
    await expect(node.start("/studio_team")).resolves.toEqual({ accepted: false, code: "REMOTE_TEAMS_NOT_SUPPORTED",
      message: "Studio Team is an Agent Team.", targetName: "Studio Team" });
    expect(node.prepareAgentRun).not.toHaveBeenCalled();
  });

  it("AC-202: refuses an Agent with no default, or an incomplete one, as NO_DEFAULT_RUNTIME, and prepares nothing", async () => {
    const node = setup();
    await expect(node.start("/reviewer")).resolves.toEqual({ accepted: false, code: "NO_DEFAULT_RUNTIME",
      message: "There is no default runtime configured for the target agent Reviewer", targetName: "Reviewer" });
    await expect(node.start("/drafter")).resolves.toMatchObject({ accepted: false, code: "NO_DEFAULT_RUNTIME", targetName: "Drafter" });
    expect(node.prepareAgentRun).not.toHaveBeenCalled();
  });

  it("AC-203: refuses a default that can't run here with its reason, and a run that could not be prepared", async () => {
    await expect(setup({ codexEnabled: false }).start("/coder")).resolves.toEqual({ accepted: false, code: "AGENT_CANNOT_RUN",
      message: "Codex App Server command 'codex' is not available.", targetName: "Coder" });
    await expect(setup({ prepareFails: "The workspace is not writable." }).start("/publisher")).resolves.toEqual({ accepted: false,
      code: "AGENT_CANNOT_RUN", message: "The workspace is not writable.", targetName: "Publisher" });
  });
});

describe("peerRefusalText words B's refusals on A (design § Contract Between Nodes)", () => {
  it("names the node, the address or the target", () => {
    expect(peerRefusalText("docker", "AGENT_NOT_FOUND", "/publisher")).toBe('Node "docker" has no Agent at /publisher that can be delegated to.');
    expect(peerRefusalText("docker", "REMOTE_TEAMS_NOT_SUPPORTED", "Studio Team is an Agent Team.", "Studio Team"))
      .toBe('Studio Team on node "docker" is an Agent Team; Agent Teams on another node are not supported yet.');
    expect(peerRefusalText("docker", "NO_DEFAULT_RUNTIME", "There is no default runtime configured for the target agent Reviewer", "Reviewer"))
      .toBe('There is no default runtime configured for the target agent Reviewer on node "docker".');
    expect(peerRefusalText("docker", "AGENT_CANNOT_RUN", "Codex App Server command 'codex' is not available.", "Coder"))
      .toBe(`The Agent Coder on node "docker" cannot run there: Codex App Server command 'codex' is not available.`);
  });
});
