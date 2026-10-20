import type {
  AgentLaunchConfigurationDto,
  ConfiguredAgentExecutionDto,
  TaskExecutionDto,
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
import { collectAgentExecutionLocations } from '~/services/teamExecution/teamExecutionTreeSelectors';
import {
  createTeamAgentContext,
  createTeamConfigurationView,
} from '~/services/teamExecution/teamExecutionContextFactory';

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
  readonly runtimeKind: 'autobyteus' | 'codex_app_server' | 'claude_agent_sdk' | 'grok_build';
  readonly llmModelIdentifier: string;
  readonly autoExecuteTools: boolean;
  readonly llmConfig: Record<string, unknown> | null;
  readonly workspaceRootPath: string | null;
  readonly currentStatus: AgentStatus;
}

/**
 * The layout of a catalog Team that a test delegates a task Team copy of. Teams are flat: its
 * members are Agents. It is not a member of the root Team; a team delegation records it as the
 * copy's `source`.
 */
export interface TestTaskTeamLayout {
  readonly address: AgentTeamAddress;
  readonly teamDefinitionId: string;
  readonly coordinatorAddress: AgentTeamAddress;
  readonly defaultLaunchConfiguration: AgentLaunchConfigurationDto;
  readonly children: readonly TestAgentNode[];
}

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
  llmConfig: null,
  workspaceRootPath: null,
  currentStatus: AgentStatus.Idle,
  ...overrides,
});

