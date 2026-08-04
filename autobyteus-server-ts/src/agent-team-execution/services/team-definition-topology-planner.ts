import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import {
  TeamDefinitionGraphResolver,
  type ResolvedTeamDefinitionGraph,
  type ResolvedTeamDefinitionMember,
} from "../../agent-team-definition/services/team-definition-graph-resolver.js";
import { TeamHandoffCompiler } from "../../agent-team-definition/services/team-handoff-compiler.js";
import type { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import {
  createAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { generateTeamRunIdForDefinitionName } from "../domain/team-run-id.js";
import { TeamBackendKind } from "../domain/team-backend-kind.js";
import {
  projectAgentLaunchSettings,
  TeamRunConfig,
  type TeamAgentLaunchSettings,
  type TeamRunAgentTeamNode,
  type TeamRunNode,
} from "../domain/team-run-config.js";
import { createTeamExecutionAddress } from "../domain/team-execution-address.js";

export type TeamAgentLaunchInput = Omit<TeamAgentLaunchSettings, "memberAddress" | "agentDefinitionId"> & {
  memberAddress: string;
  agentDefinitionId?: string | null;
};

export type TeamDefinitionTopologyPlan = Readonly<{
  teamDefinitionName: string;
  hasSubTeams: boolean;
  config: TeamRunConfig;
  agentLaunchSettings: readonly TeamAgentLaunchSettings[];
}>;

type TeamDefinitionLookup = Pick<AgentTeamDefinitionService, "getDefinitionById">;
type AgentIdAllocator = Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;

const required = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

export class TeamDefinitionTopologyPlanner {
  constructor(
    private readonly teamDefinitionService: TeamDefinitionLookup,
    private readonly agentRunIdentityAllocator: AgentIdAllocator,
  ) {}

  async buildPlan(input: {
    teamDefinitionId: string;
    teamRunId: string;
    memberConfigs: readonly TeamAgentLaunchInput[];
  }): Promise<TeamDefinitionTopologyPlan> {
    const teamDefinitionId = required(input.teamDefinitionId, "teamDefinitionId");
    const definition = await this.teamDefinitionService.getDefinitionById(teamDefinitionId);
    if (!definition) throw new Error(`AgentTeamDefinition with ID ${teamDefinitionId} not found.`);
    const graph = await new TeamDefinitionGraphResolver().resolve({
      rootDefinition: definition,
      rootDefinitionId: teamDefinitionId,
      lookup: { getTeamById: (id) => this.teamDefinitionService.getDefinitionById(id) },
    });
    const settingsByAddress = new Map<AgentTeamAddress, TeamAgentLaunchInput>();
    for (const launch of input.memberConfigs) {
      const address = createAgentTeamAddress(
        launch.memberAddress === "/" ? [] : launch.memberAddress.slice(1).split("/"),
      );
      if (settingsByAddress.has(address)) throw new Error(`Duplicate launch settings for '${address}'.`);
      settingsByAddress.set(address, launch);
    }
    const rootTeam = await this.compileTeamNode(graph, createAgentTeamAddress([]), input.teamRunId, input.teamRunId, settingsByAddress);
    if (settingsByAddress.size !== projectAgentLaunchSettings(rootTeam).length) {
      const known = new Set(projectAgentLaunchSettings(rootTeam).map((item) => item.memberAddress));
      const extra = [...settingsByAddress.keys()].filter((address) => !known.has(address));
      if (extra.length) throw new Error(`Launch settings reference unknown Team member '${extra[0]}'.`);
    }
    const config = new TeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam,
      handoffs: new TeamHandoffCompiler().compile(graph),
    });
    return Object.freeze({
      teamDefinitionName: definition.name,
      hasSubTeams: rootTeam.children.some((node) => node.kind === "agent_team"),
      config,
      agentLaunchSettings: Object.freeze(projectAgentLaunchSettings(config.rootTeam)),
    });
  }

  async buildPresetAgentLaunchSettings(input: {
    teamDefinitionId: string;
    launchPreset: Omit<TeamAgentLaunchInput, "memberAddress" | "agentDefinitionId">;
  }): Promise<TeamAgentLaunchInput[]> {
    const definition = await this.teamDefinitionService.getDefinitionById(input.teamDefinitionId);
    if (!definition) throw new Error(`AgentTeamDefinition with ID ${input.teamDefinitionId} not found.`);
    const graph = await new TeamDefinitionGraphResolver().resolve({
      rootDefinition: definition,
      rootDefinitionId: input.teamDefinitionId,
      lookup: { getTeamById: (id) => this.teamDefinitionService.getDefinitionById(id) },
    });
    const output: TeamAgentLaunchInput[] = [];
    const visit = (members: readonly ResolvedTeamDefinitionMember[]): void => {
      for (const member of members) {
        if (member.kind === "agent") {
          output.push({
            ...input.launchPreset,
            memberAddress: createAgentTeamAddress(member.absolutePath),
            agentDefinitionId: member.agentDefinitionId,
          });
        } else visit(member.team.members);
      }
    };
    visit(graph.members);
    return output;
  }

  private async compileTeamNode(
    graph: ResolvedTeamDefinitionGraph,
    address: AgentTeamAddress,
    teamRunId: string,
    rootTeamRunId: string,
    settingsByAddress: ReadonlyMap<AgentTeamAddress, TeamAgentLaunchInput>,
  ): Promise<TeamRunAgentTeamNode> {
    const placement = address === "/" ? {} : { role: null, description: null };
    return {
      kind: "agent_team",
      address,
      teamDefinitionId: graph.definitionId,
      teamRunId: required(teamRunId, `teamRunId at '${address}'`),
      coordinatorAddress: createAgentTeamAddress(graph.coordinator.absolutePath),
      ...placement,
      children: await Promise.all(graph.members.map((member) => this.compileMember(member, rootTeamRunId, settingsByAddress))),
    };
  }

  private async compileMember(
    member: ResolvedTeamDefinitionMember,
    rootTeamRunId: string,
    settingsByAddress: ReadonlyMap<AgentTeamAddress, TeamAgentLaunchInput>,
  ): Promise<TeamRunNode> {
    const address = createAgentTeamAddress(member.absolutePath);
    if (member.kind === "agent_team") {
      return this.compileTeamNode(
        member.team,
        address,
        generateTeamRunIdForDefinitionName(member.team.definition.name),
        rootTeamRunId,
        settingsByAddress,
      );
    }
    const launch = settingsByAddress.get(address);
    if (!launch) throw new Error(`Launch settings for Team member '${address}' were not provided.`);
    if (launch.agentDefinitionId && launch.agentDefinitionId !== member.agentDefinitionId) {
      throw new Error(`Launch settings for '${address}' reference the wrong Agent definition.`);
    }
    const agentRunId = await this.agentRunIdentityAllocator.allocateForAgentDefinition(member.agentDefinitionId);
    return {
      kind: "agent",
      address,
      agentDefinitionId: member.agentDefinitionId,
      agentRunId,
      platformAgentRunId: null,
      role: null,
      description: null,
      runtimeKind: launch.runtimeKind,
      llmModelIdentifier: launch.llmModelIdentifier,
      llmConfig: launch.llmConfig,
      autoExecuteTools: launch.autoExecuteTools,
      skillAccessMode: launch.skillAccessMode,
      workspaceRootPath: launch.workspaceRootPath,
      applicationExecutionContext: launch.applicationExecutionContext ? {
        ...launch.applicationExecutionContext,
        producer: {
          ...launch.applicationExecutionContext.producer,
          executionAddress: createTeamExecutionAddress({ rootTeamRunId, memberAddress: address }),
        },
      } : null,
    };
  }
}
