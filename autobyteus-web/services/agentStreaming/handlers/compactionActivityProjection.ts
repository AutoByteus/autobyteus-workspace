import type { AgentCompactionStatus, CompactionStatusPhase } from '~/types/agent/AgentRunState';
import type { CompactionActivity } from '~/types/activity/RunActivity';
import type { CompactionStatusPayload } from '../protocol/messageTypes';
import { getCompactionMessage } from '~/utils/compactionActivityPresentation';

const isCompactionPhase = (value: unknown): value is CompactionStatusPhase =>
  value === 'requested' || value === 'started' || value === 'completed' || value === 'failed';

export const isCenterFeedCompactionPhase = (
  phase: CompactionStatusPhase | null | undefined,
): boolean =>
  phase === 'started' || phase === 'completed' || phase === 'failed';

const normalizeText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const normalizeProviderTimestamp = (value: unknown): Date | null => {
  const timestamp = normalizeNumber(value);
  if (timestamp === null || timestamp <= 0) {
    return null;
  }
  return new Date(timestamp > 10_000_000_000 ? timestamp : timestamp * 1000);
};

const normalizeProviderStatusToPhase = (status: unknown): CompactionStatusPhase | null => {
  const normalized = normalizeText(status)?.toLowerCase().replace(/[^a-z0-9]+/g, '_') ?? null;
  if (!normalized) {
    return null;
  }
  if (['requested', 'queued', 'pending', 'scheduled'].includes(normalized)) {
    return 'requested';
  }
  if (['started', 'starting', 'running', 'in_progress', 'compacting'].includes(normalized)) {
    return 'started';
  }
  if (['completed', 'complete', 'succeeded', 'success', 'compacted'].includes(normalized)) {
    return 'completed';
  }
  if (['failed', 'failure', 'error', 'errored'].includes(normalized)) {
    return 'failed';
  }
  return null;
};

export const normalizeCompactionPhase = (payload: CompactionStatusPayload): CompactionStatusPhase => {
  if (isCompactionPhase(payload.phase)) {
    return payload.phase;
  }
  const providerPhase = normalizeProviderStatusToPhase(payload.status);
  if (providerPhase) {
    return providerPhase;
  }
  if (payload.kind === 'provider_compaction_boundary') {
    return 'completed';
  }
  return 'started';
};

const getTurnId = (payload: CompactionStatusPayload): string | null =>
  normalizeText(payload.turn_id) ?? normalizeText(payload.turnId);

const isActiveCompactionPhase = (phase: CompactionStatusPhase | null | undefined): boolean =>
  phase === 'requested' || phase === 'started';

const isProviderCompactionPayload = (payload: CompactionStatusPayload): boolean =>
  payload.kind === 'provider_compaction_boundary' ||
  Boolean(
    normalizeText(payload.provider) ||
    normalizeText(payload.source_surface) ||
    normalizeText(payload.boundary_key) ||
    normalizeText(payload.provider_event_id) ||
    normalizeText(payload.provider_session_id) ||
    normalizeText(payload.provider_thread_id),
  );

const isProviderCompactionStatus = (status: AgentCompactionStatus | null): boolean =>
  Boolean(
    status?.provider ||
    status?.sourceSurface ||
    status?.boundaryKey ||
    status?.providerEventId ||
    status?.providerSessionId ||
    status?.activityId?.startsWith('compaction:provider:') ||
    status?.activityId?.startsWith('compaction:boundary:'),
  );

const getProviderSessionId = (payload: CompactionStatusPayload): string | null =>
  normalizeText(payload.provider_session_id) ?? normalizeText(payload.provider_thread_id);

const getProviderOperationActivityId = (
  runId: string,
  payload: CompactionStatusPayload,
): string | null => {
  const providerEventId = normalizeText(payload.provider_event_id);
  if (!providerEventId) {
    return null;
  }
  const provider = normalizeText(payload.provider) ?? 'provider';
  const providerSessionId = getProviderSessionId(payload) ?? runId;
  const turnId = getTurnId(payload) ?? 'turn';
  return `compaction:provider:${provider}:${providerSessionId}:${providerEventId}:${turnId}`;
};

const matchesPreviousActiveProviderLifecycle = (
  payload: CompactionStatusPayload,
  previousStatus: AgentCompactionStatus | null,
): boolean => {
  if (!previousStatus?.activityId || !isActiveCompactionPhase(previousStatus.phase)) {
    return false;
  }
  if (!isProviderCompactionStatus(previousStatus)) {
    return false;
  }

  const provider = normalizeText(payload.provider);
  const previousProvider = normalizeText(previousStatus.provider);
  if (provider && previousProvider && provider !== previousProvider) {
    return false;
  }

  const providerEventId = normalizeText(payload.provider_event_id);
  const previousProviderEventId = normalizeText(previousStatus.providerEventId);
  if (providerEventId || previousProviderEventId) {
    return Boolean(providerEventId && previousProviderEventId && providerEventId === previousProviderEventId);
  }

  const turnId = getTurnId(payload);
  if (!turnId || !previousStatus.turnId || turnId !== previousStatus.turnId) {
    return false;
  }

  return Boolean(provider || previousProvider || payload.kind === 'provider_compaction_boundary');
};

const matchesPreviousActiveSemanticLifecycle = (
  previousStatus: AgentCompactionStatus | null,
): boolean =>
  Boolean(
    previousStatus?.activityId &&
    isActiveCompactionPhase(previousStatus.phase) &&
    !isProviderCompactionStatus(previousStatus),
  );

