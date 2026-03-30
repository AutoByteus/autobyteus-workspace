import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type {
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import {
  loadTeamRunContextHydrationPayload,
} from '~/services/runHydration/teamRunContextHydrationService';

export interface OpenTeamRunWithCoordinatorInput {
  teamRunId: string;
  memberRouteKey?: string | null;
  ensureWorkspaceByRootPath: (rootPath: string) => Promise<string | null>;
  selectRun?: boolean;
}

export interface OpenTeamRunWithCoordinatorResult {
  teamRunId: string;
  focusedMemberRouteKey: string;
  resumeConfig: TeamRunResumeConfigPayload;
}

export const openTeamRun = async (
  input: OpenTeamRunWithCoordinatorInput,
): Promise<OpenTeamRunWithCoordinatorResult> => {
  const {
    resumeConfig,
    metadata,
    members,
    firstWorkspaceId,
    focusedMemberRouteKey,
  } = await loadTeamRunContextHydrationPayload(input);

  const focusedBinding = metadata.memberMetadata.find((member) => {
    const routeKey = member.memberRouteKey?.trim() || member.memberName.trim();
    return routeKey === focusedMemberRouteKey;
  });
  const shouldTreatAsLive = resumeConfig.isActive;

  const teamContextsStore = useAgentTeamContextsStore();
  const hydratedContext: AgentTeamContext = {
    teamRunId: metadata.teamRunId,
    config: {
      teamDefinitionId: metadata.teamDefinitionId,
      teamDefinitionName: metadata.teamDefinitionName,
      runtimeKind: focusedBinding?.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND,
      workspaceId: firstWorkspaceId,
      llmModelIdentifier: focusedBinding?.llmModelIdentifier || '',
      autoExecuteTools: focusedBinding?.autoExecuteTools ?? false,
      skillAccessMode: 'PRELOADED_ONLY' as const,
      memberOverrides: Object.fromEntries(
        metadata.memberMetadata.map((member) => [
          member.memberName,
          {
            agentDefinitionId: member.agentDefinitionId,
            llmModelIdentifier: member.llmModelIdentifier,
            autoExecuteTools: member.autoExecuteTools,
            llmConfig: member.llmConfig ?? null,
          },
        ]),
      ),
      isLocked: shouldTreatAsLive,
    },
    members,
    focusedMemberName: focusedMemberRouteKey,
    currentStatus: shouldTreatAsLive
      ? AgentTeamStatus.Uninitialized
      : AgentTeamStatus.ShutdownComplete,
    isSubscribed: false,
    taskPlan: null,
    taskStatuses: null,
  };

  const existingTeamContext = teamContextsStore.getTeamContextById(metadata.teamRunId);
  const shouldKeepLiveContext = shouldTreatAsLive && Boolean(existingTeamContext?.isSubscribed);

  if (existingTeamContext) {
    if (!shouldKeepLiveContext && existingTeamContext.unsubscribe) {
      existingTeamContext.unsubscribe();
    }

    existingTeamContext.config = hydratedContext.config;
    existingTeamContext.focusedMemberName = focusedMemberRouteKey;

    if (shouldKeepLiveContext) {
      const refreshedMembers = new Map();
      for (const [memberRouteKey, memberContext] of members.entries()) {
        const existingMemberContext = existingTeamContext.members.get(memberRouteKey);
        if (existingMemberContext) {
          existingMemberContext.config = memberContext.config;
          refreshedMembers.set(memberRouteKey, existingMemberContext);
        } else {
          refreshedMembers.set(memberRouteKey, memberContext);
        }
      }
      existingTeamContext.members = refreshedMembers;
    } else {
      existingTeamContext.members = members;
      existingTeamContext.currentStatus = hydratedContext.currentStatus;
      existingTeamContext.isSubscribed = false;
      existingTeamContext.unsubscribe = undefined;
      existingTeamContext.taskPlan = null;
      existingTeamContext.taskStatuses = null;
    }
  } else {
    teamContextsStore.addTeamContext(hydratedContext);
  }

  if (input.selectRun !== false) {
    useAgentSelectionStore().selectRun(metadata.teamRunId, 'team');
    useTeamRunConfigStore().clearConfig();
    useAgentRunConfigStore().clearConfig();
  }

  if (shouldTreatAsLive) {
    useAgentTeamRunStore().connectToTeamStream(metadata.teamRunId);
  } else {
    const hydratedTeam = teamContextsStore.getTeamContextById(metadata.teamRunId);
    if (hydratedTeam?.unsubscribe) {
      hydratedTeam.unsubscribe();
      hydratedTeam.isSubscribed = false;
    }
  }

  return {
    teamRunId: metadata.teamRunId,
    focusedMemberRouteKey,
    resumeConfig,
  };
};
