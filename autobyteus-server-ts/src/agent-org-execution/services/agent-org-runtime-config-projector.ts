import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type {
  ConfiguredAgentExecutionNode,
  ConfiguredTeamExecutionNode,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode, TeamRunNode } from "../../agent-team-execution/domain/team-run-config.js";

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

export const findAgentOrgConfiguredSourceNode = (
  tree: AgentOrgRunExecutionTreeSnapshot,
  address: AgentTeamAddress,
): TeamRunNode | null => {
  for (const member of tree.rootOrg.members) {
    if (member.address === address) {
      return "agentRunId" in member
        ? projectAgentOrgConfiguredAgentNode(member)
        : projectAgentOrgConfiguredTeamNode(member);
    }
    if (!("agentRunId" in member)) {
      const agent = member.members.find((candidate) => candidate.address === address);
      if (agent) return projectAgentOrgConfiguredAgentNode(agent);
    }
  }
  return null;
};
