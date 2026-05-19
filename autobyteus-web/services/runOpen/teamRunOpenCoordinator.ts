import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { AgentStatus } from '~/types/agent/AgentStatus';
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
  hydrateTeamMemberActivitiesFromProjection,
  loadTeamRunContextHydrationPayload,
} from '~/services/runHydration/teamRunContextHydrationService';
import { reconstructTeamRunConfigFromMetadata } from '~/utils/teamRunConfigUtils';
import { applyMemberOrHistoryStatusSnapshot } from '~/services/runStatus/agentRuntimeStatusState';
import { indexTeamMemberNodesByRouteKey } from '~/utils/teamDefinitionMembers';
import { teamMemberNodesFromMetadata } from '~/utils/teamMemberMetadataNodes';

const preserveCanonicalMemberStatus = (status: unknown): AgentStatus => {
  if (
    status === AgentStatus.Running ||
    status === AgentStatus.Initializing ||
    status === AgentStatus.Idle ||
    status === AgentStatus.Error ||
    status === AgentStatus.Offline
  ) {
    return status;
  }
  return AgentStatus.Offline;
};

export type TeamRunOpenSelectionMode = 'desktop' | 'mobile';

export interface OpenTeamRunWithCoordinatorInput {
  teamRunId: string;
  memberRouteKey?: string | null;
  ensureWorkspaceByRootPath: (rootPath: string) => Promise<string | null>;
  selectRun?: boolean;
  selectionMode?: TeamRunOpenSelectionMode;
}

export interface OpenTeamRunWithCoordinatorResult {
  teamRunId: string;
  focusedMemberRouteKey: string;
  resumeConfig: TeamRunResumeConfigPayload;
}

const mergeHydratedMembers = (
  existingMembers: Map<string, any>,
  hydratedMembers: Map<string, any>,
  options: { preserveLiveRuntimeState: boolean; preserveMemberStatus: boolean },
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
      applyMemberOrHistoryStatusSnapshot(
        existingMemberContext,
        options.preserveMemberStatus
          ? preserveCanonicalMemberStatus(existingMemberContext.state.currentStatus)
          : memberContext.state.currentStatus,
        { preserveLiveInterrupt: false },
      );
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
    projectionByMemberRouteKey,
  } = await loadTeamRunContextHydrationPayload(input);

  const shouldTreatAsLive = resumeConfig.isActive;
  const memberTree = teamMemberNodesFromMetadata(metadata.memberTree);

  const teamContextsStore = useAgentTeamContextsStore();
  const hydratedContext: AgentTeamContext = {
    teamRunId: metadata.teamRunId,
    config: reconstructTeamRunConfigFromMetadata({
      metadata,
      firstWorkspaceId,
      isLocked: shouldTreatAsLive,
    }),
    memberTree,
    memberNodesByRouteKey: indexTeamMemberNodesByRouteKey(memberTree),
    leafAgentContextsByRouteKey: members,
    coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
    historicalHydration,
    focusedMemberRouteKey,
    currentStatus: shouldTreatAsLive
      ? AgentTeamStatus.Running
      : AgentTeamStatus.Offline,
    isSubscribed: false,
    taskPlan: null,
    taskStatuses: null,
  };

  const existingTeamContext = teamContextsStore.getTeamContextById(metadata.teamRunId);
  const shouldKeepLiveContext = shouldTreatAsLive && Boolean(existingTeamContext?.isSubscribed);
  let liveProjectionActivityMemberKeys = Array.from(members.keys());

  if (existingTeamContext) {
    if (!shouldKeepLiveContext && existingTeamContext.unsubscribe) {
      existingTeamContext.unsubscribe();
    }

    existingTeamContext.config = hydratedContext.config;
    existingTeamContext.coordinatorMemberRouteKey = metadata.coordinatorMemberRouteKey;
    existingTeamContext.historicalHydration = historicalHydration;
    existingTeamContext.memberTree = memberTree;
    existingTeamContext.memberNodesByRouteKey = indexTeamMemberNodesByRouteKey(memberTree);
    existingTeamContext.focusedMemberRouteKey = focusedMemberRouteKey;

    if (shouldKeepLiveContext) {
      const existingMemberKeys = new Set(existingTeamContext.leafAgentContextsByRouteKey.keys());
      liveProjectionActivityMemberKeys = Array.from(members.keys()).filter(
        (memberRouteKey) => !existingMemberKeys.has(memberRouteKey),
      );
      existingTeamContext.leafAgentContextsByRouteKey = mergeHydratedMembers(existingTeamContext.leafAgentContextsByRouteKey, members, {
        preserveLiveRuntimeState: true,
        preserveMemberStatus: true,
      });
    } else {
      existingTeamContext.leafAgentContextsByRouteKey = mergeHydratedMembers(existingTeamContext.leafAgentContextsByRouteKey, members, {
        preserveLiveRuntimeState: false,
        preserveMemberStatus: shouldTreatAsLive,
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

  if (shouldTreatAsLive && liveProjectionActivityMemberKeys.length > 0) {
    const teamContext = teamContextsStore.getTeamContextById(metadata.teamRunId) || hydratedContext;
    hydrateTeamMemberActivitiesFromProjection({
      members: teamContext.leafAgentContextsByRouteKey,
      projectionByMemberRouteKey,
      memberRouteKeys: liveProjectionActivityMemberKeys,
    });
  }

  if (input.selectRun !== false) {
    const selectionStore = useAgentSelectionStore();
    if (input.selectionMode === 'mobile') {
      selectionStore.selectRunWithoutShellNavigation(metadata.teamRunId, 'team');
    } else {
      selectionStore.selectRun(metadata.teamRunId, 'team');
    }
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
