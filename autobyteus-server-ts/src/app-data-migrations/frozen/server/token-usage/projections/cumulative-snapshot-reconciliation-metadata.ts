export const cumulativeSnapshotSourceTokensKey = "autobyteus_cumulative_snapshot_source_tokens";

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