const resolveCompactionActivityId = (
  runId: string,
  payload: CompactionStatusPayload,
  previousStatus: AgentCompactionStatus | null,
  now: Date,
): string => {
  const isProviderPayload = isProviderCompactionPayload(payload);
  const compactionOperationId = normalizeText(payload.compaction_operation_id);
  if (!isProviderPayload && compactionOperationId) {
    return `compaction:operation:${compactionOperationId}`;
  }

  if (isProviderPayload) {
    const providerOperationActivityId = getProviderOperationActivityId(runId, payload);
    if (providerOperationActivityId) {
      return providerOperationActivityId;
    }
    if (matchesPreviousActiveProviderLifecycle(payload, previousStatus)) {
      return previousStatus!.activityId!;
    }
    const boundaryKey = normalizeText(payload.boundary_key);
    if (boundaryKey) {
      return `compaction:boundary:${boundaryKey}`;
    }
    const turnId = getTurnId(payload);
    if (turnId) {
      return `compaction:provider-turn:${runId}:${turnId}`;
    }
    return `compaction:provider-event:${runId}:${now.getTime()}`;
  }

  if (matchesPreviousActiveSemanticLifecycle(previousStatus)) {
    return previousStatus!.activityId!;
  }

  const requestedTurnId = normalizeText(payload.requested_turn_id);
  if (requestedTurnId) {
    return `compaction:turn:${runId}:${requestedTurnId}`;
  }
  const turnId = getTurnId(payload);
  if (turnId) {
    return `compaction:turn:${runId}:${turnId}`;
  }
  return `compaction:event:${runId}:${now.getTime()}`;
};

export const projectCompactionStatusToActivity = (
  payload: CompactionStatusPayload,
  input: {
    runId: string;
    previousStatus: AgentCompactionStatus | null;
    now?: Date;
  },
): { status: AgentCompactionStatus; activity: CompactionActivity } => {
  const phase = normalizeCompactionPhase(payload);
  const now = input.now ?? normalizeProviderTimestamp(payload.provider_timestamp) ?? new Date();
  const activityId = resolveCompactionActivityId(input.runId, payload, input.previousStatus, now);
  const isProviderBoundary = isProviderCompactionPayload(payload);
  const errorMessage = normalizeText(payload.error_message);
  const message = getCompactionMessage({ phase, errorMessage, isProviderBoundary });
  const turnId = getTurnId(payload);
  const compactionOperationId = normalizeText(payload.compaction_operation_id);
  const requestedTurnId = normalizeText(payload.requested_turn_id);
  const executionTurnId = normalizeText(payload.execution_turn_id);
  const compactionRuntimeKind = normalizeText(payload.compaction_runtime_kind) ?? normalizeText(payload.runtime_kind);
  const provider = normalizeText(payload.provider);
  const sourceSurface = normalizeText(payload.source_surface);
  const boundaryKey = normalizeText(payload.boundary_key);
  const providerEventId = normalizeText(payload.provider_event_id);
  const providerSessionId = getProviderSessionId(payload);
  const centerTimelineTimestamp = isCenterFeedCompactionPhase(phase) ? now : null;

  const status: AgentCompactionStatus = {
    activityId,
    phase,
    message,
    turnId,
    compactionOperationId,
    requestedTurnId,
    executionTurnId,
    selectedBlockCount: normalizeNumber(payload.selected_block_count),
    compactedBlockCount: normalizeNumber(payload.compacted_block_count),
    rawTraceCount: normalizeNumber(payload.raw_trace_count),
    semanticFactCount: normalizeNumber(payload.semantic_fact_count),
    compactionAgentDefinitionId: normalizeText(payload.compaction_agent_definition_id),
    compactionAgentName: normalizeText(payload.compaction_agent_name),
    compactionRuntimeKind,
    compactionModelIdentifier: normalizeText(payload.compaction_model_identifier),
    compactionRunId: normalizeText(payload.compaction_run_id),
    compactionTaskId: normalizeText(payload.compaction_task_id),
    ...(provider ? { provider } : {}),
    ...(sourceSurface ? { sourceSurface } : {}),
    ...(boundaryKey ? { boundaryKey } : {}),
    ...(providerEventId ? { providerEventId } : {}),
    ...(providerSessionId ? { providerSessionId } : {}),
    errorMessage,
    centerTimelineTimestamp,
  };

  return {
    status,
    activity: {
      kind: 'compaction',
      activityId,
      phase,
      message,
      turnId,
      compactionOperationId,
      requestedTurnId,
      executionTurnId,
      selectedBlockCount: status.selectedBlockCount,
      compactedBlockCount: status.compactedBlockCount,
      rawTraceCount: status.rawTraceCount,
      semanticFactCount: status.semanticFactCount,
      compactionAgentDefinitionId: status.compactionAgentDefinitionId,
      compactionAgentName: status.compactionAgentName,
      compactionRuntimeKind,
      compactionModelIdentifier: status.compactionModelIdentifier,
      compactionRunId: status.compactionRunId,
      compactionTaskId: status.compactionTaskId,
      provider,
      sourceSurface,
      boundaryKey,
      providerEventId,
      providerSessionId,
      trigger: normalizeText(payload.trigger),
      preTokens: normalizeNumber(payload.pre_tokens),
      rotationEligible: typeof payload.rotation_eligible === 'boolean' ? payload.rotation_eligible : null,
      errorMessage,
      timestamp: now,
      updatedAt: now,
      centerTimelineTimestamp,
    },
  };
};
