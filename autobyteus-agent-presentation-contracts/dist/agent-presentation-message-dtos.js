import { z } from "zod";
import { agentAddressSchema, finiteNumberSchema, jsonValueSchema, nonEmptyStringSchema, nullableFiniteNumberSchema, nullableNonEmptyStringSchema, } from "./schema-helpers.js";
import { agentTokenUsageRunSummarySchema } from "./token-usage-presentation-dto.js";
const turnId = nullableNonEmptyStringSchema;
const segmentType = z.enum(["text", "tool_call", "write_file", "edit_file", "run_bash", "reasoning", "media"]);
const toolCore = { invocation_id: nonEmptyStringSchema, tool_name: nonEmptyStringSchema, turn_id: turnId };
const status = {
    status: z.enum(["offline", "initializing", "idle", "running", "error"]),
    trigger: nullableNonEmptyStringSchema,
    tool_name: nullableNonEmptyStringSchema,
    error_message: nullableNonEmptyStringSchema,
    error_details: nullableNonEmptyStringSchema,
};
const executionIdentity = z.object({ agent_run_id: nonEmptyStringSchema, member_address: agentAddressSchema }).strict();
const contextPath = z.object({ path: nonEmptyStringSchema, type: nullableNonEmptyStringSchema }).strict();
const token = {
    usage_event_id: nonEmptyStringSchema, idempotency_key: nonEmptyStringSchema, observed_at: nonEmptyStringSchema,
    turn_id: turnId, llm_call_id: nullableNonEmptyStringSchema, model_provider: nullableNonEmptyStringSchema,
    model_identifier: nullableNonEmptyStringSchema, model_value: nullableNonEmptyStringSchema,
    usage_scope: z.enum(["per_call", "per_turn", "cumulative_snapshot"]),
    input_token_semantic: z.enum(["gross_includes_cache", "base_excludes_cache", "unknown"]),
    standard_input_tokens: nullableFiniteNumberSchema, cache_miss_input_tokens: nullableFiniteNumberSchema,
    cache_read_input_tokens: nullableFiniteNumberSchema, cache_creation_input_tokens: nullableFiniteNumberSchema,
    cache_creation_5m_input_tokens: nullableFiniteNumberSchema, cache_creation_1h_input_tokens: nullableFiniteNumberSchema,
    cache_state: z.enum(["positive", "zero_reported", "not_reported", "unsupported_or_local", "unknown"]),
    reasoning_output_tokens: nullableFiniteNumberSchema, billable_output_tokens: nullableFiniteNumberSchema,
    meter_delta_input_tokens: nullableFiniteNumberSchema, meter_delta_output_tokens: nullableFiniteNumberSchema,
    meter_delta_total_tokens: nullableFiniteNumberSchema, input_price_per_million: nullableFiniteNumberSchema,
    output_price_per_million: nullableFiniteNumberSchema, cached_input_read_price_per_million: nullableFiniteNumberSchema,
    cached_input_write_price_per_million: nullableFiniteNumberSchema, cached_input_write_5m_price_per_million: nullableFiniteNumberSchema,
    cached_input_write_1h_price_per_million: nullableFiniteNumberSchema, estimated_api_input_cost: nullableFiniteNumberSchema,
    estimated_api_standard_input_cost: nullableFiniteNumberSchema, estimated_api_cache_read_input_cost: nullableFiniteNumberSchema,
    estimated_api_cache_creation_input_cost: nullableFiniteNumberSchema, estimated_api_cache_creation_5m_input_cost: nullableFiniteNumberSchema,
    estimated_api_cache_creation_1h_input_cost: nullableFiniteNumberSchema, estimated_api_output_cost: nullableFiniteNumberSchema,
    estimated_api_reasoning_output_cost: nullableFiniteNumberSchema, estimated_api_total_cost: nullableFiniteNumberSchema,
    currency: nullableNonEmptyStringSchema,
    api_cost_status: z.enum(["estimated", "price_missing", "partial_price_missing", "mixed", "local_no_api_bill"]),
    missing_price_dimensions: z.array(nonEmptyStringSchema), pricing_policy_key: nullableNonEmptyStringSchema,
    selected_pricing_tier_id: nullableNonEmptyStringSchema, latest_prompt_tokens: nullableFiniteNumberSchema,
    effective_context_window_tokens: nullableFiniteNumberSchema, context_window_usage_percent: nullableFiniteNumberSchema,
    run_summary_after_event: agentTokenUsageRunSummarySchema.nullable(), quality_flags: z.array(nonEmptyStringSchema),
};
const compaction = {
    phase: nullableNonEmptyStringSchema, kind: nullableNonEmptyStringSchema, status: nullableNonEmptyStringSchema,
    turn_id: turnId, compaction_operation_id: nullableNonEmptyStringSchema, requested_turn_id: nullableNonEmptyStringSchema,
    execution_turn_id: nullableNonEmptyStringSchema, selected_block_count: nullableFiniteNumberSchema,
    compacted_block_count: nullableFiniteNumberSchema, raw_trace_count: nullableFiniteNumberSchema,
    semantic_fact_count: nullableFiniteNumberSchema, compaction_agent_definition_id: nullableNonEmptyStringSchema,
    compaction_agent_name: nullableNonEmptyStringSchema, compaction_runtime_kind: nullableNonEmptyStringSchema,
    compaction_model_identifier: nullableNonEmptyStringSchema, compaction_run_id: nullableNonEmptyStringSchema,
    compaction_task_id: nullableNonEmptyStringSchema, error_message: nullableNonEmptyStringSchema,
    provider: nullableNonEmptyStringSchema, source_surface: nullableNonEmptyStringSchema,
    boundary_key: nullableNonEmptyStringSchema, provider_event_id: nullableNonEmptyStringSchema,
    provider_session_id: nullableNonEmptyStringSchema, provider_thread_id: nullableNonEmptyStringSchema,
    provider_timestamp: nullableFiniteNumberSchema, trigger: nullableNonEmptyStringSchema,
    pre_tokens: nullableFiniteNumberSchema, rotation_eligible: z.boolean().nullable(),
};
export const agentPresentationPayloadSchemas = {
    SYSTEM_INSTRUCTIONS_SUPPLIED: z.object({ trace_id: nonEmptyStringSchema, content: z.string(), ts: finiteNumberSchema.positive() }).strict(),
    TURN_STARTED: z.object({ turn_id: turnId }).strict(),
    TURN_COMPLETED: z.object({ turn_id: turnId, reason: nullableNonEmptyStringSchema }).strict(),
    TURN_INTERRUPTED: z.object({ turn_id: turnId, reason: nullableNonEmptyStringSchema }).strict(),
    SEGMENT_START: z.object({ segment_id: nonEmptyStringSchema, turn_id: nonEmptyStringSchema, segment_type: segmentType, metadata: jsonValueSchema.nullable() }).strict(),
    SEGMENT_CONTENT: z.object({ segment_id: nonEmptyStringSchema, turn_id: nonEmptyStringSchema, segment_type: segmentType, delta: z.string() }).strict(),
    SEGMENT_END: z.object({ segment_id: nonEmptyStringSchema, turn_id: nonEmptyStringSchema, metadata: jsonValueSchema.nullable(), interrupted: z.boolean(), reason: nullableNonEmptyStringSchema, failed: z.boolean(), error: nullableNonEmptyStringSchema }).strict(),
    AGENT_STATUS: z.object(status).strict(),
    COMPACTION_STATUS: z.object(compaction).strict(),
    TOKEN_USAGE_UPDATED: z.object(token).strict(),
    ASSISTANT_COMPLETE: z.object({ content: z.string().nullable(), reasoning: z.string().nullable(), usage: jsonValueSchema.nullable(), image_urls: z.array(nonEmptyStringSchema), audio_urls: z.array(nonEmptyStringSchema), video_urls: z.array(nonEmptyStringSchema) }).strict(),
    TOOL_APPROVAL_REQUESTED: z.object({ ...toolCore, arguments: jsonValueSchema }).strict(),
    TOOL_APPROVED: z.object({ ...toolCore, reason: nullableNonEmptyStringSchema }).strict(),
    TOOL_DENIED: z.object({ ...toolCore, arguments: jsonValueSchema.nullable(), reason: nullableNonEmptyStringSchema, error: nullableNonEmptyStringSchema }).strict(),
    TOOL_EXECUTION_STARTED: z.object({ ...toolCore, arguments: jsonValueSchema.nullable() }).strict(),
    TOOL_EXECUTION_SUCCEEDED: z.object({ ...toolCore, arguments: jsonValueSchema.nullable(), result: jsonValueSchema.nullable() }).strict(),
    TOOL_EXECUTION_FAILED: z.object({ ...toolCore, arguments: jsonValueSchema.nullable(), error: nonEmptyStringSchema }).strict(),
    TOOL_EXECUTION_INTERRUPTED: z.object({ ...toolCore, arguments: jsonValueSchema.nullable(), reason: nonEmptyStringSchema }).strict(),
    TOOL_LOG: z.object({ log_entry: z.string(), tool_invocation_id: nonEmptyStringSchema, tool_name: nonEmptyStringSchema, turn_id: turnId }).strict(),
    TODO_LIST_UPDATE: z.object({ todos: z.array(z.object({ todo_id: nonEmptyStringSchema, description: z.string(), status: z.enum(["pending", "in_progress", "done"]) }).strict()) }).strict(),
    SYSTEM_TASK_NOTIFICATION: z.object({ sender: z.union([z.object({ kind: z.literal("system") }).strict(), z.object({ kind: z.literal("execution"), identity: executionIdentity }).strict()]), content: z.string() }).strict(),
    ARTIFACT_PERSISTED: z.object({ artifact_id: nonEmptyStringSchema, path: nonEmptyStringSchema, artifact_type: nonEmptyStringSchema, status: z.literal("available"), description: z.string().nullable(), revision_id: nonEmptyStringSchema, created_at: nonEmptyStringSchema, updated_at: nonEmptyStringSchema }).strict(),
    FILE_CHANGE: z.object({ file_change_id: nonEmptyStringSchema, path: nonEmptyStringSchema, file_type: nonEmptyStringSchema, status: nonEmptyStringSchema, source_tool: nonEmptyStringSchema, source_invocation_id: nullableNonEmptyStringSchema, content: z.string().nullable(), created_at: nonEmptyStringSchema, updated_at: nonEmptyStringSchema }).strict(),
    MEMBER_INPUT_MESSAGE: z.object({ message_id: nonEmptyStringSchema, dedupe_key: nonEmptyStringSchema, content: z.string(), input_origin: z.enum(["user_message", "inter_agent_delivery"]), received_at: nonEmptyStringSchema, context_file_paths: z.array(contextPath), sender_agent_run_id: nonEmptyStringSchema.nullable(), parent_communication_message_id: nonEmptyStringSchema.nullable() }).strict(),
    EXTERNAL_USER_MESSAGE: z.object({ content: z.string(), received_at: nonEmptyStringSchema, provider: nonEmptyStringSchema, transport: nonEmptyStringSchema, account_id: nonEmptyStringSchema, peer_id: nonEmptyStringSchema, thread_id: nonEmptyStringSchema.nullable(), external_message_id: nonEmptyStringSchema, context_file_paths: z.array(contextPath) }).strict(),
};
const errorCommon = {
    code: nonEmptyStringSchema, message: nonEmptyStringSchema, details: z.string().nullable().optional(),
    provider_status: z.union([z.number().finite(), nonEmptyStringSchema]).nullable().optional(),
    provider_code: nullableNonEmptyStringSchema.optional(), provider_request_id: nullableNonEmptyStringSchema.optional(),
};
export const agentPresentationErrorPayloadSchemas = {
    unscoped: z.object({ ...errorCommon, error_scope: z.null(), error_effect: z.null(), turn_id: z.null() }).strict(),
    turn: z.object({ ...errorCommon, error_scope: z.literal("turn"), error_effect: z.enum(["diagnostic", "terminal"]), turn_id: nonEmptyStringSchema }).strict(),
    runtime: z.object({ ...errorCommon, error_scope: z.literal("runtime"), error_effect: z.literal("terminal"), turn_id: z.null() }).strict(),
};
export const agentPresentationErrorPayloadSchema = z.union([
    agentPresentationErrorPayloadSchemas.unscoped,
    agentPresentationErrorPayloadSchemas.turn,
    agentPresentationErrorPayloadSchemas.runtime,
]);
const variants = Object.entries(agentPresentationPayloadSchemas).map(([type, payload]) => z.object({ type: z.literal(type), payload }).strict());
export const agentPresentationMessageSchema = z.union([
    ...variants,
    z.object({ type: z.literal("ERROR"), payload: agentPresentationErrorPayloadSchema }).strict(),
]);
//# sourceMappingURL=agent-presentation-message-dtos.js.map