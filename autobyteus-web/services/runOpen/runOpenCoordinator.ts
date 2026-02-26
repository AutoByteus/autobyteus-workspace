import { getApolloClient } from '~/utils/apolloClient';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { GetRunProjection, GetRunResumeConfig } from '~/graphql/queries/runHistoryQueries';
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  type AgentRunConfig,
  type AgentRuntimeKind,
  type SkillAccessMode,
} from '~/types/agent/AgentRunConfig';
import type { Conversation, AIMessage, UserMessage } from '~/types/conversation';
import type { AIResponseSegment, ToolInvocationStatus } from '~/types/segments';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { decideRunOpenStrategy } from './runOpenStrategyPolicy';

export interface RunProjectionConversationEntry {
  kind: string;
  role?: string | null;
  content?: string | null;
  toolName?: string | null;
  toolArgs?: Record<string, unknown> | null;
  toolResult?: unknown | null;
  toolError?: string | null;
  media?: Record<string, string[]> | null;
  ts?: number | null;
}

export interface RunProjectionPayload {
  runId: string;
  conversation: RunProjectionConversationEntry[];
  summary?: string | null;
  lastActivityAt?: string | null;
}

export interface RunEditableFieldFlags {
  llmModelIdentifier: boolean;
  llmConfig: boolean;
  autoExecuteTools: boolean;
  skillAccessMode: boolean;
  workspaceRootPath: boolean;
  runtimeKind: boolean;
}

