import { describe, expect, it, vi } from "vitest";
import type { PeerStartedRunDecisions } from "../../../src/remote-collaboration/inbound/peer-started-run-decisions.js";
import type { ModelRouterPort } from "../../../src/model-routing/domain/model-routing-types.js";
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
 * and the refusal texts on A. autobyteus-247: a shared Agent Team goes to the Team starter with its resolved source.
 */

const TEMP = "/data/temp_workspace";
const opus = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: { thinking: "on" } };
const sol = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig: null };
const agent = (id: string, name: string, defaultLaunchConfig: AgentDefinition["defaultLaunchConfig"] = null, ownershipScope: AgentDefinition["ownershipScope"] = "shared") =>
  new AgentDefinition({ id, name, description: name, instructions: "x", ownershipScope, defaultLaunchConfig });
const builtIn = BUILT_IN_AGENT_DEFINITIONS[0]!;

/** B's Model Routing, on: its runtimes (Claude with opus) and a router that is not asked here (every default is usable). */
const routingOn: ModelRouterPort = {
  openDelegation: async () => ({
    facts: { report: { checkedAt: "2026-10-26T09:00:00.000Z", agentRuntimes: [
      { runtime: RuntimeKind.CLAUDE_AGENT_SDK, name: "Claude", limits: "not reported", models: [{ id: "opus", name: "Opus" }] },
      { runtime: RuntimeKind.CODEX_APP_SERVER, name: "Codex", limits: "not reported", models: [{ id: "sol-6.1", name: "Sol" }] },
    ] } as never, signedOutRuntimes: new Set<string>() },
    notActiveReason: null,
    route: async () => ({ kind: "failed" as const, reason: "not expected" }),
  }),
};

const setup = (options: { codexEnabled?: boolean; prepareFails?: string; modelRouter?: ModelRouterPort } = {}) => {
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
  }), new AgentTeamDefinition({
    id: "bare", name: "Bare Team", description: "Bare", instructions: "x", coordinatorMemberName: "reviewer",
    nodes: [new TeamMember({ memberName: "reviewer", ref: "reviewer", refScope: "shared" })],
  })];
  const catalog: CollaboratorDefinitionCatalog = {
    listAgentDefinitions: async () => agents,
    isAgentHidden: () => false,
    listTeamDefinitions: async () => teams,
    getAgentDefinition: async (id) => agents.find((item) => item.id === id) ?? null,
    getTeamDefinition: async (id) => teams.find((item) => item.id === id) ?? null,
  };
  const validator = {
    validate: vi.fn(),
    // A valid check returns the canonical selection; these configs declare every key, so it equals the input.
    validateMany: vi.fn(async (inputs: readonly { selection: { llmModelIdentifier: string; llmConfig: Readonly<Record<string, unknown>> | null } }[]) =>
      inputs.map(({ selection }) => ({ kind: "valid" as const, selection: { llmModelIdentifier: selection.llmModelIdentifier, llmConfig: selection.llmConfig } }))),
  } as unknown as RunModelSelectionValidator;
  const availability = {
    getRuntimeAvailability: vi.fn(async (runtimeKind: RuntimeKind) => {
      const off = runtimeKind === RuntimeKind.CODEX_APP_SERVER && options.codexEnabled === false;
      return { runtimeKind, enabled: !off, reason: off ? "Codex App Server command 'codex' is not available." : null };
    }),
  };
  const admission = createCollaboratorAdmission(catalog, validator, availability, options.modelRouter);
  const prepareAgentRun = vi.fn(async () => {
    if (options.prepareFails) throw new Error(options.prepareFails);
    return { runId: "publisher_7f3a" } as never;
  });
  const teamAnswer = { accepted: true as const, kind: "agent_team" as const, teamRunId: "studio_team_1", coordinatorAddress: "/studio_team/publisher",
    members: [{ address: "/studio_team/publisher", agentRunId: "publisher_t1" }] };
  const startTeam = vi.fn(async () => teamAnswer);
  const decisions = { hold: vi.fn<PeerStartedRunDecisions["hold"]>() };
  const receiver = new RemoteDelegationReceiver({ admission: () => admission, catalogPort: new NodeCatalogPort(TEMP), agentRuns: { prepareAgentRun },
    teams: { start: startTeam }, decisions });
  const start = (address: string) => receiver.start({
    fromNodeId: "srv_node_a", toNodeId: "srv_node_b", address,
    delegator: { agentRunId: "lead_run" }, coordinatingRun: { kind: "agent_team", runId: "team_a" }, task: { text: "Publish it.", title: "Publish it.", taskKey: null, projectId: null, taskId: null },
  }, { nodeId: "srv_node_a", name: "desktop", baseUrl: "http://a", addedAt: "2026-10-21T00:00:00.000Z" });
  return { start, prepareAgentRun, startTeam, teamAnswer, decisions };
};