export const testTaskTeamLayout = (
  address: AgentTeamAddress,
  children: readonly TestAgentNode[],
  overrides: Partial<TestTaskTeamLayout> = {},
): TestTaskTeamLayout => {
  const coordinatorAddress = overrides.coordinatorAddress ?? children[0]?.address ?? address;
  const coordinator = children.find((agent) => agent.address === coordinatorAddress);
  if (!coordinator) throw new Error(`Test Team '${address}' requires a direct coordinator Agent.`);
  return Object.freeze({
    address,
    teamDefinitionId: `${address.replace(/[^a-z0-9]+/gi, '-')}-definition`,
    coordinatorAddress,
    defaultLaunchConfiguration: launch(coordinator),
    children: Object.freeze([...children]),
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
    isLocked: true, llmConfig: null,
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
  workspace_root_path: node.workspaceRootPath,
  };
}

const withWorkspaceFallback = (
  configuration: AgentLaunchConfigurationDto,
  workspaceRootPath: string | null,
): AgentLaunchConfigurationDto => ({
  ...configuration,
  workspace_root_path: configuration.workspace_root_path ?? workspaceRootPath,
});

const configuredMember = (
  node: TestAgentNode,
  workspaceRootPath: string | null,
): ConfiguredAgentExecutionDto => ({
  kind: 'configured_agent', address: node.address,
  agent_definition_id: node.agentDefinitionId, role: node.role, description: node.description,
  agent_run_id: node.agentRunId, platform_agent_run_id: node.platformAgentRunId,
  launch_configuration: withWorkspaceFallback(launch(node), workspaceRootPath),
});

/** One delegated child in a test tree: who started it, and the task Agent or task Team it is. */
export interface TestDelegation {
  readonly delegatorAgentRunId: string;
  readonly recipientAddress: AgentTeamAddress;
  readonly target: { agentRunId: string } | { teamRunId: string; team: TestTaskTeamLayout };
  readonly startedAt?: string;
}

export const testDelegation = (input: TestDelegation): TestDelegation => Object.freeze({ ...input });

/**
 * A delegated child as the server records it: every copy carries the snapshot it started from. An Agent copy at a
 * configured member's address records that member's settings (origin `configured`); any other Agent copy a
 * catalog-like snapshot named after its address.
 */
const executionForDelegation = (
  delegation: TestDelegation,
  rootChildren: readonly TestAgentNode[],
  workspaceRootPath: string | null,
): TaskExecutionDto => {
  const startedAt = delegation.startedAt ?? NOW;
  if ('agentRunId' in delegation.target) {
    const slot = rootChildren.find((node) => node.address === delegation.recipientAddress);
    const name = delegation.recipientAddress.split('/').filter(Boolean).at(-1) ?? 'agent';
    return {
      kind: 'task_agent', address: delegation.recipientAddress,
      agent_run_id: delegation.target.agentRunId,
      platform_agent_run_id: null, delegator_agent_run_id: delegation.delegatorAgentRunId, started_at: startedAt,
      source: slot
        ? { kind: 'agent', agent_definition_id: slot.agentDefinitionId, launch_configuration: withWorkspaceFallback(launch(slot), workspaceRootPath),
          launch_source: { origin: 'configured', fallbacks: [] } }
        : { kind: 'agent', agent_definition_id: name, launch_configuration: withWorkspaceFallback(launch(testAgentNode(delegation.recipientAddress)), workspaceRootPath) },
    };
  }
  const { team, teamRunId } = delegation.target;
  if (team.address !== delegation.recipientAddress) {
    throw new Error(`Test Team layout '${team.address}' is not at '${delegation.recipientAddress}'.`);
  }
  return {
    kind: 'task_team', address: delegation.recipientAddress,
    team_run_id: teamRunId,
    members: team.children.map((child) => ({
      kind: 'task_team_agent' as const, address: child.address,
      agent_run_id: `${teamRunId}:${child.agentRunId}`, platform_agent_run_id: null,
    })),
    task_executions: [], delegator_agent_run_id: delegation.delegatorAgentRunId, started_at: startedAt,
    source: {
      kind: 'agent_team', team_definition_id: team.teamDefinitionId, coordinator_address: team.coordinatorAddress,
      members: team.children.map((child) => ({ address: child.address, agent_definition_id: child.agentDefinitionId,
        launch_configuration: launch(child), follows_team: true })),
      handoffs: [], default_launch_configuration: team.defaultLaunchConfiguration,
    },
  };
};

export const buildTestTeamContext = (input: {
  teamRunId?: string;
  teamDefinitionId?: string;
  teamDefinitionName?: string;
  rootChildren: readonly TestAgentNode[];
  coordinatorAddress?: AgentTeamAddress;
  focusedAgentRunId?: string;
  workspaceRootPath?: string | null;
  contexts?: readonly { agentRunId: string; context: AgentContext }[];
  isActive?: boolean;
  delegations?: readonly TestDelegation[];
  taskExecutions?: readonly TaskExecutionDto[];
  messages?: readonly TeamCommunicationMessageDto[];
  configuration?: Record<string, unknown>;
  baseChangeSequence?: number;
  closedTaskExecutions?: readonly import('~/utils/collaboration/taskExecutionClosure').TaskExecutionReference[];
}): AgentTeamContext => {
  const teamRunId = input.teamRunId ?? 'test-root-team-run';
  const coordinatorAddress = input.coordinatorAddress
    ?? input.rootChildren[0]?.address;
  if (!coordinatorAddress) throw new Error('Test Team requires one Agent coordinator.');
  const taskExecutions = input.taskExecutions
    ? [...input.taskExecutions]
    : (input.delegations ?? []).map((delegation) => executionForDelegation(delegation, input.rootChildren, input.workspaceRootPath ?? null));
  const coordinator = input.rootChildren.find((node) => node.address === coordinatorAddress);
  if (!coordinator) throw new Error(`No configured coordinator exists at '${coordinatorAddress}'.`);
  const rootLaunch = withWorkspaceFallback(launch(coordinator), input.workspaceRootPath ?? null);
  const tree: TeamRunExecutionTreeDto = {
    created_at: NOW, archived_at: null,
    application_binding: null, handoffs: [],
    root_team: {
      address: '/',
      team_definition_id: input.teamDefinitionId ?? 'test-team-definition',
      team_definition_name: input.teamDefinitionName ?? 'Test Team',
      team_run_id: teamRunId, coordinator_address: coordinatorAddress,
      default_launch_configuration: rootLaunch,
      members: input.rootChildren.map((member) => configuredMember(member, input.workspaceRootPath ?? null)), task_executions: taskExecutions,
    },
  };
  const configuredWorkspaceId = typeof input.configuration?.workspaceId === 'string'
    ? input.configuration.workspaceId
    : 'test-workspace';
  const configuredWorkspaceMetadata = input.configuration?.workspaceMetadata;
  const workspaceMetadata = configuredWorkspaceMetadata && typeof configuredWorkspaceMetadata === 'object'
    ? configuredWorkspaceMetadata as TeamRunConfig['rootConfig']['workspace']['workspaceMetadata']
    : input.workspaceRootPath ? {
    workspaceId: configuredWorkspaceId, workspaceRootPath: input.workspaceRootPath,
    displayName: 'test-workspace', kind: 'filesystem' as const,
  } : null;
  const configurationMetadata = new Map<AgentTeamAddress, NonNullable<typeof workspaceMetadata>>();
  if (workspaceMetadata) {
    configurationMetadata.set('/', workspaceMetadata);
    input.rootChildren.forEach((node) => configurationMetadata.set(node.address, workspaceMetadata));
  }
  const configuration = createTeamConfigurationView({
    tree,
    workspaceMetadataByAddress: configurationMetadata,
  });
  const contexts = collectAgentExecutionLocations(tree).map((agent) => {
    const explicit = input.contexts?.find((entry) => entry.agentRunId === agent.agentRunId)?.context;
    const context = explicit ?? createTeamAgentContext({
      tree, agentRunId: agent.agentRunId, address: agent.memberAddress, workspaceMetadata,
    });
    if (!context) throw new Error(`No test Agent context for '${agent.agentRunId}'.`);
    const configuredStatus = input.rootChildren.find((node) => node.agentRunId === agent.agentRunId)?.currentStatus;
    if (configuredStatus) context.state.currentStatus = configuredStatus;
    return Object.freeze({ agentRunId: agent.agentRunId, memberAddress: agent.memberAddress, agentContext: context });
  });
  const focusedAgentRunId = input.focusedAgentRunId
    ?? contexts.find((entry) => entry.memberAddress === coordinatorAddress)?.agentRunId
    ?? contexts[0]?.agentRunId;
  if (!focusedAgentRunId) throw new Error('Test Team requires one focusable Agent.');
  const view = createTeamExecutionViewState({
    rootTeamRunId: teamRunId, rootActive: input.isActive ?? true,
    baseChangeSequence: input.baseChangeSequence ?? 0,
    executionTree: tree, closedTaskExecutions: input.closedTaskExecutions ?? [], messages: input.messages ?? [], configuration,
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
