import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorDefinitionCatalog } from "../../../src/agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { NodeCatalogPort } from "../../../src/agent-collaboration/collaborators/node-catalog-port.js";
import { buildInitialTeamRunExecutionTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import type { RunModelSelectionValidator } from "../../../src/llm-management/services/run-model-selection-service.js";
import { RemoteTeamRunStarter, TEAM_CHANGED_WHILE_STARTING } from "../../../src/remote-collaboration/inbound/remote-team-run-starter.js";
import type { TaskTeamExecutionSource } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/**
 * autobyteus-247 G-9 / N-302: B's Team creation from a resolved source. The source comes from the real
 * `CollaboratorAdmission` (node catalog port: temp workspace, auto-approve), and `createTeamRun` runs the real
 * `TeamRunService` and topology planner (only the root manager, the catalog and the workspaces are replaced).
 * Agent Team definitions are flat (direct Agent members), so every member maps by its address under the mount.
 */

const TEMP = "/data/temp_workspace";
const delegatedFrom = { nodeId: "srv_node_a", coordinatingRun: { kind: "agent" as const, runId: "assistant_a1" }, delegatorAgentRunId: "assistant_a1" };
const agent = (id: string, defaultLaunchConfig: AgentDefinition["defaultLaunchConfig"] = null) =>
  new AgentDefinition({ id, name: id, description: id, instructions: "x", ownershipScope: "shared", defaultLaunchConfig });

const setup = () => {
  const agents = [
    agent("lead", { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: { thinking: "on" } }),
    agent("writer"),
    agent("checker", { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig: null }),
  ];
  const team = new AgentTeamDefinition({
    id: "studio", name: "Studio Team", description: "Studio", instructions: "x", coordinatorMemberName: "lead", ownershipScope: "shared",
    defaultLaunchConfig: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "team-model", llmConfig: null },
    nodes: ["lead", "writer", "checker"].map((name) => new TeamMember({ memberName: name, ref: name, refScope: "shared" })),
  } as never);
  const definitions = new Map<string, AgentTeamDefinition>([["studio", team]]);
  const catalog: CollaboratorDefinitionCatalog = {
    listAgentDefinitions: async () => agents, listTeamDefinitions: async () => [...definitions.values()],
    isAgentHidden: () => false,
    getAgentDefinition: async (id) => agents.find((item) => item.id === id) ?? null, getTeamDefinition: async (id) => definitions.get(id) ?? null,
  };
  const validator = { validate: vi.fn(), validateMany: vi.fn(async (inputs: readonly { selection: { llmModelIdentifier: string; llmConfig: unknown } }[]) =>
    inputs.map(({ selection }) => ({ kind: "valid" as const, selection }))) } as unknown as RunModelSelectionValidator;
  const admission = createCollaboratorAdmission(catalog, validator, { getRuntimeAvailability: async (runtimeKind) => ({ runtimeKind, enabled: true, reason: null }) });
  const port = new NodeCatalogPort(TEMP);
  const resolve = async (address: string) => {
    const ref = await admission.catalogDefinitionAt(port, address);
    return (await admission.catalogTaskSourceOf(port, { ref: ref!, address })).source as TaskTeamExecutionSource;
  };

  let allocation = 0;
  const created: Array<{ config: unknown; teamDefinitionName: string; delegatedFrom?: unknown }> = [];
  const roots = new Map<string, { teamRunId: string; getExecutionTreeSnapshot(): unknown }>();
  const override = { coordinatorAddress: null as string | null };
  const manager = {
    createTeamRun: vi.fn(async (input: { config: { rootTeam: { teamRunId: string } }; teamDefinitionName: string; delegatedFrom?: typeof delegatedFrom }) => {
      created.push(input);
      const built = buildInitialTeamRunExecutionTree(input as never);
      const tree = { ...built, ...(input.delegatedFrom ? { delegatedFrom: input.delegatedFrom } : {}),
        rootTeam: { ...built.rootTeam, ...(override.coordinatorAddress ? { coordinatorAddress: override.coordinatorAddress } : {}) } };
      const root = { teamRunId: input.config.rootTeam.teamRunId, getExecutionTreeSnapshot: () => tree };
      roots.set(root.teamRunId, root);
      return root;
    }),
    terminateTeamRun: vi.fn(async (teamRunId: string) => roots.delete(teamRunId)),
  };
  const teamRuns = new TeamRunService({
    agentTeamRunManager: manager as never,
    teamDefinitionService: { getDefinitionById: async (id: string) => definitions.get(id) ?? null } as never,
    teamRunHistoryCatalogService: { recordTeamRunCreated: vi.fn(async () => undefined), recordTeamRunTerminated: vi.fn(async () => undefined) } as never,
    workspaceManager: { ensureWorkspaceByRootPath: vi.fn(async (rootPath: string) => ({ getBasePath: () => rootPath })) } as never,
    memoryDir: "/tmp/remote-team-run-starter",
    agentRunIdentityAllocator: { allocateForAgentDefinition: async (id: string) => `${id}_run_${++allocation}` },
    teamRunIdentityAllocator: { allocateForTeamDefinitionName: () => "studio_team_run" },
    tokenUsageReadiness: { assertCurrentSchemaReady: vi.fn(), assertExistingRunRestoreReady: vi.fn() },
    definitionAdmissionService: { requireAvailable: vi.fn(async (_kind: string, id: string) => ({ status: "available", subjectKind: "agent_team", definition: definitions.get(id) })) } as never,
  });
  const starter = new RemoteTeamRunStarter({ teamRuns });
  const start = async (address = "/studio_team") => starter.start({ source: await resolve(address), address: address as never, name: "Studio Team", delegatedFrom });
  return { start, resolve, created, roots, manager, definitions, team, override, starter, teamRuns, delegatedFrom };
};

