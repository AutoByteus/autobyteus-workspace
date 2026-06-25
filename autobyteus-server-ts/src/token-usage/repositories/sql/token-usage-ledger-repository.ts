import { PrismaClient, type Prisma, type TokenUsageLedgerEvent as PrismaTokenUsageLedgerEvent } from "@prisma/client";
import type { TokenUsageUpdatedPayload } from "../../../agent-execution/domain/agent-run-token-usage.js";

const prisma = new PrismaClient();

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

const toCreateInput = (payload: TokenUsageUpdatedPayload): Prisma.TokenUsageLedgerEventCreateInput => ({
  usageEventId: payload.usage_event_id,
  idempotencyKey: payload.idempotency_key,
  observedAt: normalizeDate(payload.observed_at),
  persistedAt: new Date(),
  runId: payload.run_id,
  turnId: payload.turn_id,
  llmCallId: payload.llm_call_id,
  callSequence: payload.call_sequence,
  rootTeamRunId: payload.root_team_run_id,
  teamRunPathJson: toJsonString(payload.team_run_path),
  memberAgentRunId: payload.member_agent_run_id,
  memberPathJson: toJsonString(payload.member_path),
  memberRouteKey: payload.member_route_key,
  agentDefinitionId: payload.agent_definition_id,
  workspaceId: payload.workspace_id,
  taskAgentInstanceId: payload.task_agent_instance_id,
  taskAgentRunId: payload.task_agent_run_id,
  taskId: payload.task_id,
  runtimeKind: payload.runtime_kind,
  modelProvider: payload.model_provider,
  modelIdentifier: payload.model_identifier,
  modelValue: payload.model_value,
  ingestionKind: payload.ingestion_kind,
  usageScope: payload.usage_scope,
  snapshotSeriesKey: payload.snapshot_series_key,
  previousSnapshotEventId: payload.previous_snapshot_event_id,
  reportedInputTokens: payload.reported_input_tokens,
  reportedOutputTokens: payload.reported_output_tokens,
  reportedTotalTokens: payload.reported_total_tokens,
  accountingInputTokens: payload.accounting_input_tokens,
  accountingOutputTokens: payload.accounting_output_tokens,
  accountingTotalTokens: payload.accounting_total_tokens,
  cacheReadInputTokens: payload.cache_read_input_tokens,
  cacheCreationInputTokens: payload.cache_creation_input_tokens,
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
  pricingSource: payload.pricing_source,
  pricingStatus: payload.pricing_status,
  pricingMissingReason: payload.pricing_missing_reason,
  pricingSnapshotJson: toJsonString(payload.pricing_snapshot_json),
  estimatedApiInputCost: payload.estimated_api_input_cost,
  estimatedApiStandardInputCost: payload.estimated_api_standard_input_cost,
  estimatedApiCacheReadInputCost: payload.estimated_api_cache_read_input_cost,
  estimatedApiCacheCreationInputCost: payload.estimated_api_cache_creation_input_cost,
  estimatedApiOutputCost: payload.estimated_api_output_cost,
  estimatedApiReasoningOutputCost: payload.estimated_api_reasoning_output_cost,
  estimatedApiTotalCost: payload.estimated_api_total_cost,
  apiCostStatus: payload.api_cost_status,
  latestContextInputTokens: payload.latest_context_input_tokens,
  effectiveContextBudgetTokens: payload.effective_context_budget_tokens,
  contextPressurePercent: payload.context_pressure_percent,
});

