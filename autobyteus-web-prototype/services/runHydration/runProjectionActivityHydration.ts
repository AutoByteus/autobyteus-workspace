import { useAgentActivityStore } from '~/stores/agentActivityStore';
import type {
  CompactionActivity,
  RunActivity,
  SystemInstructionActivity,
  ToolActivity,
} from '~/types/activity/RunActivity';
import type { CompactionStatusPhase } from '~/types/agent/AgentRunState';
import type { ToolInvocationStatus } from '~/types/segments';
import { getCompactionMessage } from '~/utils/compactionActivityPresentation';

export interface RunProjectionToolActivityEntry {
  kind: 'tool';
  invocationId: string;
  toolName?: string | null;
  type?: ToolActivity['type'] | null;
  status?: ToolInvocationStatus | null;
  contextText?: string | null;
  arguments?: Record<string, unknown> | null;
  logs?: string[] | null;
  result?: unknown | null;
  error?: string | null;
  ts?: number | null;
  detailLevel?: 'full' | 'source_limited' | null;
}

export interface RunProjectionSystemInstructionActivityEntry {
  kind: 'system_instruction';
  activityId: string;
  content: string;
  ts: number;
}

export interface RunProjectionCompactionActivityEntry {
  kind: 'compaction';
  activityId: string;
  phase?: CompactionStatusPhase | null;
  message?: string | null;
  turnId?: string | null;
  compactionOperationId?: string | null;
  requestedTurnId?: string | null;
  executionTurnId?: string | null;
  selectedBlockCount?: number | null;
  compactedBlockCount?: number | null;
  rawTraceCount?: number | null;
  semanticFactCount?: number | null;
  compactionAgentDefinitionId?: string | null;
  compactionAgentName?: string | null;
  compactionRuntimeKind?: string | null;
  compactionModelIdentifier?: string | null;
  compactionRunId?: string | null;
  compactionTaskId?: string | null;
  provider?: string | null;
  sourceSurface?: string | null;
  boundaryKey?: string | null;
  providerEventId?: string | null;
  providerSessionId?: string | null;
  trigger?: string | null;
  preTokens?: number | null;
  rotationEligible?: boolean | null;
  errorMessage?: string | null;
  ts?: number | null;
  updatedTs?: number | null;
  detailLevel?: 'full' | 'source_limited' | null;
}

export type RunProjectionActivityEntry =
  | RunProjectionToolActivityEntry
  | RunProjectionCompactionActivityEntry
  | RunProjectionSystemInstructionActivityEntry;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const toDate = (seconds?: number | null): Date => {
  if (typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0) {
    return new Date(seconds * 1000);
  }
  return new Date();
};

const isToolInvocationStatus = (value: unknown): value is ToolInvocationStatus =>
  value === 'parsing' ||
  value === 'parsed' ||
  value === 'awaiting-approval' ||
  value === 'approved' ||
  value === 'executing' ||
  value === 'success' ||
  value === 'error' ||
  value === 'denied' ||
  value === 'interrupted';

const isCompactionPhase = (value: unknown): value is CompactionStatusPhase =>
  value === 'requested' || value === 'started' || value === 'completed' || value === 'failed';

const inferActivityType = (
  toolName: string,
  args: Record<string, unknown>,
): ToolActivity['type'] => {
  if (toolName === 'write_file') {
    return 'write_file';
  }
  if (
    toolName === 'edit_file' ||
    typeof args.patch === 'string' ||
    typeof args.diff === 'string'
  ) {
    return 'edit_file';
  }
  if (toolName === 'run_bash' || typeof args.command === 'string') {
    return 'terminal_command';
  }
  return 'tool_call';
};

const resolveContextText = (
  toolName: string,
  args: Record<string, unknown>,
  contextText?: string | null,
): string => {
  const normalizedContextText = typeof contextText === 'string' ? contextText.trim() : '';
  if (normalizedContextText) {
    return normalizedContextText;
  }
  const pathCandidate = typeof args.path === 'string' ? args.path.trim() : '';
  if (pathCandidate) {
    return pathCandidate;
  }
  const commandCandidate = typeof args.command === 'string' ? args.command.trim() : '';
  if (commandCandidate) {
    return commandCandidate;
  }
  return toolName;
};

const resolveStatus = (
  entry: RunProjectionToolActivityEntry,
): ToolInvocationStatus => {
  if (isToolInvocationStatus(entry.status)) {
    return entry.status;
  }
  if (entry.error) {
    return 'error';
  }
  if (entry.result !== null && entry.result !== undefined) {
    return 'success';
  }
  return 'parsed';
};

const toLogs = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

