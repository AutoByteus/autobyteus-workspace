import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import {
  createTeamExecutionAddress,
  sameTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import type { Conversation } from '~/types/conversation';
import type {
  TeamRunMetadataAgentMember,
  TeamRunMetadataMember,
  TeamRunMetadataPayload,
  TeamRunMetadataSubTeamMember,
} from '~/stores/runHistoryTypes';
import type {
  TeamTaskProjection,
  TeamTaskProjectionSnapshot,
  TeamTaskProjectionStatus,
  TeamTaskUpdateProjection,
  TeamExecutionProjectionMessage,
} from '~/services/teamExecution/teamExecutionModels';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import { buildTeamRunFrontendProjection } from '~/services/teamExecution/teamRunFrontendProjectionBuilder';

const NOW = '2026-08-10T12:00:00.000Z';

export interface TestAgentNode {
  readonly kind: 'agent';
  readonly address: string;
  readonly displayName: string;
  readonly role: string | null;
  readonly description: string | null;
  readonly agentDefinitionId: string;
  readonly agentRunId: string;
  readonly runtimeKind: string;
  readonly llmModelIdentifier: string;
  readonly autoExecuteTools: boolean;
  readonly skillAccessMode: 'PRELOADED_ONLY' | 'NONE';
  readonly llmConfig: Record<string, unknown> | null;
  readonly workspaceRootPath: string | null;
  readonly currentStatus: AgentStatus;
}

export interface TestSubTeamNode {
  readonly kind: 'agent_team';
  readonly address: string;
  readonly displayName: string;
  readonly role: string | null;
  readonly description: string | null;
  readonly teamDefinitionId: string;
  readonly teamRunId: string;
  readonly coordinatorAddress: string;
  readonly children: readonly TestTeamNode[];
}

export type TestTeamNode = TestAgentNode | TestSubTeamNode;

export const testAgentNode = (
  address: string,
  overrides: Partial<TestAgentNode> = {},
): TestAgentNode => Object.freeze({
  kind: 'agent',
  address,
  displayName: address.split('/').filter(Boolean).at(-1) ?? 'agent',
  role: null,
  description: null,
  agentDefinitionId: `${address.replace(/[^a-z0-9]+/gi, '-')}-definition`,
  agentRunId: `${address.replace(/[^a-z0-9]+/gi, '-')}-run`,
  runtimeKind: 'autobyteus',
  llmModelIdentifier: 'test-model',
  autoExecuteTools: true,
  skillAccessMode: 'NONE',
  llmConfig: null,
  workspaceRootPath: null,
  currentStatus: AgentStatus.Idle,
  ...overrides,
});

export const testSubTeamNode = (
  address: string,
  children: readonly TestTeamNode[],
  overrides: Partial<TestSubTeamNode> = {},
): TestSubTeamNode => Object.freeze({
  kind: 'agent_team',
  address,
  displayName: address === '/' ? 'Test Team' : address.split('/').filter(Boolean).at(-1) ?? 'team',
  role: null,
  description: null,
  teamDefinitionId: `${address.replace(/[^a-z0-9]+/gi, '-')}-definition`,
  teamRunId: `${address.replace(/[^a-z0-9]+/gi, '-')}-run`,
  coordinatorAddress: children.find((child) => child.kind === 'agent')?.address ?? address,
  children: Object.freeze([...children]),
  ...overrides,
});

export const testAgentContext = (input: {
  runId: string;
  displayName?: string;
  status?: AgentStatus;
  messages?: Conversation['messages'];
  workspaceRootPath?: string | null;
  agentDefinitionId?: string;
  runtimeKind?: string;
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
    workspaceMetadata: input.workspaceRootPath
      ? {
          workspaceId: 'test-workspace',
          workspaceRootPath: input.workspaceRootPath,
          displayName: 'test-workspace',
          kind: 'filesystem',
        }
      : null,
    autoExecuteTools: input.autoExecuteTools ?? true,
    skillAccessMode: 'NONE',
    isLocked: true,
    llmConfig: null,
  };
  const conversation: Conversation = {
    id: input.runId,
    messages: input.messages ?? [],
    createdAt: NOW,
    updatedAt: NOW,
    agentDefinitionId,
    agentName: config.agentDefinitionName,
    llmModelIdentifier: config.llmModelIdentifier,
  };
  const context = new AgentContext(config, new AgentRunState(input.runId, conversation));
  context.state.currentStatus = input.status ?? AgentStatus.Idle;
  return context;
};

const toMetadataMember = (node: TestTeamNode, workspaceRootPath: string | null): TeamRunMetadataMember => {
  const common = { address: node.address, role: node.role, description: node.description };
  if (node.kind === 'agent') {
    return {
      ...common,
      kind: 'agent',
      agentRunId: node.agentRunId,
      runtimeKind: node.runtimeKind,
      platformAgentRunId: null,
      agentDefinitionId: node.agentDefinitionId,
      llmModelIdentifier: node.llmModelIdentifier,
      autoExecuteTools: node.autoExecuteTools,
      skillAccessMode: node.skillAccessMode,
      llmConfig: node.llmConfig,
      workspaceRootPath: node.workspaceRootPath ?? workspaceRootPath,
      applicationExecutionContext: null,
    } satisfies TeamRunMetadataAgentMember;
  }
  return {
    ...common,
    kind: 'agent_team',
    teamDefinitionId: node.teamDefinitionId,
    teamRunId: node.teamRunId,
    coordinatorAddress: node.coordinatorAddress,
    children: node.children.map((child) => toMetadataMember(child, workspaceRootPath)),
  } satisfies TeamRunMetadataSubTeamMember;
};

const listAgents = (nodes: readonly TestTeamNode[]): readonly TestAgentNode[] => nodes.flatMap((node) =>
  node.kind === 'agent' ? [node] : listAgents(node.children));

export const testTaskProjection = (input: {
  taskId: string;
  executionAddress: TeamExecutionAddress;
  senderAddress: TeamExecutionAddress;
  status?: TeamTaskProjectionStatus;
  content?: string;
  createdAt?: string;
  startedAt?: string;
  updatedAt?: string;
  referenceFiles?: readonly TeamReferenceFile[];
  updates?: readonly TeamTaskUpdateProjection[];
}): TeamTaskProjection => Object.freeze({
  taskId: input.taskId,
  executionAddress: createTeamExecutionAddress(input.executionAddress),
  status: input.status ?? 'active',
  senderAddress: createTeamExecutionAddress(input.senderAddress),
  content: input.content ?? `Task ${input.taskId}`,
  referenceFiles: Object.freeze([...(input.referenceFiles ?? [])]),
  createdAt: input.createdAt ?? NOW,
  startedAt: input.startedAt ?? NOW,
  updatedAt: input.updatedAt ?? NOW,
  updates: Object.freeze([...(input.updates ?? [])]),
});

export const reconcileTestTaskSnapshot = (
  context: AgentTeamContext,
  tasks: readonly TeamTaskProjection[],
) => context.executions.reconcileTaskSnapshot(Object.freeze({
  kind: 'complete_root_task_snapshot',
  tasks: Object.freeze([...tasks]),
}) satisfies TeamTaskProjectionSnapshot);

export const buildTestTeamContext = (input: {
  teamRunId?: string;
  teamDefinitionId?: string;
  teamDefinitionName?: string;
  rootChildren: readonly TestTeamNode[];
  coordinatorAddress?: string;
  focusedExecutionAddress?: TeamExecutionAddress;
  workspaceRootPath?: string | null;
  contexts?: readonly { executionAddress: TeamExecutionAddress; context: AgentContext }[];
  isActive?: boolean;
  tasks?: readonly TeamTaskProjection[];
  executionMessages?: readonly TeamExecutionProjectionMessage[];
  configuration?: Partial<TeamRunConfig>;
}): AgentTeamContext => {
  const teamRunId = input.teamRunId ?? 'test-root-team-run';
  const coordinatorAddress = input.coordinatorAddress
    ?? input.rootChildren.find((node) => node.kind === 'agent')?.address
    ?? listAgents(input.rootChildren)[0]?.address;
  if (!coordinatorAddress) throw new Error('Test Team requires one Agent coordinator.');
  const root: TestSubTeamNode = testSubTeamNode('/', input.rootChildren, {
    displayName: input.teamDefinitionName ?? 'Test Team',
    teamDefinitionId: input.teamDefinitionId ?? 'test-team-definition',
    teamRunId,
    coordinatorAddress,
  });
  const metadata: TeamRunMetadataPayload = {
    schemaVersion: 3,
    teamDefinitionName: input.teamDefinitionName ?? 'Test Team',
    createdAt: NOW,
    rootTeam: toMetadataMember(root, input.workspaceRootPath ?? null) as TeamRunMetadataSubTeamMember,
    handoffs: [],
  };
  const workspaceMetadata = input.workspaceRootPath ? {
    workspaceId: 'test-workspace',
    workspaceRootPath: input.workspaceRootPath,
    displayName: 'test-workspace',
    kind: 'filesystem' as const,
  } : null;
  const configuration: TeamRunConfig = {
    teamDefinitionId: input.teamDefinitionId ?? 'test-team-definition',
    teamDefinitionName: input.teamDefinitionName ?? 'Test Team',
    runtimeKind: 'autobyteus',
    workspaceId: workspaceMetadata?.workspaceId ?? null,
    workspaceMetadata,
    llmModelIdentifier: 'test-model',
    llmConfig: null,
    autoExecuteTools: true,
    skillAccessMode: 'NONE',
    memberOverrides: {},
    isLocked: true,
    ...input.configuration,
  };
  const explicitContexts = input.contexts ?? [];
  const persistentAgentSeeds = listAgents(input.rootChildren).map((node) => {
    const address = createTeamExecutionAddress({ rootTeamRunId: teamRunId, memberAddress: node.address });
    const explicit = explicitContexts.find((entry) => sameTeamExecutionAddress(entry.executionAddress, address));
    return {
      memberAddress: node.address,
      agentContext: explicit?.context ?? testAgentContext({
        runId: node.agentRunId,
        displayName: node.displayName,
        status: node.currentStatus,
        workspaceRootPath: node.workspaceRootPath ?? input.workspaceRootPath,
        agentDefinitionId: node.agentDefinitionId,
        runtimeKind: node.runtimeKind,
        llmModelIdentifier: node.llmModelIdentifier,
        autoExecuteTools: node.autoExecuteTools,
      }),
      runtime: { kind: 'loaded' as const },
    };
  });
  const focusedAddress = input.focusedExecutionAddress ?? createTeamExecutionAddress({
    rootTeamRunId: teamRunId,
    memberAddress: coordinatorAddress,
  });
  const context = buildTeamRunFrontendProjection({
    metadata,
    configuration,
    rootLifecycle: { isActive: input.isActive ?? true },
    initialFocusedMemberAddress: focusedAddress.memberAddress,
    persistentAgentSeeds,
  });
  if (input.tasks?.length) {
    const result = reconcileTestTaskSnapshot(context, input.tasks);
    if (result.disposition === 'rejected') throw new Error(`Rejected test task snapshot: ${result.message}`);
  }
  for (const message of input.executionMessages ?? []) {
    const result = context.executions.applyExecutionMessage(message);
    if (result.disposition === 'rejected') throw new Error(`Rejected test execution message: ${result.message}`);
  }
  if (!sameTeamExecutionAddress(focusedAddress, context.executions.getFocusedAddress())) {
    const result = context.executions.focus(focusedAddress);
    if (result.disposition === 'rejected') throw new Error(`Rejected test focus: ${result.message}`);
  }
  return context;
};
