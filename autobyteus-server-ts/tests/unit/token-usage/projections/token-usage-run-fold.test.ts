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
import { AgyStreamEventConverter } from "../../../../src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TokenUsageComponentBasisResolver } from "../../../../src/token-usage/projections/token-usage-component-basis-resolver.js";
import { TokenUsageSnapshotDeltaNormalizer } from "../../../../src/token-usage/projections/token-usage-snapshot-delta-normalizer.js";

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
      reports_model_call: true,
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

/** One AGY DONE `agent_response` step usage as the server records it: converter, then the event pipeline's basis and snapshot steps. */
const agyStep = async (input: { step: number; inputTokens: number; outputTokens: number; cacheReadTokens: number }) => {
  const converter = new AgyStreamEventConverter("run-agy", "agy-conversation", "gemini-3.8-flash-high");
  converter.startTurn(`turn-${input.step}`);
  const event = converter.convert({ event: "step_update", step_update: {
    conversation_id: "agy-conversation", step_index: input.step, step_type: "agent_response", state: "DONE",
    usage: {
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      total_tokens: input.inputTokens + input.outputTokens,
      cache_read_tokens: input.cacheReadTokens,
    },
  } }).find((item) => item.eventType === AgentRunEventType.TOKEN_USAGE_UPDATED)!;
  return normalize(createTokenUsageUpdatedPayload({
    runId: "run-agy",
    payload: { ...event.payload, observed_at: new Date(Date.UTC(2026, 9, 9, 0, 0, input.step)).toISOString() },
  }));
};

/** The cumulative AGY `result` snapshot recorded before per-step usage (gemini-native-cache-hit era and earlier). */
const preUpgradeAgyResult = async (input: { turn: number; inputTokens: number; cacheReadTokens: number }) => normalize(
  createTokenUsageUpdatedPayload({
    runId: "run-agy",
    payload: {
      turn_id: `turn-${input.turn}`,
      idempotency_key: `agy:agy-conversation:${input.turn}`,
      observed_at: new Date(Date.UTC(2026, 9, 8, 0, 0, input.turn)).toISOString(),
      runtime_kind: "antigravity_cli", ingestion_kind: "agy_result",
      usage_scope: "cumulative_snapshot", snapshot_series_key: "agy-conversation",
      model_identifier: "gemini-3.8-flash-high", model_value: "gemini-3.8-flash-high", model_provider: "GEMINI",
      provider_name: "Antigravity CLI",
      reported_input_tokens: input.inputTokens, reported_output_tokens: 1, reported_total_tokens: input.inputTokens + 1,
      input_token_semantic: "gross_includes_cache",
      cache_read_input_tokens: input.cacheReadTokens, cache_state: "positive",
      quality_flags: ["agy_provider_reported_cumulative_usage"],
    },
  }),
);

const normalize = (payload: ReturnType<typeof createTokenUsageUpdatedPayload>) =>
  new TokenUsageSnapshotDeltaNormalizer().normalizeAccountingDelta(new TokenUsageComponentBasisResolver().resolve(payload));

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
    reports_model_call: true,
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

  it("counts AGY cache reads in gross input and its reported input as the cache miss", async () => {
    const first = fold(null, await agyStep({ step: 1, inputTokens: 6_110, outputTokens: 1, cacheReadTokens: 307_003 }));
    expect(first.record?.tokenTotals).toMatchObject({
      accounting_input_tokens: 313_113n,
      standard_input_tokens: 6_110n,
      cache_miss_input_tokens: 6_110n,
      cache_read_input_tokens: 307_003n,
    });

    // Per-step usage is per call (D-5): each step adds its own input and cache read.
    const second = fold(first.record, await agyStep({ step: 3, inputTokens: 9_000, outputTokens: 3, cacheReadTokens: 400_000 }));
    expect(second.kind).toBe("CHANGED");
    expect(second.authoritativePayload).toMatchObject({
      accounting_input_tokens: 409_000,
      cache_miss_input_tokens: 9_000,
      cache_read_input_tokens: 400_000,
    });
    expect(second.record?.tokenTotals).toMatchObject({
      accounting_input_tokens: 722_113n,
      standard_input_tokens: 15_110n,
      cache_miss_input_tokens: 15_110n,
      cache_read_input_tokens: 707_003n,
    });
    expect(second.record?.qualityFlags).not.toContain("cumulative_snapshot_regressed");
  });

  it("continues an AGY run checkpointed with a pre-fix cumulative result series on per-step usage without flagging a regression", async () => {
    const before = fold(null, await preUpgradeAgyResult({ turn: 1, inputTokens: 6_110, cacheReadTokens: 307_003 }));
    const seriesBefore = before.record?.snapshotSeriesState;
    expect(seriesBefore?.[0]?.sourceTokens).toMatchObject({ accounting_input_tokens: 6_110n });

    const after = fold(before.record, await agyStep({ step: 4, inputTokens: 9_000, outputTokens: 3, cacheReadTokens: 400_000 }));

    expect(after.kind).toBe("CHANGED");
    expect(after.authoritativePayload.quality_flags ?? []).not.toContain("cumulative_snapshot_regressed");
    expect(after.record?.qualityFlags).not.toContain("cumulative_snapshot_regressed");
    // Fix-forward: the pre-fix row keeps its stored totals; the step adds its own per-call usage, and the
    // stored snapshot series is kept but no longer read for AGY.
    expect(after.record?.tokenTotals).toMatchObject({
      accounting_input_tokens: 415_110n,
      cache_miss_input_tokens: 9_000n,
      cache_read_input_tokens: 707_003n,
    });
    expect(after.record?.snapshotSeriesState).toEqual(seriesBefore);
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
        reports_model_call: true,
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
