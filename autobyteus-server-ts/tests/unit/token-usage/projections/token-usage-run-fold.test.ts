import { describe, expect, it } from "vitest";
import { createTokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import type { CacheState } from "../../../../src/token-usage/domain/token-usage-component-basis.js";
import {
  MAX_CUMULATIVE_SERIES_PER_RUN,
  MAX_RECENT_IDEMPOTENCY_DIGESTS,
  MAX_RECENT_IDEMPOTENCY_STATE_BYTES,
  MAX_SNAPSHOT_SERIES_STATE_BYTES,
} from "../../../../src/token-usage/domain/token-usage-snapshot-checkpoint.js";
import { emptyTrustedDimensions, type ResolvedTokenPricingPolicy } from "../../../../src/token-usage/pricing/token-pricing-policy.js";
import { foldTokenUsageObservation } from "../../../../src/token-usage/projections/token-usage-run-fold.js";
import { buildTokenUsageRunAggregate } from "../../../../src/token-usage/projections/token-usage-run-aggregate.js";
import { toPrismaTokenUsageRunRecordData } from "../../../../src/token-usage/repositories/sql/token-usage-run-record-codec.js";
import { cumulativeSnapshotSourceTokensKey } from "../../../../src/token-usage/projections/cumulative-snapshot-reconciliation-metadata.js";

const policy: ResolvedTokenPricingPolicy = {
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
  missing_reason: "test",
  source: null,
  effective_from: null,
  effective_to: null,
  version: null,
};

const snapshot = (input: { event: string; series: string; total: number; providerDelta?: number }) => {
  const source = {
    reported_input_tokens: input.total,
    reported_output_tokens: 0,
    reported_total_tokens: input.total,
    accounting_input_tokens: input.total,
    accounting_output_tokens: 0,
    accounting_total_tokens: input.total,
    standard_input_tokens: input.total,
    cache_miss_input_tokens: input.total,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_creation_5m_input_tokens: 0,
    cache_creation_1h_input_tokens: 0,
    reasoning_output_tokens: 0,
    billable_input_tokens: input.total,
    billable_output_tokens: 0,
  };
  return createTokenUsageUpdatedPayload({
    runId: "run-fold",
    payload: {
      usage_event_id: input.event,
      idempotency_key: `idem:${input.event}`,
      observed_at: new Date(Date.UTC(2026, 7, 19, 0, 0, 0, Number(input.event))).toISOString(),
      runtime_kind: "codex_app_server",
      ingestion_kind: "codex_thread_token_usage",
      usage_scope: "cumulative_snapshot",
      snapshot_series_key: input.series,
      input_token_semantic: "gross_includes_cache",
      ...source,
      ...(input.providerDelta === undefined ? {} : {
        accounting_input_tokens: input.providerDelta,
        accounting_total_tokens: input.providerDelta,
        standard_input_tokens: input.providerDelta,
        cache_miss_input_tokens: input.providerDelta,
        billable_input_tokens: input.providerDelta,
      }),
      raw_event_json: { [cumulativeSnapshotSourceTokensKey]: source },
    },
  });
};

const fold = (current: ReturnType<typeof foldTokenUsageObservation>["record"], payload: ReturnType<typeof snapshot>) =>
  foldTokenUsageObservation({ current, payload, pricingPolicy: policy });

const cacheObservation = (input: {
  event: string;
  cacheState: CacheState;
  runtimeKind?: string;
}) => createTokenUsageUpdatedPayload({
  runId: "run-cache-state",
  payload: {
    usage_event_id: `cache-${input.event}`,
    idempotency_key: `cache-idem-${input.event}`,
    observed_at: `2026-08-19T01:00:0${input.event}.000Z`,
    runtime_kind: input.runtimeKind ?? "autobyteus",
    ingestion_kind: "autobyteus_llm_phase",
    usage_scope: "per_call",
    input_token_semantic: "gross_includes_cache",
    reported_input_tokens: 1,
    reported_output_tokens: 0,
    reported_total_tokens: 1,
    accounting_input_tokens: 1,
    accounting_output_tokens: 0,
    accounting_total_tokens: 1,
    standard_input_tokens: 1,
    cache_miss_input_tokens: 1,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_creation_5m_input_tokens: 0,
    cache_creation_1h_input_tokens: 0,
    cache_state: input.cacheState,
    reasoning_output_tokens: 0,
    billable_input_tokens: 1,
    billable_output_tokens: 0,
  },
});

const foldCacheStates = (states: CacheState[]) => states.reduce(
  (current, cacheState, index) => foldTokenUsageObservation({
    current,
    payload: cacheObservation({ event: String(index + 1), cacheState }),
    pricingPolicy: policy,
    componentResolver: { resolve: (payload) => payload } as never,
    costCalculator: { applyPolicy: (payload) => payload } as never,
  }).record,
  null as ReturnType<typeof foldTokenUsageObservation>["record"],
);

describe("token usage current run fold", () => {
  it("uses the first admitted cache observation instead of the empty-record sentinel", () => {
    const local = foldTokenUsageObservation({
      current: null,
      payload: cacheObservation({ event: "1", cacheState: "unknown", runtimeKind: "OLLAMA" }),
      pricingPolicy: policy,
    });

    expect(local.record?.usageReportCount).toBe(1n);
    expect(local.record?.cacheState).toBe("unsupported_or_local");
  });

  it.each([
    [["unsupported_or_local", "unsupported_or_local"], "unsupported_or_local"],
    [["unsupported_or_local", "unknown"], "unknown"],
    [["unknown", "positive"], "positive"],
    [["unsupported_or_local", "zero_reported"], "zero_reported"],
    [["unknown"], "unknown"],
  ] as Array<[CacheState[], CacheState]>)(
    "summarizes admitted cache observations %j as %s",
    (states, expected) => {
      const record = foldCacheStates(states);

      expect(record?.usageReportCount).toBe(BigInt(states.length));
      expect(record?.cacheState).toBe(expected);
    },
  );

  it("replays cumulative snapshots without changing totals, reports, or revision", () => {
    const first = fold(null, snapshot({ event: "01", series: "series-a", total: 100, providerDelta: 100 }));
    const second = fold(first.record, snapshot({ event: "02", series: "series-a", total: 150 }));
    const replay = fold(second.record, snapshot({ event: "03", series: "series-a", total: 150 }));
    const final = fold(replay.record, snapshot({ event: "04", series: "series-a", total: 210 }));

    expect(first.record?.tokenTotals.accounting_input_tokens).toBe(100n);
    expect(second.record?.tokenTotals.accounting_input_tokens).toBe(150n);
    expect(replay.kind).toBe("SUPPRESSED");
    expect(replay.record?.revision).toBe(second.record?.revision);
    expect(replay.record?.usageReportCount).toBe(second.record?.usageReportCount);
    expect(final.record?.tokenTotals.accounting_input_tokens).toBe(210n);
    expect(final.record?.snapshotSeriesState[0]?.sourceTokens.accounting_input_tokens).toBe(210n);
  });

  it("keeps checkpoint and digest state within hard count and byte limits", () => {
    let current = null as ReturnType<typeof foldTokenUsageObservation>["record"];
    for (let index = 0; index < 9; index += 1) {
      current = fold(current, snapshot({ event: String(index + 1), series: `series-${index}`, total: 100 })).record;
    }
    expect(current?.snapshotSeriesState).toHaveLength(MAX_CUMULATIVE_SERIES_PER_RUN);
    expect(current?.qualityFlags).toContain("cumulative_series_checkpoint_evicted");

    for (let index = 9; index < 80; index += 1) {
      current = fold(current, snapshot({ event: String(index + 1), series: "series-8", total: 100 + index })).record;
    }
    expect(current?.recentIdempotencyDigests.length).toBeLessThanOrEqual(MAX_RECENT_IDEMPOTENCY_DIGESTS);
    const data = toPrismaTokenUsageRunRecordData(current!);
    expect(Buffer.byteLength(String(data.snapshotSeriesStateJson))).toBeLessThanOrEqual(MAX_SNAPSHOT_SERIES_STATE_BYTES);
    expect(Buffer.byteLength(String(data.recentIdempotencyDigestsJson))).toBeLessThanOrEqual(MAX_RECENT_IDEMPOTENCY_STATE_BYTES);
  });

  it("rejects unsafe input numbers and refuses to narrow persisted BigInt totals", () => {
    const unsafe = Number.MAX_SAFE_INTEGER + 1;
    const parsed = createTokenUsageUpdatedPayload({
      runId: "run-unsafe",
      payload: {
        runtime_kind: "codex_app_server",
        ingestion_kind: "codex_thread_token_usage",
        usage_scope: "per_call",
        accounting_input_tokens: unsafe,
      },
    });
    expect(parsed.accounting_input_tokens).toBeNull();

    const record = fold(null, snapshot({ event: "1", series: "series-a", total: 1 })).record!;
    const unsafeRecord = {
      ...record,
      tokenTotals: { ...record.tokenTotals, accounting_input_tokens: 9_007_199_254_740_992n },
    };
    expect(() => buildTokenUsageRunAggregate([unsafeRecord])).toThrow(
      "TOKEN_USAGE_SAFE_INTEGER_EXCEEDED:accounting_input_tokens",
    );
  });

  it("preserves the run-specific Mixed identity summary across records", () => {
    const first = foldTokenUsageObservation({
      current: null,
      payload: cacheObservation({ event: "1", cacheState: "positive", runtimeKind: "autobyteus" }),
      pricingPolicy: policy,
    }).record!;
    const second = foldTokenUsageObservation({
      current: null,
      payload: cacheObservation({ event: "2", cacheState: "positive", runtimeKind: "codex_app_server" }),
      pricingPolicy: policy,
    }).record!;

    const aggregate = buildTokenUsageRunAggregate([first, second]);

    expect(aggregate.total_tokens).toBe(2);
    expect(aggregate.observed_runtime_kinds).toEqual(["Mixed"]);
  });
});
