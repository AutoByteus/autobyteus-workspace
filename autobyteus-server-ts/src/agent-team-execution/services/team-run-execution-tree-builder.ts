import type {
  ConfiguredAgentExecutionNode,
  TeamRunExecutionTreeSnapshot,
} from "../domain/team-run-execution-tree.js";
import type {
  AgentLaunchConfiguration,
  TeamRunAgentNode,
  TeamRunAgentTeamNode,
} from "../domain/team-run-config.js";
import { TeamRunConfig } from "../domain/team-run-config.js";
import { validateTeamRunExecutionTreePayload } from "../../run-history/store/team-run-execution-tree-schema.js";
import { TeamBackendKind } from "../domain/team-backend-kind.js";
import { createAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

const launchConfiguration = (value: AgentLaunchConfiguration): AgentLaunchConfiguration => ({
  runtimeKind: value.runtimeKind,
  llmModelIdentifier: value.llmModelIdentifier,
  llmConfig: value.llmConfig,
  autoExecuteTools: value.autoExecuteTools,
  skillAccessMode: value.skillAccessMode,
  workspaceRootPath: value.workspaceRootPath,
});

const toAgent = (node: TeamRunAgentNode): ConfiguredAgentExecutionNode => ({
  address: node.address,
  agentDefinitionId: node.agentDefinitionId,
  role: node.role,
  description: node.description,
  agentRunId: node.agentRunId,
  platformAgentRunId: node.platformAgentRunId,
  launchConfiguration: launchConfiguration(node),
});


export const buildInitialTeamRunExecutionTree = (input: {
  config: TeamRunConfig;
  teamDefinitionName: string;
  createdAt?: string;
}): TeamRunExecutionTreeSnapshot => validateTeamRunExecutionTreePayload({
  schemaVersion: 2,
  createdAt: input.createdAt ?? new Date().toISOString(),
  archivedAt: null,
  applicationBinding: input.config.applicationBinding,
  handoffs: input.config.handoffs,
  rootTeam: {
    address: "/",
    teamDefinitionId: input.config.rootTeam.teamDefinitionId,
    teamDefinitionName: input.teamDefinitionName.trim(),
    teamRunId: input.config.rootTeam.teamRunId,
    coordinatorAddress: input.config.rootTeam.coordinatorAddress,
    defaultLaunchConfiguration: launchConfiguration(input.config.rootTeam.defaultLaunchConfiguration),
    members: input.config.rootTeam.children.map((member) => {
      if (member.kind !== "agent") throw new Error(`Team V2 cannot contain configured Team '${member.address}'.`);
      return toAgent(member);
    }),
    taskExecutions: [],
  },
}, input.config.rootTeam.teamRunId);

const fromConfiguredAgent = (node: ConfiguredAgentExecutionNode): TeamRunAgentNode => ({
  kind: "agent",
  address: node.address,
  agentDefinitionId: node.agentDefinitionId,
  agentRunId: node.agentRunId,
  platformAgentRunId: node.platformAgentRunId,
  role: node.role,
  description: node.description,
  ...launchConfiguration(node.launchConfiguration),
});


/** Reconstructs only configured launch facts; task executions remain tree-owned. */
export const buildTeamRunConfigFromExecutionTree = (
  tree: TeamRunExecutionTreeSnapshot,
): TeamRunConfig => new TeamRunConfig({
  teamBackendKind: TeamBackendKind.MIXED,
  rootTeam: {
    kind: "agent_team",
    address: createAgentTeamAddress([]),
    teamDefinitionId: tree.rootTeam.teamDefinitionId,
    teamRunId: tree.rootTeam.teamRunId,
    coordinatorAddress: tree.rootTeam.coordinatorAddress,
    defaultLaunchConfiguration: launchConfiguration(tree.rootTeam.defaultLaunchConfiguration),
    children: tree.rootTeam.members.map(fromConfiguredAgent),
  },
  handoffs: tree.handoffs,
  applicationBinding: tree.applicationBinding,
});
