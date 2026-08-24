import { getApolloClient } from '~/utils/apolloClient';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { GetAgentRunResumeConfig, GetRunFileChanges, GetRunProjection } from '~/graphql/queries/runHistoryQueries';
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  type AgentRunConfig,
  type AgentRuntimeKind,
  type SkillAccessMode,
} from '~/types/agent/AgentRunConfig';
import type { RunResumeConfigPayload } from '~/stores/runHistoryTypes';
import { buildConversationFromProjection, type RunProjectionConversationEntry } from './runProjectionConversation';
import { hydrateActivitiesFromProjection, type RunProjectionActivityEntry } from './runProjectionActivityHydration';
import { normalizeAgentRuntimeStatus } from './runtimeStatusNormalization';
import type { RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import { hydrateRunFileChanges } from './runFileChangeHydrationService';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { createWorkspaceMetadata } from '~/utils/workspaceMetadata';
import { primeRecentEventMonitorBaseline } from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';

export interface RunProjectionPayload {
  runId: string;
  conversation: RunProjectionConversationEntry[];
  activities: RunProjectionActivityEntry[];
  summary?: string | null;
  lastActivityAt?: string | null;
  hasEarlierActiveTraceEvents: boolean;
}

interface GetRunProjectionQueryData {
  getRunProjection: RunProjectionPayload;
}

interface GetAgentRunResumeConfigQueryData {
  getAgentRunResumeConfig: RunResumeConfigPayload;
}

interface GetRunFileChangesQueryData {
  getRunFileChanges: RunFileChangeArtifact[];
}

export interface LoadRunContextHydrationInput {
  runId: string;
  fallbackAgentName: string | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
}

export interface RunContextHydrationPayload {
  runId: string;
  resumeConfig: RunResumeConfigPayload;
  config: AgentRunConfig;
  conversation: ReturnType<typeof buildConversationFromProjection>;
  activities: RunProjectionActivityEntry[];
  fileChanges: RunFileChangeArtifact[];
  hasEarlierActiveTraceEvents: boolean;
}

export const loadRunContextHydrationPayload = async (
  input: LoadRunContextHydrationInput,
): Promise<RunContextHydrationPayload> => {
  const client = getApolloClient();
  const [projectionResponse, resumeResponse, fileChangesResponse] = await Promise.all([
    client.query<GetRunProjectionQueryData>({
      query: GetRunProjection,
      variables: { runId: input.runId },
      fetchPolicy: 'network-only',
    }),
    client.query<GetAgentRunResumeConfigQueryData>({
      query: GetAgentRunResumeConfig,
      variables: { runId: input.runId },
      fetchPolicy: 'network-only',
    }),
    client.query<GetRunFileChangesQueryData>({
      query: GetRunFileChanges,
      variables: { runId: input.runId },
      fetchPolicy: 'network-only',
    }),
  ]);

  const projectionErrors = projectionResponse.errors || [];
  if (projectionErrors.length > 0) {
    throw new Error(projectionErrors.map((e: { message: string }) => e.message).join(', '));
  }

  const resumeErrors = resumeResponse.errors || [];
  if (resumeErrors.length > 0) {
    throw new Error(resumeErrors.map((e: { message: string }) => e.message).join(', '));
  }

  const fileChangeErrors = fileChangesResponse.errors || [];
  if (fileChangeErrors.length > 0) {
    throw new Error(fileChangeErrors.map((e: { message: string }) => e.message).join(', '));
  }

  const projection = projectionResponse.data?.getRunProjection;
  const resumeConfig = resumeResponse.data?.getAgentRunResumeConfig;
  if (!projection) {
    throw new Error('Run projection payload is missing.');
  }
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

  const conversation = buildConversationFromProjection(
    input.runId,
    projection.conversation || [],
    {
      agentDefinitionId: resumeConfig.metadataConfig.agentDefinitionId,
      agentName: resolvedAgentName,
      llmModelIdentifier: resumeConfig.metadataConfig.llmModelIdentifier,
    },
  );
  if (projection.lastActivityAt) {
    conversation.updatedAt = projection.lastActivityAt;
  }

  const config: AgentRunConfig = {
    agentDefinitionId: resumeConfig.metadataConfig.agentDefinitionId,
    agentDefinitionName: resolvedAgentName,
    agentAvatarUrl: agentDefinition?.avatarUrl || null,
    llmModelIdentifier: resumeConfig.metadataConfig.llmModelIdentifier,
    runtimeKind: resumeConfig.metadataConfig.runtimeKind ?? DEFAULT_AGENT_RUNTIME_KIND,
    workspaceId: workspaceMetadata.workspaceId,
    workspaceMetadata,
    autoExecuteTools: resumeConfig.metadataConfig.autoExecuteTools,
    skillAccessMode:
      (resumeConfig.metadataConfig.skillAccessMode as SkillAccessMode | null) ||
      'PRELOADED_ONLY',
    llmConfig: resumeConfig.metadataConfig.llmConfig ?? null,
    isLocked: resumeConfig.isActive,
  };

  return {
    runId: input.runId,
    resumeConfig,
    config,
    conversation,
    activities: projection.activities || [],
    fileChanges: fileChangesResponse.data?.getRunFileChanges || [],
    hasEarlierActiveTraceEvents: projection.hasEarlierActiveTraceEvents,
  };
};

export const hydrateLiveRunContext = async (
  input: LoadRunContextHydrationInput & { currentStatus?: string | null },
): Promise<RunContextHydrationPayload> => {
  const payload = await loadRunContextHydrationPayload(input);
  const context = useAgentContextsStore().upsertProjectionContext({
    runId: payload.runId,
    config: payload.config,
    conversation: payload.conversation,
    status: normalizeAgentRuntimeStatus(input.currentStatus),
    hasEarlierActiveTraceEvents: payload.hasEarlierActiveTraceEvents,
  });
  hydrateActivitiesFromProjection(payload.runId, payload.activities);
  primeRecentEventMonitorBaseline(context);
  hydrateRunFileChanges(payload.runId, payload.fileChanges);
  return payload;
};
