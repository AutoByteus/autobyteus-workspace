import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import type { ResolvedTokenPricingPolicy } from "../pricing/token-pricing-policy.js";
import { TokenCostCalculator } from "../pricing/token-cost-calculator.js";
import { TokenUsageComponentBasisResolver } from "./token-usage-component-basis-resolver.js";
import {
  cumulativeSnapshotTokenFields,
  readCumulativeSnapshotSourceTokens,
  type CumulativeSnapshotTokenRecord,
} from "./cumulative-snapshot-reconciliation-metadata.js";
import type { TokenUsageRunRecord } from "../domain/token-usage-run-record.js";
import {
  MAX_CUMULATIVE_SERIES_PER_RUN,
  addRecentIdentityDigests,
  compareCheckpointRecency,
  cumulativeSnapshotDelta,
  digestTokenUsageIdentity,
  hasRecentIdentityDigest,
  maxCumulativeSnapshotTokens,
  toBigIntSnapshotTokens,
  type AdmissionMarker,
  type SnapshotSeriesCheckpoint,
} from "../domain/token-usage-snapshot-checkpoint.js";
import {
  applyTokenUsageContribution,
  createEmptyRunRecord,
} from "./token-usage-run-record-state.js";

export type TokenUsageRunFoldResult = Readonly<{
  kind: "SUPPRESSED" | "CHANGED";
  record: TokenUsageRunRecord | null;
  authoritativePayload: TokenUsageUpdatedPayload;
}>;

export const zeroTokenUsageContribution = (payload: TokenUsageUpdatedPayload): TokenUsageUpdatedPayload => ({
  ...payload,
  ...Object.fromEntries(cumulativeSnapshotTokenFields.map((field) => [field, null])),
  meter_delta_input_tokens: 0,
  meter_delta_output_tokens: 0,
  meter_delta_total_tokens: 0,
  estimated_api_input_cost: null,
  estimated_api_standard_input_cost: null,
  estimated_api_cache_read_input_cost: null,
  estimated_api_cache_creation_input_cost: null,
  estimated_api_cache_creation_5m_input_cost: null,
  estimated_api_cache_creation_1h_input_cost: null,
  estimated_api_output_cost: null,
  estimated_api_reasoning_output_cost: null,
  estimated_api_total_cost: null,
});

const withFlag = (payload: TokenUsageUpdatedPayload, flag: string): TokenUsageUpdatedPayload => ({
  ...payload,
  quality_flags: [...new Set([...payload.quality_flags, flag])],
});

const safeNumber = (value: bigint | null, field: string): number | null => {
  if (value === null) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new Error(`Token usage cumulative advancement '${field}' exceeds JavaScript SafeInt.`);
  }
  return number;
};

const payloadWithSnapshotTokens = (
  payload: TokenUsageUpdatedPayload,
  tokens: Record<(typeof cumulativeSnapshotTokenFields)[number], bigint | null>,
): TokenUsageUpdatedPayload => ({
  ...payload,
  ...Object.fromEntries(cumulativeSnapshotTokenFields.map((field) => [field, safeNumber(tokens[field], field)])),
});

const normalizeAuthoritativeContribution = (
  payload: TokenUsageUpdatedPayload,
  policy: ResolvedTokenPricingPolicy,
  componentResolver: TokenUsageComponentBasisResolver,
  costCalculator: TokenCostCalculator,
): TokenUsageUpdatedPayload => {
  const withBasis = componentResolver.resolve(payload);
  const withCost = costCalculator.applyPolicy(withBasis, policy);
  return {
    ...withCost,
    meter_delta_input_tokens: withCost.accounting_input_tokens,
    meter_delta_output_tokens: withCost.accounting_output_tokens,
    meter_delta_total_tokens: withCost.accounting_total_tokens,
  };
};

const markerFor = (payload: TokenUsageUpdatedPayload, ordinal: bigint): AdmissionMarker => {
  const date = new Date(payload.observed_at);
  if (Number.isNaN(date.getTime())) throw new Error("Token usage observation time is invalid.");
  return { observedAt: date.toISOString(), generation: 1, ordinal };
};

