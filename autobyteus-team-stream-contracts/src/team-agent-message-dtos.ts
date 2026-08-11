import { z } from "zod";
import {
  finiteNumberSchema,
  jsonValueSchema,
  nonEmptyStringSchema,
  nullableFiniteNumberSchema,
  nullableNonEmptyStringSchema,
} from "./schema-helpers.js";
import { teamAgentExecutionBindingDtoSchema, teamExecutionAddressDtoSchema } from "./team-execution-address-dto.js";

const turnId = nullableNonEmptyStringSchema;
const withExecution = <T extends z.ZodRawShape>(shape: T) => z.object({
  agent_execution: teamAgentExecutionBindingDtoSchema,
  ...shape,
}).strict();

const statusDetails = {
  status: z.enum(["offline", "initializing", "idle", "running", "error"]),
  trigger: nullableNonEmptyStringSchema,
  tool_name: nullableNonEmptyStringSchema,
  error_message: nullableNonEmptyStringSchema,
  error_details: nullableNonEmptyStringSchema,
};

const tokenUsageDetails = {
  usage_event_id: nonEmptyStringSchema,
  idempotency_key: nonEmptyStringSchema,
  observed_at: nonEmptyStringSchema,
  turn_id: nullableNonEmptyStringSchema,
  llm_call_id: nullableNonEmptyStringSchema,
  model_provider: nullableNonEmptyStringSchema,
  model_identifier: nullableNonEmptyStringSchema,
  model_value: nullableNonEmptyStringSchema,
  usage_scope: z.enum(["per_call", "per_turn", "cumulative_snapshot"]),
  input_token_semantic: z.enum(["gross_includes_cache", "base_excludes_cache", "unknown"]),
  standard_input_tokens: nullableFiniteNumberSchema,
  cache_miss_input_tokens: nullableFiniteNumberSchema,
  cache_read_input_tokens: nullableFiniteNumberSchema,
  cache_creation_input_tokens: nullableFiniteNumberSchema,
  cache_creation_5m_input_tokens: nullableFiniteNumberSchema,
  cache_creation_1h_input_tokens: nullableFiniteNumberSchema,
  cache_state: z.enum(["positive", "zero_reported", "not_reported", "unsupported_or_local", "unknown"]),
  reasoning_output_tokens: nullableFiniteNumberSchema,
  billable_output_tokens: nullableFiniteNumberSchema,
  meter_delta_input_tokens: nullableFiniteNumberSchema,
  meter_delta_output_tokens: nullableFiniteNumberSchema,
  meter_delta_total_tokens: nullableFiniteNumberSchema,
  input_price_per_million: nullableFiniteNumberSchema,
  output_price_per_million: nullableFiniteNumberSchema,
  cached_input_read_price_per_million: nullableFiniteNumberSchema,
  cached_input_write_price_per_million: nullableFiniteNumberSchema,
  cached_input_write_5m_price_per_million: nullableFiniteNumberSchema,
  cached_input_write_1h_price_per_million: nullableFiniteNumberSchema,
  estimated_api_input_cost: nullableFiniteNumberSchema,
  estimated_api_standard_input_cost: nullableFiniteNumberSchema,
  estimated_api_cache_read_input_cost: nullableFiniteNumberSchema,
  estimated_api_cache_creation_input_cost: nullableFiniteNumberSchema,
  estimated_api_cache_creation_5m_input_cost: nullableFiniteNumberSchema,
  estimated_api_cache_creation_1h_input_cost: nullableFiniteNumberSchema,
  estimated_api_output_cost: nullableFiniteNumberSchema,
  estimated_api_reasoning_output_cost: nullableFiniteNumberSchema,
  estimated_api_total_cost: nullableFiniteNumberSchema,
  currency: nullableNonEmptyStringSchema,
  api_cost_status: z.enum(["estimated", "price_missing", "partial_price_missing", "mixed", "local_no_api_bill"]),
  missing_price_dimensions: z.array(nonEmptyStringSchema),
  pricing_policy_key: nullableNonEmptyStringSchema,
  selected_pricing_tier_id: nullableNonEmptyStringSchema,
  latest_prompt_tokens: nullableFiniteNumberSchema,
  effective_context_window_tokens: nullableFiniteNumberSchema,
  context_window_usage_percent: nullableFiniteNumberSchema,
  quality_flags: z.array(nonEmptyStringSchema),
};

const compactionDetails = {
  phase: nullableNonEmptyStringSchema,
  kind: nullableNonEmptyStringSchema,
  status: nullableNonEmptyStringSchema,
  turn_id: turnId,
  compaction_operation_id: nullableNonEmptyStringSchema,
  requested_turn_id: nullableNonEmptyStringSchema,
  execution_turn_id: nullableNonEmptyStringSchema,
  selected_block_count: nullableFiniteNumberSchema,
  compacted_block_count: nullableFiniteNumberSchema,
  raw_trace_count: nullableFiniteNumberSchema,
  semantic_fact_count: nullableFiniteNumberSchema,
  compaction_agent_definition_id: nullableNonEmptyStringSchema,
  compaction_agent_name: nullableNonEmptyStringSchema,
  compaction_runtime_kind: nullableNonEmptyStringSchema,
  compaction_model_identifier: nullableNonEmptyStringSchema,
  compaction_run_id: nullableNonEmptyStringSchema,
  compaction_task_id: nullableNonEmptyStringSchema,
  error_message: nullableNonEmptyStringSchema,
  provider: nullableNonEmptyStringSchema,
  source_surface: nullableNonEmptyStringSchema,
  boundary_key: nullableNonEmptyStringSchema,
  provider_event_id: nullableNonEmptyStringSchema,
  provider_session_id: nullableNonEmptyStringSchema,
  provider_thread_id: nullableNonEmptyStringSchema,
  provider_timestamp: nullableFiniteNumberSchema,
  trigger: nullableNonEmptyStringSchema,
  pre_tokens: nullableFiniteNumberSchema,
  rotation_eligible: z.boolean().nullable(),
};

