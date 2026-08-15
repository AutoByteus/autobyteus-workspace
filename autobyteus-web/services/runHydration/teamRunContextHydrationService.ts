import {
  teamRunExecutionTreeDtoSchema,
  type TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts';
import { getApolloClient } from '~/utils/apolloClient';
import { GetTeamMemberRunProjection, GetTeamRunResumeConfig } from '~/graphql/queries/runHistoryQueries';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import type {
  TeamMemberRunProjectionPayload,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import { createWorkspaceMetadata } from '~/utils/workspaceMetadata';
import { buildConversationFromProjection } from './runProjectionConversation';
import { hydrateActivitiesFromProjection } from './runProjectionActivityHydration';
import { primeRecentEventMonitorBaseline, resetRecentEventMonitorBaseline } from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';
import { fetchTaskDelegationRecordsForTeam } from './taskDelegationHydrationService';
import { fetchTeamCommunicationForTeam } from './teamCommunicationHydrationService';
import { createTeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState';
import {
  createTeamAgentContext,
  createTeamConfigurationView,
} from '~/services/teamExecution/teamExecutionContextFactory';
import {
  collectExecutionAgents,
  findConfiguredAgentByAddress,
} from '~/services/teamExecution/teamExecutionTreeSelectors';

export interface LoadTeamRunContextHydrationInput {
  teamRunId: string;
  agentRunId?: string | null;
  memberAddress?: AgentTeamAddress | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
}

export interface TeamRunContextHydrationPayload {
  teamRunId: string;
  focusedAgentRunId: string;
  resumeConfig: TeamRunResumeConfigPayload;
  hydratedContext: AgentTeamContext;
  projectionByAgentRunId: Map<string, TeamMemberRunProjectionPayload | null>;
}

interface ResumeGraphqlData {
  getTeamRunResumeConfig: {
    teamRunId: string;
    isActive: boolean;
    executionTree: unknown;
  } | null;
}

interface ProjectionGraphqlData {
  getTeamMemberRunProjection: TeamMemberRunProjectionPayload | null;
}

const fetchProjection = async (
  teamRunId: string,
  agentRunId: string,
): Promise<TeamMemberRunProjectionPayload | null> => {
  try {
    const response = await getApolloClient().query<ProjectionGraphqlData>({
      query: GetTeamMemberRunProjection,
      variables: { teamRunId, agentRunId },
      fetchPolicy: 'network-only',
    });
    if (response.errors?.length) throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
    const projection = response.data?.getTeamMemberRunProjection ?? null;
    if (projection && projection.agentRunId !== agentRunId) {
      throw new Error(`Team member projection '${projection.agentRunId}' does not match '${agentRunId}'.`);
    }
    return projection;
  } catch (error) {
    console.warn(`[teamRunContextHydration] Failed to fetch AgentRun projection '${agentRunId}'.`, error);
    return null;
  }
};

const resolveWorkspaces = async (input: {
  tree: TeamRunExecutionTreeDto;
  isActive: boolean;
  resolveWorkspaceMetadataByRootPath: LoadTeamRunContextHydrationInput['resolveWorkspaceMetadataByRootPath'];
  ensureWorkspaceByRootPath?: LoadTeamRunContextHydrationInput['ensureWorkspaceByRootPath'];
}): Promise<ReadonlyMap<AgentTeamAddress, WorkspaceMetadata>> => {
  const result = new Map<AgentTeamAddress, WorkspaceMetadata>();
  for (const agent of collectExecutionAgents(input.tree).filter((entry) => entry.configured)) {
    const configured = findConfiguredAgentByAddress(input.tree, agent.address);
    const rootPath = configured?.launch_configuration.workspace_root_path ?? null;
    if (!rootPath || result.has(agent.address)) continue;
    const workspaceId = input.isActive
      ? await input.ensureWorkspaceByRootPath?.(rootPath) ?? null
      : null;
    const existing = await input.resolveWorkspaceMetadataByRootPath(rootPath);
    const metadata = existing ?? (workspaceId ? createWorkspaceMetadata({ workspaceId, workspaceRootPath: rootPath }) : null);
    if (metadata) result.set(agent.address, metadata);
  }
  return result;
};

const applyProjection = (input: {
  tree: TeamRunExecutionTreeDto;
  agentRunId: string;
  address: AgentTeamAddress;
  context: AgentContext;
  projection: TeamMemberRunProjectionPayload | null;
}): void => {
  if (!input.projection) return;
  const configured = findConfiguredAgentByAddress(input.tree, input.address);
  if (!configured) throw new Error(`AgentRun '${input.agentRunId}' has no configured placement.`);
  resetRecentEventMonitorBaseline(input.context);
  input.context.state.conversation = buildConversationFromProjection(
    input.agentRunId,
    input.projection.conversation ?? [],
    {
      agentDefinitionId: configured.agent_definition_id,
      agentName: input.address.split('/').at(-1) ?? input.address,
      llmModelIdentifier: configured.launch_configuration.llm_model_identifier,
    },
  );
  input.context.state.hasEarlierActiveTraceEvents = input.projection.hasEarlierActiveTraceEvents === true;
  hydrateActivitiesFromProjection(input.agentRunId, input.projection.activities ?? []);
  primeRecentEventMonitorBaseline(input.context);
};

const selectInitialAgentRunId = (input: {
  tree: TeamRunExecutionTreeDto;
  requestedAgentRunId?: string | null;
  requestedMemberAddress?: AgentTeamAddress | null;
}): string => {
  const agents = collectExecutionAgents(input.tree);
  const requestedId = input.requestedAgentRunId?.trim() ?? '';
  if (requestedId && agents.some((agent) => agent.agentRunId === requestedId)) return requestedId;
  if (input.requestedMemberAddress) {
    const configured = findConfiguredAgentByAddress(input.tree, input.requestedMemberAddress);
    if (configured) return configured.agent_run_id;
  }
  const coordinator = findConfiguredAgentByAddress(input.tree, input.tree.root_team.coordinator_address);
  if (!coordinator) throw new Error(`Team '${input.tree.root_team.team_run_id}' has no root coordinator Agent.`);
  return coordinator.agent_run_id;
};

export const hydrateLiveTeamRunContext = async (
  input: LoadTeamRunContextHydrationInput,
): Promise<TeamRunContextHydrationPayload> => {
  const client = getApolloClient();
  const response = await client.query<ResumeGraphqlData>({
    query: GetTeamRunResumeConfig,
    variables: { teamRunId: input.teamRunId },
    fetchPolicy: 'network-only',
  });
  if (response.errors?.length) throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '));
  const raw = response.data?.getTeamRunResumeConfig;
  if (!raw) throw new Error(`Team resume config payload missing for '${input.teamRunId}'.`);
  const tree = teamRunExecutionTreeDtoSchema.parse(raw.executionTree);
  if (raw.teamRunId !== input.teamRunId || tree.root_team.team_run_id !== input.teamRunId) {
    throw new Error(`Team execution tree root identity mismatch for '${input.teamRunId}'.`);
  }
  if (raw.isActive && !input.ensureWorkspaceByRootPath) {
    throw new Error(`Active Team '${input.teamRunId}' requires workspace activation.`);
  }
  const [tasks, messages, workspaces] = await Promise.all([
    fetchTaskDelegationRecordsForTeam({ client, teamRunId: input.teamRunId }),
    fetchTeamCommunicationForTeam({ client, teamRunId: input.teamRunId }),
    resolveWorkspaces({
      tree,
      isActive: raw.isActive,
      resolveWorkspaceMetadataByRootPath: input.resolveWorkspaceMetadataByRootPath,
      ensureWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
    }),
  ]);
  const projectionByAgentRunId = new Map<string, TeamMemberRunProjectionPayload | null>();
  await Promise.all(collectExecutionAgents(tree).map(async (agent) => {
    projectionByAgentRunId.set(agent.agentRunId, await fetchProjection(input.teamRunId, agent.agentRunId));
  }));
  const contexts = collectExecutionAgents(tree).map((agent) => {
    const context = createTeamAgentContext({
      tree,
      agentRunId: agent.agentRunId,
      address: agent.address,
      workspaceMetadata: workspaces.get(agent.address) ?? null,
    });
    if (!context) throw new Error(`No exact Agent context could be built for '${agent.agentRunId}'.`);
    applyProjection({ tree, agentRunId: agent.agentRunId, address: agent.address, context, projection: projectionByAgentRunId.get(agent.agentRunId) ?? null });
    return Object.freeze({ agentRunId: agent.agentRunId, memberAddress: agent.address, agentContext: context });
  });
  const initialFocusedAgentRunId = selectInitialAgentRunId({
    tree,
    requestedAgentRunId: input.agentRunId,
    requestedMemberAddress: input.memberAddress,
  });
  const view = createTeamExecutionViewState({
    rootTeamRunId: input.teamRunId,
    rootActive: raw.isActive,
    executionTree: tree,
    tasks,
    messages,
    configuration: createTeamConfigurationView({ tree, workspaceMetadataByAddress: workspaces }),
    initialFocusedAgentRunId,
    agentContexts: contexts,
    createAgentContext: (agentRunId, address, currentTree) => createTeamAgentContext({
      tree: currentTree,
      agentRunId,
      address,
      workspaceMetadata: workspaces.get(address) ?? null,
    }),
  });
  const hydratedContext = Object.freeze({ view });
  return {
    teamRunId: input.teamRunId,
    focusedAgentRunId: view.getFocusedAgentRunId(),
    resumeConfig: { teamRunId: input.teamRunId, isActive: raw.isActive, executionTree: tree },
    projectionByAgentRunId,
    hydratedContext,
  };
};
