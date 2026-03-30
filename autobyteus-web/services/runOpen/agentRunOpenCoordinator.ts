import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import type { RunResumeConfigPayload } from '~/stores/runHistoryTypes';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { decideRunOpenStrategy } from './runOpenStrategyPolicy';
import { loadRunContextHydrationPayload } from '~/services/runHydration/runContextHydrationService';

export interface OpenRunWithCoordinatorInput {
  runId: string;
  fallbackAgentName: string | null;
  ensureWorkspaceByRootPath: (rootPath: string) => Promise<string | null>;
  selectRun?: boolean;
}

export interface OpenRunWithCoordinatorResult {
  runId: string;
  resumeConfig: RunResumeConfigPayload;
}

export const openAgentRun = async (
  input: OpenRunWithCoordinatorInput,
): Promise<OpenRunWithCoordinatorResult> => {
  const { resumeConfig, config, conversation } = await loadRunContextHydrationPayload(input);

  const agentContextsStore = useAgentContextsStore();
  const existingContext = agentContextsStore.getRun(input.runId);
  const shouldTreatAsLive = resumeConfig.isActive;
  const strategy = decideRunOpenStrategy({
    isRunActive: shouldTreatAsLive,
    hasExistingContext: Boolean(existingContext),
    isExistingContextSubscribed: Boolean(existingContext?.isSubscribed),
  });
  config.isLocked = shouldTreatAsLive;
  const liveStatus = shouldTreatAsLive
    ? AgentStatus.Uninitialized
    : AgentStatus.ShutdownComplete;

  if (strategy === 'KEEP_LIVE_CONTEXT') {
    agentContextsStore.patchConfigOnly(input.runId, {
      ...config,
      isLocked: true,
    });
  } else {
    agentContextsStore.upsertProjectionContext({
      runId: input.runId,
      config,
      conversation,
      status: liveStatus,
    });
  }

  if (input.selectRun !== false) {
    useAgentSelectionStore().selectRun(input.runId, 'agent');
    useTeamRunConfigStore().clearConfig();
    useAgentRunConfigStore().clearConfig();
  }

  if (shouldTreatAsLive) {
    useAgentRunStore().connectToAgentStream(input.runId);
  } else if (existingContext?.isSubscribed) {
    useAgentRunStore().disconnectAgentStream(input.runId);
  }

  return {
    runId: input.runId,
    resumeConfig,
  };
};
