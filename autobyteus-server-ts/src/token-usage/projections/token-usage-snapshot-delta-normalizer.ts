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
      const missingSeries = this.withMeterDeltas({
        ...payload,
        accounting_input_tokens: null,
        accounting_output_tokens: null,
        accounting_total_tokens: null,
        quality_flags: [...payload.quality_flags, "snapshot_series_key_missing"],
      });
      this.normalizedByIdempotencyKey.set(payload.idempotency_key, missingSeries);
      return missingSeries;
    }

    const seriesKey = keyFor(payload.run_id, payload.snapshot_series_key);
    const previous = this.latestSnapshotBySeries.get(seriesKey) ??
      await this.store.getLatestCumulativeSnapshot({
        runId: payload.run_id,
        snapshotSeriesKey: payload.snapshot_series_key,
      });
    const inputDelta = delta(payload.reported_input_tokens, previous?.reported_input_tokens ?? null);
    const outputDelta = delta(payload.reported_output_tokens, previous?.reported_output_tokens ?? null);
    const totalDelta = delta(payload.reported_total_tokens, previous?.reported_total_tokens ?? null);
    const qualityFlags = [...payload.quality_flags];

    if (!previous) {
      qualityFlags.push("first_cumulative_snapshot_assumed_run_origin");
    }

    if (hasRegression(inputDelta, outputDelta, totalDelta)) {
      qualityFlags.push("cumulative_snapshot_regressed");
      const regressed = this.withMeterDeltas({
        ...payload,
        previous_snapshot_event_id: previous?.usage_event_id ?? null,
        accounting_input_tokens: null,
        accounting_output_tokens: null,
        accounting_total_tokens: null,
        quality_flags: Array.from(new Set(qualityFlags)),
      });
      this.normalizedByIdempotencyKey.set(payload.idempotency_key, regressed);
      return regressed;
    }

    const normalized = this.withMeterDeltas({
      ...payload,
      previous_snapshot_event_id: previous?.usage_event_id ?? null,
      accounting_input_tokens: inputDelta,
      accounting_output_tokens: outputDelta,
      accounting_total_tokens: totalDelta,
      quality_flags: Array.from(new Set(qualityFlags)),
    });
    this.latestSnapshotBySeries.set(seriesKey, normalized);
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
