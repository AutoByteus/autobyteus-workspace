import {
  fromTeamRunRuntimeKind,
  toTeamRunRuntimeKind,
  type ConfiguredAgentExecution,
  type ConfiguredMemberExecution,
  type ConfiguredTeamExecution,
  type TeamRunExecutionTreeSnapshot,
} from "../domain/team-run-execution-tree.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode, TeamRunNode } from "../domain/team-run-config.js";
import { TeamRunConfig } from "../domain/team-run-config.js";
import { validateTeamRunExecutionTreePayload } from "../../run-history/store/team-run-execution-tree-schema.js";
import { TeamBackendKind } from "../domain/team-backend-kind.js";
import { createAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

const toAgent = (node: TeamRunAgentNode): ConfiguredAgentExecution => ({
  address: node.address,
  agentDefinitionId: node.agentDefinitionId,
  role: node.role,
  description: node.description,
  agentRunId: node.agentRunId,
  platformAgentRunId: node.platformAgentRunId,
  launchConfiguration: {
    runtimeKind: toTeamRunRuntimeKind(node.runtimeKind),
    llmModelIdentifier: node.llmModelIdentifier,
    llmConfig: node.llmConfig,
    autoExecuteTools: node.autoExecuteTools,
    skillAccessMode: node.skillAccessMode,
    workspaceRootPath: node.workspaceRootPath,
  },
});

const toTeam = (node: TeamRunAgentTeamNode): ConfiguredTeamExecution => ({
  address: node.address,
  teamDefinitionId: node.teamDefinitionId,
  role: node.role ?? null,
  description: node.description ?? null,
  teamRunId: node.teamRunId,
  coordinatorAddress: node.coordinatorAddress,
  members: node.children.map(toMember),
  taskExecutions: [],
});

const toMember = (node: TeamRunNode): ConfiguredMemberExecution =>
  node.kind === "agent" ? toAgent(node) : toTeam(node);

export const buildInitialTeamRunExecutionTree = (input: {
  config: TeamRunConfig;
  teamDefinitionName: string;
  createdAt?: string;
}): TeamRunExecutionTreeSnapshot => validateTeamRunExecutionTreePayload({
  schemaVersion: 1,
  createdAt: input.createdAt ?? new Date().toISOString(),
  archivedAt: null,
  applicationBinding: input.config.applicationBinding,
  handoffs: input.config.handoffs,
  rootTeam: {
    teamDefinitionId: input.config.rootTeam.teamDefinitionId,
    teamDefinitionName: input.teamDefinitionName.trim(),
    teamRunId: input.config.rootTeam.teamRunId,
    coordinatorAddress: input.config.rootTeam.coordinatorAddress,
    members: input.config.rootTeam.children.map(toMember),
    taskExecutions: [],
  },
}, input.config.rootTeam.teamRunId);

const fromConfiguredAgent = (node: ConfiguredAgentExecution): TeamRunAgentNode => ({
  kind: "agent",
  address: node.address,
  agentDefinitionId: node.agentDefinitionId,
  agentRunId: node.agentRunId,
  platformAgentRunId: node.platformAgentRunId,
  role: node.role,
  description: node.description,
  runtimeKind: fromTeamRunRuntimeKind(node.launchConfiguration.runtimeKind),
  llmModelIdentifier: node.launchConfiguration.llmModelIdentifier,
  llmConfig: node.launchConfiguration.llmConfig,
  autoExecuteTools: node.launchConfiguration.autoExecuteTools,
  skillAccessMode: node.launchConfiguration.skillAccessMode,
  workspaceRootPath: node.launchConfiguration.workspaceRootPath,
});

const fromConfiguredTeam = (node: ConfiguredTeamExecution): TeamRunAgentTeamNode => ({
  kind: "agent_team",
  address: node.address,
  teamDefinitionId: node.teamDefinitionId,
  teamRunId: node.teamRunId,
  coordinatorAddress: node.coordinatorAddress,
  role: node.role,
  description: node.description,
  children: node.members.map(fromConfiguredMember),
});

const fromConfiguredMember = (node: ConfiguredMemberExecution): TeamRunNode =>
  "agentRunId" in node ? fromConfiguredAgent(node) : fromConfiguredTeam(node);

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
    children: tree.rootTeam.members.map(fromConfiguredMember),
  },
  handoffs: tree.handoffs,
  applicationBinding: tree.applicationBinding,
});