describe("RemoteDelegationReceiver resolves through the shared catalog admission", () => {
  it("AC-201 / AC-205: prepares a run of the Agent at its catalog address with its default, the temp workspace and auto-approve on", async () => {
    const node = setup();
    await expect(node.start("/publisher")).resolves.toEqual({ accepted: true, kind: "agent", agentRunId: "publisher_7f3a",
      launches: [{ address: "/publisher", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus",
        source: { origin: "agent_default", fallbacks: [] } }] });
    expect(node.prepareAgentRun).toHaveBeenCalledExactlyOnceWith({
      agentDefinitionId: "publisher", workspaceRootPath: TEMP, autoExecuteTools: true,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: { thinking: "on" },
      delegatedFrom: { nodeId: "srv_node_a", coordinatingRun: { kind: "agent_team", runId: "team_a" }, delegatorAgentRunId: "lead_run" },
    });
  });

  it("autobyteus-32 CR-001: with Model Routing on, B holds the copy's records naming the delegating node only (no run ID or agent name of A)", async () => {
    const node = setup({ modelRouter: routingOn });
    await expect(node.start("/publisher")).resolves.toMatchObject({ accepted: true, agentRunId: "publisher_7f3a" });
    expect(node.decisions.hold).toHaveBeenCalledOnce();
    const [runId, records] = node.decisions.hold.mock.calls[0]!;
    expect(runId).toBe("publisher_7f3a");
    expect(records).toEqual([expect.objectContaining({ agentAddress: "/publisher", source: "agent_default", fromNode: "desktop",
      delegatingRunId: null, delegatingAgentName: null, taskTitle: "Publish it.", taskId: null })]);
  });

  it("with Model Routing off, B holds no records", async () => {
    const node = setup();
    await node.start("/publisher");
    expect(node.decisions.hold).not.toHaveBeenCalled();
  });

  it("AC-204: refuses an address with no delegable Agent (unknown, built-in, team-local, application-owned) and prepares nothing", async () => {
    const node = setup();
    for (const address of ["/unknown", "/built_in", "/member_only", "/app_agent"]) {
      await expect(node.start(address), address).resolves.toEqual({ accepted: false, code: "AGENT_NOT_FOUND", message: address });
    }
    expect(node.prepareAgentRun).not.toHaveBeenCalled();
  });

  it("autobyteus-247 BEH-301: hands a shared Agent Team's resolved source to the Team starter, with the back-link; prepares no Agent run", async () => {
    const node = setup();
    await expect(node.start("/studio_team")).resolves.toEqual({ ...node.teamAnswer,
      launches: [expect.objectContaining({ address: "/studio_team/publisher", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" })] });
    expect(node.startTeam).toHaveBeenCalledExactlyOnceWith({
      address: "/studio_team", name: "Studio Team",
      delegatedFrom: { nodeId: "srv_node_a", coordinatingRun: { kind: "agent_team", runId: "team_a" }, delegatorAgentRunId: "lead_run" },
      source: expect.objectContaining({ kind: "agent_team", teamDefinitionId: "studio", coordinatorAddress: "/studio_team/publisher",
        members: [expect.objectContaining({ address: "/studio_team/publisher", agentDefinitionId: "publisher",
          launchConfiguration: expect.objectContaining({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus",
            workspaceRootPath: TEMP, autoExecuteTools: true }) })] }),
    });
    expect(node.prepareAgentRun).not.toHaveBeenCalled();
  });

  it("REQ-302 / AC-302: refuses a Team with an agent covered by no default, naming the Team, before anything starts", async () => {
    const node = setup();
    await expect(node.start("/bare_team")).resolves.toEqual({ accepted: false, code: "NO_DEFAULT_RUNTIME",
      message: "There is no default runtime configured for the target agent team Bare Team", target: { kind: "agent_team", name: "Bare Team" },
      modelRouting: { state: "off" } });
    expect(node.startTeam).not.toHaveBeenCalled();
  });

  it("AC-202: refuses an Agent with no default, or an incomplete one, as NO_DEFAULT_RUNTIME, and prepares nothing", async () => {
    const node = setup();
    await expect(node.start("/reviewer")).resolves.toEqual({ accepted: false, code: "NO_DEFAULT_RUNTIME",
      message: "There is no default runtime configured for the target agent Reviewer", target: { kind: "agent", name: "Reviewer" },
      modelRouting: { state: "off" } });
    await expect(node.start("/drafter")).resolves.toMatchObject({ accepted: false, code: "NO_DEFAULT_RUNTIME", target: { kind: "agent", name: "Drafter" } });
    expect(node.prepareAgentRun).not.toHaveBeenCalled();
  });

  it("AC-203: refuses a default that can't run here with its reason, and a run that could not be prepared", async () => {
    await expect(setup({ codexEnabled: false }).start("/coder")).resolves.toEqual({ accepted: false, code: "AGENT_CANNOT_RUN",
      message: "Codex App Server command 'codex' is not available.", target: { kind: "agent", name: "Coder" }, modelRouting: { state: "off" } });
    await expect(setup({ prepareFails: "The workspace is not writable." }).start("/publisher")).resolves.toEqual({ accepted: false,
      code: "AGENT_CANNOT_RUN", message: "The workspace is not writable.", target: { kind: "agent", name: "Publisher" } });
  });
});

describe("peerRefusalText words B's refusals on A (design § Contract Between Nodes)", () => {
  it("names the node, the address or the target, with the target's kind (autobyteus-261 DEC-407)", () => {
    expect(peerRefusalText("docker", "AGENT_NOT_FOUND", "/publisher")).toBe(
      'Node "docker" has no Agent or Agent Team at /publisher that can be delegated to. If you have list_available_agents, call it with this node to see what it offers.');
    expect(peerRefusalText("docker", "NO_DEFAULT_RUNTIME", "There is no default runtime configured for the target agent team Bare Team", { kind: "agent_team", name: "Bare Team" }))
      .toBe('There is no default runtime configured for the target agent team Bare Team on node "docker".');
    expect(peerRefusalText("docker", "NO_DEFAULT_RUNTIME", "There is no default runtime configured for the target agent Reviewer", { kind: "agent", name: "Reviewer" }))
      .toBe('There is no default runtime configured for the target agent Reviewer on node "docker".');
    expect(peerRefusalText("docker", "AGENT_CANNOT_RUN", "Codex App Server command 'codex' is not available.", { kind: "agent", name: "Coder" }))
      .toBe(`The Agent Coder on node "docker" cannot run there: Codex App Server command 'codex' is not available.`);
    expect(peerRefusalText("docker", "AGENT_CANNOT_RUN", "Codex App Server command 'codex' is not available.", { kind: "agent_team", name: "Studio Team" }))
      .toBe(`The Agent Team Studio Team on node "docker" cannot run there: Codex App Server command 'codex' is not available.`);
    expect(peerRefusalText("docker", "AGENT_CANNOT_RUN", "no model")).toBe(`The Agent at that address on node "docker" cannot run there: no model`);
  });
});
