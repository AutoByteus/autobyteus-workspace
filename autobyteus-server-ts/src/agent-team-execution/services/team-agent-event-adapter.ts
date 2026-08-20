import { jsonValueSchema, type JsonValue } from "@autobyteus/team-stream-contracts";
import {
  AgentRunEventType,
  type AgentRunEvent,
  type AgentRunStatusHint,
} from "../../agent-execution/domain/agent-run-event.js";
import type { TeamAgentEvent, TeamTokenUsageDetails } from "../domain/team-agent-event.js";
import { createTeamAgentStatusDetails } from "../domain/team-agent-status.js";
import type { TeamMemberExecutionIdentity } from "../domain/team-member-execution-identity.js";
import { isAgentSegmentType } from "../../agent-execution/domain/agent-segment.js";
import { resolveAgentRunErrorEvidence } from "../../agent-execution/domain/agent-run-error-evidence.js";
import type {
  AgentRunFileChangeArtifactType,
  AgentRunFileChangePayload,
  AgentRunFileChangeSourceTool,
  AgentRunFileChangeStatus,
} from "../../agent-execution/domain/agent-run-file-change.js";

export type TeamAgentEventAdaptationResult =
  | Readonly<{ kind: "publish"; event: TeamAgentEvent }>
  | Readonly<{ kind: "filtered_collaboration_duplicate" }>
  | Readonly<{ kind: "rejected"; code: "TEAM_AGENT_EVENT_ADMISSION_FAILED"; message: string }>;

export type ResolveTeamMemberIdentityByAgentRunId = (agentRunId: string) => TeamMemberExecutionIdentity | null;