const toToolActivity = (entry: RunProjectionToolActivityEntry): ToolActivity | null => {
  const invocationId = typeof entry.invocationId === 'string' ? entry.invocationId.trim() : '';
  if (!invocationId) {
    return null;
  }
  const toolName =
    typeof entry.toolName === 'string' && entry.toolName.trim().length > 0
      ? entry.toolName.trim()
      : 'tool';
  const argumentsPayload = asRecord(entry.arguments);

  return {
    kind: 'tool',
    activityId: invocationId,
    invocationId,
    toolName,
    type: entry.type || inferActivityType(toolName, argumentsPayload),
    status: resolveStatus(entry),
    contextText: resolveContextText(toolName, argumentsPayload, entry.contextText),
    arguments: argumentsPayload,
    logs: toLogs(entry.logs),
    result: entry.result ?? null,
    error: typeof entry.error === 'string' ? entry.error : null,
    timestamp: toDate(entry.ts),
  };
};

const toCompactionActivity = (entry: RunProjectionCompactionActivityEntry): CompactionActivity | null => {
  const activityId = typeof entry.activityId === 'string' ? entry.activityId.trim() : '';
  if (!activityId) {
    return null;
  }
  const phase = isCompactionPhase(entry.phase) ? entry.phase : 'completed';
  const timestamp = toDate(entry.ts);
  const message =
    typeof entry.message === 'string' && entry.message.trim().length > 0
      ? entry.message.trim()
      : getCompactionMessage({
          phase,
          errorMessage: entry.errorMessage,
          isProviderBoundary: Boolean(entry.boundaryKey || entry.provider),
        });

  return {
    kind: 'compaction',
    activityId,
    phase,
    message,
    turnId: entry.turnId ?? null,
    compactionOperationId: entry.compactionOperationId ?? null,
    requestedTurnId: entry.requestedTurnId ?? null,
    executionTurnId: entry.executionTurnId ?? null,
    selectedBlockCount: entry.selectedBlockCount ?? null,
    compactedBlockCount: entry.compactedBlockCount ?? null,
    rawTraceCount: entry.rawTraceCount ?? null,
    semanticFactCount: entry.semanticFactCount ?? null,
    compactionAgentDefinitionId: entry.compactionAgentDefinitionId ?? null,
    compactionAgentName: entry.compactionAgentName ?? null,
    compactionRuntimeKind: entry.compactionRuntimeKind ?? null,
    compactionModelIdentifier: entry.compactionModelIdentifier ?? null,
    compactionRunId: entry.compactionRunId ?? null,
    compactionTaskId: entry.compactionTaskId ?? null,
    provider: entry.provider ?? null,
    sourceSurface: entry.sourceSurface ?? null,
    boundaryKey: entry.boundaryKey ?? null,
    providerEventId: entry.providerEventId ?? null,
    providerSessionId: entry.providerSessionId ?? null,
    trigger: entry.trigger ?? null,
    preTokens: entry.preTokens ?? null,
    rotationEligible: entry.rotationEligible ?? null,
    errorMessage: entry.errorMessage ?? null,
    timestamp,
    updatedAt: toDate(entry.updatedTs ?? entry.ts),
    centerTimelineTimestamp:
      phase === 'started' || phase === 'completed' || phase === 'failed'
        ? timestamp
        : null,
  };
};

const toSystemInstructionActivity = (
  entry: RunProjectionSystemInstructionActivityEntry,
): SystemInstructionActivity | null => {
  if (typeof entry.activityId !== 'string' || entry.activityId.trim().length === 0
    || typeof entry.content !== 'string'
    || typeof entry.ts !== 'number' || !Number.isFinite(entry.ts) || entry.ts <= 0) {
    console.warn('[runProjectionActivityHydration] Omitted malformed system instruction activity.');
    return null;
  }
  return {
    kind: 'system_instruction',
    activityId: entry.activityId,
    content: entry.content,
    timestamp: new Date(entry.ts * 1000),
  };
};

const toRunActivity = (entry: RunProjectionActivityEntry): RunActivity | null => {
  switch (entry.kind) {
    case 'tool': return toToolActivity(entry);
    case 'compaction': return toCompactionActivity(entry);
    case 'system_instruction': return toSystemInstructionActivity(entry);
    default:
      console.warn('[runProjectionActivityHydration] Omitted unknown activity kind.');
      return null;
  }
};

export const hydrateActivitiesFromProjection = (
  runId: string,
  entries: RunProjectionActivityEntry[],
): void => {
  const store = useAgentActivityStore();
  store.clearActivities(runId);

  entries.forEach((entry) => {
    const activity = toRunActivity(entry);
    if (!activity) {
      return;
    }
    if (activity.kind === 'system_instruction') {
      store.upsertSystemInstructionActivity(runId, activity);
    } else {
      store.addActivity(runId, activity);
    }
  });
};
