import { getApolloClient } from '~/utils/apolloClient';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { GetAgentRunResumeConfig } from '~/graphql/queries/runHistoryQueries';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { RunResumeConfigPayload } from '~/stores/runHistoryTypes';
import { normalizeAgentRuntimeStatus } from './runtimeStatusNormalization';
import { hydrateRunFileChanges } from './runFileChangeHydrationService';
import { buildRunStoredState, readRunStoredState, type RunStoredState } from './runStoredStateLoader';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { createWorkspaceMetadata } from '~/utils/workspaceMetadata';
import { primeRecentEventMonitorBaseline } from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';

interface GetAgentRunResumeConfigQueryData {
  getAgentRunResumeConfig: RunResumeConfigPayload;
}

export interface LoadRunContextHydrationInput {
  runId: string;
  fallbackAgentName: string | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
}

export interface RunContextHydrationCandidate extends RunStoredState {
  runId: string;
  resumeConfig: RunResumeConfigPayload;
  config: AgentRunConfig;
}

export const loadRunContextHydrationCandidate = async (
  input: LoadRunContextHydrationInput,
): Promise<RunContextHydrationCandidate> => {
  const [stored, resumeResponse] = await Promise.all([
    readRunStoredState(input.runId),
    getApolloClient().query<GetAgentRunResumeConfigQueryData>({
      query: GetAgentRunResumeConfig,
      variables: { runId: input.runId },
      fetchPolicy: 'network-only',
    }),
  ]);

  const resumeErrors = resumeResponse.errors || [];
  if (resumeErrors.length > 0) {
    throw new Error(resumeErrors.map((e: { message: string }) => e.message).join(', '));
  }

  const resumeConfig = resumeResponse.data?.getAgentRunResumeConfig;
  if (!resumeConfig) {
    throw new Error('Run resume config payload is missing.');
  }

  let workspaceMetadata = await input.resolveWorkspaceMetadataByRootPath(
    resumeConfig.metadataConfig.workspaceRootPath,
  );
  if (resumeConfig.isActive && input.ensureWorkspaceByRootPath) {
    const activatedWorkspaceId = await input.ensureWorkspaceByRootPath(
      resumeConfig.metadataConfig.workspaceRootPath,
    );
    if (activatedWorkspaceId && !workspaceMetadata) {
      workspaceMetadata = createWorkspaceMetadata({
        workspaceId: activatedWorkspaceId,
        workspaceRootPath: resumeConfig.metadataConfig.workspaceRootPath,
      });
    }
  }
  if (!workspaceMetadata) {
    throw new Error(`Workspace '${resumeConfig.metadataConfig.workspaceRootPath}' could not be resolved.`);
  }

  const agentDefinitionStore = useAgentDefinitionStore();
  if (agentDefinitionStore.agentDefinitions.length === 0) {
    await agentDefinitionStore.fetchAllAgentDefinitions();
  }

  const agentDefinition = agentDefinitionStore.getAgentDefinitionById(
    resumeConfig.metadataConfig.agentDefinitionId,
  );
  const resolvedAgentName =
    agentDefinition?.name ||
    input.fallbackAgentName ||
    'Agent';

  const config: AgentRunConfig = {
    agentDefinitionId: resumeConfig.metadataConfig.agentDefinitionId,
    agentDefinitionName: resolvedAgentName,
    agentAvatarUrl: agentDefinition?.avatarUrl || null,
    llmModelIdentifier: resumeConfig.metadataConfig.llmModelIdentifier,
    runtimeKind: resumeConfig.metadataConfig.runtimeKind ?? DEFAULT_AGENT_RUNTIME_KIND,
    workspaceId: workspaceMetadata.workspaceId,
    workspaceMetadata,
    autoExecuteTools: resumeConfig.metadataConfig.autoExecuteTools,
    llmConfig: resumeConfig.metadataConfig.llmConfig ?? null,
    isLocked: resumeConfig.isActive,
  };

  return {
    runId: input.runId,
    resumeConfig,
    config,
    ...buildRunStoredState(stored, {
      agentDefinitionId: resumeConfig.metadataConfig.agentDefinitionId,
      agentName: resolvedAgentName,
      llmModelIdentifier: resumeConfig.metadataConfig.llmModelIdentifier,
    }),
  };
};

export const hydrateLiveRunContext = async (
  input: LoadRunContextHydrationInput & { currentStatus?: string | null },
): Promise<RunContextHydrationCandidate> => {
  const contexts = useAgentContextsStore();
  if (contexts.getRun(input.runId)) {
    throw new Error(`Agent run '${input.runId}' became available before background hydration.`);
  }
  const candidate = await loadRunContextHydrationCandidate(input);
  if (contexts.getRun(input.runId)) {
    throw new Error(`Agent run '${input.runId}' changed before background hydration commit.`);
  }
  const activities = useAgentActivityStore();
  const activityResult = activities.replaceProjectionActivitiesIfRevisions([{
    runId: candidate.runId,
    expectedRevision: candidate.expectedActivityRevision,
    activities: candidate.activities,
  }]);
  if (activityResult === 'conflict') {
    throw new Error(`Agent activity for '${input.runId}' changed before background hydration commit.`);
  }
  const context = contexts.upsertProjectionContext({
    runId: candidate.runId,
    config: candidate.config,
    conversation: candidate.conversation,
    status: normalizeAgentRuntimeStatus(input.currentStatus),
    hasEarlierActiveTraceEvents: candidate.hasEarlierActiveTraceEvents,
  });
  primeRecentEventMonitorBaseline(context);
  hydrateRunFileChanges(candidate.runId, candidate.fileChanges);
  return candidate;
};
