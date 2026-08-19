export type RawTokenUsageProviderNameBackfillRow = {
  id: number;
  usage_event_id: string;
  idempotency_key: string;
  observed_at: string | Date;
  persisted_at: string | Date;
  run_id: string;
  runtime_kind: string;
  model_provider: string | null;
  provider_name: string | null;
  model_identifier: string | null;
  model_value: string | null;
  [field: string]: unknown;
};

export const preservedRowSnapshot = (row: RawTokenUsageProviderNameBackfillRow): string => JSON.stringify(
  Object.fromEntries(
    Object.keys(row)
      .filter((field) => field !== "provider_name")
      .sort((left, right) => left.localeCompare(right))
      .map((field) => [field, row[field]]),
  ),
);

export interface TokenUsageProviderNameSnapshotBackfillDatabase {
  listTokenUsageLedgerRows(): Promise<RawTokenUsageProviderNameBackfillRow[]>;
  listTokenUsageProviderNameBackfillCandidates(): Promise<RawTokenUsageProviderNameBackfillRow[]>;
  countTokenUsageLedgerRows(): Promise<number>;
  updateTokenUsageProviderName(input: {
    id: number;
    expectedProviderName: string | null;
    nextProviderName: string;
  }): Promise<number | void>;
}

type SkipReason =
  | "SKIPPED_ALREADY_POPULATED"
  | "SKIPPED_SCOPE_MISMATCH"
  | "SKIPPED_PROVIDER_NAME_UNRECOVERABLE"
  | "SKIPPED_SOURCE_CHANGED";

export type Classification =
  | { kind: "MIGRATE"; providerName: string }
  | { kind: "SKIP"; reason: SkipReason };
