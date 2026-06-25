import { describe, expect, it, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createTokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import { SqlTokenUsageLedgerRepository } from "../../../../src/token-usage/repositories/sql/token-usage-ledger-repository.js";

const prisma = new PrismaClient();
const repo = new SqlTokenUsageLedgerRepository();
const createdRunIds = new Set<string>();

const buildEvent = (input: {
  runId?: string;
  idempotencyKey?: string;
  scope?: "per_call" | "per_turn" | "cumulative_snapshot";
  snapshotSeriesKey?: string | null;
  inputTokens?: number;
  outputTokens?: number;
}) => {
  const runId = input.runId ?? `ledger_repo_${randomUUID()}`;
  createdRunIds.add(runId);
  const reportedInput = input.inputTokens ?? 10;
  const reportedOutput = input.outputTokens ?? 5;
  const payload = createTokenUsageUpdatedPayload({
    runId,
    payload: {
      idempotency_key: input.idempotencyKey ?? `ledger_repo:${randomUUID()}`,
      usage_scope: input.scope ?? "per_turn",
      snapshot_series_key: input.snapshotSeriesKey ?? null,
      input_token_semantic: "gross_includes_cache",
      reported_input_tokens: reportedInput,
      reported_output_tokens: reportedOutput,
      reported_total_tokens: reportedInput + reportedOutput,
      accounting_input_tokens: reportedInput,
      accounting_output_tokens: reportedOutput,
      accounting_total_tokens: reportedInput + reportedOutput,
      standard_input_tokens: reportedInput,
      cache_miss_input_tokens: reportedInput,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_creation_5m_input_tokens: 0,
      cache_creation_1h_input_tokens: 0,
      cache_state: "not_reported",
      billable_output_tokens: reportedOutput,
      model_identifier: "gpt-test",
      runtime_kind: "codex_app_server",
      ingestion_kind: "codex_thread_token_usage",
      pricing_status: "missing",
      api_cost_status: "price_missing",
    },
  });
  return {
    ...payload,
    meter_delta_input_tokens: payload.accounting_input_tokens,
    meter_delta_output_tokens: payload.accounting_output_tokens,
    meter_delta_total_tokens: payload.accounting_total_tokens,
  };
};

afterEach(async () => {
  const runIds = Array.from(createdRunIds);
  createdRunIds.clear();
  if (runIds.length > 0) {
    await prisma.tokenUsageLedgerEvent.deleteMany({ where: { runId: { in: runIds } } });
  }
});

describe("SqlTokenUsageLedgerRepository", () => {
  it("appends and lists ledger events by run id", async () => {
    const event = buildEvent({ inputTokens: 100, outputTokens: 50 });

    const created = await repo.appendUsageEvent(event);
    const records = await repo.listEventsByRunId(event.run_id);

    expect(created.usage_event_id).toBe(event.usage_event_id);
    expect(records).toHaveLength(1);
    expect(records[0]?.run_id).toBe(event.run_id);
    expect(records[0]?.accounting_total_tokens).toBe(150);
    expect(records[0]?.standard_input_tokens).toBe(100);
    expect(records[0]?.estimated_api_total_cost).toBeNull();
  });

  it("round-trips raw usage, semantic component, pricing, missing-dimension, and context fields", async () => {
    const runId = `ledger_repo_raw_${randomUUID()}`;
    const event = createTokenUsageUpdatedPayload({
      runId,
      payload: {
        idempotency_key: `ledger_repo_raw:${randomUUID()}`,
        usage_scope: "per_call",
        runtime_kind: "autobyteus",
        ingestion_kind: "autobyteus_llm_phase",
        model_provider: "ANTHROPIC",
        model_identifier: "claude-sonnet-4-6",
        input_token_semantic: "base_excludes_cache",
        reported_input_tokens: 11,
        reported_output_tokens: 5,
        reported_total_tokens: 16,
        accounting_input_tokens: 10_447,
        accounting_output_tokens: 5,
        accounting_total_tokens: 10_452,
        standard_input_tokens: 11,
        cache_miss_input_tokens: 11,
        cache_read_input_tokens: 10_436,
        cache_creation_input_tokens: 10_436,
        cache_creation_5m_input_tokens: 10_436,
        cache_creation_1h_input_tokens: 0,
        cache_state: "positive",
        reasoning_output_tokens: 0,
        billable_output_tokens: 5,
        input_price_per_million: 3,
        output_price_per_million: 15,
        cached_input_read_price_per_million: 0.3,
        cached_input_write_5m_price_per_million: 3.75,
        cached_input_write_1h_price_per_million: 6,
        pricing_source: "catalog",
        pricing_status: "trusted",
        pricing_policy_key: "catalog:anthropic:claude-sonnet-4-6",
        selected_pricing_tier_id: "standard",
        missing_price_dimensions: ["cache_creation_1h_input"],
        estimated_api_input_cost: 0.0423318,
        estimated_api_standard_input_cost: 0.000033,
        estimated_api_cache_read_input_cost: 0.0031308,
        estimated_api_cache_creation_input_cost: 0.039135,
        estimated_api_cache_creation_5m_input_cost: 0.039135,
        estimated_api_cache_creation_1h_input_cost: 0,
        estimated_api_output_cost: 0.000075,
        estimated_api_reasoning_output_cost: 0,
        estimated_api_total_cost: 0.0424068,
        api_cost_status: "partial_price_missing",
        currency: "USD",
        latest_prompt_tokens: 10_447,
        effective_context_window_tokens: 200_000,
        context_window_usage_percent: 5.2235,
        raw_usage_json: {
          input_tokens: 11,
          cache_read_input_tokens: 10_436,
          cache_creation_input_tokens: 10_436,
          cache_creation: { ephemeral_5m_input_tokens: 10_436, ephemeral_1h_input_tokens: 0 },
          output_tokens: 5,
        },
      },
    });
    createdRunIds.add(event.run_id);

    await repo.appendUsageEvent(event);
    const [record] = await repo.listEventsByRunId(event.run_id);

    expect(record).toEqual(expect.objectContaining({
      input_token_semantic: "base_excludes_cache",
      accounting_input_tokens: 10_447,
      standard_input_tokens: 11,
      cache_miss_input_tokens: 11,
      cache_read_input_tokens: 10_436,
      cache_creation_input_tokens: 10_436,
      cache_creation_5m_input_tokens: 10_436,
      cache_creation_1h_input_tokens: 0,
      cache_state: "positive",
      billable_output_tokens: 5,
      cached_input_write_5m_price_per_million: 3.75,
      cached_input_write_1h_price_per_million: 6,
      pricing_policy_key: "catalog:anthropic:claude-sonnet-4-6",
      selected_pricing_tier_id: "standard",
      missing_price_dimensions: ["cache_creation_1h_input"],
      estimated_api_cache_creation_5m_input_cost: 0.039135,
      estimated_api_cache_creation_1h_input_cost: 0,
      api_cost_status: "partial_price_missing",
      latest_prompt_tokens: 10_447,
      effective_context_window_tokens: 200_000,
      context_window_usage_percent: 5.2235,
      raw_usage_json: {
        input_tokens: 11,
        cache_read_input_tokens: 10_436,
        cache_creation_input_tokens: 10_436,
        cache_creation: { ephemeral_5m_input_tokens: 10_436, ephemeral_1h_input_tokens: 0 },
        output_tokens: 5,
      },
    }));
  });

  it("returns the existing event on duplicate idempotency key", async () => {
    const idempotencyKey = `ledger_repo_duplicate:${randomUUID()}`;
    const first = buildEvent({ idempotencyKey, inputTokens: 3, outputTokens: 2 });
    const second = buildEvent({ runId: first.run_id, idempotencyKey, inputTokens: 99, outputTokens: 1 });

    const created = await repo.appendUsageEvent(first);
    const duplicate = await repo.appendUsageEvent(second);

    expect(duplicate.usage_event_id).toBe(created.usage_event_id);
    expect(duplicate.accounting_total_tokens).toBe(5);
  });

  it("finds the latest cumulative snapshot for a run and series", async () => {
    const runId = `ledger_repo_snapshot_${randomUUID()}`;
    const snapshotSeriesKey = `series_${randomUUID()}`;
    const first = buildEvent({ runId, scope: "cumulative_snapshot", snapshotSeriesKey, inputTokens: 10, outputTokens: 5 });
    const second = buildEvent({ runId, scope: "cumulative_snapshot", snapshotSeriesKey, inputTokens: 20, outputTokens: 10 });

    await repo.appendUsageEvent(first);
    await repo.appendUsageEvent({
      ...second,
      observed_at: new Date(Date.now() + 1_000).toISOString(),
      previous_snapshot_event_id: first.usage_event_id,
    });

    const latest = await repo.findLatestCumulativeSnapshot({ runId, snapshotSeriesKey });

    expect(latest?.usage_event_id).toBe(second.usage_event_id);
    expect(latest?.reported_total_tokens).toBe(30);
  });
});
