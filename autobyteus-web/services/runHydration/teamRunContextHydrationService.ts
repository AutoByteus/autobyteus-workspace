import { getApolloClient } from '~/utils/apolloClient';
import { GetTeamMemberRunProjection, GetTeamRunResumeConfig } from '~/graphql/queries/runHistoryQueries';
import type { GetTeamRunResumeConfigQueryData, TeamMemberRunProjectionPayload, TeamRunResumeConfigPayload } from '~/stores/runHistoryTypes';
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
import { indexTeamMemberNodesByRouteKey } from '~/utils/teamDefinitionMembers';
import { teamMemberNodesFromMetadata } from '~/utils/teamMemberMetadataNodes';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { applyLiveTeamMemberStatusSnapshot } from './teamRunMemberStatusHydration';
import type { TeamMemberLiveSnapshot } from './teamRunMemberStatusHydration';
import { resolveActiveExecutionFocusedMemberRouteKey } from '~/utils/teamActiveExecutionMembers';

export {
  applyLiveTeamMemberStatusSnapshot,
  hydrateTeamMemberActivitiesFromProjection,
} from './teamRunMemberStatusHydration';
export type {
  TeamMemberStatusSnapshotSet,
  TeamMemberLiveSnapshot,
} from './teamRunMemberStatusHydration';

export interface LoadTeamRunContextHydrationInput {
  teamRunId: string;
  memberRouteKey?: string | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
}

export interface TeamRunContextHydrationPayload {
  teamRunId: string;
  focusedMemberRouteKey: string;
  resumeConfig: TeamRunResumeConfigPayload;
  hydratedContext: AgentTeamContext;
  projectionByMemberRouteKey: Map<string, TeamMemberRunProjectionPayload | null>;
}

interface LoadedTeamRunContextHydrationPayload {
  teamRunId: string;
  focusedMemberRouteKey: string;
  resumeConfig: TeamRunResumeConfigPayload;
  members: Map<string, any>;
  primaryWorkspaceMetadata: WorkspaceMetadata | null;
  metadata: ReturnType<typeof parseTeamRunMetadata>;
  historicalHydration: HistoricalTeamHydrationState | null;
  projectionByMemberRouteKey: Map<string, TeamMemberRunProjectionPayload | null>;
}

const historicalMemberHydrationRequests = new Map<string, Promise<void>>();

const buildHistoricalHydrationRequestKey = (teamRunId: string, memberRouteKey: string): string =>
  `${teamRunId}::${memberRouteKey}`;

const resolveFocusKey = (params: {
  requestedMemberRouteKey?: string | null;
  coordinatorMemberRouteKey?: string | null;
  availableMemberRouteKeys: string[];
}): string => {
  const requestedKey = params.requestedMemberRouteKey?.trim() || '';
  if (requestedKey && params.availableMemberRouteKeys.includes(requestedKey)) {
    return requestedKey;
  }

  const coordinatorKey = params.coordinatorMemberRouteKey?.trim() || '';
  if (coordinatorKey && params.availableMemberRouteKeys.includes(coordinatorKey)) {
    return coordinatorKey;
  }

  return params.availableMemberRouteKeys[0] || '';
};

const collectMetadataMemberRouteKeys = (metadata: ReturnType<typeof parseTeamRunMetadata>): string[] => {
  const keys: string[] = [];
  const visit = (members: typeof metadata.memberTree): void => {
    for (const member of members) {
      const routeKey = toTeamMemberKey(member).trim();
      if (routeKey) {
        keys.push(routeKey);
      }
      if (member.memberKind === 'agent_team') {
        visit(member.memberTree);
      }
    }
  };
  visit(metadata.memberTree);
  return keys;
};

const selectPrimaryWorkspaceMetadata = (params: {
  memberWorkspaceMetadatasByRouteKey: Record<string, WorkspaceMetadata>;
  focusedMemberRouteKey: string;
  coordinatorMemberRouteKey?: string | null;
  fallback: WorkspaceMetadata | null;
}): WorkspaceMetadata | null => {
  const focusedReference =
    params.memberWorkspaceMetadatasByRouteKey[params.focusedMemberRouteKey] ?? null;
  if (focusedReference) {
    return focusedReference;
  }
  const coordinatorKey = params.coordinatorMemberRouteKey?.trim() || '';
  return (coordinatorKey
    ? params.memberWorkspaceMetadatasByRouteKey[coordinatorKey] ?? null
    : null) || params.fallback;
};

