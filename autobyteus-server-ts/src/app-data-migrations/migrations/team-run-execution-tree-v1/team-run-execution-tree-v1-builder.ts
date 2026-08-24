import {
  toTeamRunRuntimeKind,
  type ConfiguredAgentExecution,
  type ConfiguredMemberExecution,
  type ConfiguredTeamExecution,
  type TeamRunExecutionTreeSnapshot,
} from "./team-run-execution-tree-v1-types.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode, TeamRunNode } from "../../../agent-team-execution/domain/team-run-config.js";
import { TeamRunConfig } from "../../../agent-team-execution/domain/team-run-config.js";
import { validateTeamRunExecutionTreePayload } from "./team-run-execution-tree-v1-schema.js";

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
