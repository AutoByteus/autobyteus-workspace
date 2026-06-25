import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { TokenUsageLedgerStore } from "../providers/token-usage-ledger-store.js";

const keyFor = (runId: string, seriesKey: string): string => `${runId}::${seriesKey}`;
const delta = (current: number | null, previous: number | null): number | null => {
  if (current === null) return null;
  if (previous === null) return current;
  return current - previous;
};
const hasRegression = (...values: Array<number | null>): boolean =>
  values.some((value) => value !== null && value < 0);

const cumulativeSnapshotSourceTokensKey = "autobyteus_cumulative_snapshot_source_tokens";

const cumulativeSourceTokenFields = [
  "reported_input_tokens",
  "reported_output_tokens",
  "reported_total_tokens",
  "cache_read_input_tokens",
  "cache_creation_input_tokens",
  "reasoning_output_tokens",
  "billable_input_tokens",
  "billable_output_tokens",
] as const;

type CumulativeSourceTokenField = typeof cumulativeSourceTokenFields[number];
type CostAffectingTokenField = Exclude<
  CumulativeSourceTokenField,
  "reported_input_tokens" | "reported_output_tokens" | "reported_total_tokens"
>;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const asNonNegativeInt = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;

const cumulativeSourceTokensFrom = (payload: TokenUsageUpdatedPayload): Record<CumulativeSourceTokenField, number | null> => {
  const tokens = {} as Record<CumulativeSourceTokenField, number | null>;
  for (const field of cumulativeSourceTokenFields) {
    tokens[field] = payload[field];
  }
  return tokens;
};

const rawTokenValue = (
  record: Record<string, unknown> | null,
  field: CumulativeSourceTokenField,
): number | null => {
  if (!record) return null;
  const direct = asNonNegativeInt(record[field]);
  if (direct !== null) return direct;
  const usage = asRecord(record["usage"]);
  return asNonNegativeInt(usage?.[field]);
};

const previousCumulativeTokenValue = (
  previous: TokenUsageUpdatedPayload | null,
  field: CostAffectingTokenField,
): number | null => {
  if (!previous) return null;
  const rawEvent = asRecord(previous.raw_event_json);
  const sourceTokens = asRecord(rawEvent?.[cumulativeSnapshotSourceTokensKey]);
  return asNonNegativeInt(sourceTokens?.[field])
    ?? rawTokenValue(rawEvent, field)
    ?? rawTokenValue(asRecord(previous.raw_usage_json), field)
    ?? asNonNegativeInt(previous[field]);
};

const withCumulativeSourceTokens = (payload: TokenUsageUpdatedPayload): TokenUsageUpdatedPayload => ({
  ...payload,
  raw_event_json: {
    ...(payload.raw_event_json ?? {}),
    [cumulativeSnapshotSourceTokensKey]: cumulativeSourceTokensFrom(payload),
  },
});

const clearCostAffectingTokenFields = (payload: TokenUsageUpdatedPayload): TokenUsageUpdatedPayload => ({
  ...payload,
  cache_read_input_tokens: null,
  cache_creation_input_tokens: null,
  reasoning_output_tokens: null,
  billable_input_tokens: null,
  billable_output_tokens: null,
});

export class TokenUsageSnapshotDeltaNormalizer {
  private readonly latestSnapshotBySeries = new Map<string, TokenUsageUpdatedPayload>();
  private readonly normalizedByIdempotencyKey = new Map<string, TokenUsageUpdatedPayload>();

  constructor(private readonly store = new TokenUsageLedgerStore()) {}

