import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { AgentTeamDefinition } from "../../agent-team-definition/domain/agent-team-definition.js";
import {
  FlatTeamDefinitionResolver,
  type ResolvedTeamDefinitionAgent,
  type ResolvedFlatTeamDefinition,
} from "../../agent-team-definition/services/flat-team-definition-resolver.js";
import { CollaborationHandoffCompiler } from "../../agent-collaboration/definition/collaboration-handoff-compiler.js";
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
  type TeamRunAgentNode,
  type TeamRunAgentTeamNode,
  type TeamRunApplicationBinding,
  type TeamScopeLaunchSettings,
} from "../domain/team-run-config.js";

export type TeamAgentLaunchInput = Omit<TeamAgentLaunchSettings, "memberAddress" | "agentDefinitionId"> & {
  memberAddress: string;
  agentDefinitionId?: string | null;
};

export type TeamScopeLaunchInput = Omit<TeamScopeLaunchSettings, "teamAddress"> & {
  teamAddress: string;
};

export type FlatTeamTopologyPlan = Readonly<{
  teamDefinitionName: string;
  hasSubTeams: false;
  config: TeamRunConfig;
  agentLaunchSettings: readonly TeamAgentLaunchSettings[];
}>;

type TeamDefinitionLookup = Pick<AgentTeamDefinitionService, "getDefinitionById">;
type AgentIdAllocator = Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
type TeamIdAllocator = Pick<TeamRunIdentityAllocator, "allocateForTeamDefinitionName">;

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

export class FlatTeamTopologyPlanner {
  constructor(
    private readonly teamDefinitionService: TeamDefinitionLookup,
    private readonly teamRunIdentityAllocator: TeamIdAllocator,
    private readonly agentRunIdentityAllocator: AgentIdAllocator,
  ) {}

  async buildPlan(input: {
    teamDefinitionId: string;
    rootDefinition?: AgentTeamDefinition | null;
    teamConfigs: readonly TeamScopeLaunchInput[];
    memberConfigs: readonly TeamAgentLaunchInput[];
    applicationBinding?: TeamRunApplicationBinding | null;
  }): Promise<FlatTeamTopologyPlan> {
    const { definition, graph } = await this.resolveGraph(input.teamDefinitionId, input.rootDefinition);
    const rootConfig = this.validateRootConfig(input.teamConfigs);
    const memberConfigs = this.validateMemberConfigs(input.memberConfigs, graph);
    this.validateRootInheritedSkillAccess(rootConfig, memberConfigs);
    const rootTeam = await this.compileRoot(graph, definition.name, rootConfig, memberConfigs);
    const config = new TeamRunConfig({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam,
      handoffs: new CollaborationHandoffCompiler().compileTeam(graph),
      applicationBinding: input.applicationBinding ?? null,
    });
    return Object.freeze({
      teamDefinitionName: definition.name,
      hasSubTeams: false,
      config,
      agentLaunchSettings: Object.freeze(projectAgentLaunchSettings(config.rootTeam)),
    });
  }

  async buildRootLaunchInputs(input: {
    teamDefinitionId: string;
    rootDefinition?: AgentTeamDefinition | null;
    rootConfig: AgentLaunchConfiguration;
    memberConfigs?: readonly TeamAgentLaunchInput[] | null;
  }): Promise<Readonly<{
    teamConfigs: readonly TeamScopeLaunchInput[];
    memberConfigs: readonly TeamAgentLaunchInput[];
  }>> {
    const { graph } = await this.resolveGraph(input.teamDefinitionId, input.rootDefinition);
    const teamConfigs = Object.freeze([{ teamAddress: "/", ...launchValue(input.rootConfig) }]);
    const memberConfigs = input.memberConfigs
      ? Object.freeze(input.memberConfigs.map((value) => Object.freeze({ ...value })))
      : Object.freeze(graph.members.map((member) => Object.freeze({
          memberAddress: createAgentTeamAddress(member.absolutePath),
          agentDefinitionId: member.agentDefinitionId,
          ...launchValue(input.rootConfig),
        })));
    return Object.freeze({ teamConfigs, memberConfigs });
  }

