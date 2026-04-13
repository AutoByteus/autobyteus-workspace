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
import { reconstructTeamRunConfigFromMetadata } from '~/utils/teamRunConfigUtils';

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

const mergeHydratedMembers = (
  existingMembers: Map<string, any>,
  hydratedMembers: Map<string, any>,
  options: { preserveLiveRuntimeState: boolean },
): Map<string, any> => {
  const refreshedMembers = new Map<string, any>();

  for (const [memberRouteKey, memberContext] of hydratedMembers.entries()) {
    const existingMemberContext = existingMembers.get(memberRouteKey);
    if (!existingMemberContext) {
      refreshedMembers.set(memberRouteKey, memberContext);
      continue;
    }

    existingMemberContext.config = memberContext.config;

    if (!options.preserveLiveRuntimeState) {
      existingMemberContext.state.runId = memberContext.state.runId;
      existingMemberContext.state.conversation = memberContext.state.conversation;
      existingMemberContext.state.currentStatus = memberContext.state.currentStatus;
    }

    refreshedMembers.set(memberRouteKey, existingMemberContext);
  }

  return refreshedMembers;
};

export const openTeamRun = async (
  input: OpenTeamRunWithCoordinatorInput,
): Promise<OpenTeamRunWithCoordinatorResult> => {
  const {
    resumeConfig,
    metadata,
    members,
    firstWorkspaceId,
    focusedMemberRouteKey,
    historicalHydration,
  } = await loadTeamRunContextHydrationPayload(input);

  const shouldTreatAsLive = resumeConfig.isActive;

  const teamContextsStore = useAgentTeamContextsStore();
  const hydratedContext: AgentTeamContext = {
    teamRunId: metadata.teamRunId,
    config: reconstructTeamRunConfigFromMetadata({
      metadata,
      firstWorkspaceId,
      isLocked: shouldTreatAsLive,
    }),
    members,
    coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
    historicalHydration,
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
    existingTeamContext.coordinatorMemberRouteKey = metadata.coordinatorMemberRouteKey;
    existingTeamContext.historicalHydration = historicalHydration;
    existingTeamContext.focusedMemberName = focusedMemberRouteKey;

    if (shouldKeepLiveContext) {
      existingTeamContext.members = mergeHydratedMembers(existingTeamContext.members, members, {
        preserveLiveRuntimeState: true,
      });
    } else {
      existingTeamContext.members = mergeHydratedMembers(existingTeamContext.members, members, {
        preserveLiveRuntimeState: false,
      });
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
