import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";

export const cumulativeSnapshotSourceTokensKey = "autobyteus_cumulative_snapshot_source_tokens";
export const cumulativeSnapshotProviderDeltaTokensKey = "autobyteus_cumulative_snapshot_provider_delta_tokens";

export const cumulativeSnapshotTokenFields = [
  "reported_input_tokens",
  "reported_output_tokens",
  "reported_total_tokens",
  "accounting_input_tokens",
  "accounting_output_tokens",
  "accounting_total_tokens",
  "standard_input_tokens",
  "cache_miss_input_tokens",
  "cache_read_input_tokens",
  "cache_creation_input_tokens",
  "cache_creation_5m_input_tokens",
  "cache_creation_1h_input_tokens",
  "reasoning_output_tokens",
  "billable_input_tokens",
  "billable_output_tokens",
] as const;

export type CumulativeSnapshotTokenField = typeof cumulativeSnapshotTokenFields[number];
export type CumulativeSnapshotTokenRecord = Record<CumulativeSnapshotTokenField, number | null>;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

export const asCumulativeSnapshotTokenValue = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;

export const cumulativeSnapshotTokensFromPayload = (
  payload: TokenUsageUpdatedPayload,
): CumulativeSnapshotTokenRecord => {
  const tokens = {} as CumulativeSnapshotTokenRecord;
  for (const field of cumulativeSnapshotTokenFields) {
    tokens[field] = payload[field];
  }
  return tokens;
};

export const cumulativeSnapshotTokensFromRecord = (
  record: Record<string, unknown> | null,
): CumulativeSnapshotTokenRecord | null => {
  if (!record) return null;
  const tokens = {} as CumulativeSnapshotTokenRecord;
  let sawField = false;
  for (const field of cumulativeSnapshotTokenFields) {
    const token = asCumulativeSnapshotTokenValue(record[field]);
    tokens[field] = token;
    sawField = sawField || token !== null;
  }
  return sawField ? tokens : null;
};

export const readCumulativeSnapshotProviderDeltaTokens = (
  payload: TokenUsageUpdatedPayload,
): CumulativeSnapshotTokenRecord | null =>
  cumulativeSnapshotTokensFromRecord(
    asRecord(asRecord(payload.raw_event_json)?.[cumulativeSnapshotProviderDeltaTokensKey]),
  );

export const withCumulativeSnapshotSourceTokens = (
  payload: TokenUsageUpdatedPayload,
): TokenUsageUpdatedPayload => ({
  ...payload,
  raw_event_json: {
    ...(payload.raw_event_json ?? {}),
    [cumulativeSnapshotSourceTokensKey]: cumulativeSnapshotTokensFromPayload(payload),
  },
});

export const readCumulativeSnapshotSourceTokens = (
  rawEventJson: Record<string, unknown> | null,
): CumulativeSnapshotTokenRecord | null =>
  cumulativeSnapshotTokensFromRecord(
    asRecord(rawEventJson?.[cumulativeSnapshotSourceTokensKey]),
  );
