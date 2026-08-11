import {
  Prisma,
  type TokenUsageLedgerEvent as PrismaTokenUsageLedgerEvent,
} from "@prisma/client";
import { BaseRepository } from "repository_prisma";
import { getPrismaClient } from "repository_prisma";
import type { TokenUsageUpdatedPayload } from "../../../agent-execution/domain/agent-run-token-usage.js";
import { normalizeTokenUsageExecutionAddress } from "../../domain/execution-address.js";
import { isCacheState, isInputTokenSemantic } from "../../domain/token-usage-component-basis.js";

const toJsonString = (value: unknown): string | null =>
  value === undefined || value === null ? null : JSON.stringify(value);

const parseJson = (value: string | null): unknown => {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const normalizeDate = (value: string | Date | null | undefined): Date => {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
};

const normalizeNullableDate = (value: string | Date | null | undefined): Date | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toCreateInput = (payload: TokenUsageUpdatedPayload): Prisma.TokenUsageLedgerEventCreateInput => ({
  usageEventId: payload.usage_event_id,
  idempotencyKey: payload.idempotency_key,
  observedAt: normalizeDate(payload.observed_at),
  persistedAt: new Date(),
  runId: payload.run_id,
  turnId: payload.turn_id,
  llmCallId: payload.llm_call_id,
  callSequence: payload.call_sequence,
  executionAddressJson: toJsonString(payload.execution_address),
  agentDefinitionId: payload.agent_definition_id,
  workspaceId: payload.workspace_id,
  taskId: payload.task_id,
  teamName: payload.team_name,
  agentName: payload.agent_name,
  runSummary: payload.run_summary,
  runCreatedAt: normalizeNullableDate(payload.run_created_at),
  memberDisplayName: payload.member_display_name,
  runtimeKind: payload.runtime_kind,
  modelProvider: payload.model_provider,
  providerName: payload.provider_name,
  modelIdentifier: payload.model_identifier,
  modelValue: payload.model_value,
  ingestionKind: payload.ingestion_kind,
  usageScope: payload.usage_scope,
  snapshotSeriesKey: payload.snapshot_series_key,
  previousSnapshotEventId: payload.previous_snapshot_event_id,
  inputTokenSemantic: payload.input_token_semantic,
  reportedInputTokens: payload.reported_input_tokens,
  reportedOutputTokens: payload.reported_output_tokens,
  reportedTotalTokens: payload.reported_total_tokens,
  accountingInputTokens: payload.accounting_input_tokens,
  accountingOutputTokens: payload.accounting_output_tokens,
  accountingTotalTokens: payload.accounting_total_tokens,
  standardInputTokens: payload.standard_input_tokens,
  cacheMissInputTokens: payload.cache_miss_input_tokens,
  cacheReadInputTokens: payload.cache_read_input_tokens,
  cacheCreationInputTokens: payload.cache_creation_input_tokens,
  cacheCreation5mInputTokens: payload.cache_creation_5m_input_tokens,
  cacheCreation1hInputTokens: payload.cache_creation_1h_input_tokens,
  cacheState: payload.cache_state,
  reasoningOutputTokens: payload.reasoning_output_tokens,
  billableInputTokens: payload.billable_input_tokens,
  billableOutputTokens: payload.billable_output_tokens,
  rawUsageJson: toJsonString(payload.raw_usage_json),
  rawEventJson: toJsonString(payload.raw_event_json),
  qualityFlagsJson: toJsonString(payload.quality_flags),
  costBasis: payload.cost_basis,
  currency: payload.currency,
  inputPricePerMillion: payload.input_price_per_million,
  outputPricePerMillion: payload.output_price_per_million,
  cachedInputReadPricePerMillion: payload.cached_input_read_price_per_million,
  cachedInputWritePricePerMillion: payload.cached_input_write_price_per_million,
  cachedInputWrite5mPricePerMillion: payload.cached_input_write_5m_price_per_million,
  cachedInputWrite1hPricePerMillion: payload.cached_input_write_1h_price_per_million,
  pricingSource: payload.pricing_source,
  pricingStatus: payload.pricing_status,
  pricingMissingReason: payload.pricing_missing_reason,
  pricingSnapshotJson: toJsonString(payload.pricing_snapshot_json),
  pricingPolicyKey: payload.pricing_policy_key,
  selectedPricingTierId: payload.selected_pricing_tier_id,
  missingPriceDimensionsJson: toJsonString(payload.missing_price_dimensions),
  estimatedApiInputCost: payload.estimated_api_input_cost,
  estimatedApiStandardInputCost: payload.estimated_api_standard_input_cost,
  estimatedApiCacheReadInputCost: payload.estimated_api_cache_read_input_cost,
  estimatedApiCacheCreationInputCost: payload.estimated_api_cache_creation_input_cost,
  estimatedApiCacheCreation5mInputCost: payload.estimated_api_cache_creation_5m_input_cost,
  estimatedApiCacheCreation1hInputCost: payload.estimated_api_cache_creation_1h_input_cost,
  estimatedApiOutputCost: payload.estimated_api_output_cost,
  estimatedApiReasoningOutputCost: payload.estimated_api_reasoning_output_cost,
  estimatedApiTotalCost: payload.estimated_api_total_cost,
  apiCostStatus: payload.api_cost_status,
  latestPromptTokens: payload.latest_prompt_tokens,
  effectiveContextWindowTokens: payload.effective_context_window_tokens,
  contextWindowUsagePercent: payload.context_window_usage_percent,
});

const parseStringArray = (value: string | null): string[] => {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
};

const mergeStringArrays = (...values: string[][]): string[] =>
  Array.from(new Set(values.flat())).sort();

export const toDomainPayload = (record: PrismaTokenUsageLedgerEvent): TokenUsageUpdatedPayload => {
  const inputTokenSemantic = isInputTokenSemantic(record.inputTokenSemantic) ? record.inputTokenSemantic : "unknown";
  const cacheState = isCacheState(record.cacheState) ? record.cacheState : "unknown";
  const isLocalNoApiBill = record.pricingStatus === "local_no_api_bill" || record.apiCostStatus === "local_no_api_bill";
  const semanticUnknown = inputTokenSemantic === "unknown" && !isLocalNoApiBill;
  const existingMissingDimensions = parseStringArray(record.missingPriceDimensionsJson);
  const semanticMissingDimensions = semanticUnknown && (record.accountingInputTokens ?? 0) > 0
    ? ["input_token_semantic", "standard_input_tokens"]
    : semanticUnknown
      ? ["input_token_semantic"]
      : [];
  const missingPriceDimensions = mergeStringArrays(existingMissingDimensions, semanticMissingDimensions);
  const outputOnlyPartialCost = semanticUnknown ? record.estimatedApiOutputCost : record.estimatedApiTotalCost;

  return {
    usage_event_id: record.usageEventId,
    idempotency_key: record.idempotencyKey,
    observed_at: record.observedAt.toISOString(),
    run_id: record.runId,
    turn_id: record.turnId,
    llm_call_id: record.llmCallId,
    call_sequence: record.callSequence,
    execution_address: normalizeTokenUsageExecutionAddress(parseJson(record.executionAddressJson)),
    agent_definition_id: record.agentDefinitionId,
    workspace_id: record.workspaceId,
    task_id: record.taskId,
    team_name: record.teamName,
    agent_name: record.agentName,
    run_summary: record.runSummary,
    run_created_at: record.runCreatedAt?.toISOString() ?? null,
    member_display_name: record.memberDisplayName,
    runtime_kind: record.runtimeKind,
    model_provider: record.modelProvider,
    provider_name: record.providerName,
    model_identifier: record.modelIdentifier,
    model_value: record.modelValue,
    ingestion_kind: record.ingestionKind,
    usage_scope: record.usageScope as TokenUsageUpdatedPayload["usage_scope"],
    snapshot_series_key: record.snapshotSeriesKey,
    previous_snapshot_event_id: record.previousSnapshotEventId,
    input_token_semantic: inputTokenSemantic,
    reported_input_tokens: record.reportedInputTokens,
    reported_output_tokens: record.reportedOutputTokens,
    reported_total_tokens: record.reportedTotalTokens,
    accounting_input_tokens: record.accountingInputTokens,
    accounting_output_tokens: record.accountingOutputTokens,
    accounting_total_tokens: record.accountingTotalTokens,
    standard_input_tokens: semanticUnknown ? null : record.standardInputTokens,
    cache_miss_input_tokens: semanticUnknown ? null : record.cacheMissInputTokens,
    cache_read_input_tokens: semanticUnknown ? null : record.cacheReadInputTokens,
    cache_creation_input_tokens: semanticUnknown ? null : record.cacheCreationInputTokens,
    cache_creation_5m_input_tokens: semanticUnknown ? null : record.cacheCreation5mInputTokens,
    cache_creation_1h_input_tokens: semanticUnknown ? null : record.cacheCreation1hInputTokens,
    cache_state: semanticUnknown ? "unknown" : cacheState,
    reasoning_output_tokens: record.reasoningOutputTokens,
    billable_input_tokens: record.billableInputTokens,
    billable_output_tokens: record.billableOutputTokens,
    cost_basis: outputOnlyPartialCost !== null ? "api_price_estimate" : null,
    currency: record.currency,
    input_price_per_million: record.inputPricePerMillion,
    output_price_per_million: record.outputPricePerMillion,
    cached_input_read_price_per_million: record.cachedInputReadPricePerMillion,
    cached_input_write_price_per_million: record.cachedInputWritePricePerMillion,
    cached_input_write_5m_price_per_million: record.cachedInputWrite5mPricePerMillion,
    cached_input_write_1h_price_per_million: record.cachedInputWrite1hPricePerMillion,
    pricing_source: record.pricingSource,
    pricing_status: record.pricingStatus as TokenUsageUpdatedPayload["pricing_status"],
    pricing_missing_reason: semanticUnknown ? "input_token_semantic_unknown" : record.pricingMissingReason,
    pricing_snapshot_json: parseJson(record.pricingSnapshotJson) as Record<string, unknown> | null,
    pricing_policy_key: record.pricingPolicyKey,
    selected_pricing_tier_id: record.selectedPricingTierId,
    missing_price_dimensions: missingPriceDimensions,
    estimated_api_input_cost: semanticUnknown ? null : record.estimatedApiInputCost,
    estimated_api_standard_input_cost: semanticUnknown ? null : record.estimatedApiStandardInputCost,
    estimated_api_cache_read_input_cost: semanticUnknown ? null : record.estimatedApiCacheReadInputCost,
    estimated_api_cache_creation_input_cost: semanticUnknown ? null : record.estimatedApiCacheCreationInputCost,
    estimated_api_cache_creation_5m_input_cost: semanticUnknown ? null : record.estimatedApiCacheCreation5mInputCost,
    estimated_api_cache_creation_1h_input_cost: semanticUnknown ? null : record.estimatedApiCacheCreation1hInputCost,
    estimated_api_output_cost: record.estimatedApiOutputCost,
    estimated_api_reasoning_output_cost: record.estimatedApiReasoningOutputCost,
    estimated_api_total_cost: outputOnlyPartialCost,
    api_cost_status: semanticUnknown
      ? "partial_price_missing"
      : record.apiCostStatus as TokenUsageUpdatedPayload["api_cost_status"],
    meter_delta_input_tokens: record.accountingInputTokens,
    meter_delta_output_tokens: record.accountingOutputTokens,
    meter_delta_total_tokens: record.accountingTotalTokens,
    run_summary_after_event: null,
    latest_prompt_tokens: record.latestPromptTokens,
    effective_context_window_tokens: record.effectiveContextWindowTokens,
    context_window_usage_percent: record.contextWindowUsagePercent,
    raw_usage_json: parseJson(record.rawUsageJson) as Record<string, unknown> | null,
    raw_event_json: parseJson(record.rawEventJson) as Record<string, unknown> | null,
    quality_flags: parseStringArray(record.qualityFlagsJson),
  };
};

export class SqlTokenUsageLedgerRepository extends BaseRepository.forModel(
  Prisma.ModelName.TokenUsageLedgerEvent,
) {
  async appendUsageEvent(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    try {
      const created = await this.create({ data: toCreateInput(payload) });
      return toDomainPayload(created);
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
        const existing = await this.findFirst({
          where: {
            OR: [
              { usageEventId: payload.usage_event_id },
              { idempotencyKey: payload.idempotency_key },
            ],
          },
        });
        if (existing) return toDomainPayload(existing);
      }
      throw error;
    }
  }

  async updateUsageEventDisplayFields(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    const updated = await this.update({
      where: { usageEventId: payload.usage_event_id },
      data: {
        teamName: payload.team_name,
        agentName: payload.agent_name,
        runSummary: payload.run_summary,
        runCreatedAt: normalizeNullableDate(payload.run_created_at),
        memberDisplayName: payload.member_display_name,
      },
    });
    return toDomainPayload(updated);
  }

  async findLatestCumulativeSnapshot(input: {
    runId: string;
    snapshotSeriesKey: string;
  }): Promise<TokenUsageUpdatedPayload | null> {
    const record = await this.findFirst({
      where: {
        runId: input.runId,
        snapshotSeriesKey: input.snapshotSeriesKey,
        usageScope: "cumulative_snapshot",
      },
      orderBy: [
        { observedAt: "desc" },
        { id: "desc" },
      ],
    });
    return record ? toDomainPayload(record) : null;
  }

  async listEventsByRunId(runId: string): Promise<TokenUsageUpdatedPayload[]> {
    const records = await this.findMany({
      where: { runId },
      orderBy: [{ observedAt: "asc" }, { id: "asc" }],
    });
    return records.map(toDomainPayload);
  }

  async listEventsByTeamRunId(rootTeamRunId: string): Promise<TokenUsageUpdatedPayload[]> {
    const normalized = rootTeamRunId.trim();
    if (!normalized) return [];
    const ids = await getPrismaClient().$queryRaw<{ id: number | bigint }[]>`
      SELECT "id"
      FROM "token_usage_ledger_events"
      WHERE json_extract("execution_address_json", '$.rootTeamRunId') = ${normalized}
      ORDER BY "observed_at" ASC, "id" ASC`;
    const records = await this.findMany({
      where: { id: { in: ids.map((row) => Number(row.id)) } },
      orderBy: [{ observedAt: "asc" }, { id: "asc" }],
    });
    return records.map(toDomainPayload);
  }

  async listEventsInPeriod(input: {
    startDate: Date;
    endDate: Date;
  }): Promise<TokenUsageUpdatedPayload[]> {
    const records = await this.findMany({
      where: { observedAt: { gte: input.startDate, lte: input.endDate } },
      orderBy: [{ observedAt: "asc" }, { id: "asc" }],
    });
    return records.map(toDomainPayload);
  }
}
