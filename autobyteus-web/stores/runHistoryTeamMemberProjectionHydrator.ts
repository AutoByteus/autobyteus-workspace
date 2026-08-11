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
import { createTeamExecutionAddress, memberAddressBasename, serializeTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { resetRecentEventMonitorBaseline } from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';

export const fetchTeamMemberProjections = async (params: {
  client: any;
  getTeamMemberRunProjectionQuery: any;
  teamRunId: string;
  metadata: TeamRunMetadataPayload;
  toTeamMemberKey: (member: { address: string }) => string;
}): Promise<Map<string, TeamMemberRunProjectionPayload | null>> => {
  const projectionByMemberAddress = new Map<string, TeamMemberRunProjectionPayload | null>();
  await Promise.all(
    flattenTeamRunAgentMetadata(params.metadata.rootTeam.children).map(async (member) => {
      const normalizedMemberAddress = params.toTeamMemberKey(member).trim();
      if (!normalizedMemberAddress) {
        return;
      }

      try {
        const projectionResponse = await params.client.query({
          query: params.getTeamMemberRunProjectionQuery,
          variables: {
            teamRunId: params.teamRunId,
            memberAddress: normalizedMemberAddress,
          },
          fetchPolicy: 'network-only',
        });

        if (projectionResponse.errors && projectionResponse.errors.length > 0) {
          throw new Error(
            projectionResponse.errors.map((e: { message: string }) => e.message).join(', '),
          );
        }

        projectionByMemberAddress.set(
          normalizedMemberAddress,
          projectionResponse.data?.getTeamMemberRunProjection || null,
        );
      } catch (projectionError) {
        console.warn(
          `[runHistoryStore] Failed to fetch team-member projection for '${member.address}'`,
          projectionError,
        );
        projectionByMemberAddress.set(normalizedMemberAddress, null);
      }
    }),
  );
  return projectionByMemberAddress;
};

export const fetchTeamMemberProjection = async (params: {
  client: any;
  getTeamMemberRunProjectionQuery: any;
  teamRunId: string;
  memberAddress: string;
}): Promise<TeamMemberRunProjectionPayload | null> => {
  const normalizedMemberAddress = params.memberAddress.trim();
  if (!normalizedMemberAddress) {
    return null;
  }

  try {
    const projectionResponse = await params.client.query({
      query: params.getTeamMemberRunProjectionQuery,
      variables: {
        teamRunId: params.teamRunId,
        memberAddress: normalizedMemberAddress,
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
      `[runHistoryStore] Failed to fetch team-member projection for '${normalizedMemberAddress}'`,
      projectionError,
    );
    return null;
  }
};

const buildTeamMemberConversation = (params: {
  teamRunId: string;
  metadata: Pick<TeamRunMetadataPayload, 'createdAt'>;
  member: ReturnType<typeof flattenTeamRunAgentMetadata>[number];
  normalizedMemberAddress: string;
  projection: TeamMemberRunProjectionPayload | null;
}): AgentContext['state']['conversation'] => {
  const agentRunId = params.member.agentRunId || params.normalizedMemberAddress;
  const conversation = params.projection
    ? buildConversationFromProjection(
      agentRunId,
      params.projection.conversation || [],
      {
        agentDefinitionId: params.member.agentDefinitionId,
        agentName: memberAddressBasename(params.member.address),
        llmModelIdentifier: params.member.llmModelIdentifier,
      },
    )
    : {
      id: `${params.teamRunId}::${params.normalizedMemberAddress}`,
      messages: [],
      createdAt: params.metadata.createdAt,
      updatedAt: params.metadata.createdAt,
      agentDefinitionId: params.member.agentDefinitionId,
      agentName: memberAddressBasename(params.member.address),
      llmModelIdentifier: params.member.llmModelIdentifier,
    };

  conversation.id = `${params.teamRunId}::${params.normalizedMemberAddress}`;
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
  agentDefinitionName: memberAddressBasename(params.member.address),
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
  metadata: Pick<TeamRunMetadataPayload, 'createdAt'>;
  member: ReturnType<typeof flattenTeamRunAgentMetadata>[number];
  projection: TeamMemberRunProjectionPayload | null;
  memberContext: AgentContext;
  isActive: boolean;
}): void => {
  const normalizedMemberAddress = params.member.address.trim();
  if (!normalizedMemberAddress) {
    return;
  }

  resetRecentEventMonitorBaseline(params.memberContext);
  const agentRunId = params.member.agentRunId || normalizedMemberAddress;
  const conversation = buildTeamMemberConversation({
    teamRunId: params.teamRunId,
    metadata: params.metadata,
    member: params.member,
    normalizedMemberAddress,
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
  params.memberContext.state.runId = agentRunId;
  params.memberContext.state.conversation = conversation;
  params.memberContext.state.resetEventMonitorPresentationRevision();
  params.memberContext.state.hasEarlierActiveTraceEvents = params.projection?.hasEarlierActiveTraceEvents === true;
  applyMemberOrHistoryStatusSnapshot(
    params.memberContext,
    params.isActive
      ? preserveCanonicalAgentStatus(params.memberContext.state.currentStatus)
      : AgentStatus.Offline,
    { preserveCurrentStatus: params.isActive },
  );

  if (params.projection) {
    hydrateActivitiesFromProjection(agentRunId, params.projection.activities || []);
  }
};

interface TeamMemberContextBuildResult {
  members: Map<string, AgentContext>;
  primaryWorkspaceMetadata: WorkspaceMetadata | null;
  memberWorkspaceMetadatasByAddress: Record<string, WorkspaceMetadata>;
}

const buildTeamMemberContextsFromReferences = (params: {
  teamRunId: string;
  metadata: TeamRunMetadataPayload;
  isActive: boolean;
  projectionByMemberAddress: Map<string, TeamMemberRunProjectionPayload | null>;
  toTeamMemberKey: (member: { address: string }) => string;
  memberWorkspaceMetadatasByAddress: Record<string, WorkspaceMetadata>;
}): TeamMemberContextBuildResult => {
  const members = new Map<string, AgentContext>();
  let primaryWorkspaceMetadata: WorkspaceMetadata | null = null;
  for (const member of flattenTeamRunAgentMetadata(params.metadata.rootTeam.children)) {
    const normalizedMemberAddress = params.toTeamMemberKey(member).trim();
    if (!normalizedMemberAddress) {
      continue;
    }
    const workspaceMetadata =
      params.memberWorkspaceMetadatasByAddress[normalizedMemberAddress] ?? null;
    if (workspaceMetadata && !primaryWorkspaceMetadata) {
      primaryWorkspaceMetadata = workspaceMetadata;
    }
    const memberConfig = buildTeamMemberConfig({
      member,
      workspaceMetadata,
      isActive: params.isActive,
    });
    const agentRunId = member.agentRunId || normalizedMemberAddress;
    const projection = params.projectionByMemberAddress.get(params.toTeamMemberKey(member)) || null;
    const conversation = buildTeamMemberConversation({
      teamRunId: params.teamRunId,
      metadata: params.metadata,
      member,
      normalizedMemberAddress,
      projection,
    });

    const state = new AgentRunState(agentRunId, conversation);
    state.hasEarlierActiveTraceEvents = projection?.hasEarlierActiveTraceEvents === true;
    initializeRuntimeStatusState(state, AgentStatus.Offline);
    members.set(
      serializeTeamExecutionAddress(createTeamExecutionAddress({ rootTeamRunId: params.teamRunId, memberAddress: normalizedMemberAddress })),
      new AgentContext(memberConfig, state),
    );
  }

  return {
    members,
    primaryWorkspaceMetadata,
    memberWorkspaceMetadatasByAddress: params.memberWorkspaceMetadatasByAddress,
  };
};

export const buildLiveTeamMemberContexts = async (params: {
  teamRunId: string;
  metadata: TeamRunMetadataPayload;
  isActive: boolean;
  projectionByMemberAddress: Map<string, TeamMemberRunProjectionPayload | null>;
  toTeamMemberKey: (member: { address: string }) => string;
  activateWorkspaceByRootPath: (path: string) => Promise<string | null>;
  resolveWorkspaceMetadataByRootPath: (path: string) => Promise<WorkspaceMetadata | null>;
}): Promise<TeamMemberContextBuildResult> => {
  const memberWorkspaceMetadatasByAddress: Record<string, WorkspaceMetadata> = {};
  for (const member of flattenTeamRunAgentMetadata(params.metadata.rootTeam.children)) {
    const normalizedMemberAddress = params.toTeamMemberKey(member).trim();
    if (!normalizedMemberAddress || !member.workspaceRootPath) {
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
      memberWorkspaceMetadatasByAddress[normalizedMemberAddress] = workspaceMetadata;
    }
  }
  return buildTeamMemberContextsFromReferences({
    ...params,
    memberWorkspaceMetadatasByAddress,
  });
};

export const buildHistoricalTeamMemberContextShells = async (params: {
  teamRunId: string;
  metadata: TeamRunMetadataPayload;
  projectionByMemberAddress: Map<string, TeamMemberRunProjectionPayload | null>;
  toTeamMemberKey: (member: { address: string }) => string;
  resolveWorkspaceMetadataByRootPath: (path: string) => Promise<WorkspaceMetadata | null>;
}): Promise<TeamMemberContextBuildResult> => {
  const memberWorkspaceMetadatasByAddress: Record<string, WorkspaceMetadata> = {};
  for (const member of flattenTeamRunAgentMetadata(params.metadata.rootTeam.children)) {
    const normalizedMemberAddress = params.toTeamMemberKey(member).trim();
    if (!normalizedMemberAddress || !member.workspaceRootPath) {
      continue;
    }
    const workspaceMetadata = await params.resolveWorkspaceMetadataByRootPath(member.workspaceRootPath);
    if (workspaceMetadata) {
      memberWorkspaceMetadatasByAddress[normalizedMemberAddress] = workspaceMetadata;
    }
  }
  return buildTeamMemberContextsFromReferences({
    ...params,
    isActive: false,
    memberWorkspaceMetadatasByAddress,
  });
};
