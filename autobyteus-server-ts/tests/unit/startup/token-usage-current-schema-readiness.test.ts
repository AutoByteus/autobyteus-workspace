import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { assertTokenUsageCurrentSchema } from '../../../src/startup/token-usage-current-schema-readiness.js';

const fakePrisma = (omitSdkColumn: boolean): PrismaClient => ({
  $queryRawUnsafe: async (sql: string) => {
    if (sql.includes('table_info')) {
      const table = /table_info\("([^"]+)"\)/.exec(sql)?.[1];
      if (table === 'token_usage_run_records') {
        // Start from the fixed expected list parsed from the current Prisma model's mapped fields.
        const names = [
          'id', 'run_id', 'revision', 'persisted_at', 'root_team_run_id', 'root_attribution_status',
          'agent_definition_id', 'workspace_id', 'task_id', 'team_name', 'agent_name', 'run_summary',
          'run_created_at', 'member_display_name', 'first_observed_at', 'latest_observed_at',
          'latest_observation_generation', 'latest_observation_ordinal', 'usage_report_count',
          'accounting_input_tokens', 'accounting_output_tokens', 'accounting_total_tokens',
          'standard_input_tokens', 'cache_miss_input_tokens', 'cache_read_input_tokens',
          'cache_creation_input_tokens', 'cache_creation_5m_input_tokens', 'cache_creation_1h_input_tokens',
          'reasoning_output_tokens', 'billable_input_tokens', 'billable_output_tokens',
          'estimated_api_input_cost', 'estimated_api_standard_input_cost', 'estimated_api_cache_read_input_cost',
          'estimated_api_cache_creation_input_cost', 'estimated_api_cache_creation_5m_input_cost',
          'estimated_api_cache_creation_1h_input_cost', 'estimated_api_output_cost',
          'estimated_api_reasoning_output_cost', 'estimated_api_total_cost', 'cache_state', 'currency',
          'api_cost_status', 'pricing_summary_json', 'quality_flags_json', 'latest_runtime_kind',
          'latest_model_provider', 'latest_provider_name', 'latest_model_identifier', 'latest_model_value',
          'identity_summary_json', 'latest_prompt_tokens', 'effective_context_window_tokens',
          'context_window_usage_percent', 'snapshot_series_state_json', 'recent_idempotency_digests_json',
          ...omitSdkColumn ? [] : ['claude_sdk_usage_state_json'],
        ];
        return names.map((name) => ({ name }));
      }
      if (table === 'token_usage_analytics_coverage') return [{ name: 'id' }, { name: 'coverage_start' }];
      // This fixture checks the run-column gate before analytics details.
      return [];
    }
    if (sql.includes('index_list')) return [{ name: 'unique_run', unique: 1 }];
    if (sql.includes('index_info')) return [{ name: 'run_id' }];
    return [];
  },
}) as unknown as PrismaClient;

describe('token usage current-schema readiness', () => {
  it('fails closed when the nullable Claude SDK checkpoint column is absent', async () => {
    await expect(assertTokenUsageCurrentSchema(fakePrisma(true)))
      .rejects.toThrow('TOKEN_USAGE_CURRENT_SCHEMA_COLUMNS_MISSING:token_usage_run_records:claude_sdk_usage_state_json');
  });
});
