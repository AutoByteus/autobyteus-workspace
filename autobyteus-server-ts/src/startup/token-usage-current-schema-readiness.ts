import type { PrismaClient } from "@prisma/client";
import { rootPrismaClient } from "repository_prisma";

const RUN_COLUMNS = new Set([
  "id", "run_id", "revision", "persisted_at", "root_team_run_id", "root_attribution_status",
  "agent_definition_id", "workspace_id", "task_id", "team_name", "agent_name", "run_summary",
  "run_created_at", "member_display_name", "first_observed_at", "latest_observed_at",
  "latest_observation_generation", "latest_observation_ordinal", "usage_report_count",
  "accounting_input_tokens", "accounting_output_tokens", "accounting_total_tokens",
  "standard_input_tokens", "cache_miss_input_tokens", "cache_read_input_tokens",
  "cache_creation_input_tokens", "cache_creation_5m_input_tokens", "cache_creation_1h_input_tokens",
  "reasoning_output_tokens", "billable_input_tokens", "billable_output_tokens",
  "estimated_api_input_cost", "estimated_api_standard_input_cost", "estimated_api_cache_read_input_cost",
  "estimated_api_cache_creation_input_cost", "estimated_api_cache_creation_5m_input_cost",
  "estimated_api_cache_creation_1h_input_cost", "estimated_api_output_cost",
  "estimated_api_reasoning_output_cost", "estimated_api_total_cost", "cache_state", "currency",
  "api_cost_status", "pricing_summary_json", "quality_flags_json", "latest_runtime_kind",
  "latest_model_provider", "latest_provider_name", "latest_model_identifier", "latest_model_value",
  "identity_summary_json", "latest_prompt_tokens", "effective_context_window_tokens",
  "context_window_usage_percent", "snapshot_series_state_json", "recent_idempotency_digests_json",
]);
const ANALYTICS_COLUMNS = new Set([
  "id", "bucket_start", "facet_key", "identity_key", "provider_key", "model_key", "runtime_kind",
  "model_provider", "provider_name", "model_identifier", "model_value", "cache_state", "pricing_summary_json",
  "accounting_input_tokens", "accounting_output_tokens", "accounting_total_tokens", "standard_input_tokens",
  "cache_miss_input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens",
  "cache_creation_5m_input_tokens", "cache_creation_1h_input_tokens", "reasoning_output_tokens",
  "billable_input_tokens", "billable_output_tokens", "estimated_api_input_cost",
  "estimated_api_standard_input_cost", "estimated_api_cache_read_input_cost",
  "estimated_api_cache_creation_input_cost", "estimated_api_cache_creation_5m_input_cost",
  "estimated_api_cache_creation_1h_input_cost", "estimated_api_output_cost",
  "estimated_api_reasoning_output_cost", "estimated_api_total_cost", "usage_report_count", "latest_observed_at",
]);
type TableColumn = { name: string };
type IndexRow = { name: string; unique: number | bigint };
type IndexColumn = { name: string };

const assertColumns = async (prisma: PrismaClient, table: string, required: Set<string>): Promise<void> => {
  const columns = await prisma.$queryRawUnsafe<TableColumn[]>(`PRAGMA table_info(${JSON.stringify(table)})`);
  const present = new Set(columns.map(({ name }) => name));
  const missing = [...required].filter((name) => !present.has(name));
  if (missing.length > 0) throw new Error(`TOKEN_USAGE_CURRENT_SCHEMA_COLUMNS_MISSING:${table}:${missing.slice(0, 8).join(",")}`);
};

const assertUnique = async (prisma: PrismaClient, table: string, expected: string[]): Promise<void> => {
  const indexes = await prisma.$queryRawUnsafe<IndexRow[]>(`PRAGMA index_list(${JSON.stringify(table)})`);
  for (const index of indexes) {
    if (Number(index.unique) !== 1) continue;
    const columns = await prisma.$queryRawUnsafe<IndexColumn[]>(`PRAGMA index_info(${JSON.stringify(index.name)})`);
    if (columns.map(({ name }) => name).join("\0") === expected.join("\0")) return;
  }
  throw new Error(`TOKEN_USAGE_CURRENT_SCHEMA_UNIQUE_CONSTRAINT_MISSING:${table}:${expected.join(",")}`);
};

export const assertTokenUsageCurrentSchema = async (
  prisma: PrismaClient = rootPrismaClient,
): Promise<void> => {
  await assertColumns(prisma, "token_usage_run_records", RUN_COLUMNS);
  await assertUnique(prisma, "token_usage_run_records", ["run_id"]);
  await assertColumns(prisma, "token_usage_analytics_coverage", new Set(["id", "coverage_start"]));
  await assertColumns(prisma, "token_usage_analytics_daily_facets", ANALYTICS_COLUMNS);
  await assertUnique(prisma, "token_usage_analytics_daily_facets", ["bucket_start", "facet_key"]);
};