const toolCore = {
  invocation_id: nonEmptyStringSchema,
  tool_name: nonEmptyStringSchema,
  turn_id: turnId,
};

export const teamAgentPayloadSchemas = {
  TURN_STARTED: withExecution({ turn_id: turnId }),
  TURN_COMPLETED: withExecution({ turn_id: turnId, reason: nullableNonEmptyStringSchema }),
  TURN_INTERRUPTED: withExecution({ turn_id: turnId, reason: nullableNonEmptyStringSchema }),
  SEGMENT_START: withExecution({ segment_id: nonEmptyStringSchema, turn_id: turnId, segment_type: nonEmptyStringSchema, metadata: jsonValueSchema.nullable() }),
  SEGMENT_CONTENT: withExecution({ segment_id: nonEmptyStringSchema, turn_id: turnId, segment_type: nonEmptyStringSchema, delta: z.string() }),
  SEGMENT_END: withExecution({ segment_id: nonEmptyStringSchema, turn_id: turnId, metadata: jsonValueSchema.nullable(), interrupted: z.boolean(), reason: nullableNonEmptyStringSchema, failed: z.boolean(), error: nullableNonEmptyStringSchema }),
  AGENT_STATUS: withExecution(statusDetails),
  COMPACTION_STATUS: withExecution(compactionDetails),
  TOKEN_USAGE_UPDATED: withExecution(tokenUsageDetails),
  ASSISTANT_COMPLETE: withExecution({ content: z.string().nullable(), reasoning: z.string().nullable(), usage: jsonValueSchema.nullable(), image_urls: z.array(nonEmptyStringSchema), audio_urls: z.array(nonEmptyStringSchema), video_urls: z.array(nonEmptyStringSchema) }),
  TOOL_APPROVAL_REQUESTED: withExecution({ ...toolCore, arguments: jsonValueSchema }),
  TOOL_APPROVED: withExecution({ ...toolCore, reason: nullableNonEmptyStringSchema }),
  TOOL_DENIED: withExecution({ ...toolCore, arguments: jsonValueSchema.nullable(), reason: nullableNonEmptyStringSchema, error: nullableNonEmptyStringSchema }),
  TOOL_EXECUTION_STARTED: withExecution({ ...toolCore, arguments: jsonValueSchema.nullable() }),
  TOOL_EXECUTION_SUCCEEDED: withExecution({ ...toolCore, arguments: jsonValueSchema.nullable(), result: jsonValueSchema.nullable() }),
  TOOL_EXECUTION_FAILED: withExecution({ ...toolCore, arguments: jsonValueSchema.nullable(), error: nonEmptyStringSchema }),
  TOOL_EXECUTION_INTERRUPTED: withExecution({ ...toolCore, arguments: jsonValueSchema.nullable(), reason: nonEmptyStringSchema }),
  TOOL_LOG: withExecution({ log_entry: z.string(), tool_invocation_id: nonEmptyStringSchema, tool_name: nonEmptyStringSchema, turn_id: turnId }),
  TODO_LIST_UPDATE: withExecution({ todos: z.array(z.object({ todo_id: nonEmptyStringSchema, description: z.string(), status: z.enum(["pending", "in_progress", "done"]) }).strict()) }),
  SYSTEM_TASK_NOTIFICATION: withExecution({ sender: z.union([z.object({ kind: z.literal("system") }).strict(), z.object({ kind: z.literal("execution"), execution_address: teamExecutionAddressDtoSchema }).strict()]), content: z.string() }),
  ARTIFACT_PERSISTED: withExecution({ artifact_id: nonEmptyStringSchema, path: nonEmptyStringSchema, artifact_type: nonEmptyStringSchema, status: z.literal("available"), description: z.string().nullable(), revision_id: nonEmptyStringSchema, created_at: nonEmptyStringSchema, updated_at: nonEmptyStringSchema }),
  FILE_CHANGE: withExecution({ file_change_id: nonEmptyStringSchema, path: nonEmptyStringSchema, file_type: nonEmptyStringSchema, status: nonEmptyStringSchema, source_tool: nonEmptyStringSchema, source_invocation_id: nullableNonEmptyStringSchema, content: z.string().nullable(), created_at: nonEmptyStringSchema, updated_at: nonEmptyStringSchema }),
} as const;

export const teamAgentErrorPayloadSchema = z.union([
  z.object({ code: nonEmptyStringSchema, message: z.string(), agent_execution: teamAgentExecutionBindingDtoSchema }).strict(),
  z.object({ code: nonEmptyStringSchema, message: z.string(), agent_execution: z.null() }).strict(),
]);

export const teamInterruptCommandAckPayloadSchema = z.union([
  z.object({ command_type: z.literal("INTERRUPT_GENERATION"), command_id: nonEmptyStringSchema, state: z.literal("accepted"), execution_address: teamExecutionAddressDtoSchema }).strict(),
  z.object({ command_type: z.literal("INTERRUPT_GENERATION"), command_id: nonEmptyStringSchema, state: z.enum(["rejected", "failed"]), code: nonEmptyStringSchema, message: z.string(), execution_address: teamExecutionAddressDtoSchema }).strict(),
]);

export type TeamAgentMessageType = keyof typeof teamAgentPayloadSchemas;
export type TeamAgentPayload<T extends TeamAgentMessageType> = Readonly<z.infer<(typeof teamAgentPayloadSchemas)[T]>>;