  private async resolveGraph(teamDefinitionIdInput: string, admittedDefinition?: AgentTeamDefinition | null): Promise<{
    definition: NonNullable<Awaited<ReturnType<TeamDefinitionLookup["getDefinitionById"]>>>;
    graph: ResolvedFlatTeamDefinition;
  }> {
    const teamDefinitionId = required(teamDefinitionIdInput, "teamDefinitionId");
    const definition = admittedDefinition ?? await this.teamDefinitionService.getDefinitionById(teamDefinitionId);
    if (!definition) throw new Error(`AgentTeamDefinition with ID ${teamDefinitionId} not found.`);
    if (definition.id !== teamDefinitionId) throw new Error(`Admitted Team definition identity does not match '${teamDefinitionId}'.`);
    const graph = await new FlatTeamDefinitionResolver().resolve({
      rootDefinition: definition,
      rootDefinitionId: teamDefinitionId,
      lookup: {},
    });
    return { definition, graph };
  }

  private validateRootConfig(values: readonly TeamScopeLaunchInput[]): TeamScopeLaunchInput {
    if (values.length !== 1 || assertAgentTeamAddress(values[0]!.teamAddress) !== "/") {
      throw new Error("A flat AgentTeam launch requires exactly one root Team configuration at '/'.");
    }
    return Object.freeze({
      ...values[0]!,
      ...cloneAgentLaunchConfiguration(values[0]!, "defaultLaunchConfiguration at '/'") ,
    });
  }

  private validateMemberConfigs(
    values: readonly TeamAgentLaunchInput[],
    graph: ResolvedFlatTeamDefinition,
  ): ReadonlyMap<AgentTeamAddress, TeamAgentLaunchInput> {
    const expected = new Map<AgentTeamAddress, ResolvedTeamDefinitionAgent>(graph.members.map((member) => [
      createAgentTeamAddress(member.absolutePath),
      member,
    ]));
    const result = new Map<AgentTeamAddress, TeamAgentLaunchInput>();
    for (const value of values) {
      const address = assertAgentTeamAddress(value.memberAddress);
      if (address === "/") throw new Error("Agent launch settings cannot reference root Team '/'.");
      if (result.has(address)) throw new Error(`Duplicate Agent launch settings for '${address}'.`);
      const member = expected.get(address);
      if (!member) throw new Error(`Agent launch settings reference unknown direct Team member '${address}'.`);
      if (value.agentDefinitionId && value.agentDefinitionId !== member.agentDefinitionId) {
        throw new Error(`Launch settings for '${address}' reference the wrong Agent definition.`);
      }
      result.set(address, Object.freeze({
        ...value,
        ...cloneAgentLaunchConfiguration(value, `launchConfiguration at '${address}'`),
      }));
    }
    const missing = [...expected.keys()].find((address) => !result.has(address));
    if (missing) throw new Error(`Launch settings for Team member '${missing}' were not provided.`);
    return result;
  }

  private validateRootInheritedSkillAccess(
    rootConfig: TeamScopeLaunchInput,
    memberConfigs: ReadonlyMap<AgentTeamAddress, TeamAgentLaunchInput>,
  ): void {
    const divergent = [...memberConfigs.entries()].find(([, config]) =>
      config.skillAccessMode !== rootConfig.skillAccessMode);
    if (divergent) throw new Error(`Agent '${divergent[0]}' cannot override root skillAccessMode.`);
  }

  private async compileRoot(
    graph: ResolvedFlatTeamDefinition,
    teamDefinitionName: string,
    rootConfig: TeamScopeLaunchInput,
    memberConfigs: ReadonlyMap<AgentTeamAddress, TeamAgentLaunchInput>,
  ): Promise<TeamRunAgentTeamNode> {
    const children: TeamRunAgentNode[] = [];
    for (const member of graph.members) {
      const address = createAgentTeamAddress(member.absolutePath);
      const launch = memberConfigs.get(address)!;
      children.push({
        kind: "agent",
        address,
        agentDefinitionId: member.agentDefinitionId,
        agentRunId: await this.agentRunIdentityAllocator.allocateForAgentDefinition(member.agentDefinitionId),
        platformAgentRunId: null,
        role: null,
        description: null,
        ...launchValue(launch),
      });
    }
    return {
      kind: "agent_team",
      address: "/" as AgentTeamAddress,
      teamDefinitionId: graph.definitionId,
      teamRunId: this.teamRunIdentityAllocator.allocateForTeamDefinitionName(teamDefinitionName),
      coordinatorAddress: createAgentTeamAddress(graph.coordinator.absolutePath),
      defaultLaunchConfiguration: launchValue(rootConfig),
      children,
    };
  }
}
