import { AgentContext } from '~/types/agent/AgentContext';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamTreeNode, TeamRunHistoryItem, TeamRunMetadataPayload, TeamMemberRunProjectionPayload } from '~/stores/runHistoryTypes';
import { buildConversationFromProjection } from '~/services/runHydration/runProjectionConversation';
import { hydrateActivitiesFromProjection } from '~/services/runHydration/runProjectionActivityHydration';

export const toHistoryTeamStatus = (
  team: Pick<TeamRunHistoryItem, 'isActive' | 'lastKnownStatus'>,
): AgentTeamStatus => {
  if (team.lastKnownStatus === 'ERROR') {
    return AgentTeamStatus.Error;
  }
  if (!team.isActive) {
    return AgentTeamStatus.ShutdownComplete;
  }
  return AgentTeamStatus.Processing;
};

export const toTeamRunStatus = (
  status: AgentTeamStatus,
): Pick<TeamRunHistoryItem, 'isActive' | 'lastKnownStatus'> => {
  if (status === AgentTeamStatus.Error) {
    return { isActive: false, lastKnownStatus: 'ERROR' };
  }

  if (
    status === AgentTeamStatus.Uninitialized ||
    status === AgentTeamStatus.ShutdownComplete
  ) {
    return { isActive: false, lastKnownStatus: 'IDLE' };
  }

  return { isActive: true, lastKnownStatus: 'ACTIVE' };
};

const toTeamMemberRunStatus = (
  status: AgentStatus,
): Pick<TeamRunHistoryItem, 'isActive' | 'lastKnownStatus'> => {
  if (status === AgentStatus.Error) {
    return { isActive: false, lastKnownStatus: 'ERROR' };
  }

  if (
    status === AgentStatus.Uninitialized ||
    status === AgentStatus.ShutdownComplete ||
    status === AgentStatus.ToolDenied
  ) {
    return { isActive: false, lastKnownStatus: 'IDLE' };
  }

  return { isActive: true, lastKnownStatus: 'ACTIVE' };
};

export const summarizeTeamDraft = (teamContext: AgentTeamContext, draftSummaryPrefix: string): string => {
  const coordinatorMemberRouteKey = teamContext.coordinatorMemberRouteKey?.trim() || '';
  const coordinatorContext = coordinatorMemberRouteKey
    ? teamContext.members.get(coordinatorMemberRouteKey) ?? null
    : null;

  const firstCoordinatorUserMessage = coordinatorContext?.state.conversation.messages.find(
    (message) => message.type === 'user' && message.text?.trim().length > 0,
  );
  if (firstCoordinatorUserMessage?.type === 'user') {
    return firstCoordinatorUserMessage.text.trim();
  }

  if (!coordinatorContext) {
    const firstMemberContext = teamContext.members.values().next().value ?? null;
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
  for (const member of teamContext.members.values()) {
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
  for (const member of teamContext.members.values()) {
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
    team: Pick<TeamRunHistoryItem, 'isActive' | 'lastKnownStatus'>,
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
    const sortedMembers = team.members
      .map((member) => ({
        teamRunId: team.teamRunId,
        memberRouteKey: member.memberRouteKey,
        memberName: member.memberName,
        memberRunId: member.memberRunId,
        workspaceRootPath: member.workspaceRootPath ?? null,
        summary: team.summary,
        lastActivityAt: team.lastActivityAt,
        lastKnownStatus: team.lastKnownStatus,
        isActive: team.isActive,
        deleteLifecycle: team.deleteLifecycle,
      }))
      .sort((a, b) => a.memberName.localeCompare(b.memberName));
    const coordinatorMemberRouteKey = team.coordinatorMemberRouteKey?.trim() || '';
    const focusedMemberName =
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
      focusedMemberName,
      members: sortedMembers,
    });
  }

  for (const teamContext of params.teamContexts) {
    const existing = nodesByTeamRunId.get(teamContext.teamRunId);
    const workspaceRootPath = params.resolveWorkspaceRootPathFromContext(teamContext);
    const { isActive, lastKnownStatus } = params.toTeamRunStatus(teamContext.currentStatus);
    const summary = existing?.summary?.trim() || params.summarizeTeamDraft(teamContext);
    const lastActivityAt = existing?.lastActivityAt || params.resolveTeamLastActivityAt(teamContext);
    const members = Array.from(teamContext.members.entries())
      .map(([memberRouteKey, memberContext]) => ({
        ...toTeamMemberRunStatus(memberContext.state.currentStatus),
        teamRunId: teamContext.teamRunId,
        memberRouteKey,
        memberName: memberContext.config.agentDefinitionName || memberRouteKey,
        memberRunId: memberContext.state.runId,
        workspaceRootPath: params.resolveWorkspaceRootPath(memberContext.config.workspaceId),
        summary,
        lastActivityAt:
          memberContext.state.conversation.updatedAt ||
          memberContext.state.conversation.createdAt ||
          lastActivityAt,
        deleteLifecycle: 'READY' as const,
      }))
      .sort((a, b) => a.memberName.localeCompare(b.memberName));
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
      currentStatus: teamContext.currentStatus,
      deleteLifecycle,
      focusedMemberName: teamContext.focusedMemberName,
      members,
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
    params.metadata.memberMetadata.map(async (member) => {
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
  member: TeamRunMetadataPayload['memberMetadata'][number];
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
  member: TeamRunMetadataPayload['memberMetadata'][number];
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
  member: TeamRunMetadataPayload['memberMetadata'][number];
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
  params.memberContext.state.currentStatus = params.isActive
    ? AgentStatus.Uninitialized
    : AgentStatus.ShutdownComplete;

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
  for (const member of params.metadata.memberMetadata) {
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
    state.currentStatus = params.isActive ? AgentStatus.Uninitialized : AgentStatus.ShutdownComplete;
    members.set(
      normalizedMemberRouteKey,
      new AgentContext(memberConfig, state),
    );
  }

  return { members, firstWorkspaceId };
};
