import { useAgentActivityStore, type ToolActivity } from '~/stores/agentActivityStore';
import type { ToolInvocationStatus } from '~/types/segments';

export interface RunProjectionActivityEntry {
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
  value === 'denied';

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
  entry: RunProjectionActivityEntry,
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

const toToolActivity = (entry: RunProjectionActivityEntry): ToolActivity | null => {
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

export const hydrateActivitiesFromProjection = (
  runId: string,
  entries: RunProjectionActivityEntry[],
): void => {
  const store = useAgentActivityStore();
  store.clearActivities(runId);

  entries.forEach((entry) => {
    const activity = toToolActivity(entry);
    if (!activity) {
      return;
    }
    store.addActivity(runId, activity);
  });
};
