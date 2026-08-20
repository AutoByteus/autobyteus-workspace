import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { resolveTokenUsageComponentBasis } from "../domain/token-usage-component-basis.js";
import {
  cumulativeSnapshotTokenFields,
  readCumulativeSnapshotProviderDeltaTokens,
  withCumulativeSnapshotSourceTokens,
  type CumulativeSnapshotTokenRecord,
} from "./cumulative-snapshot-reconciliation-metadata.js";

const clearCostAffectingTokenFields = (payload: TokenUsageUpdatedPayload): TokenUsageUpdatedPayload => ({
  ...payload,
  ...Object.fromEntries(cumulativeSnapshotTokenFields.map((field) => [field, null])),
});

const payloadWithTokenRecord = (
  payload: TokenUsageUpdatedPayload,
  tokens: CumulativeSnapshotTokenRecord,
): TokenUsageUpdatedPayload => ({
  ...payload,
  ...Object.fromEntries(cumulativeSnapshotTokenFields.map((field) => [field, tokens[field]])),
});

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

const withMeterDeltas = (payload: TokenUsageUpdatedPayload): TokenUsageUpdatedPayload => ({
  ...payload,
  meter_delta_input_tokens: payload.accounting_input_tokens,
  meter_delta_output_tokens: payload.accounting_output_tokens,
  meter_delta_total_tokens: payload.accounting_total_tokens,
});

/**
 * Prepares an optimistic live delta while retaining the exact cumulative source
 * counters for the transactional run fold. Durable reconciliation is owned by
 * TokenUsageRunAccumulator, not by this event-pipeline projection.
 */
export class TokenUsageSnapshotDeltaNormalizer {
  async normalizeAccountingDelta(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    if (payload.usage_scope !== "cumulative_snapshot") return withMeterDeltas(payload);

    const sourceSnapshot = withCumulativeSnapshotSourceTokens(payload);
    if (!payload.snapshot_series_key?.trim()) {
      return withMeterDeltas({
        ...clearCostAffectingTokenFields(sourceSnapshot),
        quality_flags: [...new Set([...payload.quality_flags, "snapshot_series_key_missing"])],
      });
    }

    const providerDelta = readCumulativeSnapshotProviderDeltaTokens(payload);
    if (providerDelta) {
      return withMeterDeltas(payloadWithTokenRecord(
        sourceSnapshot,
        resolveProviderDeltaComponentBasis(payload, providerDelta),
      ));
    }

    const mayAssumeRunOrigin = payload.runtime_kind !== "codex_app_server" &&
      payload.ingestion_kind !== "codex_thread_token_usage";
    if (mayAssumeRunOrigin) {
      return withMeterDeltas({
        ...sourceSnapshot,
        quality_flags: [...new Set([...payload.quality_flags, "first_cumulative_snapshot_assumed_run_origin"])],
      });
    }
    return withMeterDeltas({
      ...clearCostAffectingTokenFields(sourceSnapshot),
      quality_flags: [...new Set([...payload.quality_flags, "cumulative_snapshot_provider_delta_missing"])],
    });
  }
}
