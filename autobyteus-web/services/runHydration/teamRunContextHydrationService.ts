import { getApolloClient } from '~/utils/apolloClient';
import { GetTeamMemberRunProjection, GetTeamRunResumeConfig } from '~/graphql/queries/runHistoryQueries';
import type {
  GetTeamRunResumeConfigQueryData,
  TeamMemberRunProjectionPayload,
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
import type { AgentTeamContext, HistoricalTeamHydrationState, TeamMemberProjectionLoadState } from '~/types/agent/AgentTeamContext';
import { reconstructTeamRunConfigFromMetadata } from '~/utils/teamRunConfigUtils';
import { fetchAndHydrateTeamCommunicationForTeam } from './teamCommunicationHydrationService';
import { fetchAndHydrateTaskDelegationRecordsForTeam } from './taskDelegationHydrationService';
import { indexTeamMemberNodesByAddress } from '~/utils/teamDefinitionMembers';
import { teamRootNodeFromMetadata } from '~/utils/teamMemberMetadataNodes';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { applyLiveTeamMemberStatusSnapshot } from './teamRunMemberStatusHydration';
import type { TeamMemberLiveSnapshot } from './teamRunMemberStatusHydration';
import { createTeamExecutionAddress, serializeTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

export { applyLiveTeamMemberStatusSnapshot, hydrateTeamMemberActivitiesFromProjection } from './teamRunMemberStatusHydration';
export type { TeamMemberStatusSnapshotSet, TeamMemberLiveSnapshot } from './teamRunMemberStatusHydration';

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
  agentExecutionsByKey: Map<string, any>;
  primaryWorkspaceMetadata: WorkspaceMetadata | null;
  metadata: TeamRunMetadataPayload;
  historicalHydration: HistoricalTeamHydrationState | null;
}

const historicalMemberHydrationRequests = new Map<string, Promise<void>>();
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
  agentExecutionsByKey: Map<string, any>;
  focusedExecutionAddress: TeamExecutionAddress;
  primaryWorkspaceMetadata: WorkspaceMetadata | null;
  memberStatuses: TeamMemberLiveSnapshot[];
  historicalHydration: HistoricalTeamHydrationState | null;
}): AgentTeamContext => {
  const rootTeam = teamRootNodeFromMetadata(params.metadata.rootTeam);
  const context: AgentTeamContext = {
    teamRunId: params.metadata.rootTeam.teamRunId,
    config: reconstructTeamRunConfigFromMetadata({
      metadata: params.metadata,
      primaryWorkspaceMetadata: params.primaryWorkspaceMetadata,
      isLocked: params.resumeConfig.isActive,
    }),
    rootTeam,
    memberNodesByAddress: indexTeamMemberNodesByAddress(rootTeam),
    agentExecutionsByKey: params.agentExecutionsByKey,
    historicalHydration: params.historicalHydration,
    focusedExecutionAddress: params.focusedExecutionAddress,
    isActive: params.resumeConfig.isActive,
    isSubscribed: false,
  };
  applyLiveTeamMemberStatusSnapshot(context, { memberStatuses: params.memberStatuses });
  return context;
};

const hydrateTeamOwnedRecords = async (teamRunId: string): Promise<void> => {
  const client = getApolloClient();
  await Promise.all([
    fetchAndHydrateTeamCommunicationForTeam({ client, teamRunId }),
    fetchAndHydrateTaskDelegationRecordsForTeam({ client, teamRunId }),
  ]);
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
  await hydrateTeamOwnedRecords(teamRunId);

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
  return {
    teamRunId,
    focusedExecutionAddress: executionAddress(teamRunId, focusedMemberAddress),
    resumeConfig: input.resumeConfig,
    agentExecutionsByKey: contexts.members,
    primaryWorkspaceMetadata: selectPrimaryWorkspaceMetadata(
      contexts.memberWorkspaceMetadatasByAddress,
      focusedMemberAddress,
      input.metadata.rootTeam.coordinatorAddress,
      contexts.primaryWorkspaceMetadata,
    ),
    metadata: input.metadata,
    historicalHydration,
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
    agentExecutionsByKey: payload.agentExecutionsByKey,
    focusedExecutionAddress: payload.focusedExecutionAddress,
    primaryWorkspaceMetadata: payload.primaryWorkspaceMetadata,
    memberStatuses: input.memberStatuses ?? [],
    historicalHydration: payload.historicalHydration,
  });
  return { ...payload, hydratedContext };
};

export const ensureHistoricalTeamMemberHydrated = async (params: {
  teamContext: AgentTeamContext;
  memberAddress: string;
}): Promise<void> => {
  const state = params.teamContext.historicalHydration;
  const memberAddress = params.memberAddress.trim();
  if (!state || !memberAddress || state.memberProjectionLoadStateByAddress[memberAddress] === 'loaded') return;
  const requestKey = `${params.teamContext.teamRunId}::${memberAddress}`;
  const pending = historicalMemberHydrationRequests.get(requestKey);
  if (pending) return pending;
  const member = state.memberMetadataByAddress[memberAddress];
  const memberContext = params.teamContext.agentExecutionsByKey.get(executionKey(params.teamContext.teamRunId, memberAddress));
  if (!member || !memberContext) {
    state.memberProjectionLoadStateByAddress[memberAddress] = 'error';
    return;
  }
  state.memberProjectionLoadStateByAddress[memberAddress] = 'loading';
  const request = (async () => {
    const projection = await fetchTeamMemberProjection({
      client: getApolloClient(),
      getTeamMemberRunProjectionQuery: GetTeamMemberRunProjection,
      teamRunId: params.teamContext.teamRunId,
      memberAddress,
    });
    if (!projection) {
      state.memberProjectionLoadStateByAddress[memberAddress] = 'error';
      return;
    }
    applyProjectionToTeamMemberContext({
      teamRunId: params.teamContext.teamRunId,
      metadata: { createdAt: state.createdAt },
      member,
      projection,
      memberContext,
      isActive: false,
    });
    state.memberProjectionLoadStateByAddress[memberAddress] = 'loaded';
  })();
  historicalMemberHydrationRequests.set(requestKey, request);
  try { await request; } finally { historicalMemberHydrationRequests.delete(requestKey); }
};
