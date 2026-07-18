import { AgentContext } from '~/types/agent/AgentContext';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { TeamRunMetadataPayload, TeamMemberRunProjectionPayload } from '~/stores/runHistoryTypes';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { createWorkspaceMetadata } from '~/utils/workspaceMetadata';
import { buildConversationFromProjection } from '~/services/runHydration/runProjectionConversation';
import { hydrateActivitiesFromProjection } from '~/services/runHydration/runProjectionActivityHydration';
import {
  applyMemberOrHistoryStatusSnapshot,
  initializeRuntimeStatusState,
  preserveCanonicalAgentStatus,
} from '~/services/runStatus/agentRuntimeStatusState';
import { flattenTeamRunAgentMetadata } from '~/stores/runHistoryMetadata';

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
      updatedAt: params.metadata.createdAt,
      agentDefinitionId: params.member.agentDefinitionId,
      agentName: params.member.memberName,
      llmModelIdentifier: params.member.llmModelIdentifier,
    };

  conversation.id = `${params.teamRunId}::${params.normalizedMemberRouteKey}`;
  if (conversation.messages.length === 0) {
    conversation.createdAt = params.metadata.createdAt;
    conversation.updatedAt = params.projection?.lastActivityAt || params.metadata.createdAt;
  } else if (params.projection?.lastActivityAt) {
    conversation.updatedAt = params.projection.lastActivityAt;
  }

  return conversation;
};

const buildTeamMemberConfig = (params: {
  member: ReturnType<typeof flattenTeamRunAgentMetadata>[number];
  workspaceMetadata: WorkspaceMetadata | null;
  isActive: boolean;
}): AgentRunConfig => ({
  agentDefinitionId: params.member.agentDefinitionId,
  agentDefinitionName: params.member.memberName,
  llmModelIdentifier: params.member.llmModelIdentifier,
  runtimeKind: params.member.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND,
  workspaceId: params.workspaceMetadata?.workspaceId ?? null,
  workspaceMetadata: params.workspaceMetadata,
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
    workspaceMetadata:
      params.memberContext.config.workspaceMetadata ||
      (params.memberContext.config.workspaceId && params.member.workspaceRootPath
        ? createWorkspaceMetadata({
            workspaceId: params.memberContext.config.workspaceId,
            workspaceRootPath: params.member.workspaceRootPath,
          })
        : null),
    isActive: params.isActive,
  });
  params.memberContext.state.runId = memberRunId;
  params.memberContext.state.conversation = conversation;
  params.memberContext.state.resetEventMonitorPresentationRevision();
  applyMemberOrHistoryStatusSnapshot(
    params.memberContext,
    params.isActive
      ? preserveCanonicalAgentStatus(params.memberContext.state.currentStatus)
      : AgentStatus.Offline,
    { preserveLiveInterrupt: params.isActive },
  );

  if (params.projection) {
    hydrateActivitiesFromProjection(memberRunId, params.projection.activities || []);
  }
};

interface TeamMemberContextBuildResult {
  members: Map<string, AgentContext>;
  primaryWorkspaceMetadata: WorkspaceMetadata | null;
  memberWorkspaceMetadatasByRouteKey: Record<string, WorkspaceMetadata>;
}

const buildTeamMemberContextsFromReferences = (params: {
  teamRunId: string;
  metadata: TeamRunMetadataPayload;
  isActive: boolean;
  projectionByMemberRouteKey: Map<string, TeamMemberRunProjectionPayload | null>;
  toTeamMemberKey: (member: { memberRouteKey: string; memberName: string }) => string;
  memberWorkspaceMetadatasByRouteKey: Record<string, WorkspaceMetadata>;
}): TeamMemberContextBuildResult => {
  const members = new Map<string, AgentContext>();
  let primaryWorkspaceMetadata: WorkspaceMetadata | null = null;
  for (const member of flattenTeamRunAgentMetadata(params.metadata.memberTree)) {
    const normalizedMemberRouteKey = params.toTeamMemberKey(member).trim();
    if (!normalizedMemberRouteKey) {
      continue;
    }
    const workspaceMetadata =
      params.memberWorkspaceMetadatasByRouteKey[normalizedMemberRouteKey] ?? null;
    if (workspaceMetadata && !primaryWorkspaceMetadata) {
      primaryWorkspaceMetadata = workspaceMetadata;
    }
    const memberConfig = buildTeamMemberConfig({
      member,
      workspaceMetadata,
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

  return {
    members,
    primaryWorkspaceMetadata,
    memberWorkspaceMetadatasByRouteKey: params.memberWorkspaceMetadatasByRouteKey,
  };
};

export const buildLiveTeamMemberContexts = async (params: {
  teamRunId: string;
  metadata: TeamRunMetadataPayload;
  isActive: boolean;
  projectionByMemberRouteKey: Map<string, TeamMemberRunProjectionPayload | null>;
  toTeamMemberKey: (member: { memberRouteKey: string; memberName: string }) => string;
  activateWorkspaceByRootPath: (path: string) => Promise<string | null>;
  resolveWorkspaceMetadataByRootPath: (path: string) => Promise<WorkspaceMetadata | null>;
}): Promise<TeamMemberContextBuildResult> => {
  const memberWorkspaceMetadatasByRouteKey: Record<string, WorkspaceMetadata> = {};
  for (const member of flattenTeamRunAgentMetadata(params.metadata.memberTree)) {
    const normalizedMemberRouteKey = params.toTeamMemberKey(member).trim();
    if (!normalizedMemberRouteKey || !member.workspaceRootPath) {
      continue;
    }
    const activatedWorkspaceId = await params.activateWorkspaceByRootPath(member.workspaceRootPath);
    const resolvedReference = await params.resolveWorkspaceMetadataByRootPath(member.workspaceRootPath);
    const workspaceMetadata = resolvedReference || (activatedWorkspaceId
      ? createWorkspaceMetadata({
          workspaceId: activatedWorkspaceId,
          workspaceRootPath: member.workspaceRootPath,
        })
      : null);
    if (workspaceMetadata) {
      memberWorkspaceMetadatasByRouteKey[normalizedMemberRouteKey] = workspaceMetadata;
    }
  }
  return buildTeamMemberContextsFromReferences({
    ...params,
    memberWorkspaceMetadatasByRouteKey,
  });
};

export const buildHistoricalTeamMemberContextShells = async (params: {
  teamRunId: string;
  metadata: TeamRunMetadataPayload;
  projectionByMemberRouteKey: Map<string, TeamMemberRunProjectionPayload | null>;
  toTeamMemberKey: (member: { memberRouteKey: string; memberName: string }) => string;
  resolveWorkspaceMetadataByRootPath: (path: string) => Promise<WorkspaceMetadata | null>;
}): Promise<TeamMemberContextBuildResult> => {
  const memberWorkspaceMetadatasByRouteKey: Record<string, WorkspaceMetadata> = {};
  for (const member of flattenTeamRunAgentMetadata(params.metadata.memberTree)) {
    const normalizedMemberRouteKey = params.toTeamMemberKey(member).trim();
    if (!normalizedMemberRouteKey || !member.workspaceRootPath) {
      continue;
    }
    const workspaceMetadata = await params.resolveWorkspaceMetadataByRootPath(member.workspaceRootPath);
    if (workspaceMetadata) {
      memberWorkspaceMetadatasByRouteKey[normalizedMemberRouteKey] = workspaceMetadata;
    }
  }
  return buildTeamMemberContextsFromReferences({
    ...params,
    isActive: false,
    memberWorkspaceMetadatasByRouteKey,
  });
};
