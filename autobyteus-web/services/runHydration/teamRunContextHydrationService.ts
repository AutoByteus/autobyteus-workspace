import { getApolloClient } from '~/utils/apolloClient';
import { GetTeamMemberRunProjection, GetTeamRunResumeConfig } from '~/graphql/queries/runHistoryQueries';
import type {
  GetTeamRunResumeConfigQueryData,
  TeamMemberRunProjectionPayload,
  TeamRunMetadataAgentMember,
  TeamRunMetadataPayload,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import { flattenTeamRunAgentMetadata, parseTeamRunMetadata, toTeamMemberKey } from '~/stores/runHistoryMetadata';
import {
  applyProjectionToTeamMemberContext,
  buildHistoricalTeamMemberContextShells,
  buildLiveTeamMemberContexts,
  fetchTeamMemberProjection,
  fetchTeamMemberProjections,
} from '~/stores/runHistoryTeamMemberProjectionHydrator';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { reconstructTeamRunConfigFromMetadata } from '~/utils/teamRunConfigUtils';
import { fetchAndHydrateTeamCommunicationForTeam } from './teamCommunicationHydrationService';
import {
  fetchTaskDelegationRecordsForTeam,
  hydrateTaskDelegationRecords,
} from './taskDelegationHydrationService';
import type { TaskDelegationRecord } from '~/stores/taskDelegationTypes';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import {
  applyLiveTeamMemberStatusSnapshot,
  hydrateTeamMemberActivitiesFromProjection,
} from './teamRunMemberStatusHydration';
import type { TeamMemberLiveSnapshot } from './teamRunMemberStatusHydration';
import { createTeamExecutionAddress, serializeTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { mapCompleteTeamTaskProjectionSnapshot } from '~/services/teamExecution/teamTaskProjectionMapper';
import { buildTeamRunFrontendProjection } from '~/services/teamExecution/teamRunFrontendProjectionBuilder';
import { primeRecentEventMonitorBaseline } from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';
import type { TeamAgentContextEntry } from '~/services/teamExecution/teamExecutionModels';

export { applyLiveTeamMemberStatusSnapshot, hydrateTeamMemberActivitiesFromProjection } from './teamRunMemberStatusHydration';
export type { TeamMemberStatusSnapshotSet, TeamMemberLiveSnapshot } from './teamRunMemberStatusHydration';

type TeamMemberProjectionLoadState = 'unloaded' | 'loading' | 'loaded' | 'error';
interface HistoricalTeamHydrationState {
  createdAt: string;
  updatedAt: string;
  memberMetadataByAddress: Record<string, TeamRunMetadataAgentMember>;
  memberProjectionLoadStateByAddress: Record<string, TeamMemberProjectionLoadState>;
  memberWorkspaceMetadatasByAddress: Record<string, WorkspaceMetadata>;
}

export interface LoadTeamRunContextHydrationInput {
  teamRunId: string;
  memberAddress?: string | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
}

export interface TeamRunContextHydrationPayload {
  teamRunId: string;
  focusedExecutionAddress: TeamExecutionAddress;
  resumeConfig: TeamRunResumeConfigPayload;
  hydratedContext: AgentTeamContext;
  projectionByMemberAddress: Map<string, TeamMemberRunProjectionPayload | null>;
}

interface LoadedTeamRunContextHydrationPayload extends Omit<TeamRunContextHydrationPayload, 'hydratedContext'> {
  persistentAgentSeeds: readonly TeamAgentContextEntry[];
  primaryWorkspaceMetadata: WorkspaceMetadata | null;
  metadata: TeamRunMetadataPayload;
  historicalHydration: HistoricalTeamHydrationState | null;
  taskDelegationRecords: readonly TaskDelegationRecord[];
}

const historicalMemberHydrationRequests = new Map<string, Promise<void>>();
const historicalHydrationByRootTeamRunId = new Map<string, HistoricalTeamHydrationState>();

export const getHistoricalTeamMemberProjectionLoadState = (
  rootTeamRunId: string,
  memberAddress: string,
): TeamMemberProjectionLoadState | null =>
  historicalHydrationByRootTeamRunId.get(rootTeamRunId)?.memberProjectionLoadStateByAddress[memberAddress] ?? null;

export const getHistoricalTeamHydrationUpdatedAt = (rootTeamRunId: string): string | null =>
  historicalHydrationByRootTeamRunId.get(rootTeamRunId)?.updatedAt ?? null;
const executionAddress = (teamRunId: string, memberAddress: string): TeamExecutionAddress =>
  createTeamExecutionAddress({ rootTeamRunId: teamRunId, memberAddress });
const executionKey = (teamRunId: string, memberAddress: string): string =>
  serializeTeamExecutionAddress(executionAddress(teamRunId, memberAddress));

const agentAddresses = (metadata: TeamRunMetadataPayload): string[] =>
  flattenTeamRunAgentMetadata(metadata.rootTeam.children).map(toTeamMemberKey);

const selectMemberAddress = (metadata: TeamRunMetadataPayload, requested?: string | null): string => {
  const available = agentAddresses(metadata);
  const candidate = requested?.trim() || '';
  if (candidate && available.includes(candidate)) return candidate;
  if (available.includes(metadata.rootTeam.coordinatorAddress)) return metadata.rootTeam.coordinatorAddress;
  if (!available[0]) throw new Error(`Team '${metadata.rootTeam.teamRunId}' has no Agent members.`);
  return available[0];
};

const selectPrimaryWorkspaceMetadata = (
  byAddress: Record<string, WorkspaceMetadata>,
  focusedMemberAddress: string,
  coordinatorAddress: string,
  fallback: WorkspaceMetadata | null,
): WorkspaceMetadata | null => byAddress[focusedMemberAddress] ?? byAddress[coordinatorAddress] ?? fallback;

const buildHistoricalHydrationState = (params: {
  metadata: TeamRunMetadataPayload;
  loadedMemberAddresses: string[];
  erroredMemberAddresses?: string[];
  memberWorkspaceMetadatasByAddress: Record<string, WorkspaceMetadata>;
}): HistoricalTeamHydrationState => {
  const loaded = new Set(params.loadedMemberAddresses);
  const errored = new Set(params.erroredMemberAddresses ?? []);
  const memberMetadataByAddress: HistoricalTeamHydrationState['memberMetadataByAddress'] = {};
  const memberProjectionLoadStateByAddress: Record<string, TeamMemberProjectionLoadState> = {};
  flattenTeamRunAgentMetadata(params.metadata.rootTeam.children).forEach((member) => {
    memberMetadataByAddress[member.address] = member;
    memberProjectionLoadStateByAddress[member.address] = loaded.has(member.address)
      ? 'loaded'
      : errored.has(member.address) ? 'error' : 'unloaded';
  });
  return {
    createdAt: params.metadata.createdAt,
    updatedAt: params.metadata.createdAt,
    memberMetadataByAddress,
    memberProjectionLoadStateByAddress,
    memberWorkspaceMetadatasByAddress: params.memberWorkspaceMetadatasByAddress,
  };
};

const buildHydratedTeamContext = (params: {
  metadata: TeamRunMetadataPayload;
  resumeConfig: TeamRunResumeConfigPayload;
  persistentAgentSeeds: readonly TeamAgentContextEntry[];
  focusedExecutionAddress: TeamExecutionAddress;
  primaryWorkspaceMetadata: WorkspaceMetadata | null;
  memberStatuses: TeamMemberLiveSnapshot[];
  historicalHydration: HistoricalTeamHydrationState | null;
  taskDelegationRecords: readonly TaskDelegationRecord[];
}): AgentTeamContext => {
  const teamRunId = params.metadata.rootTeam.teamRunId;
  const configuration = reconstructTeamRunConfigFromMetadata({
      metadata: params.metadata,
      primaryWorkspaceMetadata: params.primaryWorkspaceMetadata,
      isLocked: params.resumeConfig.isActive,
    });
  const context = buildTeamRunFrontendProjection({
    metadata: params.metadata,
    configuration,
    rootLifecycle: { isActive: params.resumeConfig.isActive },
    initialFocusedMemberAddress: params.focusedExecutionAddress.memberAddress,
    persistentAgentSeeds: params.persistentAgentSeeds.map((entry) => ({
      memberAddress: entry.executionAddress.memberAddress,
      agentContext: entry.agentContext,
      runtime: { kind: params.resumeConfig.isActive ? 'loaded' : 'historical_unloaded' } as const,
    })),
  });
  applyLiveTeamMemberStatusSnapshot(context, { memberStatuses: params.memberStatuses });
  const taskReconciliation = context.executions.reconcileTaskSnapshot(mapCompleteTeamTaskProjectionSnapshot({
    expectedRootTeamRunId: teamRunId,
    topology: context.topology,
    records: params.taskDelegationRecords,
  }));
  if (taskReconciliation.disposition === 'rejected') {
    throw new Error(`Rejected hydrated Team task snapshot (${taskReconciliation.code}): ${taskReconciliation.message}`);
  }
  if (params.historicalHydration) historicalHydrationByRootTeamRunId.set(teamRunId, params.historicalHydration);
  else historicalHydrationByRootTeamRunId.delete(teamRunId);
  return context;
};

const fetchTeamOwnedRecords = async (teamRunId: string): Promise<readonly TaskDelegationRecord[]> => {
  const client = getApolloClient();
  const [, taskDelegationRecords] = await Promise.all([
    fetchAndHydrateTeamCommunicationForTeam({ client, teamRunId }),
    fetchTaskDelegationRecordsForTeam({ client, teamRunId }),
  ]);
  return taskDelegationRecords;
};

const loadRuntimePayload = async (input: {
  metadata: TeamRunMetadataPayload;
  resumeConfig: TeamRunResumeConfigPayload;
  requestedMemberAddress?: string | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
}): Promise<LoadedTeamRunContextHydrationPayload> => {
  const teamRunId = input.metadata.rootTeam.teamRunId;
  const focusedMemberAddress = selectMemberAddress(input.metadata, input.requestedMemberAddress);
  const client = getApolloClient();
  const projectionByMemberAddress = input.resumeConfig.isActive
    ? await fetchTeamMemberProjections({ client, getTeamMemberRunProjectionQuery: GetTeamMemberRunProjection, teamRunId, metadata: input.metadata, toTeamMemberKey })
    : new Map<string, TeamMemberRunProjectionPayload | null>();
  if (!input.resumeConfig.isActive) {
    const projection = await fetchTeamMemberProjection({ client, getTeamMemberRunProjectionQuery: GetTeamMemberRunProjection, teamRunId, memberAddress: focusedMemberAddress });
    projectionByMemberAddress.set(focusedMemberAddress, projection);
  }
  const taskDelegationRecords = await fetchTeamOwnedRecords(teamRunId);

  const contexts = input.resumeConfig.isActive
    ? await buildLiveTeamMemberContexts({
        teamRunId,
        metadata: input.metadata,
        isActive: true,
        projectionByMemberAddress,
        toTeamMemberKey,
        activateWorkspaceByRootPath: input.ensureWorkspaceByRootPath!,
        resolveWorkspaceMetadataByRootPath: input.resolveWorkspaceMetadataByRootPath,
      })
    : await buildHistoricalTeamMemberContextShells({
        teamRunId,
        metadata: input.metadata,
        projectionByMemberAddress,
        toTeamMemberKey,
        resolveWorkspaceMetadataByRootPath: input.resolveWorkspaceMetadataByRootPath,
      });
  const focusedProjection = projectionByMemberAddress.get(focusedMemberAddress) ?? null;
  const focusedMetadata = flattenTeamRunAgentMetadata(input.metadata.rootTeam.children)
    .find((member) => member.address === focusedMemberAddress) ?? null;
  if (!input.resumeConfig.isActive && focusedProjection && focusedMetadata) {
    const memberContext = contexts.members.get(executionKey(teamRunId, focusedMemberAddress));
    if (memberContext) applyProjectionToTeamMemberContext({
      teamRunId,
      metadata: input.metadata,
      member: focusedMetadata,
      projection: focusedProjection,
      memberContext,
      isActive: false,
    });
  }
  const historicalHydration = input.resumeConfig.isActive ? null : buildHistoricalHydrationState({
    metadata: input.metadata,
    loadedMemberAddresses: focusedProjection ? [focusedMemberAddress] : [],
    erroredMemberAddresses: focusedProjection ? [] : [focusedMemberAddress],
    memberWorkspaceMetadatasByAddress: contexts.memberWorkspaceMetadatasByAddress,
  });
  const persistentAgentSeeds = flattenTeamRunAgentMetadata(input.metadata.rootTeam.children).map((member) => {
    const address = executionAddress(teamRunId, member.address);
    const agentContext = contexts.members.get(serializeTeamExecutionAddress(address));
    if (!agentContext) throw new Error(`Missing hydrated Agent context for '${member.address}'.`);
    return Object.freeze({ executionAddress: address, agentContext });
  });
  return {
    teamRunId,
    focusedExecutionAddress: executionAddress(teamRunId, focusedMemberAddress),
    resumeConfig: input.resumeConfig,
    persistentAgentSeeds: Object.freeze(persistentAgentSeeds),
    primaryWorkspaceMetadata: selectPrimaryWorkspaceMetadata(
      contexts.memberWorkspaceMetadatasByAddress,
      focusedMemberAddress,
      input.metadata.rootTeam.coordinatorAddress,
      contexts.primaryWorkspaceMetadata,
    ),
    metadata: input.metadata,
    historicalHydration,
    taskDelegationRecords,
    projectionByMemberAddress,
  };
};

export const loadTeamRunContextHydrationPayload = async (
  input: LoadTeamRunContextHydrationInput,
): Promise<LoadedTeamRunContextHydrationPayload> => {
  const { data, errors } = await getApolloClient().query<GetTeamRunResumeConfigQueryData>({
    query: GetTeamRunResumeConfig,
    variables: { teamRunId: input.teamRunId },
    fetchPolicy: 'network-only',
  });
  if (errors?.length) throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
  if (!data?.getTeamRunResumeConfig) throw new Error(`Team resume config payload missing for '${input.teamRunId}'.`);
  const metadata = parseTeamRunMetadata(data.getTeamRunResumeConfig.metadata);
  if (metadata.rootTeam.teamRunId !== input.teamRunId) throw new Error(`Team metadata root identity mismatch for '${input.teamRunId}'.`);
  const resumeConfig: TeamRunResumeConfigPayload = {
    teamRunId: metadata.rootTeam.teamRunId,
    isActive: data.getTeamRunResumeConfig.isActive,
    metadata,
  };
  if (resumeConfig.isActive && !input.ensureWorkspaceByRootPath) {
    throw new Error(`Active team '${input.teamRunId}' requires workspace activation.`);
  }
  return loadRuntimePayload({
    metadata,
    resumeConfig,
    requestedMemberAddress: input.memberAddress,
    resolveWorkspaceMetadataByRootPath: input.resolveWorkspaceMetadataByRootPath,
    ensureWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
  });
};

export const hydrateLiveTeamRunContext = async (
  input: LoadTeamRunContextHydrationInput & { memberStatuses?: TeamMemberLiveSnapshot[] },
): Promise<TeamRunContextHydrationPayload> => {
  const payload = await loadTeamRunContextHydrationPayload(input);
  const hydratedContext = buildHydratedTeamContext({
    metadata: payload.metadata,
    resumeConfig: payload.resumeConfig,
    persistentAgentSeeds: payload.persistentAgentSeeds,
    focusedExecutionAddress: payload.focusedExecutionAddress,
    primaryWorkspaceMetadata: payload.primaryWorkspaceMetadata,
    memberStatuses: input.memberStatuses ?? [],
    historicalHydration: payload.historicalHydration,
    taskDelegationRecords: payload.taskDelegationRecords,
  });
  hydrateTeamMemberActivitiesFromProjection({
    members: hydratedContext.executions.listAgentContextEntries(),
    projectionByMemberAddress: payload.projectionByMemberAddress,
  });
  hydratedContext.executions.listAgentContextEntries().forEach(({ agentContext }) => primeRecentEventMonitorBaseline(agentContext));
  hydrateTaskDelegationRecords(payload.teamRunId, payload.taskDelegationRecords);
  return {
    teamRunId: payload.teamRunId,
    focusedExecutionAddress: payload.focusedExecutionAddress,
    resumeConfig: payload.resumeConfig,
    projectionByMemberAddress: payload.projectionByMemberAddress,
    hydratedContext,
  };
};

export const ensureHistoricalTeamMemberHydrated = async (params: {
  teamContext: AgentTeamContext;
  memberAddress: string;
}): Promise<void> => {
  const teamRunId = params.teamContext.executions.getRootTeamRunId();
  const state = historicalHydrationByRootTeamRunId.get(teamRunId);
  const memberAddress = params.memberAddress.trim();
  if (!state || !memberAddress || state.memberProjectionLoadStateByAddress[memberAddress] === 'loaded') return;
  const requestKey = `${teamRunId}::${memberAddress}`;
  const pending = historicalMemberHydrationRequests.get(requestKey);
  if (pending) return pending;
  const member = state.memberMetadataByAddress[memberAddress];
  const memberContext = params.teamContext.executions.getAgentContext(executionAddress(teamRunId, memberAddress));
  if (!member || !memberContext) {
    state.memberProjectionLoadStateByAddress[memberAddress] = 'error';
    return;
  }
  state.memberProjectionLoadStateByAddress[memberAddress] = 'loading';
  const request = (async () => {
    const projection = await fetchTeamMemberProjection({
      client: getApolloClient(),
      getTeamMemberRunProjectionQuery: GetTeamMemberRunProjection,
      teamRunId,
      memberAddress,
    });
    if (!projection) {
      state.memberProjectionLoadStateByAddress[memberAddress] = 'error';
      return;
    }
    applyProjectionToTeamMemberContext({
      teamRunId,
      metadata: { createdAt: state.createdAt },
      member,
      projection,
      memberContext,
      isActive: false,
    });
    primeRecentEventMonitorBaseline(memberContext);
    state.memberProjectionLoadStateByAddress[memberAddress] = 'loaded';
  })();
  historicalMemberHydrationRequests.set(requestKey, request);
  try { await request; } finally { historicalMemberHydrationRequests.delete(requestKey); }
};
