/**
 * The world's runs in the node's own shapes (autobyteus-279): each built with, and validated by, its contract package's
 * schema, so a changed contract fails the demo loudly instead of drifting.
 */
import { agentOrgExecutionTreeDtoSchema, type AgentOrgExecutionTreeDto } from '@autobyteus/collaboration-stream-contracts';
import { teamRunExecutionTreeDtoSchema, type AgentLaunchConfigurationDto, type TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts';
import { runLaunchOf, type DemoAgent, type DemoLaunch, type DemoRun, type DemoWorld } from './DemoWorld';

/** An agent's launch as a Team execution tree carries it (snake case). */
export const launchSnake = (launch: DemoLaunch): AgentLaunchConfigurationDto => ({
  runtime_kind: launch.runtimeKind as AgentLaunchConfigurationDto['runtime_kind'],
  llm_model_identifier: launch.llmModelIdentifier,
  llm_config: launch.llmConfig as AgentLaunchConfigurationDto['llm_config'],
  auto_execute_tools: launch.autoExecuteTools,
  workspace_root_path: launch.workspaceRootPath,
});

/** An agent's launch as an Org execution tree carries it (camel case). */
export const launchCamel = (launch: DemoLaunch): AgentOrgExecutionTreeDto['rootOrg']['defaultLaunchConfiguration'] => ({
  runtimeKind: launch.runtimeKind as AgentOrgExecutionTreeDto['rootOrg']['defaultLaunchConfiguration']['runtimeKind'],
  llmModelIdentifier: launch.llmModelIdentifier,
  llmConfig: launch.llmConfig as AgentOrgExecutionTreeDto['rootOrg']['defaultLaunchConfiguration']['llmConfig'],
  autoExecuteTools: launch.autoExecuteTools,
  workspaceRootPath: launch.workspaceRootPath,
});

export const addressOf = (agent: DemoAgent): string => (agent.memberName ? `/${agent.memberName}` : '/');

/** Whether the node holds the run live (any of its agents is idle or working): the run list's `isActive`. */
export const isLive = (world: DemoWorld, run: DemoRun): boolean => world.statusOf(run) !== 'offline';

/** A Team run's own tree (`TeamRunExecutionTreeDto`): its members; the runs it delegated are its run tree's rows. */
export const teamExecutionTree = (run: DemoRun): TeamRunExecutionTreeDto => teamRunExecutionTreeDtoSchema.parse({
  created_at: run.createdAt, archived_at: null, application_binding: null, handoffs: [],
  root_team: {
    address: '/', team_definition_id: run.definitionId, team_definition_name: run.name, team_run_id: run.runId,
    coordinator_address: addressOf(run.coordinator), default_launch_configuration: launchSnake(runLaunchOf(run)),
    members: run.agents.map((agent) => ({
      kind: 'configured_agent', address: addressOf(agent), agent_definition_id: agent.definitionId, role: null, description: null,
      agent_run_id: agent.agentRunId, platform_agent_run_id: null, launch_configuration: launchSnake(agent.launch),
    })),
  },
});

/** An Org run's own tree (`AgentOrgExecutionTreeDto`): its members (the demo's Org has agents only). */
export const orgExecutionTree = (run: DemoRun): AgentOrgExecutionTreeDto => agentOrgExecutionTreeDtoSchema.parse({
  subjectKind: 'agent_org', createdAt: run.createdAt, archivedAt: null, applicationBinding: null, handoffs: [],
  rootOrg: {
    address: '/', orgDefinitionId: run.definitionId, orgDefinitionName: run.name, orgRunId: run.runId,
    defaultLaunchConfiguration: launchCamel(runLaunchOf(run)),
    members: run.agents.map((agent) => ({
      address: addressOf(agent), agentDefinitionId: agent.definitionId, role: null, description: null, agentRunId: agent.agentRunId,
      platformAgentRunId: null, launchConfiguration: launchCamel(agent.launch),
    })),
  },
});
