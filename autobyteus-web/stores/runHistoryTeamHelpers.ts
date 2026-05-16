import { AgentContext } from '~/types/agent/AgentContext';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type {
  TeamTreeNode,
  TeamRunHistoryItem,
  TeamRunMetadataPayload,
  TeamMemberRunProjectionPayload,
} from '~/stores/runHistoryTypes';
import { buildConversationFromProjection } from '~/services/runHydration/runProjectionConversation';
import { hydrateActivitiesFromProjection } from '~/services/runHydration/runProjectionActivityHydration';
import { normalizeTeamRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization';
import {
  applyMemberOrHistoryStatusSnapshot,
  initializeRuntimeStatusState,
} from '~/services/runStatus/agentRuntimeStatusState';
import { flattenTeamRunAgentMetadata } from '~/stores/runHistoryMetadata';
import {
  buildTeamRowsFromContext,
  buildTeamRowsFromHistoryItem,
  flattenTeamRows,
} from '~/stores/runHistoryTeamRows';

export const toHistoryTeamStatus = (
  team: Pick<TeamRunHistoryItem, 'status'>,
): AgentTeamStatus => {
  return normalizeTeamRuntimeStatus(team.status);
};

export const toTeamRunStatus = (
  status: AgentTeamStatus,
): Pick<TeamRunHistoryItem, 'isActive' | 'lastKnownStatus'> => {
  if (status === AgentTeamStatus.Error) {
    return { isActive: false, lastKnownStatus: 'ERROR' };
  }

  if (status === AgentTeamStatus.Offline) {
    return { isActive: false, lastKnownStatus: 'IDLE' };
  }

  return { isActive: true, lastKnownStatus: 'ACTIVE' };
};

const preserveCanonicalMemberStatus = (status: unknown): AgentStatus => {
  if (
    status === AgentStatus.Running ||
    status === AgentStatus.Idle ||
    status === AgentStatus.Error ||
    status === AgentStatus.Offline
  ) {
    return status;
  }
  return AgentStatus.Offline;
};

export const summarizeTeamDraft = (teamContext: AgentTeamContext, draftSummaryPrefix: string): string => {
  const coordinatorMemberRouteKey = teamContext.coordinatorMemberRouteKey?.trim() || '';
  const coordinatorContext = coordinatorMemberRouteKey
    ? teamContext.leafAgentContextsByRouteKey.get(coordinatorMemberRouteKey) ?? null
    : null;

  const firstCoordinatorUserMessage = coordinatorContext?.state.conversation.messages.find(
    (message) => message.type === 'user' && message.text?.trim().length > 0,
  );
  if (firstCoordinatorUserMessage?.type === 'user') {
    return firstCoordinatorUserMessage.text.trim();
  }

  if (!coordinatorContext) {
    const firstMemberContext = teamContext.leafAgentContextsByRouteKey.values().next().value ?? null;
    const firstMemberUserMessage = firstMemberContext?.state.conversation.messages.find(
      (message) => message.type === 'user' && message.text?.trim().length > 0,
    );
    if (firstMemberUserMessage?.type === 'user') {
      return firstMemberUserMessage.text.trim();
    }
  }

  return `${draftSummaryPrefix}${teamContext.config.teamDefinitionName || 'Team'}`.trim();
};

export const resolveTeamLastActivityAt = (teamContext: AgentTeamContext): string => {
  let latest = '';
  for (const member of teamContext.leafAgentContextsByRouteKey.values()) {
    const ts = member.state.conversation.updatedAt || member.state.conversation.createdAt || '';
    if (!ts) {
      continue;
    }
    if (!latest || ts > latest) {
      latest = ts;
    }
  }
  return latest || new Date().toISOString();
};

export const resolveTeamWorkspaceRootPathFromContext = (
  teamContext: AgentTeamContext,
  resolveWorkspaceRootPath: (workspaceId: string | null) => string,
  unassignedWorkspaceKey: string,
): string => {
  const fromTeamConfig = resolveWorkspaceRootPath(teamContext.config.workspaceId);
  if (fromTeamConfig) {
    return fromTeamConfig;
  }
  for (const member of teamContext.leafAgentContextsByRouteKey.values()) {
    const fromMemberConfig = resolveWorkspaceRootPath(member.config.workspaceId);
    if (fromMemberConfig) {
      return fromMemberConfig;
    }
  }
  return unassignedWorkspaceKey;
};

export const buildTeamNodes = (params: {
  teamRuns: TeamRunHistoryItem[];
  teamContexts: AgentTeamContext[];
  workspaceRootPath?: string;
  normalizeRootPath: (value: string | null | undefined) => string;
  resolveWorkspaceRootPath: (workspaceId: string | null) => string;
  resolveWorkspaceRootPathFromContext: (teamContext: AgentTeamContext) => string;
  summarizeTeamDraft: (teamContext: AgentTeamContext) => string;
  resolveTeamLastActivityAt: (teamContext: AgentTeamContext) => string;
  toHistoryTeamStatus: (
    team: Pick<TeamRunHistoryItem, 'status'>,
  ) => AgentTeamStatus;
  toTeamRunStatus: (
    status: AgentTeamStatus,
  ) => Pick<TeamRunHistoryItem, 'isActive' | 'lastKnownStatus'>;
  unassignedWorkspaceKey: string;
}): TeamTreeNode[] => {
  const nodesByTeamRunId = new Map<string, TeamTreeNode>();

  for (const team of params.teamRuns) {
    const fallbackWorkspaceRootPath = team.members
      .map((member) => params.normalizeRootPath(member.workspaceRootPath))
      .find((value) => Boolean(value))
      || params.unassignedWorkspaceKey;
    const normalizedWorkspaceRootPath =
      params.normalizeRootPath(team.workspaceRootPath) ||
      fallbackWorkspaceRootPath;
    const memberTree = buildTeamRowsFromHistoryItem(team);
    const sortedMembers = flattenTeamRows(memberTree);
    const coordinatorMemberRouteKey = team.coordinatorMemberRouteKey?.trim() || '';
    const focusedMemberRouteKey =
      sortedMembers.find((member) => member.memberRouteKey === coordinatorMemberRouteKey)?.memberRouteKey ||
      sortedMembers[0]?.memberRouteKey ||
      '';

    nodesByTeamRunId.set(team.teamRunId, {
      teamRunId: team.teamRunId,
      teamDefinitionId: team.teamDefinitionId,
      teamDefinitionName: team.teamDefinitionName || 'Team',
      workspaceRootPath: normalizedWorkspaceRootPath,
      summary: team.summary,
      lastActivityAt: team.lastActivityAt,
      lastKnownStatus: team.lastKnownStatus,
      isActive: team.isActive,
      currentStatus: params.toHistoryTeamStatus(team),
      deleteLifecycle: team.deleteLifecycle,
      focusedMemberRouteKey,
      members: sortedMembers,
      memberTree,
    });
  }

  for (const teamContext of params.teamContexts) {
    const existing = nodesByTeamRunId.get(teamContext.teamRunId);
    const workspaceRootPath = params.resolveWorkspaceRootPathFromContext(teamContext);
    const currentStatus = normalizeTeamRuntimeStatus(teamContext.currentStatus);
    const { isActive, lastKnownStatus } = params.toTeamRunStatus(currentStatus);
    const summary = existing?.summary?.trim() || params.summarizeTeamDraft(teamContext);
    const lastActivityAt = existing?.lastActivityAt || params.resolveTeamLastActivityAt(teamContext);
    const memberTree = buildTeamRowsFromContext(
      teamContext,
      summary,
      lastActivityAt,
      params.resolveWorkspaceRootPath,
    );
    const members = flattenTeamRows(memberTree);
    const deleteLifecycle = existing?.deleteLifecycle ?? ('READY' as const);
    const teamDefinitionId =
      existing?.teamDefinitionId ||
      teamContext.config.teamDefinitionId ||
      teamContext.teamRunId;

    nodesByTeamRunId.set(teamContext.teamRunId, {
      teamRunId: teamContext.teamRunId,
      teamDefinitionId,
      teamDefinitionName: teamContext.config.teamDefinitionName || existing?.teamDefinitionName || 'Team',
      workspaceRootPath,
      summary,
      lastActivityAt,
      lastKnownStatus,
      isActive,
      currentStatus,
      deleteLifecycle,
      focusedMemberRouteKey: teamContext.focusedMemberRouteKey,
      members,
      memberTree,
    });
  }

  // Preserve source/insertion order to avoid dynamic recency-based row jumping in the tree.
  const allNodes = Array.from(nodesByTeamRunId.values());
  if (!params.workspaceRootPath) {
    return allNodes;
  }
  const normalizedWorkspaceRootPath = params.normalizeRootPath(params.workspaceRootPath);
  return allNodes.filter((node) => node.workspaceRootPath === normalizedWorkspaceRootPath);
};

export const fetchTeamMemberProjections = async (params: {
  client: any;
  getTeamMemberRunProjectionQuery: any;
  teamRunId: string;
  metadata: TeamRunMetadataPayload;
  toTeamMemberKey: (member: { memberRouteKey: string; memberName: string }) => string;
}): Promise<Map<string, TeamMemberRunProjectionPayload | null>> => {
  const projectionByMemberRouteKey = new Map<string, TeamMemberRunProjectionPayload | null>();
  await Promise.all(
    flattenTeamRunAgentMetadata(params.metadata.memberTree).map(async (member) => {
      const normalizedMemberRouteKey = params.toTeamMemberKey(member).trim();
      if (!normalizedMemberRouteKey) {
        return;
      }

      try {
        const projectionResponse = await params.client.query({
          query: params.getTeamMemberRunProjectionQuery,
          variables: {
            teamRunId: params.teamRunId,
            memberRouteKey: normalizedMemberRouteKey,
          },
          fetchPolicy: 'network-only',
        });

        if (projectionResponse.errors && projectionResponse.errors.length > 0) {
          throw new Error(
            projectionResponse.errors.map((e: { message: string }) => e.message).join(', '),
          );
        }

        projectionByMemberRouteKey.set(
          normalizedMemberRouteKey,
          projectionResponse.data?.getTeamMemberRunProjection || null,
        );
      } catch (projectionError) {
        console.warn(
          `[runHistoryStore] Failed to fetch team-member projection for '${member.memberRouteKey}'`,
          projectionError,
        );
        projectionByMemberRouteKey.set(normalizedMemberRouteKey, null);
      }
    }),
  );
  return projectionByMemberRouteKey;
};

export const fetchTeamMemberProjection = async (params: {
  client: any;
  getTeamMemberRunProjectionQuery: any;
  teamRunId: string;
  memberRouteKey: string;
}): Promise<TeamMemberRunProjectionPayload | null> => {
  const normalizedMemberRouteKey = params.memberRouteKey.trim();
  if (!normalizedMemberRouteKey) {
    return null;
  }

  try {
    const projectionResponse = await params.client.query({
      query: params.getTeamMemberRunProjectionQuery,
      variables: {
        teamRunId: params.teamRunId,
        memberRouteKey: normalizedMemberRouteKey,
      },
      fetchPolicy: 'network-only',
    });

    if (projectionResponse.errors && projectionResponse.errors.length > 0) {
      throw new Error(
        projectionResponse.errors.map((e: { message: string }) => e.message).join(', '),
      );
    }

    return projectionResponse.data?.getTeamMemberRunProjection || null;
  } catch (projectionError) {
    console.warn(
      `[runHistoryStore] Failed to fetch team-member projection for '${normalizedMemberRouteKey}'`,
      projectionError,
    );
    return null;
  }
};

const buildTeamMemberConversation = (params: {
  teamRunId: string;
  metadata: TeamRunMetadataPayload;
  member: ReturnType<typeof flattenTeamRunAgentMetadata>[number];
  normalizedMemberRouteKey: string;
  projection: TeamMemberRunProjectionPayload | null;
}): AgentContext['state']['conversation'] => {
  const memberRunId = params.member.memberRunId || params.normalizedMemberRouteKey;
  const conversation = params.projection
    ? buildConversationFromProjection(
      memberRunId,
      params.projection.conversation || [],
      {
        agentDefinitionId: params.member.agentDefinitionId,
        agentName: params.member.memberName,
        llmModelIdentifier: params.member.llmModelIdentifier,
      },
    )
    : {
      id: `${params.teamRunId}::${params.normalizedMemberRouteKey}`,
      messages: [],
      createdAt: params.metadata.createdAt,
      updatedAt: params.metadata.updatedAt,
      agentDefinitionId: params.member.agentDefinitionId,
      agentName: params.member.memberName,
      llmModelIdentifier: params.member.llmModelIdentifier,
    };

  conversation.id = `${params.teamRunId}::${params.normalizedMemberRouteKey}`;
  if (conversation.messages.length === 0) {
    conversation.createdAt = params.metadata.createdAt;
    conversation.updatedAt = params.projection?.lastActivityAt || params.metadata.updatedAt;
  } else if (params.projection?.lastActivityAt) {
    conversation.updatedAt = params.projection.lastActivityAt;
  }

  return conversation;
};

const buildTeamMemberConfig = (params: {
  member: ReturnType<typeof flattenTeamRunAgentMetadata>[number];
  workspaceId: string | null;
  isActive: boolean;
}): AgentRunConfig => ({
  agentDefinitionId: params.member.agentDefinitionId,
  agentDefinitionName: params.member.memberName,
  llmModelIdentifier: params.member.llmModelIdentifier,
  runtimeKind: params.member.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND,
  workspaceId: params.workspaceId,
  autoExecuteTools: params.member.autoExecuteTools,
  skillAccessMode: params.member.skillAccessMode ?? 'PRELOADED_ONLY',
  llmConfig: params.member.llmConfig ?? null,
  isLocked: params.isActive,
});

export const applyProjectionToTeamMemberContext = (params: {
  teamRunId: string;
  metadata: TeamRunMetadataPayload;
  member: ReturnType<typeof flattenTeamRunAgentMetadata>[number];
  projection: TeamMemberRunProjectionPayload | null;
  memberContext: AgentContext;
  isActive: boolean;
}): void => {
  const normalizedMemberRouteKey = params.member.memberRouteKey.trim();
  if (!normalizedMemberRouteKey) {
    return;
  }

  const memberRunId = params.member.memberRunId || normalizedMemberRouteKey;
  const conversation = buildTeamMemberConversation({
    teamRunId: params.teamRunId,
    metadata: params.metadata,
    member: params.member,
    normalizedMemberRouteKey,
    projection: params.projection,
  });

  params.memberContext.config = buildTeamMemberConfig({
    member: params.member,
    workspaceId: params.memberContext.config.workspaceId,
    isActive: params.isActive,
  });
  params.memberContext.state.runId = memberRunId;
  params.memberContext.state.conversation = conversation;
  applyMemberOrHistoryStatusSnapshot(
    params.memberContext,
    params.isActive
      ? preserveCanonicalMemberStatus(params.memberContext.state.currentStatus)
      : AgentStatus.Offline,
    { preserveLiveInterrupt: params.isActive },
  );

  if (params.projection) {
    hydrateActivitiesFromProjection(memberRunId, params.projection.activities || []);
  }
};

export const buildTeamMemberContexts = async (params: {
  teamRunId: string;
  metadata: TeamRunMetadataPayload;
  isActive: boolean;
  projectionByMemberRouteKey: Map<string, TeamMemberRunProjectionPayload | null>;
  toTeamMemberKey: (member: { memberRouteKey: string; memberName: string }) => string;
  ensureWorkspaceByRootPath: (path: string) => Promise<string | null>;
}): Promise<{ members: Map<string, AgentContext>; firstWorkspaceId: string | null }> => {
  const members = new Map<string, AgentContext>();
  let firstWorkspaceId: string | null = null;
  for (const member of flattenTeamRunAgentMetadata(params.metadata.memberTree)) {
    const normalizedMemberRouteKey = params.toTeamMemberKey(member).trim();
    if (!normalizedMemberRouteKey) {
      continue;
    }
    let workspaceId: string | null = null;
    if (member.workspaceRootPath) {
      workspaceId = await params.ensureWorkspaceByRootPath(member.workspaceRootPath);
      if (workspaceId && !firstWorkspaceId) {
        firstWorkspaceId = workspaceId;
      }
    }
    const memberConfig = buildTeamMemberConfig({
      member,
      workspaceId,
      isActive: params.isActive,
    });
    const memberRunId = member.memberRunId || normalizedMemberRouteKey;
    const projection = params.projectionByMemberRouteKey.get(params.toTeamMemberKey(member)) || null;
    const conversation = buildTeamMemberConversation({
      teamRunId: params.teamRunId,
      metadata: params.metadata,
      member,
      normalizedMemberRouteKey,
      projection,
    });

    const state = new AgentRunState(memberRunId, conversation);
    initializeRuntimeStatusState(state, AgentStatus.Offline);
    members.set(
      normalizedMemberRouteKey,
      new AgentContext(memberConfig, state),
    );
  }

  return { members, firstWorkspaceId };
};
