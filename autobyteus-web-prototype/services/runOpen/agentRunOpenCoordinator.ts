import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import type { RunResumeConfigPayload } from '~/stores/runHistoryTypes';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { decideRunOpenStrategy } from './runOpenStrategyPolicy';
import { loadRunContextHydrationPayload } from '~/services/runHydration/runContextHydrationService';
import { hydrateActivitiesFromProjection } from '~/services/runHydration/runProjectionActivityHydration';
import {
  hydrateRunFileChanges,
  mergeHydratedRunFileChanges,
} from '~/services/runHydration/runFileChangeHydrationService';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { primeRecentEventMonitorBaseline } from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';

export type RunOpenSelectionMode = 'desktop' | 'mobile';

export interface OpenRunWithCoordinatorInput {
  runId: string;
  fallbackAgentName: string | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
  selectRun?: boolean;
  selectionMode?: RunOpenSelectionMode;
}

export interface OpenRunWithCoordinatorResult {
  runId: string;
  resumeConfig: RunResumeConfigPayload;
}

export const openAgentRun = async (
  input: OpenRunWithCoordinatorInput,
): Promise<OpenRunWithCoordinatorResult> => {
  const { resumeConfig, config, conversation, activities, fileChanges } = await loadRunContextHydrationPayload(input);

  const agentContextsStore = useAgentContextsStore();
  const existingContext = agentContextsStore.getRun(input.runId);
  const agentRunStore = useAgentRunStore();
  const streamConnected = agentRunStore.isAgentStreamReady(input.runId);
  const shouldTreatAsLive = resumeConfig.isActive;
  const strategy = decideRunOpenStrategy({
    isRunActive: shouldTreatAsLive,
    hasExistingContext: Boolean(existingContext),
    isExistingContextSubscribed: streamConnected,
  });
  config.isLocked = shouldTreatAsLive;
  const liveStatus = shouldTreatAsLive
    ? AgentStatus.Running
    : AgentStatus.Offline;

  if (strategy === 'KEEP_LIVE_CONTEXT') {
    agentContextsStore.patchConfigOnly(input.runId, {
      ...config,
      isLocked: true,
    });
    mergeHydratedRunFileChanges(input.runId, fileChanges);
    if (existingContext) primeRecentEventMonitorBaseline(existingContext);
  } else {
    const context = agentContextsStore.upsertProjectionContext({
      runId: input.runId,
      config,
      conversation,
      status: liveStatus,
      preserveCurrentStatus: streamConnected,
    });
    hydrateActivitiesFromProjection(input.runId, activities);
    primeRecentEventMonitorBaseline(context);
    hydrateRunFileChanges(input.runId, fileChanges);
  }

  if (input.selectRun !== false) {
    const selectionStore = useAgentSelectionStore();
    if (input.selectionMode === 'mobile') {
      selectionStore.selectRunWithoutShellNavigation(input.runId, 'agent');
    } else {
      selectionStore.selectRun(input.runId, 'agent');
    }
    useTeamRunConfigStore().clearConfig();
    useAgentRunConfigStore().clearConfig();
  }

  if (shouldTreatAsLive) {
    agentRunStore.connectToAgentStream(input.runId);
  } else if (streamConnected) {
    agentRunStore.disconnectAgentStream(input.runId);
  }

  return {
    runId: input.runId,
    resumeConfig,
  };
};
