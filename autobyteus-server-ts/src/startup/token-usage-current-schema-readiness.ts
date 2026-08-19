import type { PrismaClient } from "@prisma/client";
import { rootPrismaClient } from "repository_prisma";

const REQUIRED_COLUMNS = new Set([
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

type TableColumn = { name: string };
type IndexRow = { name: string; unique: number | bigint };
type IndexColumn = { name: string };

export const assertTokenUsageCurrentSchema = async (
  prisma: PrismaClient = rootPrismaClient,
): Promise<void> => {
  const columns = await prisma.$queryRawUnsafe<TableColumn[]>(
    'PRAGMA table_info("token_usage_run_records")',
  );
  const present = new Set(columns.map(({ name }) => name));
  const missing = [...REQUIRED_COLUMNS].filter((name) => !present.has(name));
  if (missing.length > 0) {
    throw new Error(`TOKEN_USAGE_CURRENT_SCHEMA_COLUMNS_MISSING:${missing.slice(0, 8).join(",")}`);
  }
  const indexes = await prisma.$queryRawUnsafe<IndexRow[]>(
    'PRAGMA index_list("token_usage_run_records")',
  );
  let uniqueRunId = false;
  for (const index of indexes) {
    if (Number(index.unique) !== 1) continue;
    const indexColumns = await prisma.$queryRawUnsafe<IndexColumn[]>(
      `PRAGMA index_info(${JSON.stringify(index.name)})`,
    );
    if (indexColumns.length === 1 && indexColumns[0]?.name === "run_id") {
      uniqueRunId = true;
      break;
    }
  }
  if (!uniqueRunId) throw new Error("TOKEN_USAGE_CURRENT_SCHEMA_RUN_ID_UNIQUE_CONSTRAINT_MISSING");
};
