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
  buildTeamMemberContexts,
  fetchTeamMemberProjections,
} from '~/stores/runHistoryTeamHelpers';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { normalizeAgentRuntimeStatus, normalizeTeamRuntimeStatus } from './runtimeStatusNormalization';
import { reconstructTeamRunConfigFromMetadata } from '~/utils/teamRunConfigUtils';

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
}

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

export const applyLiveTeamStatusSnapshot = (
  context: AgentTeamContext,
  snapshot: TeamLiveStatusSnapshot,
): void => {
  context.currentStatus = normalizeTeamRuntimeStatus(snapshot.currentStatus);
  applyMemberStatuses(context.members, snapshot.memberStatuses || []);
};

const buildHydratedTeamContext = (params: {
  metadata: ReturnType<typeof parseTeamRunMetadata>;
  resumeConfig: TeamRunResumeConfigPayload;
  members: Map<string, any>;
  focusedMemberRouteKey: string;
  firstWorkspaceId: string | null;
  currentStatus: string | null | undefined;
  memberStatuses: TeamMemberLiveSnapshot[];
}): AgentTeamContext => {
  const context = {
    teamRunId: params.metadata.teamRunId,
    config: reconstructTeamRunConfigFromMetadata({
      metadata: params.metadata,
      firstWorkspaceId: params.firstWorkspaceId,
      isLocked: params.resumeConfig.isActive,
    }),
    members: params.members,
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

  const projectionByMemberRouteKey = await fetchTeamMemberProjections({
    client,
    getTeamMemberRunProjectionQuery: GetTeamMemberRunProjection,
    teamRunId: metadata.teamRunId,
    metadata,
    toTeamMemberKey,
  });

  const { members, firstWorkspaceId } = await buildTeamMemberContexts({
    teamRunId: metadata.teamRunId,
    metadata,
    isActive: resumeConfig.isActive,
    projectionByMemberRouteKey,
    toTeamMemberKey,
    ensureWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
  });

  const availableMemberRouteKeys = Array.from(members.keys());
  const focusedMemberRouteKey = resolveFocusKey({
    requestedMemberRouteKey: input.memberRouteKey,
    coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
    availableMemberRouteKeys,
  });

  if (!focusedMemberRouteKey) {
    throw new Error(`Team '${metadata.teamRunId}' has no members in metadata.`);
  }

  return {
    teamRunId: metadata.teamRunId,
    focusedMemberRouteKey,
    resumeConfig,
    members,
    firstWorkspaceId,
    metadata,
  };
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
  });
  useAgentTeamContextsStore().addTeamContext(hydratedContext);
  return {
    teamRunId: payload.teamRunId,
    focusedMemberRouteKey: payload.focusedMemberRouteKey,
    resumeConfig: payload.resumeConfig,
    hydratedContext,
  };
};
