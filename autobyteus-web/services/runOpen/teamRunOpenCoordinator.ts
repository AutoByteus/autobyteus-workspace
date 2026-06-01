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
import type { AgentTeamContext, AgentTeamMemberNode } from '~/types/agent/AgentTeamContext';
import {
  hydrateTeamMemberActivitiesFromProjection,
  loadTeamRunContextHydrationPayload,
} from '~/services/runHydration/teamRunContextHydrationService';
import { reconstructTeamRunConfigFromMetadata } from '~/utils/teamRunConfigUtils';
import { applyMemberOrHistoryStatusSnapshot } from '~/services/runStatus/agentRuntimeStatusState';
import { indexTeamMemberNodesByRouteKey } from '~/utils/teamDefinitionMembers';
import { teamMemberNodesFromMetadata } from '~/utils/teamMemberMetadataNodes';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { resolveActiveExecutionFocusedMemberRouteKey } from '~/utils/teamActiveExecutionMembers';
import {
  getTaskAgentIdentityFromContext,
  restoreTaskAgentContextProjections,
} from '~/services/agentStreaming/teamTaskAgentContextProjection';

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
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
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

const getLeafAgentContextsByRouteKey = (teamContext: any): Map<string, any> => {
  if (teamContext?.leafAgentContextsByRouteKey instanceof Map) {
    return teamContext.leafAgentContextsByRouteKey;
  }
  return teamContext?.members instanceof Map ? teamContext.members : new Map();
};

const getTaskAgentNodesByRouteKey = (teamContext: AgentTeamContext | null | undefined): AgentTeamMemberNode[] => {
  if (!(teamContext?.memberNodesByRouteKey instanceof Map)) {
    return [];
  }

  return Array.from(teamContext.memberNodesByRouteKey.values()).filter(
    (node): node is AgentTeamMemberNode => node.memberKind === 'agent' && Boolean(node.isTaskAgentInstance),
  );
};

const getTaskAgentContextsByRouteKey = (
  teamContext: AgentTeamContext | null | undefined,
  taskAgentNodes: readonly AgentTeamMemberNode[],
): Map<string, any> => {
  const contexts = getLeafAgentContextsByRouteKey(teamContext);
  const taskAgentNodeKeys = new Set(taskAgentNodes.map((node) => node.memberRouteKey));
  return new Map(
    Array.from(contexts.entries()).filter(([memberRouteKey, context]) => (
      taskAgentNodeKeys.has(memberRouteKey) ||
      getTaskAgentIdentityFromContext(context)?.taskAgentRunId === memberRouteKey
    )),
  );
};

export const openTeamRun = async (
  input: OpenTeamRunWithCoordinatorInput,
): Promise<OpenTeamRunWithCoordinatorResult> => {
  const teamContextsStore = useAgentTeamContextsStore();
  const preExistingTeamContext = teamContextsStore.getTeamContextById(input.teamRunId);
  const requestedMemberRouteKey = preExistingTeamContext?.isSubscribed
    ? resolveActiveExecutionFocusedMemberRouteKey(preExistingTeamContext, input.memberRouteKey)
      || input.memberRouteKey
    : input.memberRouteKey;
  const {
    resumeConfig,
    metadata,
    members,
    primaryWorkspaceMetadata,
    focusedMemberRouteKey,
    historicalHydration,
    projectionByMemberRouteKey,
  } = await loadTeamRunContextHydrationPayload({
    ...input,
    memberRouteKey: requestedMemberRouteKey,
  });

  const shouldTreatAsLive = resumeConfig.isActive;
  const memberTree = teamMemberNodesFromMetadata(metadata.memberTree);

  const hydratedContext: AgentTeamContext = {
    teamRunId: metadata.teamRunId,
    config: reconstructTeamRunConfigFromMetadata({
      metadata,
      primaryWorkspaceMetadata,
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
  (hydratedContext as any).members = members;
  const resolvedFocusedMemberRouteKey = shouldTreatAsLive
    ? resolveActiveExecutionFocusedMemberRouteKey(hydratedContext, focusedMemberRouteKey)
      || focusedMemberRouteKey
    : focusedMemberRouteKey;
  hydratedContext.focusedMemberRouteKey = resolvedFocusedMemberRouteKey;
  (hydratedContext as any).focusedMemberName = resolvedFocusedMemberRouteKey;

  const existingTeamContext = teamContextsStore.getTeamContextById(metadata.teamRunId);
  const shouldKeepLiveContext = shouldTreatAsLive && Boolean(existingTeamContext?.isSubscribed);
  const liveTaskAgentNodesToRestore = shouldKeepLiveContext
    ? getTaskAgentNodesByRouteKey(existingTeamContext)
    : [];
  const liveTaskAgentContextsToRestore = shouldKeepLiveContext
    ? getTaskAgentContextsByRouteKey(existingTeamContext, liveTaskAgentNodesToRestore)
    : new Map<string, any>();
  let finalFocusedMemberRouteKey = resolvedFocusedMemberRouteKey;
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
    existingTeamContext.focusedMemberRouteKey = resolvedFocusedMemberRouteKey;
    (existingTeamContext as any).focusedMemberName = resolvedFocusedMemberRouteKey;
    const existingLeafAgentContextsByRouteKey = getLeafAgentContextsByRouteKey(existingTeamContext);

    if (shouldKeepLiveContext) {
      const existingMemberKeys = new Set(existingLeafAgentContextsByRouteKey.keys());
      liveProjectionActivityMemberKeys = Array.from(members.keys()).filter(
        (memberRouteKey) => !existingMemberKeys.has(memberRouteKey),
      );
      existingTeamContext.leafAgentContextsByRouteKey = mergeHydratedMembers(existingLeafAgentContextsByRouteKey, members, {
        preserveLiveRuntimeState: true,
        preserveMemberStatus: true,
      });
      if (liveTaskAgentContextsToRestore.size > 0) {
        existingTeamContext.leafAgentContextsByRouteKey = new Map([
          ...existingTeamContext.leafAgentContextsByRouteKey,
          ...liveTaskAgentContextsToRestore,
        ]);
      }
    } else {
      existingTeamContext.leafAgentContextsByRouteKey = mergeHydratedMembers(existingLeafAgentContextsByRouteKey, members, {
        preserveLiveRuntimeState: false,
        preserveMemberStatus: shouldTreatAsLive,
      });
      existingTeamContext.currentStatus = hydratedContext.currentStatus;
      existingTeamContext.isSubscribed = false;
      existingTeamContext.unsubscribe = undefined;
      existingTeamContext.taskPlan = null;
      existingTeamContext.taskStatuses = null;
    }
    (existingTeamContext as any).members = existingTeamContext.leafAgentContextsByRouteKey;

    if (liveTaskAgentNodesToRestore.length > 0 || liveTaskAgentContextsToRestore.size > 0) {
      restoreTaskAgentContextProjections(existingTeamContext, liveTaskAgentNodesToRestore);
      if (shouldTreatAsLive) {
        const restoredFocus = resolveActiveExecutionFocusedMemberRouteKey(
          existingTeamContext,
          input.memberRouteKey ?? existingTeamContext.focusedMemberRouteKey,
        ) || existingTeamContext.focusedMemberRouteKey;
        existingTeamContext.focusedMemberRouteKey = restoredFocus;
        (existingTeamContext as any).focusedMemberName = restoredFocus;
        finalFocusedMemberRouteKey = restoredFocus;
      }
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
    focusedMemberRouteKey: finalFocusedMemberRouteKey,
    resumeConfig,
  };
};
