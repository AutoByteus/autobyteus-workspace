import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { resolveTokenUsageComponentBasis } from "../domain/token-usage-component-basis.js";
import { TokenUsageLedgerStore } from "../providers/token-usage-ledger-store.js";
import {
  asCumulativeSnapshotTokenValue,
  cumulativeSnapshotTokenFields,
  readCumulativeSnapshotProviderDeltaTokens,
  readCumulativeSnapshotSourceTokens,
  withCumulativeSnapshotSourceTokens,
  type CumulativeSnapshotTokenField,
  type CumulativeSnapshotTokenRecord,
} from "./cumulative-snapshot-reconciliation-metadata.js";

const keyFor = (runId: string, seriesKey: string): string => `${runId}::${seriesKey}`;
const delta = (current: number | null, previous: number | null): number | null => {
  if (current === null) return null;
  if (previous === null) return current;
  return current - previous;
};
const hasRegression = (...values: Array<number | null>): boolean =>
  values.some((value) => value !== null && value < 0);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const rawTokenValue = (
  record: Record<string, unknown> | null,
  field: CumulativeSnapshotTokenField,
): number | null => {
  if (!record) return null;
  const direct = asCumulativeSnapshotTokenValue(record[field]);
  if (direct !== null) return direct;
  const usage = asRecord(record["usage"]);
  return asCumulativeSnapshotTokenValue(usage?.[field]);
};

const previousCumulativeTokenValue = (
  previous: TokenUsageUpdatedPayload | null,
  field: CumulativeSnapshotTokenField,
): number | null => {
  if (!previous) return null;
  const rawEvent = asRecord(previous.raw_event_json);
  const sourceTokens = readCumulativeSnapshotSourceTokens(rawEvent);
  return sourceTokens?.[field]
    ?? rawTokenValue(rawEvent, field)
    ?? rawTokenValue(asRecord(previous.raw_usage_json), field)
    ?? asCumulativeSnapshotTokenValue(previous[field]);
};

const clearCostAffectingTokenFields = (payload: TokenUsageUpdatedPayload): TokenUsageUpdatedPayload => ({
  ...payload,
  accounting_input_tokens: null,
  accounting_output_tokens: null,
  accounting_total_tokens: null,
  standard_input_tokens: null,
  cache_miss_input_tokens: null,
  cache_read_input_tokens: null,
  cache_creation_input_tokens: null,
  cache_creation_5m_input_tokens: null,
  cache_creation_1h_input_tokens: null,
  reasoning_output_tokens: null,
  billable_input_tokens: null,
  billable_output_tokens: null,
});

const hasProviderDeltaMismatch = (
  deltas: CumulativeSnapshotTokenRecord,
  providerDelta: CumulativeSnapshotTokenRecord | null,
): boolean => {
  if (!providerDelta) return false;
  return cumulativeSnapshotTokenFields.some((field) => {
    const computed = deltas[field];
    const provider = providerDelta[field];
    if (computed === null && provider === null) return false;
    return computed !== provider;
  });
};

const resolveProviderDeltaComponentBasis = (
  payload: TokenUsageUpdatedPayload,
  providerDelta: CumulativeSnapshotTokenRecord,
): CumulativeSnapshotTokenRecord => {
  const basis = resolveTokenUsageComponentBasis({
    runtime_kind: payload.runtime_kind,
    input_token_semantic: payload.input_token_semantic,
    reported_input_tokens: providerDelta.reported_input_tokens,
    reported_output_tokens: providerDelta.reported_output_tokens,
    accounting_input_tokens: providerDelta.accounting_input_tokens,
    standard_input_tokens: providerDelta.standard_input_tokens,
    cache_miss_input_tokens: providerDelta.cache_miss_input_tokens,
    cache_read_input_tokens: providerDelta.cache_read_input_tokens,
    cache_creation_input_tokens: providerDelta.cache_creation_input_tokens,
    cache_creation_5m_input_tokens: providerDelta.cache_creation_5m_input_tokens,
    cache_creation_1h_input_tokens: providerDelta.cache_creation_1h_input_tokens,
    cache_state: payload.cache_state,
    billable_output_tokens: providerDelta.billable_output_tokens,
  });

  return {
    ...providerDelta,
    accounting_input_tokens: basis.accounting_input_tokens,
    accounting_output_tokens: basis.accounting_output_tokens,
    accounting_total_tokens: basis.accounting_total_tokens,
    standard_input_tokens: basis.standard_input_tokens,
    cache_miss_input_tokens: basis.cache_miss_input_tokens,
    cache_creation_input_tokens: basis.cache_creation_input_tokens,
    billable_input_tokens: basis.billable_input_tokens,
    billable_output_tokens: basis.billable_output_tokens,
  };
};

