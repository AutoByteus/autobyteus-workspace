import { getApolloClient } from '~/utils/apolloClient';
import {
  GetTeamMemberRunProjection,
  GetTeamRunResumeConfig,
} from '~/graphql/queries/runHistoryQueries';
import type {
  GetTeamRunResumeConfigQueryData,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import { parseTeamRunMetadata, toTeamMemberKey } from '~/stores/runHistoryMetadata';
import {
  applyProjectionToTeamMemberContext,
  buildTeamMemberContexts,
  fetchTeamMemberProjection,
  fetchTeamMemberProjections,
} from '~/stores/runHistoryTeamHelpers';
import type {
  AgentTeamContext,
  HistoricalTeamHydrationState,
  TeamMemberProjectionLoadState,
} from '~/types/agent/AgentTeamContext';
import { normalizeAgentRuntimeStatus, normalizeTeamRuntimeStatus } from './runtimeStatusNormalization';
import { reconstructTeamRunConfigFromMetadata } from '~/utils/teamRunConfigUtils';
import { hydrateActivitiesFromProjection } from './runProjectionActivityHydration';

export interface LoadTeamRunContextHydrationInput {
  teamRunId: string;
  memberRouteKey?: string | null;
  ensureWorkspaceByRootPath: (rootPath: string) => Promise<string | null>;
}

export interface TeamMemberLiveSnapshot {
  memberRouteKey: string | null;
  memberName: string;
  memberRunId: string | null;
  currentStatus: string;
}

export interface TeamLiveStatusSnapshot {
  currentStatus?: string | null;
  memberStatuses?: TeamMemberLiveSnapshot[];
}

export interface TeamRunContextHydrationPayload {
  teamRunId: string;
  focusedMemberRouteKey: string;
  resumeConfig: TeamRunResumeConfigPayload;
  hydratedContext: AgentTeamContext;
}

interface LoadedTeamRunContextHydrationPayload {
  teamRunId: string;
  focusedMemberRouteKey: string;
  resumeConfig: TeamRunResumeConfigPayload;
  members: Map<string, any>;
  firstWorkspaceId: string | null;
  metadata: ReturnType<typeof parseTeamRunMetadata>;
  historicalHydration: HistoricalTeamHydrationState | null;
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

const applyMemberStatuses = (
  members: Map<string, any>,
  snapshots: TeamMemberLiveSnapshot[],
): void => {
  const statusByKey = new Map<string, TeamMemberLiveSnapshot>();
  const statusByRunId = new Map<string, TeamMemberLiveSnapshot>();

  snapshots.forEach((snapshot) => {
    const routeKey = snapshot.memberRouteKey?.trim() || '';
    if (routeKey) {
      statusByKey.set(routeKey, snapshot);
    }
    const runId = snapshot.memberRunId?.trim() || '';
    if (runId) {
      statusByRunId.set(runId, snapshot);
    }
  });

  members.forEach((memberContext, memberRouteKey) => {
    memberContext.config.isLocked = true;
    const byRouteKey = statusByKey.get(memberRouteKey);
    const byRunId = statusByRunId.get(memberContext.state.runId);
    const matched = byRouteKey || byRunId;
    if (matched) {
      memberContext.state.currentStatus = normalizeAgentRuntimeStatus(matched.currentStatus);
    }
  });
};

const hydrateLoadedMemberActivities = (params: {
  metadata: ReturnType<typeof parseTeamRunMetadata>;
  projectionByMemberRouteKey: Map<string, any>;
}): void => {
  params.metadata.memberMetadata.forEach((member) => {
    const normalizedMemberRouteKey = toTeamMemberKey(member).trim();
    if (!normalizedMemberRouteKey) {
      return;
    }
    const projection = params.projectionByMemberRouteKey.get(normalizedMemberRouteKey) || null;
    if (!projection) {
      return;
    }
    const memberRunId = member.memberRunId || normalizedMemberRouteKey;
    hydrateActivitiesFromProjection(memberRunId, projection.activities || []);
  });
};

const buildHistoricalHydrationState = (params: {
  metadata: ReturnType<typeof parseTeamRunMetadata>;
  loadedMemberRouteKeys: string[];
  erroredMemberRouteKeys?: string[];
}): HistoricalTeamHydrationState => {
  const memberMetadataByRouteKey: HistoricalTeamHydrationState['memberMetadataByRouteKey'] = {};
  const memberProjectionLoadStateByRouteKey: Record<string, TeamMemberProjectionLoadState> = {};
  const loadedKeys = new Set(params.loadedMemberRouteKeys.map((key) => key.trim()).filter(Boolean));
  const erroredKeys = new Set((params.erroredMemberRouteKeys || []).map((key) => key.trim()).filter(Boolean));

  params.metadata.memberMetadata.forEach((member) => {
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
    updatedAt: params.metadata.updatedAt,
    memberMetadataByRouteKey,
    memberProjectionLoadStateByRouteKey,
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
    runVersion: 0,
    createdAt: historicalHydration.createdAt,
    updatedAt: historicalHydration.updatedAt,
    memberMetadata: [member],
  };
};

const buildHydratedTeamContext = (params: {
  metadata: ReturnType<typeof parseTeamRunMetadata>;
  resumeConfig: TeamRunResumeConfigPayload;
  members: Map<string, any>;
  focusedMemberRouteKey: string;
  firstWorkspaceId: string | null;
  currentStatus: string | null | undefined;
  memberStatuses: TeamMemberLiveSnapshot[];
  historicalHydration: HistoricalTeamHydrationState | null;
}): AgentTeamContext => {
  const context = {
    teamRunId: params.metadata.teamRunId,
    config: reconstructTeamRunConfigFromMetadata({
      metadata: params.metadata,
      firstWorkspaceId: params.firstWorkspaceId,
      isLocked: params.resumeConfig.isActive,
    }),
    members: params.members,
    coordinatorMemberRouteKey: params.metadata.coordinatorMemberRouteKey,
    historicalHydration: params.historicalHydration,
    focusedMemberName: params.focusedMemberRouteKey,
    currentStatus: normalizeTeamRuntimeStatus(params.currentStatus),
    isSubscribed: false,
    taskPlan: null,
    taskStatuses: null,
  };

  applyLiveTeamStatusSnapshot(context, {
    currentStatus: params.currentStatus,
    memberStatuses: params.memberStatuses,
  });
  return context;
};

const loadLiveTeamRunContextHydrationPayload = async (input: {
  metadata: ReturnType<typeof parseTeamRunMetadata>;
  resumeConfig: TeamRunResumeConfigPayload;
  requestedMemberRouteKey?: string | null;
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

  const { members, firstWorkspaceId } = await buildTeamMemberContexts({
    teamRunId: input.metadata.teamRunId,
    metadata: input.metadata,
    isActive: input.resumeConfig.isActive,
    projectionByMemberRouteKey,
    toTeamMemberKey,
    ensureWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
  });
  hydrateLoadedMemberActivities({
    metadata: input.metadata,
    projectionByMemberRouteKey,
  });

  const availableMemberRouteKeys = Array.from(members.keys());
  const focusedMemberRouteKey = resolveFocusKey({
    requestedMemberRouteKey: input.requestedMemberRouteKey,
    coordinatorMemberRouteKey: input.metadata.coordinatorMemberRouteKey,
    availableMemberRouteKeys,
  });

  if (!focusedMemberRouteKey) {
    throw new Error(`Team '${input.metadata.teamRunId}' has no members in metadata.`);
  }

  return {
    teamRunId: input.metadata.teamRunId,
    focusedMemberRouteKey,
    resumeConfig: input.resumeConfig,
    members,
    firstWorkspaceId,
    metadata: input.metadata,
    historicalHydration: null,
  };
};

const loadHistoricalTeamRunContextHydrationPayload = async (input: {
  metadata: ReturnType<typeof parseTeamRunMetadata>;
  resumeConfig: TeamRunResumeConfigPayload;
  requestedMemberRouteKey?: string | null;
  ensureWorkspaceByRootPath: (rootPath: string) => Promise<string | null>;
}): Promise<LoadedTeamRunContextHydrationPayload> => {
  const availableMemberRouteKeys = input.metadata.memberMetadata
    .map((member) => toTeamMemberKey(member).trim())
    .filter(Boolean);
  const focusedMemberRouteKey = resolveFocusKey({
    requestedMemberRouteKey: input.requestedMemberRouteKey,
    coordinatorMemberRouteKey: input.metadata.coordinatorMemberRouteKey,
    availableMemberRouteKeys,
  });

  if (!focusedMemberRouteKey) {
    throw new Error(`Team '${input.metadata.teamRunId}' has no members in metadata.`);
  }

  const client = getApolloClient();
  const focusedProjection = await fetchTeamMemberProjection({
    client,
    getTeamMemberRunProjectionQuery: GetTeamMemberRunProjection,
    teamRunId: input.metadata.teamRunId,
    memberRouteKey: focusedMemberRouteKey,
  });
  const projectionByMemberRouteKey = new Map<string, any>();
  if (focusedProjection) {
    projectionByMemberRouteKey.set(focusedMemberRouteKey, focusedProjection);
  }

  const { members, firstWorkspaceId } = await buildTeamMemberContexts({
    teamRunId: input.metadata.teamRunId,
    metadata: input.metadata,
    isActive: false,
    projectionByMemberRouteKey,
    toTeamMemberKey,
    ensureWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
  });

  if (focusedProjection) {
    const focusedMetadata = input.metadata.memberMetadata.find(
      (member) => toTeamMemberKey(member).trim() === focusedMemberRouteKey,
    );
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
    firstWorkspaceId,
    metadata: input.metadata,
    historicalHydration: buildHistoricalHydrationState({
      metadata: input.metadata,
      loadedMemberRouteKeys: focusedProjection ? [focusedMemberRouteKey] : [],
      erroredMemberRouteKeys: focusedProjection ? [] : [focusedMemberRouteKey],
    }),
  };
};

export const applyLiveTeamStatusSnapshot = (
  context: AgentTeamContext,
  snapshot: TeamLiveStatusSnapshot,
): void => {
  context.currentStatus = normalizeTeamRuntimeStatus(snapshot.currentStatus);
  applyMemberStatuses(context.members, snapshot.memberStatuses || []);
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
    return loadLiveTeamRunContextHydrationPayload({
      metadata,
      resumeConfig,
      requestedMemberRouteKey: input.memberRouteKey,
      ensureWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
    });
  }

  return loadHistoricalTeamRunContextHydrationPayload({
    metadata,
    resumeConfig,
    requestedMemberRouteKey: input.memberRouteKey,
    ensureWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
  });
};

export const hydrateLiveTeamRunContext = async (
  input: LoadTeamRunContextHydrationInput & {
    currentStatus?: string | null;
    memberStatuses?: TeamMemberLiveSnapshot[];
  },
): Promise<TeamRunContextHydrationPayload> => {
  const payload = await loadTeamRunContextHydrationPayload(input);
  const hydratedContext = buildHydratedTeamContext({
    metadata: payload.metadata,
    resumeConfig: payload.resumeConfig,
    members: payload.members,
    focusedMemberRouteKey: payload.focusedMemberRouteKey,
    firstWorkspaceId: payload.firstWorkspaceId,
    currentStatus: input.currentStatus,
    memberStatuses: input.memberStatuses || [],
    historicalHydration: payload.historicalHydration,
  });
  return {
    teamRunId: payload.teamRunId,
    focusedMemberRouteKey: payload.focusedMemberRouteKey,
    resumeConfig: payload.resumeConfig,
    hydratedContext,
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
  const memberContext = params.teamContext.members.get(normalizedMemberRouteKey) || null;
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

export const ensureHistoricalTeamMembersHydrated = async (params: {
  teamContext: AgentTeamContext;
  memberRouteKeys: string[];
}): Promise<void> => {
  if (!params.teamContext.historicalHydration) {
    return;
  }

  for (const memberRouteKey of params.memberRouteKeys) {
    await ensureHistoricalTeamMemberHydrated({
      teamContext: params.teamContext,
      memberRouteKey,
    });
  }
};
