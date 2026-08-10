import type { TeamRunResumeConfigPayload } from '~/stores/runHistoryTypes';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import {
  hydrateLiveTeamRunContext,
  hydrateTeamMemberActivitiesFromProjection,
} from '~/services/runHydration/teamRunContextHydrationService';
import {
  applyMemberOrHistoryStatusSnapshot,
  preserveCanonicalAgentStatus,
} from '~/services/runStatus/agentRuntimeStatusState';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import {
  createTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import { findTeamExecutionNode } from '~/services/agentStreaming/teamTaskExecutionTree';

export type TeamRunOpenSelectionMode = 'desktop' | 'mobile';

export interface OpenTeamRunWithCoordinatorInput {
  teamRunId: string;
  memberAddress?: string | null;
  executionAddress?: TeamExecutionAddress | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
  selectRun?: boolean;
  selectionMode?: TeamRunOpenSelectionMode;
}

export interface OpenTeamRunWithCoordinatorResult {
  teamRunId: string;
  focusedExecutionAddress: TeamExecutionAddress;
  resumeConfig: TeamRunResumeConfigPayload;
}

const mergeHydratedExecutions = (
  current: Map<string, any>,
  hydrated: Map<string, any>,
  preserveLiveRuntimeState: boolean,
): Map<string, any> => {
  const next = new Map(current);
  hydrated.forEach((hydratedContext, executionKey) => {
    const currentContext = current.get(executionKey);
    if (!currentContext) {
      next.set(executionKey, hydratedContext);
      return;
    }
    currentContext.config = hydratedContext.config;
    if (!preserveLiveRuntimeState) {
      currentContext.state.runId = hydratedContext.state.runId;
      currentContext.state.conversation = hydratedContext.state.conversation;
      currentContext.state.hasEarlierActiveTraceEvents = hydratedContext.state.hasEarlierActiveTraceEvents;
      currentContext.state.resetEventMonitorPresentationRevision();
      applyMemberOrHistoryStatusSnapshot(
        currentContext,
        hydratedContext.state.currentStatus,
        { preserveCurrentStatus: false },
      );
    } else {
      applyMemberOrHistoryStatusSnapshot(
        currentContext,
        preserveCanonicalAgentStatus(currentContext.state.currentStatus),
        { preserveCurrentStatus: false },
      );
    }
    next.set(executionKey, currentContext);
  });
  return next;
};

const requestedFocus = (input: OpenTeamRunWithCoordinatorInput, existing?: AgentTeamContext): TeamExecutionAddress | null => {
  if (input.executionAddress?.rootTeamRunId === input.teamRunId) return createTeamExecutionAddress(input.executionAddress);
  if (input.memberAddress) return createTeamExecutionAddress({ rootTeamRunId: input.teamRunId, memberAddress: input.memberAddress });
  return existing?.focusedExecutionAddress ?? null;
};

export const openTeamRun = async (
  input: OpenTeamRunWithCoordinatorInput,
): Promise<OpenTeamRunWithCoordinatorResult> => {
  const teamContextsStore = useAgentTeamContextsStore();
  const existing = teamContextsStore.getTeamContextById(input.teamRunId);
  const preferredFocus = requestedFocus(input, existing);
  const hydration = await hydrateLiveTeamRunContext({
    ...input,
    memberAddress: preferredFocus?.memberAddress ?? input.memberAddress,
  });
  const hydrated = hydration.hydratedContext;
  const preserveLiveRuntime = hydrated.isActive && existing?.isSubscribed === true;
  let current = hydrated;

  if (existing) {
    if (!preserveLiveRuntime) existing.unsubscribe?.();
    existing.config = hydrated.config;
    existing.historicalHydration = hydrated.historicalHydration;
    existing.isActive = hydrated.isActive;
    existing.agentExecutionsByKey = mergeHydratedExecutions(
      preserveLiveRuntime ? existing.agentExecutionsByKey : new Map(),
      hydrated.agentExecutionsByKey,
      preserveLiveRuntime,
    );
    if (!preserveLiveRuntime) {
      existing.rootTeam = hydrated.rootTeam;
      existing.memberNodesByAddress = hydrated.memberNodesByAddress;
      existing.isSubscribed = false;
      existing.unsubscribe = undefined;
    }
    const requested = preferredFocus;
    existing.focusedExecutionAddress = requested && (
      Boolean(findTeamExecutionNode(existing, requested)) ||
      existing.agentExecutionsByKey.has(JSON.stringify(requested))
    ) ? requested : hydration.focusedExecutionAddress;
    current = existing;
  } else {
    teamContextsStore.addTeamContext(hydrated);
  }

  if (hydrated.isActive) {
    hydrateTeamMemberActivitiesFromProjection({
      members: current.agentExecutionsByKey,
      projectionByMemberAddress: hydration.projectionByMemberAddress,
    });
  }

  if (input.selectRun !== false) {
    const selection = useAgentSelectionStore();
    input.selectionMode === 'mobile'
      ? selection.selectRunWithoutShellNavigation(input.teamRunId, 'team')
      : selection.selectRun(input.teamRunId, 'team');
    useTeamRunConfigStore().clearConfig();
    useAgentRunConfigStore().clearConfig();
  }
  if (hydrated.isActive) {
    useAgentTeamRunStore().connectToTeamStream(input.teamRunId);
  } else {
    current.unsubscribe?.();
    current.isSubscribed = false;
  }
  return {
    teamRunId: input.teamRunId,
    focusedExecutionAddress: current.focusedExecutionAddress,
    resumeConfig: hydration.resumeConfig,
  };
};
