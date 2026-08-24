import type {
  AgentLaunchConfigurationDto,
  ConfiguredMemberExecutionDto,
  TaskDelegationRecordDto,
  TaskExecutionDto,
  TaskTeamMemberExecutionDto,
  TeamCommunicationMessageDto,
  TeamRunExecutionTreeDto,
  TeamStreamServerMessage,
} from '@autobyteus/team-stream-contracts';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { Conversation } from '~/types/conversation';
import { createTeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState';
import { collectExecutionAgents } from '~/services/teamExecution/teamExecutionTreeSelectors';
import { createTeamAgentContext } from '~/services/teamExecution/teamExecutionContextFactory';

const NOW = '2026-08-10T12:00:00.000Z';

export interface TestAgentNode {
  readonly kind: 'agent';
  readonly address: AgentTeamAddress;
  readonly displayName: string;
  readonly role: string | null;
  readonly description: string | null;
  readonly agentDefinitionId: string;
  readonly agentRunId: string;
  readonly platformAgentRunId: string | null;
  readonly runtimeKind: 'autobyteus' | 'codex_app_server' | 'claude_agent_sdk';
  readonly llmModelIdentifier: string;
  readonly autoExecuteTools: boolean;
  readonly skillAccessMode: 'PRELOADED_ONLY' | 'NONE';
  readonly llmConfig: Record<string, unknown> | null;
  readonly workspaceRootPath: string | null;
  readonly currentStatus: AgentStatus;
}

export interface TestSubTeamNode {
  readonly kind: 'agent_team';
  readonly address: AgentTeamAddress;
  readonly displayName: string;
  readonly role: string | null;
  readonly description: string | null;
  readonly teamDefinitionId: string;
  readonly teamRunId: string;
  readonly coordinatorAddress: AgentTeamAddress;
  readonly defaultLaunchConfiguration: AgentLaunchConfigurationDto;
  readonly children: readonly TestTeamNode[];
  readonly taskExecutions: readonly TaskExecutionDto[];
}

export type TestTeamNode = TestAgentNode | TestSubTeamNode;

export const testAgentNode = (
  address: AgentTeamAddress,
  overrides: Partial<TestAgentNode> = {},
): TestAgentNode => Object.freeze({
  kind: 'agent',
  address,
  displayName: address.split('/').filter(Boolean).at(-1) ?? 'agent',
  role: null,
  description: null,
  agentDefinitionId: `${address.replace(/[^a-z0-9]+/gi, '-')}-definition`,
  agentRunId: `${address.replace(/[^a-z0-9]+/gi, '-')}-run`,
  platformAgentRunId: null,
  runtimeKind: 'autobyteus',
  llmModelIdentifier: 'test-model',
  autoExecuteTools: true,
  skillAccessMode: 'NONE',
  llmConfig: null,
  workspaceRootPath: null,
  currentStatus: AgentStatus.Idle,
  ...overrides,
});

const configuredAgents = (nodes: readonly TestTeamNode[]): TestAgentNode[] => nodes.flatMap((node) =>
  node.kind === 'agent' ? [node] : configuredAgents(node.children));

export const testSubTeamNode = (
  address: AgentTeamAddress,
  children: readonly TestTeamNode[],
  overrides: Partial<TestSubTeamNode> = {},
): TestSubTeamNode => {
  const coordinatorAddress = overrides.coordinatorAddress
    ?? children.find((child) => child.kind === 'agent')?.address
    ?? address;
  const coordinator = configuredAgents(children).find((agent) => agent.address === coordinatorAddress);
  if (!coordinator) throw new Error(`Test Team '${address}' requires a direct configured coordinator.`);
  return Object.freeze({
    kind: 'agent_team',
    address,
    displayName: address === '/' ? 'Test Team' : address.split('/').filter(Boolean).at(-1) ?? 'team',
    role: null,
    description: null,
    teamDefinitionId: `${address.replace(/[^a-z0-9]+/gi, '-')}-definition`,
    teamRunId: `${address.replace(/[^a-z0-9]+/gi, '-')}-run`,
    coordinatorAddress,
    defaultLaunchConfiguration: launch(coordinator),
    children: Object.freeze([...children]),
    taskExecutions: Object.freeze([]),
    ...overrides,
  });
};

export const testAgentContext = (input: {
  runId: string;
  displayName?: string;
  status?: AgentStatus;
  messages?: Conversation['messages'];
  workspaceRootPath?: string | null;
  agentDefinitionId?: string;
  runtimeKind?: AgentRunConfig['runtimeKind'];
  llmModelIdentifier?: string;
  autoExecuteTools?: boolean;
}): AgentContext => {
  const agentDefinitionId = input.agentDefinitionId ?? `${input.runId}-definition`;
  const config: AgentRunConfig = {
    agentDefinitionId,
    agentDefinitionName: input.displayName ?? input.runId,
    llmModelIdentifier: input.llmModelIdentifier ?? 'test-model',
    runtimeKind: input.runtimeKind ?? 'autobyteus',
    workspaceId: null,
    workspaceMetadata: input.workspaceRootPath ? {
      workspaceId: 'test-workspace', workspaceRootPath: input.workspaceRootPath,
      displayName: 'test-workspace', kind: 'filesystem',
    } : null,
    autoExecuteTools: input.autoExecuteTools ?? true,
    skillAccessMode: 'NONE', isLocked: true, llmConfig: null,
  };
  const conversation: Conversation = {
    id: input.runId, messages: input.messages ?? [], createdAt: NOW, updatedAt: NOW,
    agentDefinitionId, agentName: config.agentDefinitionName,
    llmModelIdentifier: config.llmModelIdentifier,
  };
  const context = new AgentContext(config, new AgentRunState(input.runId, conversation));
  context.state.currentStatus = input.status ?? AgentStatus.Idle;
  return context;
};

function launch(node: TestAgentNode): AgentLaunchConfigurationDto {
  return {
  runtime_kind: node.runtimeKind,
  llm_model_identifier: node.llmModelIdentifier,
  llm_config: node.llmConfig,
  auto_execute_tools: node.autoExecuteTools,
  skill_access_mode: node.skillAccessMode,
  workspace_root_path: node.workspaceRootPath,
  };
}

const configuredMember = (node: TestTeamNode): ConfiguredMemberExecutionDto => node.kind === 'agent'
  ? {
      kind: 'configured_agent', address: node.address,
      agent_definition_id: node.agentDefinitionId, role: node.role, description: node.description,
      agent_run_id: node.agentRunId, platform_agent_run_id: node.platformAgentRunId,
      launch_configuration: launch(node),
    }
  : {
      kind: 'configured_team', address: node.address,
      team_definition_id: node.teamDefinitionId, role: node.role, description: node.description,
      team_run_id: node.teamRunId, coordinator_address: node.coordinatorAddress,
      default_launch_configuration: node.defaultLaunchConfiguration,
      members: node.children.map(configuredMember), task_executions: [...node.taskExecutions],
    };

const taskTeamNode = (nodes: readonly TestTeamNode[], address: AgentTeamAddress): TestSubTeamNode | null => {
  for (const node of nodes) {
    if (node.kind === 'agent') continue;
    if (node.address === address) return node;
    const nested = taskTeamNode(node.children, address);
    if (nested) return nested;
  }
  return null;
};

const taskMembers = (node: TestSubTeamNode, taskTeamRunId: string): TaskTeamMemberExecutionDto[] =>
  node.children.map((child) => child.kind === 'agent'
    ? {
        kind: 'task_team_agent', address: child.address,
        agent_run_id: `${taskTeamRunId}:${child.agentRunId}`,
        platform_agent_run_id: null,
      }
    : {
        kind: 'task_team', address: child.address,
        team_run_id: `${taskTeamRunId}:${child.teamRunId}`,
        members: taskMembers(child, taskTeamRunId), task_executions: [],
      });

const executionForTask = (
  task: TaskDelegationRecordDto,
  rootChildren: readonly TestTeamNode[],
): TaskExecutionDto => {
  if ('agent_run_id' in task.task_execution) return {
    kind: 'task_agent', address: task.recipient_address,
    agent_run_id: task.task_execution.agent_run_id,
    platform_agent_run_id: null, started_at: task.created_at, settled_at: null,
  };
  const configured = taskTeamNode(rootChildren, task.recipient_address);
  if (!configured) throw new Error(`No configured task Team exists at '${task.recipient_address}'.`);
  return {
    kind: 'task_team', address: task.recipient_address,
    team_run_id: task.task_execution.team_run_id,
    members: taskMembers(configured, task.task_execution.team_run_id),
    task_executions: [], started_at: task.created_at, settled_at: null,
  };
};

export const testTaskRecord = (input: {
  taskId: string;
  delegatorAgentRunId: string;
  recipientAddress: AgentTeamAddress;
  target: { agentRunId: string } | { teamRunId: string };
  status?: TaskDelegationRecordDto['status'];
  description?: string;
  createdAt?: string;
  updates?: TaskDelegationRecordDto['updates'];
  referenceFiles?: TaskDelegationRecordDto['reference_files'];
}): TaskDelegationRecordDto => Object.freeze({
  task_id: input.taskId,
  delegator_agent_run_id: input.delegatorAgentRunId,
  recipient_address: input.recipientAddress,
  task_execution: 'agentRunId' in input.target
    ? { agent_run_id: input.target.agentRunId }
    : { team_run_id: input.target.teamRunId },
  description: input.description ?? `Task ${input.taskId}`,
  reference_files: Object.freeze([...(input.referenceFiles ?? [])]),
  status: input.status ?? 'active',
  updates: Object.freeze([...(input.updates ?? [])]),
  created_at: input.createdAt ?? NOW,
});

export const buildTestTeamContext = (input: {
  teamRunId?: string;
  teamDefinitionId?: string;
  teamDefinitionName?: string;
  rootChildren: readonly TestTeamNode[];
  coordinatorAddress?: AgentTeamAddress;
  focusedAgentRunId?: string;
  workspaceRootPath?: string | null;
  contexts?: readonly { agentRunId: string; context: AgentContext }[];
  isActive?: boolean;
  tasks?: readonly TaskDelegationRecordDto[];
  taskExecutions?: readonly TaskExecutionDto[];
  messages?: readonly TeamCommunicationMessageDto[];
  configuration?: Partial<TeamRunConfig>;
  baseChangeSequence?: number;
}): AgentTeamContext => {
  const teamRunId = input.teamRunId ?? 'test-root-team-run';
  const coordinatorAddress = input.coordinatorAddress
    ?? input.rootChildren.find((node) => node.kind === 'agent')?.address;
  if (!coordinatorAddress) throw new Error('Test Team requires one Agent coordinator.');
  const tasks = [...(input.tasks ?? [])];
  const taskExecutions = input.taskExecutions
    ? [...input.taskExecutions]
    : tasks.map((task) => executionForTask(task, input.rootChildren));
  const coordinator = configuredAgents(input.rootChildren)
    .find((node) => node.address === coordinatorAddress);
  if (!coordinator) throw new Error(`No configured coordinator exists at '${coordinatorAddress}'.`);
  const rootLaunch = launch(coordinator);
  const tree: TeamRunExecutionTreeDto = {
    schema_version: 2, created_at: NOW, archived_at: null,
    application_binding: null, handoffs: [],
    root_team: {
      address: '/',
      team_definition_id: input.teamDefinitionId ?? 'test-team-definition',
      team_definition_name: input.teamDefinitionName ?? 'Test Team',
      team_run_id: teamRunId, coordinator_address: coordinatorAddress,
      default_launch_configuration: rootLaunch,
      members: input.rootChildren.map(configuredMember), task_executions: taskExecutions,
    },
  };
  const workspaceMetadata = input.workspaceRootPath ? {
    workspaceId: 'test-workspace', workspaceRootPath: input.workspaceRootPath,
    displayName: 'test-workspace', kind: 'filesystem' as const,
  } : null;
  const configuration: TeamRunConfig = {
    teamDefinitionId: input.teamDefinitionId ?? 'test-team-definition',
    teamDefinitionName: input.teamDefinitionName ?? 'Test Team',
    rootConfig: {
      runtimeKind: rootLaunch.runtime_kind,
      workspace: { workspaceId: workspaceMetadata?.workspaceId ?? null, workspaceMetadata },
      llmModelIdentifier: rootLaunch.llm_model_identifier,
      llmConfig: rootLaunch.llm_config as Record<string, unknown> | null,
      autoExecuteTools: rootLaunch.auto_execute_tools,
      skillAccessMode: rootLaunch.skill_access_mode as TeamRunConfig['rootConfig']['skillAccessMode'],
    },
    teamOverrides: {}, agentOverrides: {}, isLocked: true, ...input.configuration,
  };
  const contexts = collectExecutionAgents(tree).map((agent) => {
    const explicit = input.contexts?.find((entry) => entry.agentRunId === agent.agentRunId)?.context;
    const context = explicit ?? createTeamAgentContext({
      tree, agentRunId: agent.agentRunId, address: agent.address, workspaceMetadata,
    });
    if (!context) throw new Error(`No test Agent context for '${agent.agentRunId}'.`);
    const configuredStatus = input.rootChildren
      .flatMap((node): TestAgentNode[] => node.kind === 'agent' ? [node] : [])
      .find((node) => node.agentRunId === agent.agentRunId)?.currentStatus;
    if (configuredStatus) context.state.currentStatus = configuredStatus;
    return Object.freeze({ agentRunId: agent.agentRunId, memberAddress: agent.address, agentContext: context });
  });
  const focusedAgentRunId = input.focusedAgentRunId
    ?? contexts.find((entry) => entry.memberAddress === coordinatorAddress)?.agentRunId
    ?? contexts[0]?.agentRunId;
  if (!focusedAgentRunId) throw new Error('Test Team requires one focusable Agent.');
  const view = createTeamExecutionViewState({
    rootTeamRunId: teamRunId, rootActive: input.isActive ?? true,
    baseChangeSequence: input.baseChangeSequence ?? 0,
    executionTree: tree, tasks, messages: input.messages ?? [], configuration,
    initialFocusedAgentRunId: focusedAgentRunId, agentContexts: contexts,
    createAgentContext: (agentRunId, address, currentTree) => createTeamAgentContext({
      tree: currentTree, agentRunId, address, workspaceMetadata,
    }),
  });
  return Object.freeze({ view });
};

export const applyTestTeamMessage = (
  context: AgentTeamContext,
  message: Exclude<TeamStreamServerMessage,
    { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'TEAM_EXECUTION_VIEW_SNAPSHOT' | 'AGENT_COMMAND_ACK' }>,
) => context.view.applyMessage(message);