export const foldTokenUsageObservation = (input: {
  current: TokenUsageRunRecord | null;
  payload: TokenUsageUpdatedPayload;
  pricingPolicy: ResolvedTokenPricingPolicy;
  componentResolver?: TokenUsageComponentBasisResolver;
  costCalculator?: TokenCostCalculator;
}): TokenUsageRunFoldResult => {
  const componentResolver = input.componentResolver ?? new TokenUsageComponentBasisResolver();
  const costCalculator = input.costCalculator ?? new TokenCostCalculator();
  const payload = input.payload;
  if (input.current && hasRecentIdentityDigest(
    input.current.recentIdempotencyDigests,
    payload.usage_event_id,
    payload.idempotency_key,
  )) {
    return { kind: "SUPPRESSED", record: input.current, authoritativePayload: zeroTokenUsageContribution(payload) };
  }

  let record = input.current;
  const nextOrdinal = (record?.revision ?? 0n) + 1n;
  const marker = markerFor(payload, nextOrdinal);
  let authoritative = payload;
  let shouldCountReport = true;

  if (payload.usage_scope === "cumulative_snapshot") {
    const seriesKey = payload.snapshot_series_key?.trim();
    const rawSource = readCumulativeSnapshotSourceTokens(payload.raw_event_json);
    if (!seriesKey || !rawSource) {
      authoritative = withFlag(zeroTokenUsageContribution(payload), seriesKey
        ? "cumulative_snapshot_source_unrecoverable"
        : "snapshot_series_key_missing");
    } else {
      const seriesDigest = digestTokenUsageIdentity("series", seriesKey);
      const sourceTokens = toBigIntSnapshotTokens(rawSource);
      const existingIndex = record?.snapshotSeriesState.findIndex((item) => item.seriesDigest === seriesDigest) ?? -1;
      if (existingIndex >= 0 && record) {
        const checkpoint = record.snapshotSeriesState[existingIndex]!;
        const advancement = cumulativeSnapshotDelta(sourceTokens, checkpoint.sourceTokens);
        if (advancement.regressed) {
          authoritative = withFlag(zeroTokenUsageContribution(payload), "cumulative_snapshot_regressed");
          record = {
            ...record,
            snapshotSeriesState: record.snapshotSeriesState.map((item, index) => index === existingIndex
              ? { ...item, sourceTokens: maxCumulativeSnapshotTokens(item.sourceTokens, sourceTokens) }
              : item),
          };
        } else if (!advancement.advanced) {
          shouldCountReport = false;
          authoritative = zeroTokenUsageContribution(payload);
        } else {
          authoritative = normalizeAuthoritativeContribution(
            payloadWithSnapshotTokens(payload, advancement.delta),
            input.pricingPolicy,
            componentResolver,
            costCalculator,
          );
          record = {
            ...record,
            snapshotSeriesState: record.snapshotSeriesState.map((item, index) => index === existingIndex
              ? { seriesDigest, sourceTokens, lastAdmission: marker }
              : item),
          };
        }
      } else {
        record ??= createEmptyRunRecord(payload, marker);
        const checkpoint: SnapshotSeriesCheckpoint = { seriesDigest, sourceTokens, lastAdmission: marker };
        if (record.snapshotSeriesState.length >= MAX_CUMULATIVE_SERIES_PER_RUN) {
          const evicted = [...record.snapshotSeriesState].sort(compareCheckpointRecency)[0]!;
          record = {
            ...record,
            snapshotSeriesState: [...record.snapshotSeriesState.filter((item) => item !== evicted), checkpoint],
          };
          authoritative = withFlag(zeroTokenUsageContribution(payload), "cumulative_series_checkpoint_evicted");
        } else {
          record = {
            ...record,
            snapshotSeriesState: [...record.snapshotSeriesState, checkpoint],
          };
          const providerDeltaMissing = payload.quality_flags.includes("cumulative_snapshot_provider_delta_missing");
          authoritative = providerDeltaMissing
            ? zeroTokenUsageContribution(payload)
            : normalizeAuthoritativeContribution(
                payload.runtime_kind === "codex_app_server" || payload.ingestion_kind === "codex_thread_token_usage"
                  ? withFlag(payload, "first_cumulative_snapshot_baselined_from_provider_delta")
                  : payload,
                input.pricingPolicy,
                componentResolver,
                costCalculator,
              );
        }
      }
    }
  } else {
    authoritative = normalizeAuthoritativeContribution(payload, input.pricingPolicy, componentResolver, costCalculator);
  }

  if (!shouldCountReport) {
    return { kind: "SUPPRESSED", record, authoritativePayload: authoritative };
  }
  record ??= createEmptyRunRecord(payload, marker);
  if (shouldCountReport) {
    record = applyTokenUsageContribution({
      record,
      payload: authoritative,
      marker,
      incrementReport: true,
      incrementRevision: true,
    });
    record = {
      ...record,
      recentIdempotencyDigests: addRecentIdentityDigests(record.recentIdempotencyDigests, {
        usageEventId: payload.usage_event_id,
        idempotencyKey: payload.idempotency_key,
        generation: 1,
        ordinal: record.revision,
      }),
    };
  }
  return { kind: "CHANGED", record, authoritativePayload: authoritative };
};

export const sourceTokensFromPayload = (payload: TokenUsageUpdatedPayload): CumulativeSnapshotTokenRecord | null =>
  readCumulativeSnapshotSourceTokens(payload.raw_event_json);