const payloadWithTokenRecord = (
  payload: TokenUsageUpdatedPayload,
  tokens: CumulativeSnapshotTokenRecord,
): TokenUsageUpdatedPayload => ({
  ...payload,
  reported_input_tokens: tokens.reported_input_tokens,
  reported_output_tokens: tokens.reported_output_tokens,
  reported_total_tokens: tokens.reported_total_tokens,
  accounting_input_tokens: tokens.accounting_input_tokens,
  accounting_output_tokens: tokens.accounting_output_tokens,
  accounting_total_tokens: tokens.accounting_total_tokens,
  standard_input_tokens: tokens.standard_input_tokens,
  cache_miss_input_tokens: tokens.cache_miss_input_tokens,
  cache_read_input_tokens: tokens.cache_read_input_tokens,
  cache_creation_input_tokens: tokens.cache_creation_input_tokens,
  cache_creation_5m_input_tokens: tokens.cache_creation_5m_input_tokens,
  cache_creation_1h_input_tokens: tokens.cache_creation_1h_input_tokens,
  reasoning_output_tokens: tokens.reasoning_output_tokens,
  billable_input_tokens: tokens.billable_input_tokens,
  billable_output_tokens: tokens.billable_output_tokens,
});

const isCodexCumulativeSnapshot = (payload: TokenUsageUpdatedPayload): boolean =>
  payload.runtime_kind === "codex_app_server" ||
  payload.ingestion_kind === "codex_thread_token_usage";

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
      const direct = this.withMeterDeltas(payload);
      this.normalizedByIdempotencyKey.set(payload.idempotency_key, direct);
      return direct;
    }

    if (!payload.snapshot_series_key) {
      const missingSeries = this.withMeterDeltas(clearCostAffectingTokenFields({
        ...payload,
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
    const sourceSnapshot = withCumulativeSnapshotSourceTokens(payload);
    const providerDelta = readCumulativeSnapshotProviderDeltaTokens(payload);
    const providerAccountingDelta = providerDelta
      ? resolveProviderDeltaComponentBasis(payload, providerDelta)
      : null;
    const deltas = Object.fromEntries(cumulativeSnapshotTokenFields.map((field) => [
      field,
      delta(payload[field], previousCumulativeTokenValue(previous, field)),
    ])) as CumulativeSnapshotTokenRecord;
    const qualityFlags = [...payload.quality_flags];

    if (previous && hasProviderDeltaMismatch(deltas, providerAccountingDelta)) {
      qualityFlags.push("cumulative_snapshot_provider_delta_mismatch");
    }

    if (hasRegression(...Object.values(deltas))) {
      qualityFlags.push("cumulative_snapshot_regressed");
      const regressed = this.withMeterDeltas(clearCostAffectingTokenFields({
        ...sourceSnapshot,
        previous_snapshot_event_id: previous?.usage_event_id ?? null,
        quality_flags: Array.from(new Set(qualityFlags)),
      }));
      this.normalizedByIdempotencyKey.set(payload.idempotency_key, regressed);
      return regressed;
    }

    if (!previous && providerAccountingDelta) {
      qualityFlags.push("first_cumulative_snapshot_baselined_from_provider_delta");
      const normalized = this.withMeterDeltas(payloadWithTokenRecord({
        ...sourceSnapshot,
        previous_snapshot_event_id: null,
        quality_flags: Array.from(new Set(qualityFlags)),
      }, providerAccountingDelta));
      this.latestSnapshotBySeries.set(seriesKey, sourceSnapshot);
      this.normalizedByIdempotencyKey.set(payload.idempotency_key, normalized);
      return normalized;
    }

    if (!previous && !providerAccountingDelta) {
      qualityFlags.push("cumulative_snapshot_provider_delta_missing");
      if (isCodexCumulativeSnapshot(payload)) {
        const missingProviderDelta = this.withMeterDeltas(clearCostAffectingTokenFields({
          ...sourceSnapshot,
          previous_snapshot_event_id: null,
          quality_flags: Array.from(new Set(qualityFlags)),
        }));
        this.latestSnapshotBySeries.set(seriesKey, sourceSnapshot);
        this.normalizedByIdempotencyKey.set(payload.idempotency_key, missingProviderDelta);
        return missingProviderDelta;
      }
      qualityFlags.push("first_cumulative_snapshot_assumed_run_origin");
    }

    const normalized = this.withMeterDeltas(payloadWithTokenRecord({
      ...sourceSnapshot,
      previous_snapshot_event_id: previous?.usage_event_id ?? null,
      quality_flags: Array.from(new Set(qualityFlags)),
    }, deltas));
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
