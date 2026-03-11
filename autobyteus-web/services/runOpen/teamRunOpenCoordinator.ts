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
import { useActiveRuntimeSyncStore } from '~/stores/activeRuntimeSyncStore';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import {
  applyLiveTeamStatusSnapshot,
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

export const openTeamRunWithCoordinator = async (
  input: OpenTeamRunWithCoordinatorInput,
): Promise<OpenTeamRunWithCoordinatorResult> => {
  const {
    resumeConfig,
    manifest,
    members,
    firstWorkspaceId,
    focusedMemberRouteKey,
  } = await loadTeamRunContextHydrationPayload(input);

  const focusedBinding = manifest.memberBindings.find((member) => {
    const routeKey = member.memberRouteKey?.trim() || member.memberName.trim();
    return routeKey === focusedMemberRouteKey;
  });
  const activeRuntimeSyncStore = useActiveRuntimeSyncStore();
  const activeTeamSnapshot = resumeConfig.isActive
    ? await activeRuntimeSyncStore.ensureActiveTeamRunSnapshot(manifest.teamRunId)
    : null;

  const teamContextsStore = useAgentTeamContextsStore();
  const hydratedContext: AgentTeamContext = {
    teamRunId: manifest.teamRunId,
    config: {
      teamDefinitionId: manifest.teamDefinitionId,
      teamDefinitionName: manifest.teamDefinitionName,
      runtimeKind: focusedBinding?.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND,
      workspaceId: firstWorkspaceId,
      llmModelIdentifier: focusedBinding?.llmModelIdentifier || '',
      autoExecuteTools: focusedBinding?.autoExecuteTools ?? false,
      memberOverrides: Object.fromEntries(
        manifest.memberBindings.map((member) => [
          member.memberName,
          {
            agentDefinitionId: member.agentDefinitionId,
            llmModelIdentifier: member.llmModelIdentifier,
            autoExecuteTools: member.autoExecuteTools,
            llmConfig: member.llmConfig ?? null,
          },
        ]),
      ),
      isLocked: resumeConfig.isActive,
    },
    members,
    focusedMemberName: focusedMemberRouteKey,
    currentStatus:
      resumeConfig.isActive && !activeTeamSnapshot ? AgentTeamStatus.Uninitialized : AgentTeamStatus.Idle,
    isSubscribed: false,
    taskPlan: null,
    taskStatuses: null,
  };
  if (activeTeamSnapshot) {
    applyLiveTeamStatusSnapshot(hydratedContext, {
      currentStatus: activeTeamSnapshot.currentStatus,
      memberStatuses: activeTeamSnapshot.members || [],
    });
  }

  const existingTeamContext = teamContextsStore.getTeamContextById(manifest.teamRunId);
  const shouldKeepLiveContext = resumeConfig.isActive && Boolean(existingTeamContext?.isSubscribed);

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
      if (activeTeamSnapshot) {
        applyLiveTeamStatusSnapshot(existingTeamContext, {
          currentStatus: activeTeamSnapshot.currentStatus,
          memberStatuses: activeTeamSnapshot.members || [],
        });
      }
    }
  } else {
    teamContextsStore.addTeamContext(hydratedContext);
  }

  if (input.selectRun !== false) {
    useAgentSelectionStore().selectRun(manifest.teamRunId, 'team');
    useTeamRunConfigStore().clearConfig();
    useAgentRunConfigStore().clearConfig();
  }

  if (resumeConfig.isActive) {
    useAgentTeamRunStore().connectToTeamStream(manifest.teamRunId);
  } else {
    const hydratedTeam = teamContextsStore.getTeamContextById(manifest.teamRunId);
    if (hydratedTeam?.unsubscribe) {
      hydratedTeam.unsubscribe();
      hydratedTeam.isSubscribed = false;
    }
  }

  return {
    teamRunId: manifest.teamRunId,
    focusedMemberRouteKey,
    resumeConfig,
  };
};
