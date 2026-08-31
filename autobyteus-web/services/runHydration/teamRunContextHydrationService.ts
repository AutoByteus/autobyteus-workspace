import {
  teamRunExecutionTreeDtoSchema,
  type TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts';
import { getApolloClient } from '~/utils/apolloClient';
import {
  GetTeamMemberRunProjection,
  GetTeamRunExecutionCheckpoint,
  GetTeamRunResumeConfig,
} from '~/graphql/queries/runHistoryQueries';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { useAgentActivityStore, type ActivityProjectionReplacement } from '~/stores/agentActivityStore';
import type {
  GetTeamRunExecutionCheckpointQueryData,
  TeamMemberRunProjectionPayload,
  TeamRunExecutionCheckpointPayload,
  TeamRunResumeConfigPayload,
  RunModelConfigEditability,
} from '~/stores/runHistoryTypes';
import { createWorkspaceMetadata } from '~/utils/workspaceMetadata';
import { buildConversationFromProjection } from './runProjectionConversation';
import { buildActivitiesFromProjection } from './runProjectionActivityHydration';
import { fetchTaskDelegationRecordsForTeam } from './taskDelegationHydrationService';
import { fetchTeamCommunicationForTeam } from './teamCommunicationHydrationService';
import { createTeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState';
import {
  createTeamAgentContext,
  createTeamConfigurationView,
} from '~/services/teamExecution/teamExecutionContextFactory';
import {
  collectConfiguredAgents,
  collectConfiguredTeams,
  collectAgentExecutionLocations,
  findConfiguredAgentByAddress,
} from '~/services/teamExecution/teamExecutionTreeSelectors';

export interface LoadTeamRunContextHydrationInput {
  teamRunId: string;
  agentRunId?: string | null;
  memberAddress?: AgentTeamAddress | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
}

export interface TeamRunHydrationCandidate {
  teamRunId: string;
  focusedAgentRunId: string;
  resumeConfig: TeamRunResumeConfigPayload;
  hydratedContext: AgentTeamContext;
  projectionByAgentRunId: Map<string, TeamMemberRunProjectionPayload | null>;
  activityReplacements: readonly ActivityProjectionReplacement[];
}

export interface TeamRunRecoveryHydrationCandidate extends Omit<TeamRunHydrationCandidate, 'projectionByAgentRunId'> {
  projectionByAgentRunId: Map<string, TeamMemberRunProjectionPayload>;
  expectedBaseChangeSequence: number;
}

interface ResumeGraphqlData {
  getTeamRunResumeConfig: {
    teamRunId: string;
    isActive: boolean;
    executionTree: unknown;
    modelConfigEditability: RunModelConfigEditability;
  } | null;
}

interface ProjectionGraphqlData {
  getTeamMemberRunProjection: TeamMemberRunProjectionPayload | null;
}

type ProjectionFetchPolicy = 'best_effort' | 'exact';

const graphqlErrors = (errors: readonly { message: string }[] | undefined): string | null =>
  errors?.length ? errors.map((error) => error.message).join(', ') : null;

export const fetchExactTeamMemberProjection = async (
  teamRunId: string,
  agentRunId: string,
): Promise<TeamMemberRunProjectionPayload> => {
  const response = await getApolloClient().query<ProjectionGraphqlData>({
    query: GetTeamMemberRunProjection,
    variables: { teamRunId, agentRunId },
    fetchPolicy: 'network-only',
  });
  const errors = graphqlErrors(response.errors);
  if (errors) throw new Error(errors);
  const projection = response.data?.getTeamMemberRunProjection;
  if (!projection) throw new Error(`Team member projection payload missing for '${agentRunId}'.`);
  if (projection.agentRunId !== agentRunId) {
    throw new Error(`Team member projection '${projection.agentRunId}' does not match '${agentRunId}'.`);
  }
  return projection;
};

const fetchBestEffortProjection = async (
  teamRunId: string,
  agentRunId: string,
): Promise<TeamMemberRunProjectionPayload | null> => {
  try {
    return await fetchExactTeamMemberProjection(teamRunId, agentRunId);
  } catch (error) {
    console.warn(`[teamRunContextHydration] Failed to fetch AgentRun projection '${agentRunId}'.`, error);
    return null;
  }
};

const fetchCheckpoint = async (teamRunId: string): Promise<TeamRunExecutionCheckpointPayload> => {
  const response = await getApolloClient().query<GetTeamRunExecutionCheckpointQueryData>({
    query: GetTeamRunExecutionCheckpoint,
    variables: { teamRunId },
    fetchPolicy: 'network-only',
  });
  const errors = graphqlErrors(response.errors);
  if (errors) throw new Error(errors);
  const checkpoint = response.data?.getTeamRunExecutionCheckpoint;
  if (!checkpoint) throw new Error(`Team execution checkpoint missing for '${teamRunId}'.`);
  if (checkpoint.rootTeamRunId !== teamRunId) {
    throw new Error(`Team execution checkpoint root '${checkpoint.rootTeamRunId}' does not match '${teamRunId}'.`);
  }
  return checkpoint;
};

const resolveWorkspaces = async (input: {
  tree: TeamRunExecutionTreeDto;
  isActive: boolean;
  resolveWorkspaceMetadataByRootPath: LoadTeamRunContextHydrationInput['resolveWorkspaceMetadataByRootPath'];
  ensureWorkspaceByRootPath?: LoadTeamRunContextHydrationInput['ensureWorkspaceByRootPath'];
}): Promise<ReadonlyMap<AgentTeamAddress, WorkspaceMetadata>> => {
  const result = new Map<AgentTeamAddress, WorkspaceMetadata>();
  const placements = [
    ...collectConfiguredTeams(input.tree).map((team) => ({
      address: team === input.tree.root_team ? '/' : team.address,
      rootPath: team.default_launch_configuration.workspace_root_path,
    })),
    ...collectConfiguredAgents(input.tree).map((agent) => ({
      address: agent.address,
      rootPath: agent.launch_configuration.workspace_root_path,
    })),
  ];
  const byRootPath = new Map<string, Promise<WorkspaceMetadata | null>>();
  const resolvePath = (rootPath: string): Promise<WorkspaceMetadata | null> => {
    const existingPromise = byRootPath.get(rootPath);
    if (existingPromise) return existingPromise;
    const promise = (async () => {
      const workspaceId = input.isActive ? await input.ensureWorkspaceByRootPath?.(rootPath) ?? null : null;
      const existing = await input.resolveWorkspaceMetadataByRootPath(rootPath);
      return existing ?? (workspaceId ? createWorkspaceMetadata({ workspaceId, workspaceRootPath: rootPath }) : null);
    })();
    byRootPath.set(rootPath, promise);
    return promise;
  };
  await Promise.all(placements.map(async ({ address, rootPath }) => {
    if (!rootPath) return;
    const metadata = await resolvePath(rootPath);
    if (metadata) result.set(address, metadata);
  }));
  for (const { rootPath } of placements) {
    if (rootPath && !byRootPath.has(rootPath)) throw new Error(`Workspace '${rootPath}' was not resolved.`);
  }
  return result;
};

const stageProjection = (input: {
  tree: TeamRunExecutionTreeDto;
  agentRunId: string;
  address: AgentTeamAddress;
  context: AgentContext;
  projection: TeamMemberRunProjectionPayload | null;
  expectedActivityRevision: number;
}): ActivityProjectionReplacement | null => {
  if (!input.projection) return null;
  const configured = findConfiguredAgentByAddress(input.tree, input.address);
  if (!configured) throw new Error(`AgentRun '${input.agentRunId}' has no configured placement.`);
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
  return Object.freeze({
    runId: input.agentRunId,
    expectedRevision: input.expectedActivityRevision,
    activities: buildActivitiesFromProjection(input.projection.activities ?? []),
  });
};

const selectInitialAgentRunId = (input: {
  tree: TeamRunExecutionTreeDto;
  requestedAgentRunId?: string | null;
  requestedMemberAddress?: AgentTeamAddress | null;
}): string => {
  const agents = collectAgentExecutionLocations(input.tree);
  const requestedId = input.requestedAgentRunId?.trim() ?? '';
  if (requestedId) {
    if (agents.some((agent) => agent.agentRunId === requestedId)) return requestedId;
    throw new Error(`Requested AgentRun '${requestedId}' is not part of this Team execution.`);
  }
  if (input.requestedMemberAddress) {
    const configured = findConfiguredAgentByAddress(input.tree, input.requestedMemberAddress);
    if (configured) return configured.agent_run_id;
  }
  const coordinator = findConfiguredAgentByAddress(input.tree, input.tree.root_team.coordinator_address);
  if (!coordinator) throw new Error(`Team '${input.tree.root_team.team_run_id}' has no root coordinator Agent.`);
  return coordinator.agent_run_id;
};

const hydrateCurrentTeamRunContext = async (
  input: LoadTeamRunContextHydrationInput,
  projectionPolicy: ProjectionFetchPolicy,
): Promise<TeamRunHydrationCandidate> => {
  const client = getApolloClient();
  const response = await client.query<ResumeGraphqlData>({
    query: GetTeamRunResumeConfig,
    variables: { teamRunId: input.teamRunId },
    fetchPolicy: 'network-only',
  });
  const errors = graphqlErrors(response.errors);
  if (errors) throw new Error(errors);
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
  const locations = collectAgentExecutionLocations(tree);
  const initialFocusedAgentRunId = selectInitialAgentRunId({
    tree,
    requestedAgentRunId: input.agentRunId,
    requestedMemberAddress: input.memberAddress,
  });
  const activityStore = useAgentActivityStore();
  const expectedActivityRevisionByRunId = new Map(locations.map((agent) => [
    agent.agentRunId,
    activityStore.getActivityContentRevision(agent.agentRunId),
  ]));
  const projectionByAgentRunId = new Map<string, TeamMemberRunProjectionPayload | null>();
  await Promise.all(locations.map(async (agent) => {
    const projection = projectionPolicy === 'exact' || agent.agentRunId === initialFocusedAgentRunId
      ? await fetchExactTeamMemberProjection(input.teamRunId, agent.agentRunId)
      : await fetchBestEffortProjection(input.teamRunId, agent.agentRunId);
    projectionByAgentRunId.set(agent.agentRunId, projection);
  }));
  const activityReplacements: ActivityProjectionReplacement[] = [];
  const contexts = locations.map((agent) => {
    const context = createTeamAgentContext({
      tree,
      agentRunId: agent.agentRunId,
      address: agent.memberAddress,
      workspaceMetadata: workspaces.get(agent.memberAddress) ?? null,
    });
    if (!context) throw new Error(`No exact Agent context could be built for '${agent.agentRunId}'.`);
    const replacement = stageProjection({
      tree,
      agentRunId: agent.agentRunId,
      address: agent.memberAddress,
      context,
      projection: projectionByAgentRunId.get(agent.agentRunId) ?? null,
      expectedActivityRevision: expectedActivityRevisionByRunId.get(agent.agentRunId)!,
    });
    if (replacement) activityReplacements.push(replacement);
    return Object.freeze({ agentRunId: agent.agentRunId, memberAddress: agent.memberAddress, agentContext: context });
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
  return {
    teamRunId: input.teamRunId,
    focusedAgentRunId: view.getFocusedAgentRunId(),
    resumeConfig: {
      teamRunId: input.teamRunId,
      isActive: raw.isActive,
      executionTree: tree,
      modelConfigEditability: raw.modelConfigEditability,
    },
    projectionByAgentRunId,
    activityReplacements: Object.freeze(activityReplacements),
    hydratedContext: Object.freeze({ view }),
  };
};

export const hydrateLiveTeamRunContext = async (
  input: LoadTeamRunContextHydrationInput,
): Promise<TeamRunHydrationCandidate> => hydrateCurrentTeamRunContext(input, 'best_effort');

export const hydrateTeamRunContextForStreamRecovery = async (
  input: LoadTeamRunContextHydrationInput,
): Promise<TeamRunRecoveryHydrationCandidate> => {
  const before = await fetchCheckpoint(input.teamRunId);
  if (before.hasOpenExecutionWork) {
    throw new Error('TEAM_STREAM_RECOVERY_WAIT: This Team is still working. Wait for it to finish, then select this Team member again.');
  }
  const candidate = await hydrateCurrentTeamRunContext(input, 'exact');
  const after = await fetchCheckpoint(input.teamRunId);
  if (after.hasOpenExecutionWork || after.changeSequence !== before.changeSequence) {
    throw new Error('TEAM_STREAM_RECOVERY_CHECKPOINT_CHANGED: Team activity changed while the conversation was being reloaded. Select this Team member again.');
  }
  return {
    ...candidate,
    projectionByAgentRunId: candidate.projectionByAgentRunId as Map<string, TeamMemberRunProjectionPayload>,
    expectedBaseChangeSequence: before.changeSequence,
  };
};