export interface RunManifestConfigPayload {
  agentDefinitionId: string;
  workspaceRootPath: string;
  llmModelIdentifier: string;
  llmConfig?: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  skillAccessMode?: SkillAccessMode | null;
  runtimeKind?: AgentRuntimeKind | null;
  runtimeReference?: {
    runtimeKind: string;
    sessionId?: string | null;
    threadId?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
}

export interface RunResumeConfigPayload {
  runId: string;
  isActive: boolean;
  manifestConfig: RunManifestConfigPayload;
  editableFields: RunEditableFieldFlags;
}

interface GetRunProjectionQueryData {
  getRunProjection: RunProjectionPayload;
}

interface GetRunResumeConfigQueryData {
  getRunResumeConfig: RunResumeConfigPayload;
}

interface OpenRunWithCoordinatorInput {
  runId: string;
  fallbackAgentName: string | null;
  ensureWorkspaceByRootPath: (rootPath: string) => Promise<string | null>;
}

export interface OpenRunWithCoordinatorResult {
  runId: string;
  resumeConfig: RunResumeConfigPayload;
}

const toDate = (seconds?: number | null): Date => {
  if (typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0) {
    return new Date(seconds * 1000);
  }
  return new Date();
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const buildMediaSegments = (entry: RunProjectionConversationEntry): AIResponseSegment[] => {
  if (!entry.media || typeof entry.media !== 'object') {
    return [];
  }

  const segments: AIResponseSegment[] = [];
  const images = Array.isArray(entry.media.image) ? entry.media.image : [];
  const audios = Array.isArray(entry.media.audio) ? entry.media.audio : [];
  const videos = Array.isArray(entry.media.video) ? entry.media.video : [];

  if (images.length) {
    segments.push({ type: 'media', mediaType: 'image', urls: images });
  }
  if (audios.length) {
    segments.push({ type: 'media', mediaType: 'audio', urls: audios });
  }
  if (videos.length) {
    segments.push({ type: 'media', mediaType: 'video', urls: videos });
  }

  return segments;
};

const inferToolStatus = (entry: RunProjectionConversationEntry): ToolInvocationStatus => {
  if (entry.toolError) {
    return 'error';
  }
  if (entry.kind === 'tool_call_pending') {
    return 'parsed';
  }
  if (entry.toolResult !== null && entry.toolResult !== undefined) {
    return 'success';
  }
  return 'parsed';
};

export const buildConversationFromProjection = (
  runId: string,
  entries: RunProjectionConversationEntry[],
  defaults: {
    agentDefinitionId: string;
    agentName: string;
    llmModelIdentifier: string;
  },
): Conversation => {
  const messages: Array<UserMessage | AIMessage> = [];

  entries.forEach((entry, index) => {
    const timestamp = toDate(entry.ts);

    if (entry.kind === 'message' && entry.role === 'user') {
      messages.push({
        type: 'user',
        text: entry.content || '',
        timestamp,
        contextFilePaths: [],
      });
      return;
    }

    if (entry.kind === 'message' && entry.role === 'assistant') {
      const segments: AIResponseSegment[] = [];
      if (entry.content) {
        segments.push({
          type: 'text',
          content: entry.content,
        });
      }
      segments.push(...buildMediaSegments(entry));
      if (segments.length === 0) {
        segments.push({ type: 'text', content: '' });
      }

      messages.push({
        type: 'ai',
        text: entry.content || '',
        timestamp,
        isComplete: true,
        segments,
      });
      return;
    }

    if (
      entry.kind === 'tool_call' ||
      entry.kind === 'tool_call_pending' ||
      entry.kind === 'tool_result_orphan'
    ) {
      const segments: AIResponseSegment[] = [
        {
          type: 'tool_call',
          invocationId: `history-${runId}-${index}`,
          toolName: entry.toolName || 'tool',
          arguments: asRecord(entry.toolArgs),
          status: inferToolStatus(entry),
          logs: [],
          result: entry.toolResult ?? null,
          error: entry.toolError ?? null,
          rawContent: entry.content || '',
        },
      ];

      if (entry.content && entry.content.trim()) {
        segments.push({
          type: 'text',
          content: entry.content,
        });
      }

      segments.push(...buildMediaSegments(entry));

      messages.push({
        type: 'ai',
        text: entry.content || '',
        timestamp,
        isComplete: true,
        segments,
      });
      return;
    }

    if (entry.content || (entry.media && Object.keys(entry.media).length > 0)) {
      const segments: AIResponseSegment[] = [];
      if (entry.content) {
        segments.push({ type: 'text', content: entry.content });
      }
      segments.push(...buildMediaSegments(entry));
      if (segments.length === 0) {
        segments.push({ type: 'text', content: '' });
      }

      messages.push({
        type: 'ai',
        text: entry.content || '',
        timestamp,
        isComplete: true,
        segments,
      });
    }
  });

  const createdAt = messages.length ? messages[0].timestamp.toISOString() : new Date().toISOString();
  const updatedAt = messages.length
    ? messages[messages.length - 1].timestamp.toISOString()
    : new Date().toISOString();

  return {
    id: runId,
    messages,
    createdAt,
    updatedAt,
    agentDefinitionId: defaults.agentDefinitionId,
    agentName: defaults.agentName,
    llmModelIdentifier: defaults.llmModelIdentifier,
  };
};

export const openRunWithCoordinator = async (
  input: OpenRunWithCoordinatorInput,
): Promise<OpenRunWithCoordinatorResult> => {
  const client = getApolloClient();
  const [projectionResponse, resumeResponse] = await Promise.all([
    client.query<GetRunProjectionQueryData>({
      query: GetRunProjection,
      variables: { runId: input.runId },
      fetchPolicy: 'network-only',
    }),
    client.query<GetRunResumeConfigQueryData>({
      query: GetRunResumeConfig,
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
  const resumeConfig = resumeResponse.data?.getRunResumeConfig;
  if (!projection) {
    throw new Error('Run projection payload is missing.');
  }
  if (!resumeConfig) {
    throw new Error('Run resume config payload is missing.');
  }

  const workspaceId = await input.ensureWorkspaceByRootPath(
    resumeConfig.manifestConfig.workspaceRootPath,
  );
  if (!workspaceId) {
    throw new Error(`Workspace '${resumeConfig.manifestConfig.workspaceRootPath}' could not be resolved.`);
  }

  const agentDefinitionStore = useAgentDefinitionStore();
  if (agentDefinitionStore.agentDefinitions.length === 0) {
    await agentDefinitionStore.fetchAllAgentDefinitions();
  }

  const agentDefinition = agentDefinitionStore.getAgentDefinitionById(
    resumeConfig.manifestConfig.agentDefinitionId,
  );
  const resolvedAgentName =
    agentDefinition?.name ||
    input.fallbackAgentName ||
    'Agent';

  const conversation = buildConversationFromProjection(
    input.runId,
    projection.conversation || [],
    {
      agentDefinitionId: resumeConfig.manifestConfig.agentDefinitionId,
      agentName: resolvedAgentName,
      llmModelIdentifier: resumeConfig.manifestConfig.llmModelIdentifier,
    },
  );
  if (projection.lastActivityAt) {
    conversation.updatedAt = projection.lastActivityAt;
  }

  const config: AgentRunConfig = {
    agentDefinitionId: resumeConfig.manifestConfig.agentDefinitionId,
    agentDefinitionName: resolvedAgentName,
    agentAvatarUrl: agentDefinition?.avatarUrl || null,
    llmModelIdentifier: resumeConfig.manifestConfig.llmModelIdentifier,
    runtimeKind: resumeConfig.manifestConfig.runtimeKind ?? DEFAULT_AGENT_RUNTIME_KIND,
    workspaceId,
    autoExecuteTools: resumeConfig.manifestConfig.autoExecuteTools,
    skillAccessMode:
      (resumeConfig.manifestConfig.skillAccessMode as SkillAccessMode | null) ||
      'PRELOADED_ONLY',
    llmConfig: resumeConfig.manifestConfig.llmConfig ?? null,
    isLocked: resumeConfig.isActive,
  };

  const agentContextsStore = useAgentContextsStore();
  const existingContext = agentContextsStore.getRun(input.runId);
  const strategy = decideRunOpenStrategy({
    isRunActive: resumeConfig.isActive,
    hasExistingContext: Boolean(existingContext),
    isExistingContextSubscribed: Boolean(existingContext?.isSubscribed),
  });

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
      status: resumeConfig.isActive ? AgentStatus.Uninitialized : AgentStatus.ShutdownComplete,
    });
  }

  useAgentSelectionStore().selectRun(input.runId, 'agent');
  useTeamRunConfigStore().clearConfig();
  useAgentRunConfigStore().clearConfig();

  if (resumeConfig.isActive) {
    const { useAgentRunStore } = await import('~/stores/agentRunStore');
    useAgentRunStore().connectToAgentStream(input.runId);
  }

  return {
    runId: input.runId,
    resumeConfig,
  };
};
