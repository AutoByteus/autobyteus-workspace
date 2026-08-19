import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  createTokenUsageUpdatedPayload,
  type TokenUsageUpdatedPayload,
} from "../../src/agent-execution/domain/agent-run-token-usage.js";
import { emptyTrustedDimensions, type ResolvedTokenPricingPolicy } from "../../src/token-usage/pricing/token-pricing-policy.js";
import { TokenUsageMigrationReadiness } from "../../src/token-usage/providers/token-usage-migration-readiness.js";
import { TokenUsageRunStore } from "../../src/token-usage/providers/token-usage-run-store.js";
import { SqlTokenUsageRunRepository } from "../../src/token-usage/repositories/sql/token-usage-run-repository.js";
import { TokenUsageRunAccumulator } from "../../src/token-usage/services/token-usage-run-accumulator.js";

const noLookupPricingPolicy: ResolvedTokenPricingPolicy = {
  pricing_policy_key: null,
  price_config_id: null,
  model_provider: null,
  model_identifier: null,
  model_value: null,
  canonical_name: null,
  currency: null,
  input_price_per_million: null,
  output_price_per_million: null,
  cached_input_read_price_per_million: null,
  cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null,
  input_price_tiers: [],
  pricing_status: "missing",
  trusted_dimensions: emptyTrustedDimensions(),
  missing_reason: "deterministic-test-payload",
  source: null,
  effective_from: null,
  effective_to: null,
  version: null,
};

export const passthroughTokenCostCalculator = {
  resolvePolicy: async () => noLookupPricingPolicy,
  applyPolicy: (payload: TokenUsageUpdatedPayload) => payload,
};

export const createCurrentTokenUsageTestHarness = (
  prisma: PrismaClient,
  options: { useProcessReadiness?: boolean } = {},
) => {
  const repository = new SqlTokenUsageRunRepository(prisma);
  const accumulator = new TokenUsageRunAccumulator(repository, passthroughTokenCostCalculator as never);
  const readiness = options.useProcessReadiness
    ? new TokenUsageMigrationReadiness()
    : {
        assertCurrentSchemaReady: () => undefined,
        assertHistoricalReadReady: () => undefined,
      };
  const store = new TokenUsageRunStore(
    repository,
    accumulator,
    { capture: async (payload: TokenUsageUpdatedPayload) => payload } as never,
    readiness as never,
  );
  return { repository, accumulator, store };
};

type PayloadInput = Readonly<{
  runId?: string;
  eventId?: string;
  idempotencyKey?: string;
  observedAt?: string;
  runCreatedAt?: string | null;
  rootTeamRunId?: string | null;
  taskId?: string | null;
  teamName?: string | null;
  agentName?: string | null;
  memberDisplayName?: string | null;
  usageScope?: "per_call" | "per_turn" | "cumulative_snapshot";
  snapshotSeriesKey?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  sourceInputTokens?: number;
  sourceOutputTokens?: number;
  standardInputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  reasoningTokens?: number;
  billableOutputTokens?: number;
  runtimeKind?: string;
  ingestionKind?: string;
  modelProvider?: string | null;
  providerName?: string | null;
  modelIdentifier?: string | null;
  modelValue?: string | null;
  currency?: string | null;
  apiCostStatus?: TokenUsageUpdatedPayload["api_cost_status"];
  pricingStatus?: TokenUsageUpdatedPayload["pricing_status"];
  pricingPolicyKey?: string | null;
  inputPricePerMillion?: number | null;
  outputPricePerMillion?: number | null;
  inputCost?: number | null;
  outputCost?: number | null;
  reasoningCost?: number | null;
  totalCost?: number | null;
  latestPromptTokens?: number | null;
  effectiveContextWindowTokens?: number | null;
  contextWindowUsagePercent?: number | null;
  qualityFlags?: string[];
}>;

