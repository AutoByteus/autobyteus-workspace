import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import {
  TeamDefinitionGraphResolver,
  type ResolvedTeamDefinitionGraph,
  type ResolvedTeamDefinitionMember,
} from "../../agent-team-definition/services/team-definition-graph-resolver.js";
import { TeamHandoffCompiler } from "../../agent-team-definition/services/team-handoff-compiler.js";
import type { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import {
  assertAgentTeamAddress,
  createAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { TeamBackendKind } from "../domain/team-backend-kind.js";
import type { TeamRunIdentityAllocator } from "./team-run-identity-allocator.js";
import {
  cloneAgentLaunchConfiguration,
  projectAgentLaunchSettings,
  TeamRunConfig,
  type AgentLaunchConfiguration,
  type TeamAgentLaunchSettings,
  type TeamRunAgentTeamNode,
  type TeamRunApplicationBinding,
  type TeamRunNode,
  type TeamScopeLaunchSettings,
} from "../domain/team-run-config.js";

export type TeamAgentLaunchInput = Omit<TeamAgentLaunchSettings, "memberAddress" | "agentDefinitionId"> & {
  memberAddress: string;
  agentDefinitionId?: string | null;
};

export type TeamScopeLaunchInput = Omit<TeamScopeLaunchSettings, "teamAddress"> & {
  teamAddress: string;
};

export type TeamDefinitionTopologyPlan = Readonly<{
  teamDefinitionName: string;
  hasSubTeams: boolean;
  config: TeamRunConfig;
  agentLaunchSettings: readonly TeamAgentLaunchSettings[];
}>;

type TeamDefinitionLookup = Pick<AgentTeamDefinitionService, "getDefinitionById">;
type AgentIdAllocator = Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
type TeamIdAllocator = Pick<TeamRunIdentityAllocator, "allocateForTeamDefinitionName">;
type AgentGraphMember = Extract<ResolvedTeamDefinitionMember, { kind: "agent" }>;
type GraphIndex = Readonly<{
  teams: ReadonlyMap<AgentTeamAddress, ResolvedTeamDefinitionGraph>;
  agents: ReadonlyMap<AgentTeamAddress, AgentGraphMember>;
}>;

const required = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

const launchValue = (value: AgentLaunchConfiguration): AgentLaunchConfiguration => ({
  runtimeKind: value.runtimeKind,
  llmModelIdentifier: value.llmModelIdentifier,
  llmConfig: value.llmConfig,
  autoExecuteTools: value.autoExecuteTools,
  skillAccessMode: value.skillAccessMode,
  workspaceRootPath: value.workspaceRootPath,
});

export class TeamDefinitionTopologyPlanner {
  constructor(
    private readonly teamDefinitionService: TeamDefinitionLookup,
    private readonly teamRunIdentityAllocator: TeamIdAllocator,
    private readonly agentRunIdentityAllocator: AgentIdAllocator,
  ) {}

  async buildPlan(input: {
    teamDefinitionId: string;
    teamConfigs: readonly TeamScopeLaunchInput[];
    memberConfigs: readonly TeamAgentLaunchInput[];
    applicationBinding?: TeamRunApplicationBinding | null;
  }): Promise<TeamDefinitionTopologyPlan> {
    const { definition, graph } = await this.resolveGraph(input.teamDefinitionId);
    const index = this.indexGraph(graph);
    const teamConfigs = this.validateTeamConfigs(input.teamConfigs, index);
    const memberConfigs = this.validateMemberConfigs(input.memberConfigs, index);
    this.validateRootInheritedSkillAccess(teamConfigs, memberConfigs);

    // Exact subject and coverage validation finishes before any run identity allocation.
    const rootTeam = await this.compileTeamNode(
      graph,
      createAgentTeamAddress([]),
      this.teamRunIdentityAllocator.allocateForTeamDefinitionName(definition.name),
      teamConfigs,
      memberConfigs,
    );
    const config = new TeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam,
      handoffs: new TeamHandoffCompiler().compile(graph),
      applicationBinding: input.applicationBinding ?? null,
    });
    return Object.freeze({
      teamDefinitionName: definition.name,
      hasSubTeams: [...index.teams.keys()].some((address) => address !== "/"),
      config,
      agentLaunchSettings: Object.freeze(projectAgentLaunchSettings(config.rootTeam)),
    });
  }

  async buildRootLaunchInputs(input: {
    teamDefinitionId: string;
    rootConfig: AgentLaunchConfiguration;
    memberConfigs?: readonly TeamAgentLaunchInput[] | null;
  }): Promise<Readonly<{
    teamConfigs: readonly TeamScopeLaunchInput[];
    memberConfigs: readonly TeamAgentLaunchInput[];
  }>> {
    const { graph } = await this.resolveGraph(input.teamDefinitionId);
    const index = this.indexGraph(graph);
    const teamConfigs = Object.freeze([...index.teams.keys()].map((teamAddress) => Object.freeze({
      teamAddress,
      ...launchValue(input.rootConfig),
    })));
    const memberConfigs = input.memberConfigs
      ? Object.freeze(input.memberConfigs.map((value) => Object.freeze({ ...value })))
      : Object.freeze([...index.agents.entries()].map(([memberAddress, member]) => Object.freeze({
          memberAddress,
          agentDefinitionId: member.agentDefinitionId,
          ...launchValue(input.rootConfig),
        })));
    return Object.freeze({ teamConfigs, memberConfigs });
  }

  private async resolveGraph(teamDefinitionIdInput: string) {
    const teamDefinitionId = required(teamDefinitionIdInput, "teamDefinitionId");
    const definition = await this.teamDefinitionService.getDefinitionById(teamDefinitionId);
    if (!definition) throw new Error(`AgentTeamDefinition with ID ${teamDefinitionId} not found.`);
    const graph = await new TeamDefinitionGraphResolver().resolve({
      rootDefinition: definition,
      rootDefinitionId: teamDefinitionId,
      lookup: { getTeamById: (id) => this.teamDefinitionService.getDefinitionById(id) },
    });
    return { definition, graph };
  }

  private indexGraph(root: ResolvedTeamDefinitionGraph): GraphIndex {
    const teams = new Map<AgentTeamAddress, ResolvedTeamDefinitionGraph>();
    const agents = new Map<AgentTeamAddress, AgentGraphMember>();
    const visit = (team: ResolvedTeamDefinitionGraph, address: AgentTeamAddress): void => {
      teams.set(address, team);
      for (const member of team.members) {
        const memberAddress = createAgentTeamAddress(member.absolutePath);
        if (member.kind === "agent") agents.set(memberAddress, member);
        else visit(member.team, memberAddress);
      }
    };
    visit(root, createAgentTeamAddress([]));
    return Object.freeze({ teams, agents });
  }

  private validateTeamConfigs(
    values: readonly TeamScopeLaunchInput[],
    index: GraphIndex,
  ): ReadonlyMap<AgentTeamAddress, TeamScopeLaunchInput> {
    const result = new Map<AgentTeamAddress, TeamScopeLaunchInput>();
    for (const value of values) {
      const address = assertAgentTeamAddress(value.teamAddress);
      if (result.has(address)) throw new Error(`Duplicate Team launch settings for '${address}'.`);
      if (index.agents.has(address)) throw new Error(`Team launch settings reference Agent placement '${address}'.`);
      if (!index.teams.has(address)) throw new Error(`Team launch settings reference unknown Team '${address}'.`);
      result.set(address, Object.freeze({
        ...value,
        ...cloneAgentLaunchConfiguration(value, `defaultLaunchConfiguration at '${address}'`),
      }));
    }
    const missing = [...index.teams.keys()].find((address) => !result.has(address));
    if (missing) throw new Error(`Launch settings for Team '${missing}' were not provided.`);
    return result;
  }

  private validateMemberConfigs(
    values: readonly TeamAgentLaunchInput[],
    index: GraphIndex,
  ): ReadonlyMap<AgentTeamAddress, TeamAgentLaunchInput> {
    const result = new Map<AgentTeamAddress, TeamAgentLaunchInput>();
    for (const value of values) {
      const address = assertAgentTeamAddress(value.memberAddress);
      if (address === "/") throw new Error("Agent launch settings cannot reference root Team '/'.");
      if (result.has(address)) throw new Error(`Duplicate Agent launch settings for '${address}'.`);
      if (index.teams.has(address)) throw new Error(`Agent launch settings reference Team placement '${address}'.`);
      const member = index.agents.get(address);
      if (!member) throw new Error(`Agent launch settings reference unknown Team member '${address}'.`);
      if (value.agentDefinitionId && value.agentDefinitionId !== member.agentDefinitionId) {
        throw new Error(`Launch settings for '${address}' reference the wrong Agent definition.`);
      }
      result.set(address, Object.freeze({
        ...value,
        ...cloneAgentLaunchConfiguration(value, `launchConfiguration at '${address}'`),
      }));
    }
    const missing = [...index.agents.keys()].find((address) => !result.has(address));
    if (missing) throw new Error(`Launch settings for Team member '${missing}' were not provided.`);
    return result;
  }

  private validateRootInheritedSkillAccess(
    teamConfigs: ReadonlyMap<AgentTeamAddress, TeamScopeLaunchInput>,
    memberConfigs: ReadonlyMap<AgentTeamAddress, TeamAgentLaunchInput>,
  ): void {
    const rootMode = teamConfigs.get("/" as AgentTeamAddress)!.skillAccessMode;
    const divergentTeam = [...teamConfigs.entries()].find(([, config]) => config.skillAccessMode !== rootMode);
    if (divergentTeam) throw new Error(`Team '${divergentTeam[0]}' cannot override root skillAccessMode.`);
    const divergentAgent = [...memberConfigs.entries()].find(([, config]) => config.skillAccessMode !== rootMode);
    if (divergentAgent) throw new Error(`Agent '${divergentAgent[0]}' cannot override root skillAccessMode.`);
  }

  private async compileTeamNode(
    graph: ResolvedTeamDefinitionGraph,
    address: AgentTeamAddress,
    teamRunId: string,
    teamConfigs: ReadonlyMap<AgentTeamAddress, TeamScopeLaunchInput>,
    memberConfigs: ReadonlyMap<AgentTeamAddress, TeamAgentLaunchInput>,
  ): Promise<TeamRunAgentTeamNode> {
    const placement = address === "/" ? {} : { role: null, description: null };
    return {
      kind: "agent_team",
      address,
      teamDefinitionId: graph.definitionId,
      teamRunId,
      coordinatorAddress: createAgentTeamAddress(graph.coordinator.absolutePath),
      defaultLaunchConfiguration: launchValue(teamConfigs.get(address)!),
      ...placement,
      children: await Promise.all(graph.members.map((member) =>
        this.compileMember(member, teamConfigs, memberConfigs))),
    };
  }

  private async compileMember(
    member: ResolvedTeamDefinitionMember,
    teamConfigs: ReadonlyMap<AgentTeamAddress, TeamScopeLaunchInput>,
    memberConfigs: ReadonlyMap<AgentTeamAddress, TeamAgentLaunchInput>,
  ): Promise<TeamRunNode> {
    const address = createAgentTeamAddress(member.absolutePath);
    if (member.kind === "agent_team") {
      return this.compileTeamNode(
        member.team,
        address,
        this.teamRunIdentityAllocator.allocateForTeamDefinitionName(member.team.definition.name),
        teamConfigs,
        memberConfigs,
      );
    }
    const launch = memberConfigs.get(address)!;
    const agentRunId = await this.agentRunIdentityAllocator.allocateForAgentDefinition(member.agentDefinitionId);
    return {
      kind: "agent",
      address,
      agentDefinitionId: member.agentDefinitionId,
      agentRunId,
      platformAgentRunId: null,
      role: null,
      description: null,
      ...launchValue(launch),
    };
  }
}
