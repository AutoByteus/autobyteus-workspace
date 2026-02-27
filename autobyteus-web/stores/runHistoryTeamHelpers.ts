import { AgentContext } from '~/types/agent/AgentContext';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamTreeNode, TeamRunHistoryItem, TeamRunManifestPayload, TeamMemberRunProjectionPayload } from '~/stores/runHistoryTypes';
import { buildConversationFromProjection } from '~/services/runOpen/runOpenCoordinator';

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

export const summarizeTeamDraft = (teamContext: AgentTeamContext, draftSummaryPrefix: string): string => {
  const focusedContext = teamContext.members.get(teamContext.focusedMemberName) ?? null;
  const candidateContexts = focusedContext
    ? [focusedContext, ...Array.from(teamContext.members.values()).filter((member) => member !== focusedContext)]
    : Array.from(teamContext.members.values());

  for (const member of candidateContexts) {
    const firstUserMessage = member.state.conversation.messages.find(
      (message) => message.type === 'user' && message.text?.trim().length > 0,
    );
    if (firstUserMessage?.type === 'user') {
      return firstUserMessage.text.trim();
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
    const focusedMemberName = sortedMembers[0]?.memberRouteKey || '';

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
    const workspaceRootPath = params.resolveWorkspaceRootPathFromContext(teamContext);
    const { isActive, lastKnownStatus } = params.toTeamRunStatus(teamContext.currentStatus);
    const summary = params.summarizeTeamDraft(teamContext);
    const lastActivityAt = params.resolveTeamLastActivityAt(teamContext);
    const members = Array.from(teamContext.members.entries())
      .map(([memberRouteKey, memberContext]) => ({
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
        lastKnownStatus,
        isActive,
        deleteLifecycle: 'READY' as const,
      }))
      .sort((a, b) => a.memberName.localeCompare(b.memberName));
    const existing = nodesByTeamRunId.get(teamContext.teamRunId);
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

  const allNodes = Array.from(nodesByTeamRunId.values())
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
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
  manifest: TeamRunManifestPayload;
  toTeamMemberKey: (member: { memberRouteKey: string; memberName: string }) => string;
}): Promise<Map<string, TeamMemberRunProjectionPayload | null>> => {
  const projectionByMemberRouteKey = new Map<string, TeamMemberRunProjectionPayload | null>();
  await Promise.all(
    params.manifest.memberBindings.map(async (binding) => {
      const normalizedMemberRouteKey = params.toTeamMemberKey(binding).trim();
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
          `[runHistoryStore] Failed to fetch team-member projection for '${binding.memberRouteKey}'`,
          projectionError,
        );
        projectionByMemberRouteKey.set(normalizedMemberRouteKey, null);
      }
    }),
  );
  return projectionByMemberRouteKey;
};

export const buildTeamMemberContexts = async (params: {
  teamRunId: string;
  manifest: TeamRunManifestPayload;
  isActive: boolean;
  projectionByMemberRouteKey: Map<string, TeamMemberRunProjectionPayload | null>;
  toTeamMemberKey: (member: { memberRouteKey: string; memberName: string }) => string;
  ensureWorkspaceByRootPath: (path: string) => Promise<string | null>;
}): Promise<{ members: Map<string, AgentContext>; firstWorkspaceId: string | null }> => {
  const members = new Map<string, AgentContext>();
  let firstWorkspaceId: string | null = null;
  for (const binding of params.manifest.memberBindings) {
    const normalizedMemberRouteKey = params.toTeamMemberKey(binding).trim();
    if (!normalizedMemberRouteKey) {
      continue;
    }
    let workspaceId: string | null = null;
    if (binding.workspaceRootPath) {
      workspaceId = await params.ensureWorkspaceByRootPath(binding.workspaceRootPath);
      if (workspaceId && !firstWorkspaceId) {
        firstWorkspaceId = workspaceId;
      }
    }
    const memberConfig: AgentRunConfig = {
      agentDefinitionId: binding.agentDefinitionId,
      agentDefinitionName: binding.memberName,
      llmModelIdentifier: binding.llmModelIdentifier,
      runtimeKind: binding.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND,
      workspaceId,
      autoExecuteTools: binding.autoExecuteTools,
      skillAccessMode: 'PRELOADED_ONLY',
      llmConfig: binding.llmConfig ?? null,
      isLocked: params.isActive,
    };
    const memberRunId = binding.memberRunId || normalizedMemberRouteKey;
    const projection = params.projectionByMemberRouteKey.get(params.toTeamMemberKey(binding)) || null;
    const conversation = projection
      ? buildConversationFromProjection(
        memberRunId,
        projection.conversation || [],
        {
          agentDefinitionId: binding.agentDefinitionId,
          agentName: binding.memberName,
          llmModelIdentifier: binding.llmModelIdentifier,
        },
      )
      : {
        id: `${params.teamRunId}::${normalizedMemberRouteKey}`,
        messages: [],
        createdAt: params.manifest.createdAt,
        updatedAt: params.manifest.updatedAt,
        agentDefinitionId: binding.agentDefinitionId,
        agentName: binding.memberName,
        llmModelIdentifier: binding.llmModelIdentifier,
      };

    conversation.id = `${params.teamRunId}::${normalizedMemberRouteKey}`;
    if (conversation.messages.length === 0) {
      conversation.createdAt = params.manifest.createdAt;
      conversation.updatedAt = projection?.lastActivityAt || params.manifest.updatedAt;
    } else if (projection?.lastActivityAt) {
      conversation.updatedAt = projection.lastActivityAt;
    }

    const state = new AgentRunState(memberRunId, conversation);
    state.currentStatus = params.isActive ? AgentStatus.Uninitialized : AgentStatus.ShutdownComplete;
    members.set(
      normalizedMemberRouteKey,
      new AgentContext(memberConfig, state),
    );
  }

  return { members, firstWorkspaceId };
};