const buildHistoricalHydrationState = (params: {
  metadata: ReturnType<typeof parseTeamRunMetadata>;
  loadedMemberRouteKeys: string[];
  memberWorkspaceMetadatasByRouteKey: Record<string, WorkspaceMetadata>;
  erroredMemberRouteKeys?: string[];
}): HistoricalTeamHydrationState => {
  const memberMetadataByRouteKey: HistoricalTeamHydrationState['memberMetadataByRouteKey'] = {};
  const memberProjectionLoadStateByRouteKey: Record<string, TeamMemberProjectionLoadState> = {};
  const loadedKeys = new Set(params.loadedMemberRouteKeys.map((key) => key.trim()).filter(Boolean));
  const erroredKeys = new Set((params.erroredMemberRouteKeys || []).map((key) => key.trim()).filter(Boolean));

  flattenTeamRunAgentMetadata(params.metadata.memberTree).forEach((member) => {
    const normalizedMemberRouteKey = toTeamMemberKey(member).trim();
    if (!normalizedMemberRouteKey) {
      return;
    }
    memberMetadataByRouteKey[normalizedMemberRouteKey] = member;
    if (loadedKeys.has(normalizedMemberRouteKey)) {
      memberProjectionLoadStateByRouteKey[normalizedMemberRouteKey] = 'loaded';
      return;
    }
    if (erroredKeys.has(normalizedMemberRouteKey)) {
      memberProjectionLoadStateByRouteKey[normalizedMemberRouteKey] = 'error';
      return;
    }
    memberProjectionLoadStateByRouteKey[normalizedMemberRouteKey] = 'unloaded';
  });

  return {
    createdAt: params.metadata.createdAt,
    updatedAt: params.metadata.createdAt,
    memberMetadataByRouteKey,
    memberProjectionLoadStateByRouteKey,
    memberWorkspaceMetadatasByRouteKey: params.memberWorkspaceMetadatasByRouteKey,
  };
};

const buildMemberMetadataEnvelope = (params: {
  teamContext: AgentTeamContext;
  memberRouteKey: string;
}): ReturnType<typeof parseTeamRunMetadata> | null => {
  const historicalHydration = params.teamContext.historicalHydration;
  if (!historicalHydration) {
    return null;
  }

  const member = historicalHydration.memberMetadataByRouteKey[params.memberRouteKey];
  if (!member) {
    return null;
  }

  return {
    teamRunId: params.teamContext.teamRunId,
    teamDefinitionId: params.teamContext.config.teamDefinitionId,
    teamDefinitionName: params.teamContext.config.teamDefinitionName,
    coordinatorMemberRouteKey: params.teamContext.coordinatorMemberRouteKey || '',
    createdAt: historicalHydration.createdAt,
    memberTree: [member],
  };
};

const buildHydratedTeamContext = (params: {
  metadata: ReturnType<typeof parseTeamRunMetadata>;
  resumeConfig: TeamRunResumeConfigPayload;
  members: Map<string, any>;
  focusedMemberRouteKey: string;
  primaryWorkspaceMetadata: WorkspaceMetadata | null;
  memberStatuses: TeamMemberLiveSnapshot[];
  historicalHydration: HistoricalTeamHydrationState | null;
}): AgentTeamContext => {
  const memberTree = teamMemberNodesFromMetadata(params.metadata.memberTree);
  const context = {
    teamRunId: params.metadata.teamRunId,
    config: reconstructTeamRunConfigFromMetadata({
      metadata: params.metadata,
      primaryWorkspaceMetadata: params.primaryWorkspaceMetadata,
      isLocked: params.resumeConfig.isActive,
    }),
    memberTree,
    memberNodesByRouteKey: indexTeamMemberNodesByRouteKey(memberTree),
    leafAgentContextsByRouteKey: params.members,
    coordinatorMemberRouteKey: params.metadata.coordinatorMemberRouteKey,
    historicalHydration: params.historicalHydration,
    focusedMemberRouteKey: params.focusedMemberRouteKey,
    isActive: params.resumeConfig.isActive,
    isSubscribed: false,
    members: params.members,
    focusedMemberName: params.focusedMemberRouteKey,
  };

  applyLiveTeamMemberStatusSnapshot(context, {
    memberStatuses: params.memberStatuses,
  });
  return context;
};