const raw = (payload: Record<string, unknown>, snake: string, camel?: string): unknown =>
  payload[snake] ?? (camel ? payload[camel] : undefined);
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const stringValue = (value: unknown): string => typeof value === "string" ? value : "";
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const boolean = (value: unknown): boolean | null => typeof value === "boolean" ? value : null;
const strings = (value: unknown): readonly string[] => Object.freeze(
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [],
);
const json = (value: unknown): JsonValue | null => {
  if (value == null) return null;
  const result = jsonValueSchema.safeParse(value);
  if (!result.success) throw new Error("opaque event data is not JSON-safe");
  return result.data;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const required = (value: unknown, field: string): string => {
  const result = text(value);
  if (!result) throw new Error(`${field} is required`);
  return result;
};
const exactKeys = (payload: Record<string, unknown>, allowed: readonly string[]): void => {
  if (Object.keys(payload).some((key) => !allowed.includes(key))) {
    throw new Error("segment payload contains unsupported fields");
  }
};
const optionalBoolean = (payload: Record<string, unknown>, key: string): void => {
  if (Object.prototype.hasOwnProperty.call(payload, key) && typeof payload[key] !== "boolean") {
    throw new Error(`${key} is invalid`);
  }
};
const optionalString = (payload: Record<string, unknown>, key: string): void => {
  if (Object.prototype.hasOwnProperty.call(payload, key) && typeof payload[key] !== "string") {
    throw new Error(`${key} is invalid`);
  }
};
const segmentType = (value: unknown) => {
  if (!isAgentSegmentType(value)) throw new Error("segment_type is invalid");
  return value;
};
const errorEvidence = (event: AgentRunEvent) => {
  const evidence = resolveAgentRunErrorEvidence(event);
  switch (evidence?.kind) {
    case "TURN_DIAGNOSTIC": return { errorScope: "turn" as const, errorEffect: "diagnostic" as const, turnId: evidence.turnId };
    case "TURN_TERMINAL": return { errorScope: "turn" as const, errorEffect: "terminal" as const, turnId: evidence.turnId };
    case "RUNTIME_GLOBAL": return { errorScope: "runtime" as const, errorEffect: "terminal" as const, turnId: null };
    default: return { errorScope: null, errorEffect: null, turnId: null };
  }
};
const statusHint = (event: AgentRunEvent): AgentRunStatusHint => event.statusHint ?? null;
const correlated = <T extends TeamAgentEvent>(event: T): Readonly<{ kind: "publish"; event: T }> =>
  Object.freeze({ kind: "publish", event: Object.freeze(event) });

const fileChangePayloadKeys = [
  "id",
  "runId",
  "path",
  "type",
  "status",
  "sourceTool",
  "sourceInvocationId",
  "content",
  "createdAt",
  "updatedAt",
] as const satisfies readonly (keyof AgentRunFileChangePayload)[];
const fileChangeArtifactTypes = new Set<AgentRunFileChangeArtifactType>([
  "file", "image", "audio", "video", "pdf", "csv", "excel", "other",
]);
const fileChangeStatuses = new Set<AgentRunFileChangeStatus>([
  "streaming", "pending", "available", "failed",
]);
const fileChangeSourceTools = new Set<AgentRunFileChangeSourceTool>([
  "write_file", "edit_file", "generated_output",
]);

const fileChangeEnum = <T extends string>(value: unknown, allowed: ReadonlySet<T>, field: string): T => {
  if (typeof value !== "string" || !allowed.has(value as T)) throw new Error(`${field} is invalid`);
  return value as T;
};

const requiredNullableText = (payload: Record<string, unknown>, key: string): string | null => {
  if (!Object.prototype.hasOwnProperty.call(payload, key)) throw new Error(`${key} is required`);
  return payload[key] === null ? null : required(payload[key], key);
};

type TeamFileChangeDetails = Extract<TeamAgentEvent, { eventType: "FILE_CHANGE" }>["details"];

const fileChange = (event: AgentRunEvent): TeamFileChangeDetails => {
  const payload = event.payload;
  if (Object.keys(payload).some((key) => !fileChangePayloadKeys.includes(key as keyof AgentRunFileChangePayload))) {
    throw new Error("FILE_CHANGE payload contains unsupported fields");
  }
  const payloadRunId = required(payload.runId, "runId");
  if (payloadRunId !== event.runId) throw new Error("runId does not match the AgentRun event");
  const content = Object.prototype.hasOwnProperty.call(payload, "content") ? payload.content : null;
  if (content !== null && typeof content !== "string") throw new Error("content is invalid");
  return Object.freeze({
    fileChangeId: required(payload.id, "id"),
    path: required(payload.path, "path"),
    fileType: fileChangeEnum(payload.type, fileChangeArtifactTypes, "type"),
    status: fileChangeEnum(payload.status, fileChangeStatuses, "status"),
    sourceTool: fileChangeEnum(payload.sourceTool, fileChangeSourceTools, "sourceTool"),
    sourceInvocationId: requiredNullableText(payload, "sourceInvocationId"),
    content,
    createdAt: required(payload.createdAt, "createdAt"),
    updatedAt: required(payload.updatedAt, "updatedAt"),
  });
};

const token = (payload: Record<string, unknown>): TeamTokenUsageDetails => Object.freeze({
  usageEventId: required(raw(payload, "usage_event_id", "usageEventId"), "usage_event_id"),
  idempotencyKey: required(raw(payload, "idempotency_key", "idempotencyKey"), "idempotency_key"),
  observedAt: required(raw(payload, "observed_at", "observedAt"), "observed_at"),
  turnId: text(raw(payload, "turn_id", "turnId")),
  llmCallId: text(raw(payload, "llm_call_id", "llmCallId")),
  modelProvider: text(raw(payload, "model_provider", "modelProvider")),
  modelIdentifier: text(raw(payload, "model_identifier", "modelIdentifier")),
  modelValue: text(raw(payload, "model_value", "modelValue")),
  usageScope: (() => {
    const value = raw(payload, "usage_scope", "usageScope");
    if (value !== "per_call" && value !== "per_turn" && value !== "cumulative_snapshot") throw new Error("usage_scope is invalid");
    return value;
  })(),
  inputTokenSemantic: (() => {
    const value = raw(payload, "input_token_semantic", "inputTokenSemantic");
    if (value !== "gross_includes_cache" && value !== "base_excludes_cache" && value !== "unknown") throw new Error("input_token_semantic is invalid");
    return value;
  })(),
  standardInputTokens: number(raw(payload, "standard_input_tokens", "standardInputTokens")),
  cacheMissInputTokens: number(raw(payload, "cache_miss_input_tokens", "cacheMissInputTokens")),
  cacheReadInputTokens: number(raw(payload, "cache_read_input_tokens", "cacheReadInputTokens")),
  cacheCreationInputTokens: number(raw(payload, "cache_creation_input_tokens", "cacheCreationInputTokens")),
  cacheCreation5mInputTokens: number(raw(payload, "cache_creation_5m_input_tokens", "cacheCreation5mInputTokens")),
  cacheCreation1hInputTokens: number(raw(payload, "cache_creation_1h_input_tokens", "cacheCreation1hInputTokens")),
  cacheState: (() => {
    const value = raw(payload, "cache_state", "cacheState");
    if (value !== "positive" && value !== "zero_reported" && value !== "not_reported" && value !== "unsupported_or_local" && value !== "unknown") throw new Error("cache_state is invalid");
    return value;
  })(),
  reasoningOutputTokens: number(raw(payload, "reasoning_output_tokens", "reasoningOutputTokens")),
  billableOutputTokens: number(raw(payload, "billable_output_tokens", "billableOutputTokens")),
  meterDeltaInputTokens: number(raw(payload, "meter_delta_input_tokens", "meterDeltaInputTokens")),
  meterDeltaOutputTokens: number(raw(payload, "meter_delta_output_tokens", "meterDeltaOutputTokens")),
  meterDeltaTotalTokens: number(raw(payload, "meter_delta_total_tokens", "meterDeltaTotalTokens")),
  inputPricePerMillion: number(raw(payload, "input_price_per_million", "inputPricePerMillion")),
  outputPricePerMillion: number(raw(payload, "output_price_per_million", "outputPricePerMillion")),
  cachedInputReadPricePerMillion: number(raw(payload, "cached_input_read_price_per_million", "cachedInputReadPricePerMillion")),
  cachedInputWritePricePerMillion: number(raw(payload, "cached_input_write_price_per_million", "cachedInputWritePricePerMillion")),
  cachedInputWrite5mPricePerMillion: number(raw(payload, "cached_input_write_5m_price_per_million", "cachedInputWrite5mPricePerMillion")),
  cachedInputWrite1hPricePerMillion: number(raw(payload, "cached_input_write_1h_price_per_million", "cachedInputWrite1hPricePerMillion")),
  estimatedApiInputCost: number(raw(payload, "estimated_api_input_cost", "estimatedApiInputCost")),
  estimatedApiStandardInputCost: number(raw(payload, "estimated_api_standard_input_cost", "estimatedApiStandardInputCost")),
  estimatedApiCacheReadInputCost: number(raw(payload, "estimated_api_cache_read_input_cost", "estimatedApiCacheReadInputCost")),
  estimatedApiCacheCreationInputCost: number(raw(payload, "estimated_api_cache_creation_input_cost", "estimatedApiCacheCreationInputCost")),
  estimatedApiCacheCreation5mInputCost: number(raw(payload, "estimated_api_cache_creation_5m_input_cost", "estimatedApiCacheCreation5mInputCost")),
  estimatedApiCacheCreation1hInputCost: number(raw(payload, "estimated_api_cache_creation_1h_input_cost", "estimatedApiCacheCreation1hInputCost")),
  estimatedApiOutputCost: number(raw(payload, "estimated_api_output_cost", "estimatedApiOutputCost")),
  estimatedApiReasoningOutputCost: number(raw(payload, "estimated_api_reasoning_output_cost", "estimatedApiReasoningOutputCost")),
  estimatedApiTotalCost: number(raw(payload, "estimated_api_total_cost", "estimatedApiTotalCost")),
  currency: text(payload.currency),
  apiCostStatus: (() => {
    const value = raw(payload, "api_cost_status", "apiCostStatus");
    if (value !== "estimated" && value !== "price_missing" && value !== "partial_price_missing" && value !== "mixed" && value !== "local_no_api_bill") throw new Error("api_cost_status is invalid");
    return value;
  })(),
  missingPriceDimensions: strings(raw(payload, "missing_price_dimensions", "missingPriceDimensions")),
  pricingPolicyKey: text(raw(payload, "pricing_policy_key", "pricingPolicyKey")),
  selectedPricingTierId: text(raw(payload, "selected_pricing_tier_id", "selectedPricingTierId")),
  latestPromptTokens: number(raw(payload, "latest_prompt_tokens", "latestPromptTokens")),
  effectiveContextWindowTokens: number(raw(payload, "effective_context_window_tokens", "effectiveContextWindowTokens")),
  contextWindowUsagePercent: number(raw(payload, "context_window_usage_percent", "contextWindowUsagePercent")),
  qualityFlags: strings(raw(payload, "quality_flags", "qualityFlags")),
});

export class TeamAgentEventAdapter {
  constructor(private readonly resolveIdentityByAgentRunId: ResolveTeamMemberIdentityByAgentRunId) {}

  adapt(event: AgentRunEvent): TeamAgentEventAdaptationResult {
    if (event.eventType === AgentRunEventType.INTER_AGENT_MESSAGE || event.eventType === AgentRunEventType.TEAM_COMMUNICATION_MESSAGE) {
      return Object.freeze({ kind: "filtered_collaboration_duplicate" });
    }
    try {
      return this.adaptKnown(event);
    } catch (error) {
      return Object.freeze({
        kind: "rejected",
        code: "TEAM_AGENT_EVENT_ADMISSION_FAILED",
        message: `Rejected ${event.eventType}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  private adaptKnown(event: AgentRunEvent): TeamAgentEventAdaptationResult {
    const p = event.payload;
    const hint = statusHint(event);
    switch (event.eventType) {
      case AgentRunEventType.SYSTEM_INSTRUCTIONS_SUPPLIED: {
        exactKeys(p, ["trace_id", "content", "ts"]);
        if (typeof p.trace_id !== "string" || p.trace_id.trim().length === 0) {
          throw new Error("trace_id is invalid");
        }
        if (typeof p.content !== "string") throw new Error("content is invalid");
        if (typeof p.ts !== "number" || !Number.isFinite(p.ts) || p.ts <= 0) {
          throw new Error("ts is invalid");
        }
        return correlated({
          eventType: "SYSTEM_INSTRUCTIONS_SUPPLIED",
          details: { traceId: p.trace_id, content: p.content, ts: p.ts },
          statusHint: null,
        });
      }
      case AgentRunEventType.TURN_STARTED:
        return correlated({ eventType: "TURN_STARTED", details: { turnId: text(raw(p, "turn_id", "turnId")) }, statusHint: hint });
      case AgentRunEventType.TURN_COMPLETED:
        return correlated({ eventType: "TURN_COMPLETED", details: { turnId: text(raw(p, "turn_id", "turnId")), reason: text(p.reason) }, statusHint: hint });
      case AgentRunEventType.TURN_INTERRUPTED:
        return correlated({ eventType: "TURN_INTERRUPTED", details: { turnId: text(raw(p, "turn_id", "turnId")), reason: text(p.reason) }, statusHint: hint });
      case AgentRunEventType.SEGMENT_START: {
        exactKeys(p, ["id", "turn_id", "segment_type", "metadata"]);
        return correlated({ eventType: "SEGMENT_START", details: { segmentId: required(p.id, "id"), turnId: required(p.turn_id, "turn_id"), segmentType: segmentType(p.segment_type), metadata: json(p.metadata) }, statusHint: hint });
      }
      case AgentRunEventType.SEGMENT_CONTENT: {
        exactKeys(p, ["id", "turn_id", "segment_type", "delta"]);
        if (typeof p.delta !== "string") throw new Error("delta is invalid");
        return correlated({ eventType: "SEGMENT_CONTENT", details: { segmentId: required(p.id, "id"), turnId: required(p.turn_id, "turn_id"), segmentType: segmentType(p.segment_type), delta: stringValue(p.delta) }, statusHint: hint });
      }
      case AgentRunEventType.SEGMENT_END: {
        exactKeys(p, ["id", "turn_id", "metadata", "interrupted", "reason", "failed", "error"]);
        optionalBoolean(p, "interrupted");
        optionalString(p, "reason");
        optionalBoolean(p, "failed");
        optionalString(p, "error");
        return correlated({ eventType: "SEGMENT_END", details: { segmentId: required(p.id, "id"), turnId: required(p.turn_id, "turn_id"), metadata: json(p.metadata), interrupted: boolean(p.interrupted) ?? false, reason: text(p.reason), failed: boolean(p.failed) ?? false, error: text(p.error) }, statusHint: hint });
      }
      case AgentRunEventType.AGENT_STATUS:
        return correlated({ eventType: "AGENT_STATUS", details: createTeamAgentStatusDetails({ status: p.status, trigger: p.trigger, toolName: raw(p, "tool_name", "toolName"), errorMessage: raw(p, "error_message", "errorMessage"), errorDetails: raw(p, "error_details", "errorDetails") }), statusHint: hint });
      case AgentRunEventType.COMPACTION_STATUS:
        return correlated({ eventType: "COMPACTION_STATUS", details: {
          phase: text(p.phase), kind: text(p.kind), status: text(p.status), turnId: text(raw(p, "turn_id", "turnId")),
          compactionOperationId: text(raw(p, "compaction_operation_id", "compactionOperationId")), requestedTurnId: text(raw(p, "requested_turn_id", "requestedTurnId")), executionTurnId: text(raw(p, "execution_turn_id", "executionTurnId")),
          selectedBlockCount: number(raw(p, "selected_block_count", "selectedBlockCount")), compactedBlockCount: number(raw(p, "compacted_block_count", "compactedBlockCount")), rawTraceCount: number(raw(p, "raw_trace_count", "rawTraceCount")), semanticFactCount: number(raw(p, "semantic_fact_count", "semanticFactCount")),
          compactionAgentDefinitionId: text(raw(p, "compaction_agent_definition_id", "compactionAgentDefinitionId")), compactionAgentName: text(raw(p, "compaction_agent_name", "compactionAgentName")), compactionRuntimeKind: text(raw(p, "compaction_runtime_kind", "compactionRuntimeKind")), compactionModelIdentifier: text(raw(p, "compaction_model_identifier", "compactionModelIdentifier")), compactionRunId: text(raw(p, "compaction_run_id", "compactionRunId")), compactionTaskId: text(raw(p, "compaction_task_id", "compactionTaskId")),
          errorMessage: text(raw(p, "error_message", "errorMessage")), provider: text(p.provider), sourceSurface: text(raw(p, "source_surface", "sourceSurface")), boundaryKey: text(raw(p, "boundary_key", "boundaryKey")), providerEventId: text(raw(p, "provider_event_id", "providerEventId")), providerSessionId: text(raw(p, "provider_session_id", "providerSessionId")), providerThreadId: text(raw(p, "provider_thread_id", "providerThreadId")), providerTimestamp: number(raw(p, "provider_timestamp", "providerTimestamp")), trigger: text(p.trigger), preTokens: number(raw(p, "pre_tokens", "preTokens")), rotationEligible: boolean(raw(p, "rotation_eligible", "rotationEligible")),
        }, statusHint: hint });
      case AgentRunEventType.TOKEN_USAGE_UPDATED:
        return correlated({ eventType: "TOKEN_USAGE_UPDATED", details: token(p), statusHint: hint });
      case AgentRunEventType.ASSISTANT_COMPLETE:
        return correlated({ eventType: "ASSISTANT_COMPLETE", details: { content: typeof p.content === "string" ? p.content : null, reasoning: typeof p.reasoning === "string" ? p.reasoning : null, usage: json(p.usage), imageUrls: strings(raw(p, "image_urls", "imageUrls")), audioUrls: strings(raw(p, "audio_urls", "audioUrls")), videoUrls: strings(raw(p, "video_urls", "videoUrls")) }, statusHint: hint });
      case AgentRunEventType.TOOL_APPROVAL_REQUESTED:
        return correlated({ eventType: "TOOL_APPROVAL_REQUESTED", details: { invocationId: required(raw(p, "invocation_id", "invocationId"), "invocation_id"), toolName: required(raw(p, "tool_name", "toolName"), "tool_name"), turnId: text(raw(p, "turn_id", "turnId")), arguments: json(p.arguments) ?? Object.freeze({}) }, statusHint: hint });
      case AgentRunEventType.TOOL_APPROVED:
        return correlated({ eventType: "TOOL_APPROVED", details: { invocationId: required(raw(p, "invocation_id", "invocationId"), "invocation_id"), toolName: required(raw(p, "tool_name", "toolName"), "tool_name"), turnId: text(raw(p, "turn_id", "turnId")), reason: text(p.reason) }, statusHint: hint });
      case AgentRunEventType.TOOL_DENIED:
        return correlated({ eventType: "TOOL_DENIED", details: { invocationId: required(raw(p, "invocation_id", "invocationId"), "invocation_id"), toolName: required(raw(p, "tool_name", "toolName"), "tool_name"), turnId: text(raw(p, "turn_id", "turnId")), arguments: json(p.arguments), reason: text(p.reason), error: text(p.error) }, statusHint: hint });
      case AgentRunEventType.TOOL_EXECUTION_STARTED:
        return correlated({ eventType: "TOOL_EXECUTION_STARTED", details: { invocationId: required(raw(p, "invocation_id", "invocationId"), "invocation_id"), toolName: required(raw(p, "tool_name", "toolName"), "tool_name"), turnId: text(raw(p, "turn_id", "turnId")), arguments: json(p.arguments) }, statusHint: hint });
      case AgentRunEventType.TOOL_EXECUTION_SUCCEEDED:
        return correlated({ eventType: "TOOL_EXECUTION_SUCCEEDED", details: { invocationId: required(raw(p, "invocation_id", "invocationId"), "invocation_id"), toolName: required(raw(p, "tool_name", "toolName"), "tool_name"), turnId: text(raw(p, "turn_id", "turnId")), arguments: json(p.arguments), result: json(p.result) }, statusHint: hint });
      case AgentRunEventType.TOOL_EXECUTION_FAILED:
        return correlated({ eventType: "TOOL_EXECUTION_FAILED", details: { invocationId: required(raw(p, "invocation_id", "invocationId"), "invocation_id"), toolName: required(raw(p, "tool_name", "toolName"), "tool_name"), turnId: text(raw(p, "turn_id", "turnId")), arguments: json(p.arguments), error: required(p.error, "error") }, statusHint: hint });
      case AgentRunEventType.TOOL_EXECUTION_INTERRUPTED:
        return correlated({ eventType: "TOOL_EXECUTION_INTERRUPTED", details: { invocationId: required(raw(p, "invocation_id", "invocationId"), "invocation_id"), toolName: required(raw(p, "tool_name", "toolName"), "tool_name"), turnId: text(raw(p, "turn_id", "turnId")), arguments: json(p.arguments), reason: required(p.reason, "reason") }, statusHint: hint });
      case AgentRunEventType.TOOL_LOG:
        return correlated({ eventType: "TOOL_LOG", details: { logEntry: stringValue(raw(p, "log_entry", "logEntry")), toolInvocationId: required(raw(p, "tool_invocation_id", "toolInvocationId"), "tool_invocation_id"), toolName: required(raw(p, "tool_name", "toolName"), "tool_name"), turnId: text(raw(p, "turn_id", "turnId")) }, statusHint: hint });
      case AgentRunEventType.TODO_LIST_UPDATE: {
        const entries = Array.isArray(p.todos) ? p.todos : [];
        const todos = entries.map((entry) => {
          if (!isRecord(entry)) throw new Error("todos contains an invalid entry");
          const item = entry;
          const status = item.status;
          if (status !== "pending" && status !== "in_progress" && status !== "done") throw new Error("todo status is invalid");
          return Object.freeze({ todoId: required(raw(item, "todo_id", "todoId"), "todo_id"), description: stringValue(item.description), status });
        });
        return correlated({ eventType: "TODO_LIST_UPDATE", details: { todos: Object.freeze(todos) }, statusHint: hint });
      }
      case AgentRunEventType.SYSTEM_TASK_NOTIFICATION: {
        const senderRunId = text(raw(p, "sender_run_id", "senderRunId"));
        const sender = senderRunId
          ? (() => { const identity = this.resolveIdentityByAgentRunId(senderRunId); if (!identity) throw new Error("sender_run_id does not resolve in the root TeamRun"); return Object.freeze({ kind: "execution" as const, identity }); })()
          : Object.freeze({ kind: "system" as const });
        return correlated({ eventType: "SYSTEM_TASK_NOTIFICATION", details: { sender, content: stringValue(p.content) }, statusHint: hint });
      }
      case AgentRunEventType.ARTIFACT_PERSISTED:
        return correlated({ eventType: "ARTIFACT_PERSISTED", details: { artifactId: required(raw(p, "artifact_id", "id"), "artifact_id"), path: required(p.path, "path"), artifactType: required(raw(p, "artifact_type", "type"), "artifact_type"), status: "available", description: typeof p.description === "string" ? p.description : null, revisionId: required(raw(p, "revision_id", "revisionId"), "revision_id"), createdAt: required(raw(p, "created_at", "createdAt"), "created_at"), updatedAt: required(raw(p, "updated_at", "updatedAt"), "updated_at") }, statusHint: hint });
      case AgentRunEventType.FILE_CHANGE:
        return correlated({ eventType: "FILE_CHANGE", details: fileChange(event), statusHint: hint });
      case AgentRunEventType.ERROR:
        return correlated({ eventType: "ERROR", details: { code: required(p.code, "code"), message: stringValue(p.message), ...errorEvidence(event) }, statusHint: hint });
      case AgentRunEventType.INTER_AGENT_MESSAGE:
      case AgentRunEventType.TEAM_COMMUNICATION_MESSAGE:
        return Object.freeze({ kind: "filtered_collaboration_duplicate" });
    }
  }
}