describe("RemoteTeamRunStarter: a resolved Team source → createTeamRun (G-9)", () => {
  it("creates the Team run with every member's resolved launch, the Team default, the temp workspace, auto-approve and the back-link", async () => {
    const node = setup();
    const answer = await node.start();
    expect(answer).toEqual({
      accepted: true, kind: "agent_team", teamRunId: "studio_team_run", coordinatorAddress: "/studio_team/lead",
      members: [{ address: "/studio_team/lead", agentRunId: "lead_run_1" }, { address: "/studio_team/writer", agentRunId: "writer_run_2" },
        { address: "/studio_team/checker", agentRunId: "checker_run_3" }],
    });
    const tree = node.roots.get("studio_team_run")!.getExecutionTreeSnapshot() as never as {
      delegatedFrom: unknown; rootTeam: { coordinatorAddress: string; defaultLaunchConfiguration: unknown; members: Array<Record<string, unknown>> } };
    expect(tree.delegatedFrom).toEqual(node.delegatedFrom);
    expect(tree.rootTeam.coordinatorAddress).toBe("/lead");
    expect(tree.rootTeam.defaultLaunchConfiguration).toMatchObject({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "team-model",
      workspaceRootPath: TEMP, autoExecuteTools: true });
    // Each agent's own default; an agent without one takes the Team's (REQ-302). Every agent: temp workspace, auto-approve.
    expect(tree.rootTeam.members.map((member) => [member.address, member.agentDefinitionId,
      (member.launchConfiguration as { runtimeKind: string }).runtimeKind, (member.launchConfiguration as { llmModelIdentifier: string }).llmModelIdentifier,
      (member.launchConfiguration as { workspaceRootPath: string }).workspaceRootPath, (member.launchConfiguration as { autoExecuteTools: boolean }).autoExecuteTools])).toEqual([
      ["/lead", "lead", RuntimeKind.CLAUDE_AGENT_SDK, "opus", TEMP, true],
      ["/writer", "writer", RuntimeKind.CODEX_APP_SERVER, "team-model", TEMP, true],
      ["/checker", "checker", RuntimeKind.CODEX_APP_SERVER, "sol-6.1", TEMP, true],
    ]);
  });

  it("N-302: a member added to the definition between resolution and creation is refused; nothing is created", async () => {
    const node = setup();
    const source = await node.resolve("/studio_team");
    node.team.nodes = [...node.team.nodes, new TeamMember({ memberName: "late", ref: "writer", refScope: "shared" })];
    await expect(node.starter.start({ source, address: "/studio_team" as never, name: "Studio Team", delegatedFrom: node.delegatedFrom }))
      .resolves.toEqual({ accepted: false, code: "AGENT_CANNOT_RUN", message: TEAM_CHANGED_WHILE_STARTING, target: { kind: "agent_team", name: "Studio Team" } });
    expect(node.created).toEqual([]);
  });

  it("N-302: a member removed, or of another Agent, is refused the same way", async () => {
    for (const edit of [
      (team: AgentTeamDefinition) => { team.nodes = team.nodes.filter((member) => member.memberName !== "checker"); },
      (team: AgentTeamDefinition) => { team.nodes = team.nodes.map((member) => member.memberName === "writer" ? new TeamMember({ memberName: "writer", ref: "checker", refScope: "shared" }) : member); },
    ]) {
      const node = setup();
      const source = await node.resolve("/studio_team");
      edit(node.team);
      await expect(node.starter.start({ source, address: "/studio_team" as never, name: "Studio Team", delegatedFrom: node.delegatedFrom }))
        .resolves.toMatchObject({ accepted: false, code: "AGENT_CANNOT_RUN", message: TEAM_CHANGED_WHILE_STARTING });
      expect(node.created).toEqual([]);
    }
  });

  it("N-302: a created Team whose coordinator is not the resolved one is terminated, then refused", async () => {
    const node = setup();
    node.override.coordinatorAddress = "/writer";
    await expect(node.start()).resolves.toMatchObject({ accepted: false, code: "AGENT_CANNOT_RUN", message: TEAM_CHANGED_WHILE_STARTING });
    expect(node.manager.terminateTeamRun).toHaveBeenCalledExactlyOnceWith("studio_team_run");
    expect(node.roots.size).toBe(0);
  });

  it("any other creation failure is AGENT_CANNOT_RUN with its reason", async () => {
    const node = setup();
    node.manager.createTeamRun.mockRejectedValueOnce(new Error("The workspace is not writable."));
    await expect(node.start()).resolves.toEqual({ accepted: false, code: "AGENT_CANNOT_RUN", message: "The workspace is not writable.", target: { kind: "agent_team", name: "Studio Team" } });
  });
});
