import { agentPresentationMessageSchema, type AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { AgentPresentationEvent, AgentPresentationTokenUsageDetails } from "./agent-presentation-event.js";

const tokenPayload = (details: AgentPresentationTokenUsageDetails) => ({
  usage_event_id: details.usageEventId, idempotency_key: details.idempotencyKey, observed_at: details.observedAt,
  turn_id: details.turnId, llm_call_id: details.llmCallId, model_provider: details.modelProvider,
  model_identifier: details.modelIdentifier, model_value: details.modelValue, usage_scope: details.usageScope,
  input_token_semantic: details.inputTokenSemantic, standard_input_tokens: details.standardInputTokens,
  cache_miss_input_tokens: details.cacheMissInputTokens, cache_read_input_tokens: details.cacheReadInputTokens,
  cache_creation_input_tokens: details.cacheCreationInputTokens, cache_creation_5m_input_tokens: details.cacheCreation5mInputTokens,
  cache_creation_1h_input_tokens: details.cacheCreation1hInputTokens, cache_state: details.cacheState,
  reasoning_output_tokens: details.reasoningOutputTokens, billable_output_tokens: details.billableOutputTokens,
  meter_delta_input_tokens: details.meterDeltaInputTokens, meter_delta_output_tokens: details.meterDeltaOutputTokens,
  meter_delta_total_tokens: details.meterDeltaTotalTokens, input_price_per_million: details.inputPricePerMillion,
  output_price_per_million: details.outputPricePerMillion, cached_input_read_price_per_million: details.cachedInputReadPricePerMillion,
  cached_input_write_price_per_million: details.cachedInputWritePricePerMillion,
  cached_input_write_5m_price_per_million: details.cachedInputWrite5mPricePerMillion,
  cached_input_write_1h_price_per_million: details.cachedInputWrite1hPricePerMillion,
  estimated_api_input_cost: details.estimatedApiInputCost, estimated_api_standard_input_cost: details.estimatedApiStandardInputCost,
  estimated_api_cache_read_input_cost: details.estimatedApiCacheReadInputCost,
  estimated_api_cache_creation_input_cost: details.estimatedApiCacheCreationInputCost,
  estimated_api_cache_creation_5m_input_cost: details.estimatedApiCacheCreation5mInputCost,
  estimated_api_cache_creation_1h_input_cost: details.estimatedApiCacheCreation1hInputCost,
  estimated_api_output_cost: details.estimatedApiOutputCost,
  estimated_api_reasoning_output_cost: details.estimatedApiReasoningOutputCost,
  estimated_api_total_cost: details.estimatedApiTotalCost, currency: details.currency,
  api_cost_status: details.apiCostStatus, missing_price_dimensions: [...details.missingPriceDimensions],
  pricing_policy_key: details.pricingPolicyKey, selected_pricing_tier_id: details.selectedPricingTierId,
  latest_prompt_tokens: details.latestPromptTokens, effective_context_window_tokens: details.effectiveContextWindowTokens,
  context_window_usage_percent: details.contextWindowUsagePercent, run_summary_after_event: details.runSummaryAfterEvent,
  quality_flags: [...details.qualityFlags],
});

const parse = (value: AgentPresentationMessage): AgentPresentationMessage => agentPresentationMessageSchema.parse(value);

export const projectAgentPresentationMessage = (event: AgentPresentationEvent): AgentPresentationMessage => {
  const type = event.eventType;
  switch (type) {
    case "SYSTEM_INSTRUCTIONS_SUPPLIED": return parse({ type, payload: { trace_id: event.details.traceId, content: event.details.content, ts: event.details.ts } });
    case "TURN_STARTED": return parse({ type, payload: { turn_id: event.details.turnId } });
    case "TURN_COMPLETED": return parse({ type, payload: { turn_id: event.details.turnId, reason: event.details.reason } });
    case "TURN_INTERRUPTED": return parse({ type, payload: { turn_id: event.details.turnId, reason: event.details.reason } });
    case "SEGMENT_START": return parse({ type, payload: { segment_id: event.details.segmentId, turn_id: event.details.turnId, segment_type: event.details.segmentType, metadata: event.details.metadata } });
    case "SEGMENT_CONTENT": return parse({ type, payload: { segment_id: event.details.segmentId, turn_id: event.details.turnId, segment_type: event.details.segmentType, delta: event.details.delta } });
    case "SEGMENT_END": return parse({ type, payload: { segment_id: event.details.segmentId, turn_id: event.details.turnId, metadata: event.details.metadata, interrupted: event.details.interrupted, reason: event.details.reason, failed: event.details.failed, error: event.details.error } });
    case "AGENT_STATUS": return parse({ type, payload: { status: event.details.status, trigger: event.details.trigger, tool_name: event.details.toolName, error_message: event.details.errorMessage, error_details: event.details.errorDetails } });
    case "COMPACTION_STATUS": return parse({ type, payload: {
      phase: event.details.phase, kind: event.details.kind, status: event.details.status, turn_id: event.details.turnId,
      compaction_operation_id: event.details.compactionOperationId, requested_turn_id: event.details.requestedTurnId,
      execution_turn_id: event.details.executionTurnId, selected_block_count: event.details.selectedBlockCount,
      compacted_block_count: event.details.compactedBlockCount, raw_trace_count: event.details.rawTraceCount,
      semantic_fact_count: event.details.semanticFactCount, compaction_agent_definition_id: event.details.compactionAgentDefinitionId,
      compaction_agent_name: event.details.compactionAgentName, compaction_runtime_kind: event.details.compactionRuntimeKind,
      compaction_model_identifier: event.details.compactionModelIdentifier, compaction_run_id: event.details.compactionRunId,
      compaction_task_id: event.details.compactionTaskId, error_message: event.details.errorMessage,
      provider: event.details.provider, source_surface: event.details.sourceSurface, boundary_key: event.details.boundaryKey,
      provider_event_id: event.details.providerEventId, provider_session_id: event.details.providerSessionId,
      provider_thread_id: event.details.providerThreadId, provider_timestamp: event.details.providerTimestamp,
      trigger: event.details.trigger, pre_tokens: event.details.preTokens, rotation_eligible: event.details.rotationEligible,
    } });
    case "TOKEN_USAGE_UPDATED": return parse({ type, payload: tokenPayload(event.details) });
    case "ASSISTANT_COMPLETE": return parse({ type, payload: { content: event.details.content, reasoning: event.details.reasoning, usage: event.details.usage, image_urls: [...event.details.imageUrls], audio_urls: [...event.details.audioUrls], video_urls: [...event.details.videoUrls] } });
    case "TOOL_APPROVAL_REQUESTED": return parse({ type, payload: { invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, arguments: event.details.arguments } });
    case "TOOL_APPROVED": return parse({ type, payload: { invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, reason: event.details.reason } });
    case "TOOL_DENIED": return parse({ type, payload: { invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, arguments: event.details.arguments, reason: event.details.reason, error: event.details.error } });
    case "TOOL_EXECUTION_STARTED": return parse({ type, payload: { invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, arguments: event.details.arguments } });
    case "TOOL_EXECUTION_SUCCEEDED": return parse({ type, payload: { invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, arguments: event.details.arguments, result: event.details.result } });
    case "TOOL_EXECUTION_FAILED": return parse({ type, payload: { invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, arguments: event.details.arguments, error: event.details.error } });
    case "TOOL_EXECUTION_INTERRUPTED": return parse({ type, payload: { invocation_id: event.details.invocationId, tool_name: event.details.toolName, turn_id: event.details.turnId, arguments: event.details.arguments, reason: event.details.reason } });
    case "TOOL_LOG": return parse({ type, payload: { log_entry: event.details.logEntry, tool_invocation_id: event.details.toolInvocationId, tool_name: event.details.toolName, turn_id: event.details.turnId } });
    case "TODO_LIST_UPDATE": return parse({ type, payload: { todos: event.details.todos.map((todo) => ({ todo_id: todo.todoId, description: todo.description, status: todo.status })) } });
    case "SYSTEM_TASK_NOTIFICATION": return parse({ type, payload: { sender: event.details.sender.kind === "system" ? { kind: "system" } : { kind: "execution", identity: { agent_run_id: event.details.sender.identity.agentRunId, member_address: event.details.sender.identity.memberAddress } }, content: event.details.content } });
    case "ARTIFACT_PERSISTED": return parse({ type, payload: { artifact_id: event.details.artifactId, path: event.details.path, artifact_type: event.details.artifactType, status: event.details.status, description: event.details.description, revision_id: event.details.revisionId, created_at: event.details.createdAt, updated_at: event.details.updatedAt } });
    case "FILE_CHANGE": return parse({ type, payload: { file_change_id: event.details.fileChangeId, path: event.details.path, file_type: event.details.fileType, status: event.details.status, source_tool: event.details.sourceTool, source_invocation_id: event.details.sourceInvocationId, content: event.details.content, created_at: event.details.createdAt, updated_at: event.details.updatedAt } });
    case "MEMBER_INPUT_MESSAGE": return parse({ type, payload: {
      message_id: event.details.messageId, dedupe_key: event.details.dedupeKey, content: event.details.content,
      input_origin: event.details.inputOrigin, received_at: event.details.receivedAt,
      context_file_paths: event.details.contextFilePaths.map((item) => ({ path: item.path, type: item.type })),
      sender_agent_run_id: event.details.senderAgentRunId,
      parent_communication_message_id: event.details.parentCommunicationMessageId,
    } });
    case "ERROR": {
      const common = {
        code: event.details.code, message: event.details.message,
        ...(event.details.details !== undefined ? { details: event.details.details } : {}),
        ...(event.details.providerStatus !== undefined ? { provider_status: event.details.providerStatus } : {}),
        ...(event.details.providerCode !== undefined ? { provider_code: event.details.providerCode } : {}),
        ...(event.details.providerRequestId !== undefined ? { provider_request_id: event.details.providerRequestId } : {}),
      };
      if (event.details.errorScope === "turn") return parse({ type, payload: {
        ...common, error_scope: "turn", error_effect: event.details.errorEffect, turn_id: event.details.turnId,
      } });
      if (event.details.errorScope === "runtime") return parse({ type, payload: {
        ...common, error_scope: "runtime", error_effect: "terminal", turn_id: null,
      } });
      return parse({ type, payload: { ...common, error_scope: null, error_effect: null, turn_id: null } });
    }
  }
};
