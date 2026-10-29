import type {
  ConfiguredAgentExecutionNode,
  ConfiguredTeamExecutionNode,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode } from "../../agent-team-execution/domain/team-run-config.js";

export const projectAgentOrgConfiguredAgentNode = (
  agent: ConfiguredAgentExecutionNode,
): TeamRunAgentNode => Object.freeze({
  kind: "agent",
  address: agent.address,
  agentDefinitionId: agent.agentDefinitionId,
  agentRunId: agent.agentRunId,
  platformAgentRunId: agent.platformAgentRunId,
  role: agent.role,
  description: agent.description,
  ...agent.launchConfiguration,
});

export const projectAgentOrgConfiguredTeamNode = (
  team: ConfiguredTeamExecutionNode,
): TeamRunAgentTeamNode => Object.freeze({
  kind: "agent_team",
  address: team.address,
  teamDefinitionId: team.teamDefinitionId,
  teamRunId: team.teamRunId,
  coordinatorAddress: team.coordinatorAddress,
  defaultLaunchConfiguration: team.defaultLaunchConfiguration,
  role: team.role,
  description: team.description,
  children: Object.freeze(team.members.map(projectAgentOrgConfiguredAgentNode)),
});