const loadLiveTeamRunContextHydrationPayload = async (input: {
  metadata: ReturnType<typeof parseTeamRunMetadata>;
  resumeConfig: TeamRunResumeConfigPayload;
  requestedMemberRouteKey?: string | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath: (rootPath: string) => Promise<string | null>;
}): Promise<LoadedTeamRunContextHydrationPayload> => {
  const client = getApolloClient();
  const projectionByMemberRouteKey = await fetchTeamMemberProjections({
    client,
    getTeamMemberRunProjectionQuery: GetTeamMemberRunProjection,
    teamRunId: input.metadata.teamRunId,
    metadata: input.metadata,
    toTeamMemberKey,
  });

  await fetchAndHydrateTeamCommunicationForTeam({
    client,
    teamRunId: input.metadata.teamRunId,
  });
  await fetchAndHydrateTaskDelegationRecordsForTeam({
    client,
    teamRunId: input.metadata.teamRunId,
  });

  const {
    members,
    primaryWorkspaceMetadata,
    memberWorkspaceMetadatasByRouteKey,
  } = await buildLiveTeamMemberContexts({
    teamRunId: input.metadata.teamRunId,
    metadata: input.metadata,
    isActive: input.resumeConfig.isActive,
    projectionByMemberRouteKey,
    toTeamMemberKey,
    activateWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
    resolveWorkspaceMetadataByRootPath: input.resolveWorkspaceMetadataByRootPath,
  });

  const fallbackFocusKey = resolveFocusKey({
    requestedMemberRouteKey: input.requestedMemberRouteKey,
    coordinatorMemberRouteKey: input.metadata.coordinatorMemberRouteKey,
    availableMemberRouteKeys: collectMetadataMemberRouteKeys(input.metadata),
  });
  const memberTree = teamMemberNodesFromMetadata(input.metadata.memberTree);
  const focusedMemberRouteKey = resolveActiveExecutionFocusedMemberRouteKey({
    teamRunId: input.metadata.teamRunId,
    config: {} as AgentTeamContext['config'],
    memberTree,
    memberNodesByRouteKey: indexTeamMemberNodesByRouteKey(memberTree),
    leafAgentContextsByRouteKey: members,
    coordinatorMemberRouteKey: input.metadata.coordinatorMemberRouteKey,
    historicalHydration: null,
    focusedMemberRouteKey: fallbackFocusKey,
    isActive: input.resumeConfig.isActive,
    isSubscribed: false,
  }, fallbackFocusKey) || fallbackFocusKey;

  if (!focusedMemberRouteKey) {
    throw new Error(`Team '${input.metadata.teamRunId}' has no members in metadata.`);
  }

  return {
    teamRunId: input.metadata.teamRunId,
    focusedMemberRouteKey,
    resumeConfig: input.resumeConfig,
    members,
    primaryWorkspaceMetadata: selectPrimaryWorkspaceMetadata({
      memberWorkspaceMetadatasByRouteKey,
      focusedMemberRouteKey,
      coordinatorMemberRouteKey: input.metadata.coordinatorMemberRouteKey,
      fallback: primaryWorkspaceMetadata,
    }),
    metadata: input.metadata,
    historicalHydration: null,
    projectionByMemberRouteKey,
  };
};

