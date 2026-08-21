import {
  parseTeamStreamServerMessage,
  type TeamMemberExecutionIdentityDto,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import type { TeamAgentEvent, TeamTokenUsageDetails } from "../../agent-team-execution/domain/team-agent-event.js";
import type { TeamAgentExecutionBinding } from "../../agent-team-execution/domain/team-agent-execution-binding.js";
import { projectLiveTeamAgentStatusMessage } from "./team-agent-status-websocket-projector.js";

export const projectTeamMemberExecutionIdentityDto = (
  identity: TeamAgentExecutionBinding,
): TeamMemberExecutionIdentityDto => Object.freeze({
  agent_run_id: identity.agentRunId,
  member_address: identity.memberAddress,
});

const tokenPayload = (change_sequence: number, agent_run_id: string, details: TeamTokenUsageDetails) => ({
  change_sequence,
  agent_run_id,
  usage_event_id: details.usageEventId,
  idempotency_key: details.idempotencyKey,
  observed_at: details.observedAt,
  turn_id: details.turnId,
  llm_call_id: details.llmCallId,
  model_provider: details.modelProvider,
  model_identifier: details.modelIdentifier,
  model_value: details.modelValue,
  usage_scope: details.usageScope,
  input_token_semantic: details.inputTokenSemantic,
  standard_input_tokens: details.standardInputTokens,
  cache_miss_input_tokens: details.cacheMissInputTokens,
  cache_read_input_tokens: details.cacheReadInputTokens,
  cache_creation_input_tokens: details.cacheCreationInputTokens,
  cache_creation_5m_input_tokens: details.cacheCreation5mInputTokens,
  cache_creation_1h_input_tokens: details.cacheCreation1hInputTokens,
  cache_state: details.cacheState,
  reasoning_output_tokens: details.reasoningOutputTokens,
  billable_output_tokens: details.billableOutputTokens,
  meter_delta_input_tokens: details.meterDeltaInputTokens,
  meter_delta_output_tokens: details.meterDeltaOutputTokens,
  meter_delta_total_tokens: details.meterDeltaTotalTokens,
  input_price_per_million: details.inputPricePerMillion,
  output_price_per_million: details.outputPricePerMillion,
  cached_input_read_price_per_million: details.cachedInputReadPricePerMillion,
  cached_input_write_price_per_million: details.cachedInputWritePricePerMillion,
  cached_input_write_5m_price_per_million: details.cachedInputWrite5mPricePerMillion,
  cached_input_write_1h_price_per_million: details.cachedInputWrite1hPricePerMillion,
  estimated_api_input_cost: details.estimatedApiInputCost,
  estimated_api_standard_input_cost: details.estimatedApiStandardInputCost,
  estimated_api_cache_read_input_cost: details.estimatedApiCacheReadInputCost,
  estimated_api_cache_creation_input_cost: details.estimatedApiCacheCreationInputCost,
  estimated_api_cache_creation_5m_input_cost: details.estimatedApiCacheCreation5mInputCost,
  estimated_api_cache_creation_1h_input_cost: details.estimatedApiCacheCreation1hInputCost,
  estimated_api_output_cost: details.estimatedApiOutputCost,
  estimated_api_reasoning_output_cost: details.estimatedApiReasoningOutputCost,
  estimated_api_total_cost: details.estimatedApiTotalCost,
  currency: details.currency,
  api_cost_status: details.apiCostStatus,
  missing_price_dimensions: [...details.missingPriceDimensions],
  pricing_policy_key: details.pricingPolicyKey,
  selected_pricing_tier_id: details.selectedPricingTierId,
  latest_prompt_tokens: details.latestPromptTokens,
  effective_context_window_tokens: details.effectiveContextWindowTokens,
  context_window_usage_percent: details.contextWindowUsagePercent,
  run_summary_after_event: details.runSummaryAfterEvent,
  quality_flags: [...details.qualityFlags],
});

export const projectTeamAgentEventMessage = (
  execution: TeamAgentExecutionBinding,
  event: TeamAgentEvent,
  changeSequence: number,
): TeamStreamServerMessage => {
  const base = { change_sequence: changeSequence, agent_run_id: execution.agentRunId };
  switch (event.eventType) {
    case "SYSTEM_INSTRUCTIONS_SUPPLIED": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, trace_id: event.details.traceId, content: event.details.content, ts: event.details.ts } });
    case "TURN_STARTED": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, turn_id: event.details.turnId } });
    case "TURN_COMPLETED": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, turn_id: event.details.turnId, reason: event.details.reason } });
    case "TURN_INTERRUPTED": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, turn_id: event.details.turnId, reason: event.details.reason } });
    case "SEGMENT_START": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, segment_id: event.details.segmentId, turn_id: event.details.turnId, segment_type: event.details.segmentType, metadata: event.details.metadata } });
    case "SEGMENT_CONTENT": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, segment_id: event.details.segmentId, turn_id: event.details.turnId, segment_type: event.details.segmentType, delta: event.details.delta } });
    case "SEGMENT_END": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, segment_id: event.details.segmentId, turn_id: event.details.turnId, metadata: event.details.metadata, interrupted: event.details.interrupted, reason: event.details.reason, failed: event.details.failed, error: event.details.error } });
    case "AGENT_STATUS": return projectLiveTeamAgentStatusMessage({ execution, details: event.details, statusHint: event.statusHint }, changeSequence);
    case "COMPACTION_STATUS": return parseTeamStreamServerMessage({ type: event.eventType, payload: {
      ...base, phase: event.details.phase, kind: event.details.kind, status: event.details.status, turn_id: event.details.turnId,
      compaction_operation_id: event.details.compactionOperationId, requested_turn_id: event.details.requestedTurnId, execution_turn_id: event.details.executionTurnId,
      selected_block_count: event.details.selectedBlockCount, compacted_block_count: event.details.compactedBlockCount, raw_trace_count: event.details.rawTraceCount, semantic_fact_count: event.details.semanticFactCount,
      compaction_agent_definition_id: event.details.compactionAgentDefinitionId, compaction_agent_name: event.details.compactionAgentName, compaction_runtime_kind: event.details.compactionRuntimeKind,
      compaction_model_identifier: event.details.compactionModelIdentifier, compaction_run_id: event.details.compactionRunId, compaction_task_id: event.details.compactionTaskId,
      error_message: event.details.errorMessage, provider: event.details.provider, source_surface: event.details.sourceSurface, boundary_key: event.details.boundaryKey,
      provider_event_id: event.details.providerEventId, provider_session_id: event.details.providerSessionId, provider_thread_id: event.details.providerThreadId,
      provider_timestamp: event.details.providerTimestamp, trigger: event.details.trigger, pre_tokens: event.details.preTokens, rotation_eligible: event.details.rotationEligible,
    } });
    case "TOKEN_USAGE_UPDATED": return parseTeamStreamServerMessage({ type: event.eventType, payload: tokenPayload(changeSequence, execution.agentRunId, event.details) });
    case "ASSISTANT_COMPLETE": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, content: event.details.content, reasoning: event.details.reasoning, usage: event.details.usage, image_urls: [...event.details.imageUrls], audio_urls: [...event.details.audioUrls], video_urls: [...event.details.videoUrls] } });
    case "TOOL_APPROVAL_REQUESTED": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, arguments: event.details.arguments } });
    case "TOOL_APPROVED": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, reason: event.details.reason } });
    case "TOOL_DENIED": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, arguments: event.details.arguments, reason: event.details.reason, error: event.details.error } });
    case "TOOL_EXECUTION_STARTED": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, arguments: event.details.arguments } });
    case "TOOL_EXECUTION_SUCCEEDED": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, arguments: event.details.arguments, result: event.details.result } });
    case "TOOL_EXECUTION_FAILED": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, arguments: event.details.arguments, error: event.details.error } });
    case "TOOL_EXECUTION_INTERRUPTED": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, arguments: event.details.arguments, reason: event.details.reason } });
    case "TOOL_LOG": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, log_entry: event.details.logEntry, tool_invocation_id: event.details.toolInvocationId, tool_name: event.details.toolName, turn_id: event.details.turnId } });
    case "TODO_LIST_UPDATE": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, todos: event.details.todos.map((todo) => ({ todo_id: todo.todoId, description: todo.description, status: todo.status })) } });
    case "SYSTEM_TASK_NOTIFICATION": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, sender: event.details.sender.kind === "system" ? { kind: "system" } : { kind: "execution", identity: projectTeamMemberExecutionIdentityDto(event.details.sender.identity) }, content: event.details.content } });
    case "ARTIFACT_PERSISTED": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, artifact_id: event.details.artifactId, path: event.details.path, artifact_type: event.details.artifactType, status: event.details.status, description: event.details.description, revision_id: event.details.revisionId, created_at: event.details.createdAt, updated_at: event.details.updatedAt } });
    case "FILE_CHANGE": return parseTeamStreamServerMessage({ type: event.eventType, payload: { ...base, file_change_id: event.details.fileChangeId, path: event.details.path, file_type: event.details.fileType, status: event.details.status, source_tool: event.details.sourceTool, source_invocation_id: event.details.sourceInvocationId, content: event.details.content, created_at: event.details.createdAt, updated_at: event.details.updatedAt } });
    case "ERROR": return parseTeamStreamServerMessage({ type: "ERROR", payload: { code: event.details.code, message: event.details.message, change_sequence: changeSequence, agent_run_id: execution.agentRunId, error_scope: event.details.errorScope, error_effect: event.details.errorEffect, turn_id: event.details.turnId } });
  }
};
