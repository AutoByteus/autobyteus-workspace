import {
  assertAgentTeamAddress,
  createAgentTeamAddress,
  type AgentTeamAddress,
} from "../domain/agent-team-address.js";
import {
  cloneAgentLaunchConfiguration,
  type AgentLaunchConfiguration,
} from "../../agent-team-execution/domain/team-run-config.js";
import type { ResolvedFlatTeamDefinition } from "../../agent-team-definition/services/flat-team-definition-resolver.js";
import type { ResolvedAgentOrgDefinition } from "../definition/resolved-collaboration-topology.js";

export type PlacementLaunchOverride = Readonly<{
  address: string;
  configuration: Partial<AgentLaunchConfiguration>;
}>;

export type ResolvedCollaborationLaunchConfiguration = Readonly<{
  root: AgentLaunchConfiguration;
  teams: ReadonlyMap<AgentTeamAddress, AgentLaunchConfiguration>;
  agents: ReadonlyMap<AgentTeamAddress, AgentLaunchConfiguration>;
}>;

const merge = (
  base: AgentLaunchConfiguration,
  override: Partial<AgentLaunchConfiguration> | undefined,
  label: string,
): AgentLaunchConfiguration => cloneAgentLaunchConfiguration({
  runtimeKind: override?.runtimeKind ?? base.runtimeKind,
  llmModelIdentifier: override?.llmModelIdentifier ?? base.llmModelIdentifier,
  llmConfig: Object.hasOwn(override ?? {}, "llmConfig") ? override?.llmConfig ?? null : base.llmConfig,
  autoExecuteTools: override?.autoExecuteTools ?? base.autoExecuteTools,
  skillAccessMode: override?.skillAccessMode ?? base.skillAccessMode,
  workspaceRootPath: Object.hasOwn(override ?? {}, "workspaceRootPath")
    ? override?.workspaceRootPath ?? null
    : base.workspaceRootPath,
}, label);

const indexedOverrides = (
  values: readonly PlacementLaunchOverride[],
  label: string,
): ReadonlyMap<AgentTeamAddress, Partial<AgentLaunchConfiguration>> => {
  const output = new Map<AgentTeamAddress, Partial<AgentLaunchConfiguration>>();
  for (const value of values) {
    const address = assertAgentTeamAddress(value.address);
    if (address === "/") throw new Error(`${label} cannot target structural root '/'.`);
    if (output.has(address)) throw new Error(`Duplicate ${label} for '${address}'.`);
    output.set(address, Object.freeze({ ...value.configuration }));
  }
  return output;
};

export class CollaborationLaunchConfigurationResolver {
  resolveTeam(input: {
    topology: ResolvedFlatTeamDefinition;
    rootConfiguration: AgentLaunchConfiguration;
    agentOverrides?: readonly PlacementLaunchOverride[] | null;
  }): ResolvedCollaborationLaunchConfiguration {
    const root = cloneAgentLaunchConfiguration(input.rootConfiguration, "rootConfiguration");
    const overrides = indexedOverrides(input.agentOverrides ?? [], "Agent override");
    const agents = new Map<AgentTeamAddress, AgentLaunchConfiguration>();
    for (const member of input.topology.members) {
      const address = createAgentTeamAddress(member.absolutePath);
      agents.set(address, merge(root, overrides.get(address), `Agent configuration at '${address}'`));
    }
    const unknown = [...overrides.keys()].find((address) => !agents.has(address));
    if (unknown) throw new Error(`Agent override '${unknown}' does not select a direct Team Agent.`);
    return Object.freeze({ root, teams: new Map(), agents });
  }

  resolveOrg(input: {
    topology: ResolvedAgentOrgDefinition;
    rootConfiguration: AgentLaunchConfiguration;
    teamOverrides?: readonly PlacementLaunchOverride[] | null;
    agentOverrides?: readonly PlacementLaunchOverride[] | null;
  }): ResolvedCollaborationLaunchConfiguration {
    const root = cloneAgentLaunchConfiguration(input.rootConfiguration, "rootConfiguration");
    const teamOverrides = indexedOverrides(input.teamOverrides ?? [], "Team override");
    const agentOverrides = indexedOverrides(input.agentOverrides ?? [], "Agent override");
    const teams = new Map<AgentTeamAddress, AgentLaunchConfiguration>();
    const agents = new Map<AgentTeamAddress, AgentLaunchConfiguration>();
    for (const member of input.topology.members) {
      if (member.kind === "agent") {
        const address = createAgentTeamAddress(member.absolutePath);
        agents.set(address, merge(root, agentOverrides.get(address), `Agent configuration at '${address}'`));
        continue;
      }
      const teamAddress = createAgentTeamAddress(member.absolutePath);
      const teamConfiguration = merge(root, teamOverrides.get(teamAddress), `Team configuration at '${teamAddress}'`);
      teams.set(teamAddress, teamConfiguration);
      for (const agent of member.team.members) {
        const address = createAgentTeamAddress(agent.absolutePath);
        agents.set(address, merge(teamConfiguration, agentOverrides.get(address), `Agent configuration at '${address}'`));
      }
    }
    const unknownTeam = [...teamOverrides.keys()].find((address) => !teams.has(address));
    if (unknownTeam) throw new Error(`Team override '${unknownTeam}' does not select a direct AgentOrg Team.`);
    const unknownAgent = [...agentOverrides.keys()].find((address) => !agents.has(address));
    if (unknownAgent) throw new Error(`Agent override '${unknownAgent}' does not select an AgentOrg Agent.`);
    return Object.freeze({ root, teams, agents });
  }
}