const loadHistoricalTeamRunContextHydrationPayload = async (input: {
  metadata: ReturnType<typeof parseTeamRunMetadata>;
  resumeConfig: TeamRunResumeConfigPayload;
  requestedMemberRouteKey?: string | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
}): Promise<LoadedTeamRunContextHydrationPayload> => {
  const availableMemberRouteKeys = collectMetadataMemberRouteKeys(input.metadata);
  const focusedMemberRouteKey = resolveFocusKey({
    requestedMemberRouteKey: input.requestedMemberRouteKey,
    coordinatorMemberRouteKey: input.metadata.coordinatorMemberRouteKey,
    availableMemberRouteKeys,
  });

  if (!focusedMemberRouteKey) {
    throw new Error(`Team '${input.metadata.teamRunId}' has no members in metadata.`);
  }

  const client = getApolloClient();
  const focusedMetadata = flattenTeamRunAgentMetadata(input.metadata.memberTree).find(
    (member) => toTeamMemberKey(member).trim() === focusedMemberRouteKey,
  ) || null;
  const focusedProjection = focusedMetadata
    ? await fetchTeamMemberProjection({
        client,
        getTeamMemberRunProjectionQuery: GetTeamMemberRunProjection,
        teamRunId: input.metadata.teamRunId,
        memberRouteKey: focusedMemberRouteKey,
      })
    : null;
  const projectionByMemberRouteKey = new Map<string, TeamMemberRunProjectionPayload | null>();
  if (focusedProjection) {
    projectionByMemberRouteKey.set(focusedMemberRouteKey, focusedProjection);
  }

  await fetchAndHydrateTeamCommunicationForTeam({
    client,
    teamRunId: input.metadata.teamRunId,
  });
  await fetchAndHydrateTaskDelegationRecordsForTeam({
    client,
    teamRunId: input.metadata.teamRunId,
  });

  const {
    members,
    primaryWorkspaceMetadata,
    memberWorkspaceMetadatasByRouteKey,
  } = await buildHistoricalTeamMemberContextShells({
    teamRunId: input.metadata.teamRunId,
    metadata: input.metadata,
    projectionByMemberRouteKey,
    toTeamMemberKey,
    resolveWorkspaceMetadataByRootPath: input.resolveWorkspaceMetadataByRootPath,
  });

  if (focusedProjection && focusedMetadata) {
    const focusedMemberContext = members.get(focusedMemberRouteKey) || null;
    if (focusedMetadata && focusedMemberContext) {
      applyProjectionToTeamMemberContext({
        teamRunId: input.metadata.teamRunId,
        metadata: input.metadata,
        member: focusedMetadata,
        projection: focusedProjection,
        memberContext: focusedMemberContext,
        isActive: false,
      });
    }
  }

  return {
    teamRunId: input.metadata.teamRunId,
    focusedMemberRouteKey,
    resumeConfig: input.resumeConfig,
    members,
    primaryWorkspaceMetadata: selectPrimaryWorkspaceMetadata({
      memberWorkspaceMetadatasByRouteKey,
      focusedMemberRouteKey,
      coordinatorMemberRouteKey: input.metadata.coordinatorMemberRouteKey,
      fallback: primaryWorkspaceMetadata,
    }),
    metadata: input.metadata,
    historicalHydration: buildHistoricalHydrationState({
      metadata: input.metadata,
      loadedMemberRouteKeys: focusedProjection ? [focusedMemberRouteKey] : [],
      memberWorkspaceMetadatasByRouteKey,
      erroredMemberRouteKeys: focusedMetadata && !focusedProjection ? [focusedMemberRouteKey] : [],
    }),
    projectionByMemberRouteKey,
  };
};

export const loadTeamRunContextHydrationPayload = async (
  input: LoadTeamRunContextHydrationInput,
): Promise<LoadedTeamRunContextHydrationPayload> => {
  const client = getApolloClient();
  const { data, errors } = await client.query<GetTeamRunResumeConfigQueryData>({
    query: GetTeamRunResumeConfig,
    variables: { teamRunId: input.teamRunId },
    fetchPolicy: 'network-only',
  });

  if (errors && errors.length > 0) {
    throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
  }

  const resumeConfigPayload = data?.getTeamRunResumeConfig;
  if (!resumeConfigPayload) {
    throw new Error(`Team resume config payload missing for '${input.teamRunId}'.`);
  }

  const metadata = parseTeamRunMetadata(resumeConfigPayload.metadata);
  if (!metadata.teamRunId) {
    throw new Error(`Team metadata is invalid for '${input.teamRunId}'.`);
  }

  const resumeConfig: TeamRunResumeConfigPayload = {
    teamRunId: metadata.teamRunId,
    isActive: resumeConfigPayload.isActive,
    metadata,
  };

  if (resumeConfig.isActive) {
    if (!input.ensureWorkspaceByRootPath) {
      throw new Error(`Active team '${input.teamRunId}' requires workspace activation.`);
    }
    return loadLiveTeamRunContextHydrationPayload({
      metadata,
      resumeConfig,
      requestedMemberRouteKey: input.memberRouteKey,
      resolveWorkspaceMetadataByRootPath: input.resolveWorkspaceMetadataByRootPath,
      ensureWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
    });
  }

  return loadHistoricalTeamRunContextHydrationPayload({
    metadata,
    resumeConfig,
    requestedMemberRouteKey: input.memberRouteKey,
    resolveWorkspaceMetadataByRootPath: input.resolveWorkspaceMetadataByRootPath,
  });
};