export const toDomainPayload = (record: PrismaTokenUsageLedgerEvent): TokenUsageUpdatedPayload => ({
  usage_event_id: record.usageEventId,
  idempotency_key: record.idempotencyKey,
  observed_at: record.observedAt.toISOString(),
  run_id: record.runId,
  turn_id: record.turnId,
  llm_call_id: record.llmCallId,
  call_sequence: record.callSequence,
  root_team_run_id: record.rootTeamRunId,
  team_run_path: parseJson(record.teamRunPathJson) as string[] | null,
  member_agent_run_id: record.memberAgentRunId,
  member_path: parseJson(record.memberPathJson) as string[] | null,
  member_route_key: record.memberRouteKey,
  agent_definition_id: record.agentDefinitionId,
  workspace_id: record.workspaceId,
  task_agent_instance_id: record.taskAgentInstanceId,
  task_agent_run_id: record.taskAgentRunId,
  task_id: record.taskId,
  runtime_kind: record.runtimeKind,
  model_provider: record.modelProvider,
  model_identifier: record.modelIdentifier,
  model_value: record.modelValue,
  ingestion_kind: record.ingestionKind,
  usage_scope: record.usageScope as TokenUsageUpdatedPayload["usage_scope"],
  snapshot_series_key: record.snapshotSeriesKey,
  previous_snapshot_event_id: record.previousSnapshotEventId,
  reported_input_tokens: record.reportedInputTokens,
  reported_output_tokens: record.reportedOutputTokens,
  reported_total_tokens: record.reportedTotalTokens,
  accounting_input_tokens: record.accountingInputTokens,
  accounting_output_tokens: record.accountingOutputTokens,
  accounting_total_tokens: record.accountingTotalTokens,
  cache_read_input_tokens: record.cacheReadInputTokens,
  cache_creation_input_tokens: record.cacheCreationInputTokens,
  reasoning_output_tokens: record.reasoningOutputTokens,
  billable_input_tokens: record.billableInputTokens,
  billable_output_tokens: record.billableOutputTokens,
  cost_basis: record.costBasis as "api_price_estimate" | null,
  currency: record.currency,
  input_price_per_million: record.inputPricePerMillion,
  output_price_per_million: record.outputPricePerMillion,
  cached_input_read_price_per_million: record.cachedInputReadPricePerMillion,
  cached_input_write_price_per_million: record.cachedInputWritePricePerMillion,
  pricing_source: record.pricingSource,
  pricing_status: record.pricingStatus as TokenUsageUpdatedPayload["pricing_status"],
  pricing_missing_reason: record.pricingMissingReason,
  pricing_snapshot_json: parseJson(record.pricingSnapshotJson) as Record<string, unknown> | null,
  estimated_api_input_cost: record.estimatedApiInputCost,
  estimated_api_standard_input_cost: record.estimatedApiStandardInputCost,
  estimated_api_cache_read_input_cost: record.estimatedApiCacheReadInputCost,
  estimated_api_cache_creation_input_cost: record.estimatedApiCacheCreationInputCost,
  estimated_api_output_cost: record.estimatedApiOutputCost,
  estimated_api_reasoning_output_cost: record.estimatedApiReasoningOutputCost,
  estimated_api_total_cost: record.estimatedApiTotalCost,
  api_cost_status: record.apiCostStatus as TokenUsageUpdatedPayload["api_cost_status"],
  meter_delta_input_tokens: record.accountingInputTokens,
  meter_delta_output_tokens: record.accountingOutputTokens,
  meter_delta_total_tokens: record.accountingTotalTokens,
  run_summary_after_event: null,
  latest_context_input_tokens: record.latestContextInputTokens,
  effective_context_budget_tokens: record.effectiveContextBudgetTokens,
  context_pressure_percent: record.contextPressurePercent,
  raw_usage_json: parseJson(record.rawUsageJson) as Record<string, unknown> | null,
  raw_event_json: parseJson(record.rawEventJson) as Record<string, unknown> | null,
  quality_flags: (parseJson(record.qualityFlagsJson) as string[] | null) ?? [],
});

export class SqlTokenUsageLedgerRepository {
  async appendUsageEvent(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    try {
      const created = await prisma.tokenUsageLedgerEvent.create({ data: toCreateInput(payload) });
      return toDomainPayload(created);
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
        const existing = await prisma.tokenUsageLedgerEvent.findFirst({
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

  async findLatestCumulativeSnapshot(input: {
    runId: string;
    snapshotSeriesKey: string;
  }): Promise<TokenUsageUpdatedPayload | null> {
    const record = await prisma.tokenUsageLedgerEvent.findFirst({
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
    const records = await prisma.tokenUsageLedgerEvent.findMany({
      where: { runId },
      orderBy: [{ observedAt: "asc" }, { id: "asc" }],
    });
    return records.map(toDomainPayload);
  }

  async listEventsByTeamRunId(rootTeamRunId: string): Promise<TokenUsageUpdatedPayload[]> {
    const records = await prisma.tokenUsageLedgerEvent.findMany({
      where: { rootTeamRunId },
      orderBy: [{ observedAt: "asc" }, { id: "asc" }],
    });
    return records.map(toDomainPayload);
  }

  async listEventsInPeriod(input: {
    startDate: Date;
    endDate: Date;
  }): Promise<TokenUsageUpdatedPayload[]> {
    const records = await prisma.tokenUsageLedgerEvent.findMany({
      where: { observedAt: { gte: input.startDate, lte: input.endDate } },
      orderBy: [{ observedAt: "asc" }, { id: "asc" }],
    });
    return records.map(toDomainPayload);
  }
}
