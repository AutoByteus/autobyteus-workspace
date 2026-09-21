import { z } from "zod";
import { finiteNumberSchema, nonEmptyStringSchema, nullableFiniteNumberSchema, nullableNonEmptyStringSchema } from "./schema-helpers.js";

const nonNegativeInteger = z.number().int().nonnegative().safe();
const unitPrice = z.object({
  status: z.enum(["single", "mixed", "missing", "partial_missing", "not_applicable", "local_no_api_bill"]),
  price_per_million: nullableFiniteNumberSchema,
}).strict();

export const agentTokenUsageRunSummarySchema = z.object({
  run_id: nonEmptyStringSchema,
  agent_definition_id: nullableNonEmptyStringSchema,
  workspace_id: nullableNonEmptyStringSchema,
  gross_input_tokens: nonNegativeInteger,
  standard_input_tokens: nonNegativeInteger,
  cache_miss_input_tokens: nonNegativeInteger,
  cache_read_input_tokens: nonNegativeInteger,
  cache_creation_input_tokens: nonNegativeInteger,
  cache_creation_5m_input_tokens: nonNegativeInteger,
  cache_creation_1h_input_tokens: nonNegativeInteger,
  output_tokens: nonNegativeInteger,
  reasoning_output_tokens: nonNegativeInteger,
  billable_output_tokens: nonNegativeInteger,
  total_tokens: nonNegativeInteger,
  cache_read_input_token_rate: nullableFiniteNumberSchema,
  standard_input_token_rate: nullableFiniteNumberSchema,
  cache_creation_input_token_rate: nullableFiniteNumberSchema,
  cache_state: z.enum(["positive", "zero_reported", "not_reported", "unsupported_or_local", "unknown"]),
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
  unit_prices: z.object({
    standard_input: unitPrice,
    cache_read_input: unitPrice,
    cache_creation_input: unitPrice,
    cache_creation_5m_input: unitPrice,
    cache_creation_1h_input: unitPrice,
    output: unitPrice,
    reasoning_output: unitPrice,
  }).strict(),
  latest_prompt_tokens: nonNegativeInteger.nullable(),
  effective_context_window_tokens: nonNegativeInteger.nullable(),
  context_window_usage_percent: finiteNumberSchema.nullable(),
  latest_model_provider: nullableNonEmptyStringSchema,
  latest_model_identifier: nullableNonEmptyStringSchema,
  latest_runtime_kind: nullableNonEmptyStringSchema,
  usage_report_count: nonNegativeInteger,
  updated_at: nullableNonEmptyStringSchema,
}).strict();

export type AgentTokenUsageRunSummary = Readonly<z.infer<typeof agentTokenUsageRunSummarySchema>>;