export const buildCurrentTokenUsagePayload = (input: PayloadInput = {}): TokenUsageUpdatedPayload => {
  const runId = input.runId ?? `token-run-${randomUUID()}`;
  const eventId = input.eventId ?? `usage-${randomUUID()}`;
  const inputTokens = input.inputTokens ?? 10;
  const outputTokens = input.outputTokens ?? 5;
  const cacheReadTokens = input.cacheReadTokens ?? 0;
  const cacheCreationTokens = input.cacheCreationTokens ?? 0;
  const standardInputTokens = input.standardInputTokens ?? Math.max(inputTokens - cacheReadTokens - cacheCreationTokens, 0);
  const reasoningTokens = input.reasoningTokens ?? 0;
  const billableOutputTokens = input.billableOutputTokens ?? outputTokens;
  const totalTokens = inputTokens + outputTokens;
  const sourceInputTokens = input.sourceInputTokens ?? inputTokens;
  const sourceOutputTokens = input.sourceOutputTokens ?? outputTokens;
  const status = input.apiCostStatus ?? (input.totalCost === null ? "price_missing" : "estimated");
  const pricingStatus = input.pricingStatus ?? (status === "local_no_api_bill"
    ? "local_no_api_bill"
    : input.totalCost === null ? "missing" : "trusted");
  const sourceTokens = {
    reported_input_tokens: sourceInputTokens,
    reported_output_tokens: sourceOutputTokens,
    reported_total_tokens: sourceInputTokens + sourceOutputTokens,
    accounting_input_tokens: sourceInputTokens,
    accounting_output_tokens: sourceOutputTokens,
    accounting_total_tokens: sourceInputTokens + sourceOutputTokens,
    standard_input_tokens: Math.max(sourceInputTokens - cacheReadTokens - cacheCreationTokens, 0),
    cache_miss_input_tokens: Math.max(sourceInputTokens - cacheReadTokens - cacheCreationTokens, 0),
    cache_read_input_tokens: cacheReadTokens,
    cache_creation_input_tokens: cacheCreationTokens,
    cache_creation_5m_input_tokens: 0,
    cache_creation_1h_input_tokens: 0,
    reasoning_output_tokens: reasoningTokens,
    billable_input_tokens: sourceInputTokens,
    billable_output_tokens: billableOutputTokens,
  };
  return createTokenUsageUpdatedPayload({
    runId,
    payload: {
      usage_event_id: eventId,
      idempotency_key: input.idempotencyKey ?? `idem:${eventId}`,
      observed_at: input.observedAt ?? "2026-08-19T12:00:00.000Z",
      run_created_at: input.runCreatedAt,
      root_team_run_id: input.rootTeamRunId,
      task_id: input.taskId,
      team_name: input.teamName,
      agent_name: input.agentName,
      member_display_name: input.memberDisplayName,
      runtime_kind: input.runtimeKind ?? "autobyteus",
      ingestion_kind: input.ingestionKind ?? "autobyteus_llm_phase",
      usage_scope: input.usageScope ?? "per_call",
      snapshot_series_key: input.snapshotSeriesKey,
      input_token_semantic: "gross_includes_cache",
      reported_input_tokens: inputTokens,
      reported_output_tokens: outputTokens,
      reported_total_tokens: totalTokens,
      accounting_input_tokens: inputTokens,
      accounting_output_tokens: outputTokens,
      accounting_total_tokens: totalTokens,
      standard_input_tokens: standardInputTokens,
      cache_miss_input_tokens: standardInputTokens,
      cache_read_input_tokens: cacheReadTokens,
      cache_creation_input_tokens: cacheCreationTokens,
      cache_creation_5m_input_tokens: 0,
      cache_creation_1h_input_tokens: 0,
      cache_state: cacheReadTokens > 0 || cacheCreationTokens > 0 ? "positive" : "not_reported",
      reasoning_output_tokens: reasoningTokens,
      billable_input_tokens: inputTokens,
      billable_output_tokens: billableOutputTokens,
      model_provider: input.modelProvider ?? "OPENAI",
      provider_name: input.providerName,
      model_identifier: input.modelIdentifier ?? "gpt-test",
      model_value: input.modelValue,
      pricing_status: pricingStatus,
      api_cost_status: status,
      currency: input.currency ?? (status === "local_no_api_bill" || status === "price_missing" ? null : "USD"),
      pricing_policy_key: input.pricingPolicyKey,
      input_price_per_million: input.inputPricePerMillion,
      output_price_per_million: input.outputPricePerMillion,
      estimated_api_input_cost: input.inputCost,
      estimated_api_standard_input_cost: input.inputCost,
      estimated_api_output_cost: input.outputCost,
      estimated_api_reasoning_output_cost: input.reasoningCost,
      estimated_api_total_cost: input.totalCost,
      latest_prompt_tokens: input.latestPromptTokens,
      effective_context_window_tokens: input.effectiveContextWindowTokens,
      context_window_usage_percent: input.contextWindowUsagePercent,
      quality_flags: input.qualityFlags ?? [],
      raw_event_json: input.usageScope === "cumulative_snapshot"
        ? { autobyteus_cumulative_snapshot_source_tokens: sourceTokens }
        : null,
    },
  });
};