  async normalizeAccountingDelta(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    const cached = this.normalizedByIdempotencyKey.get(payload.idempotency_key);
    if (cached) {
      return { ...cached };
    }

    if (payload.usage_scope === "per_call" || payload.usage_scope === "per_turn") {
      const direct = this.withMeterDeltas({
        ...payload,
        accounting_input_tokens: payload.reported_input_tokens,
        accounting_output_tokens: payload.reported_output_tokens,
        accounting_total_tokens: payload.reported_total_tokens,
      });
      this.normalizedByIdempotencyKey.set(payload.idempotency_key, direct);
      return direct;
    }

    if (!payload.snapshot_series_key) {
      const missingSeries = this.withMeterDeltas(clearCostAffectingTokenFields({
        ...payload,
        accounting_input_tokens: null,
        accounting_output_tokens: null,
        accounting_total_tokens: null,
        quality_flags: [...payload.quality_flags, "snapshot_series_key_missing"],
      }));
      this.normalizedByIdempotencyKey.set(payload.idempotency_key, missingSeries);
      return missingSeries;
    }

    const seriesKey = keyFor(payload.run_id, payload.snapshot_series_key);
    const previous = this.latestSnapshotBySeries.get(seriesKey) ??
      await this.store.getLatestCumulativeSnapshot({
        runId: payload.run_id,
        snapshotSeriesKey: payload.snapshot_series_key,
      });
    const sourceSnapshot = withCumulativeSourceTokens(payload);
    const inputDelta = delta(payload.reported_input_tokens, previous?.reported_input_tokens ?? null);
    const outputDelta = delta(payload.reported_output_tokens, previous?.reported_output_tokens ?? null);
    const totalDelta = delta(payload.reported_total_tokens, previous?.reported_total_tokens ?? null);
    const cacheReadDelta = delta(
      payload.cache_read_input_tokens,
      previousCumulativeTokenValue(previous, "cache_read_input_tokens"),
    );
    const cacheCreationDelta = delta(
      payload.cache_creation_input_tokens,
      previousCumulativeTokenValue(previous, "cache_creation_input_tokens"),
    );
    const reasoningDelta = delta(
      payload.reasoning_output_tokens,
      previousCumulativeTokenValue(previous, "reasoning_output_tokens"),
    );
    const billableInputDelta = delta(
      payload.billable_input_tokens,
      previousCumulativeTokenValue(previous, "billable_input_tokens"),
    );
    const billableOutputDelta = delta(
      payload.billable_output_tokens,
      previousCumulativeTokenValue(previous, "billable_output_tokens"),
    );
    const qualityFlags = [...payload.quality_flags];

    if (!previous) {
      qualityFlags.push("first_cumulative_snapshot_assumed_run_origin");
    }

    if (hasRegression(
      inputDelta,
      outputDelta,
      totalDelta,
      cacheReadDelta,
      cacheCreationDelta,
      reasoningDelta,
      billableInputDelta,
      billableOutputDelta,
    )) {
      qualityFlags.push("cumulative_snapshot_regressed");
      const regressed = this.withMeterDeltas(clearCostAffectingTokenFields({
        ...sourceSnapshot,
        previous_snapshot_event_id: previous?.usage_event_id ?? null,
        accounting_input_tokens: null,
        accounting_output_tokens: null,
        accounting_total_tokens: null,
        quality_flags: Array.from(new Set(qualityFlags)),
      }));
      this.normalizedByIdempotencyKey.set(payload.idempotency_key, regressed);
      return regressed;
    }

    const normalized = this.withMeterDeltas({
      ...sourceSnapshot,
      previous_snapshot_event_id: previous?.usage_event_id ?? null,
      accounting_input_tokens: inputDelta,
      accounting_output_tokens: outputDelta,
      accounting_total_tokens: totalDelta,
      cache_read_input_tokens: cacheReadDelta,
      cache_creation_input_tokens: cacheCreationDelta,
      reasoning_output_tokens: reasoningDelta,
      billable_input_tokens: billableInputDelta,
      billable_output_tokens: billableOutputDelta,
      quality_flags: Array.from(new Set(qualityFlags)),
    });
    this.latestSnapshotBySeries.set(seriesKey, sourceSnapshot);
    this.normalizedByIdempotencyKey.set(payload.idempotency_key, normalized);
    return normalized;
  }

  private withMeterDeltas(payload: TokenUsageUpdatedPayload): TokenUsageUpdatedPayload {
    return {
      ...payload,
      meter_delta_input_tokens: payload.accounting_input_tokens,
      meter_delta_output_tokens: payload.accounting_output_tokens,
      meter_delta_total_tokens: payload.accounting_total_tokens,
    };
  }
}