export const hydrateLiveTeamRunContext = async (
  input: LoadTeamRunContextHydrationInput & {
    memberStatuses?: TeamMemberLiveSnapshot[];
  },
): Promise<TeamRunContextHydrationPayload> => {
  const payload = await loadTeamRunContextHydrationPayload(input);
  const hydratedContext = buildHydratedTeamContext({
    metadata: payload.metadata,
    resumeConfig: payload.resumeConfig,
    members: payload.members,
    focusedMemberRouteKey: payload.focusedMemberRouteKey,
    primaryWorkspaceMetadata: payload.primaryWorkspaceMetadata,
    memberStatuses: input.memberStatuses || [],
    historicalHydration: payload.historicalHydration,
  });
  return {
    teamRunId: payload.teamRunId,
    focusedMemberRouteKey: payload.focusedMemberRouteKey,
    resumeConfig: payload.resumeConfig,
    hydratedContext,
    projectionByMemberRouteKey: payload.projectionByMemberRouteKey,
  };
};

export const ensureHistoricalTeamMemberHydrated = async (params: {
  teamContext: AgentTeamContext;
  memberRouteKey: string;
}): Promise<void> => {
  const historicalHydration = params.teamContext.historicalHydration;
  if (!historicalHydration) {
    return;
  }

  const normalizedMemberRouteKey = params.memberRouteKey.trim();
  if (!normalizedMemberRouteKey) {
    return;
  }

  const currentLoadState =
    historicalHydration.memberProjectionLoadStateByRouteKey[normalizedMemberRouteKey];
  if (currentLoadState === 'loaded') {
    return;
  }

  const requestKey = buildHistoricalHydrationRequestKey(
    params.teamContext.teamRunId,
    normalizedMemberRouteKey,
  );
  const inFlight = historicalMemberHydrationRequests.get(requestKey);
  if (inFlight) {
    await inFlight;
    return;
  }

  const memberMetadataEnvelope = buildMemberMetadataEnvelope({
    teamContext: params.teamContext,
    memberRouteKey: normalizedMemberRouteKey,
  });
  const memberMetadata = historicalHydration.memberMetadataByRouteKey[normalizedMemberRouteKey];
  const memberContext = params.teamContext.leafAgentContextsByRouteKey.get(normalizedMemberRouteKey) || null;
  if (!memberMetadataEnvelope || !memberMetadata || !memberContext) {
    historicalHydration.memberProjectionLoadStateByRouteKey[normalizedMemberRouteKey] = 'error';
    return;
  }

  historicalHydration.memberProjectionLoadStateByRouteKey[normalizedMemberRouteKey] = 'loading';

  const request = (async () => {
    const client = getApolloClient();
    const projection = await fetchTeamMemberProjection({
      client,
      getTeamMemberRunProjectionQuery: GetTeamMemberRunProjection,
      teamRunId: params.teamContext.teamRunId,
      memberRouteKey: normalizedMemberRouteKey,
    });

    if (!projection) {
      historicalHydration.memberProjectionLoadStateByRouteKey[normalizedMemberRouteKey] = 'error';
      return;
    }

    applyProjectionToTeamMemberContext({
      teamRunId: params.teamContext.teamRunId,
      metadata: memberMetadataEnvelope,
      member: memberMetadata,
      projection,
      memberContext,
      isActive: false,
    });
    historicalHydration.memberProjectionLoadStateByRouteKey[normalizedMemberRouteKey] = 'loaded';
  })();

  historicalMemberHydrationRequests.set(requestKey, request);
  try {
    await request;
  } finally {
    historicalMemberHydrationRequests.delete(requestKey);
  }
};
