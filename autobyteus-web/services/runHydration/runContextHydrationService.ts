import { getApolloClient } from '~/utils/apolloClient';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { GetAgentRunResumeConfig, GetRunProjection } from '~/graphql/queries/runHistoryQueries';
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  type AgentRunConfig,
  type AgentRuntimeKind,
  type SkillAccessMode,
} from '~/types/agent/AgentRunConfig';
import type { RunResumeConfigPayload } from '~/stores/runHistoryTypes';
import { buildConversationFromProjection, type RunProjectionConversationEntry } from './runProjectionConversation';
import { normalizeAgentRuntimeStatus } from './runtimeStatusNormalization';

export interface RunProjectionPayload {
  runId: string;
  conversation: RunProjectionConversationEntry[];
  summary?: string | null;
  lastActivityAt?: string | null;
}

interface GetRunProjectionQueryData {
  getRunProjection: RunProjectionPayload;
}

interface GetAgentRunResumeConfigQueryData {
  getAgentRunResumeConfig: RunResumeConfigPayload;
}

export interface LoadRunContextHydrationInput {
  runId: string;
  fallbackAgentName: string | null;
  ensureWorkspaceByRootPath: (rootPath: string) => Promise<string | null>;
}

export interface RunContextHydrationPayload {
  runId: string;
  resumeConfig: RunResumeConfigPayload;
  config: AgentRunConfig;
  conversation: ReturnType<typeof buildConversationFromProjection>;
}

export const loadRunContextHydrationPayload = async (
  input: LoadRunContextHydrationInput,
): Promise<RunContextHydrationPayload> => {
  const client = getApolloClient();
  const [projectionResponse, resumeResponse] = await Promise.all([
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
  ]);

  const projectionErrors = projectionResponse.errors || [];
  if (projectionErrors.length > 0) {
    throw new Error(projectionErrors.map((e: { message: string }) => e.message).join(', '));
  }

  const resumeErrors = resumeResponse.errors || [];
  if (resumeErrors.length > 0) {
    throw new Error(resumeErrors.map((e: { message: string }) => e.message).join(', '));
  }

  const projection = projectionResponse.data?.getRunProjection;
  const resumeConfig = resumeResponse.data?.getAgentRunResumeConfig;
  if (!projection) {
    throw new Error('Run projection payload is missing.');
  }
  if (!resumeConfig) {
    throw new Error('Run resume config payload is missing.');
  }

  const workspaceId = await input.ensureWorkspaceByRootPath(
    resumeConfig.metadataConfig.workspaceRootPath,
  );
  if (!workspaceId) {
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
    workspaceId,
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
  };
};

export const hydrateLiveRunContext = async (
  input: LoadRunContextHydrationInput & { currentStatus?: string | null },
): Promise<RunContextHydrationPayload> => {
  const payload = await loadRunContextHydrationPayload(input);
  useAgentContextsStore().upsertProjectionContext({
    runId: payload.runId,
    config: payload.config,
    conversation: payload.conversation,
    status: normalizeAgentRuntimeStatus(input.currentStatus),
  });
  return payload;
};
