import { getLlmProviderDisplayName, isBuiltInLlmProviderId } from "autobyteus-ts/llm/provider-display-names.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";
import { parseTokenUsageCompositeModelValue } from "../../token-usage/projections/token-usage-model-display-projection.js";
import {
  preservedRowSnapshot,
  type Classification,
  type RawTokenUsageProviderNameBackfillRow,
  type TokenUsageProviderNameSnapshotBackfillDatabase,
} from "./token-usage-provider-name-snapshot-backfill-row.js";
import { CustomProviderMigrationNameSnapshotReader } from "./custom-provider-migration-name-snapshot.js";
export type {
  RawTokenUsageProviderNameBackfillRow,
  TokenUsageProviderNameSnapshotBackfillDatabase,
} from "./token-usage-provider-name-snapshot-backfill-row.js";

export const TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID =
  "20260730_token_usage_provider_name_snapshot_backfill";

const MAX_ROW_FAILURE_DETAILS = 50;

const compact = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized || null;
};

const isAutoByteus = (row: RawTokenUsageProviderNameBackfillRow): boolean => (
  compact(row.runtime_kind)?.toLowerCase() === "autobyteus"
);

const resolveProviderName = (
  row: RawTokenUsageProviderNameBackfillRow,
  customProviderNames: ReadonlyMap<string, string>,
): string | null => {
  const provider = compact(row.model_provider)?.toUpperCase();
  if (!provider) return null;

  if (isBuiltInLlmProviderId(provider)) {
    return compact(getLlmProviderDisplayName(provider));
  }

  if (provider !== LLMProvider.OPENAI_COMPATIBLE) return null;
  const composite = parseTokenUsageCompositeModelValue(row.model_identifier);
  if (!composite) return null;
  return compact(customProviderNames.get(composite.providerId));
};

export const classifyTokenUsageProviderNameSnapshotRow = (
  row: RawTokenUsageProviderNameBackfillRow,
  customProviderNames: ReadonlyMap<string, string>,
): Classification => {
  if (compact(row.provider_name)) return { kind: "SKIP", reason: "SKIPPED_ALREADY_POPULATED" };
  if (!isAutoByteus(row)) return { kind: "SKIP", reason: "SKIPPED_SCOPE_MISMATCH" };

  const providerName = resolveProviderName(row, customProviderNames);
  return providerName
    ? { kind: "MIGRATE", providerName }
    : { kind: "SKIP", reason: "SKIPPED_PROVIDER_NAME_UNRECOVERABLE" };
};

const detail = (
  itemId: string,
  status: AppDataMigrationItemDetail["status"],
  message: string,
): AppDataMigrationItemDetail => ({ itemId, status, message });

const buildSummary = (input: {
  scannedCount: number;
  migratedCount: number;
  skippedDetails: AppDataMigrationItemDetail[];
  failedDetails: AppDataMigrationItemDetail[];
  failedCount?: number;
  invariantDetails: AppDataMigrationItemDetail[];
}): AppDataMigrationSummary => ({
  scannedCount: input.scannedCount,
  migratedCount: input.migratedCount,
  skippedCount: input.skippedDetails.length,
  failedCount: input.failedCount ?? input.failedDetails.length,
  details: [...input.skippedDetails, ...input.failedDetails, ...input.invariantDetails],
});

const countReasons = (details: readonly AppDataMigrationItemDetail[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const item of details) {
    const reason = item.message.match(/reason=([^;]+)/)?.[1];
    if (reason) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return counts;
};

export class PrismaTokenUsageProviderNameSnapshotBackfillDatabase
  implements TokenUsageProviderNameSnapshotBackfillDatabase {
  private prisma: ReturnType<typeof createConfiguredPrismaClient> | null;
  private readonly ownsClient: boolean;

  constructor(prisma?: ReturnType<typeof createConfiguredPrismaClient>) {
    this.prisma = prisma ?? null;
    this.ownsClient = prisma === undefined;
  }

  private get client(): ReturnType<typeof createConfiguredPrismaClient> {
    this.prisma ??= createConfiguredPrismaClient();
    return this.prisma;
  }

  async listTokenUsageLedgerRows(): Promise<RawTokenUsageProviderNameBackfillRow[]> {
    return this.client.$queryRaw<RawTokenUsageProviderNameBackfillRow[]>`
      SELECT
        "id",
        "usage_event_id",
        "idempotency_key",
        "observed_at",
        "persisted_at",
        "run_id",
        "turn_id",
        "llm_call_id",
        "call_sequence",
        "root_team_run_id",
        "execution_address_json",
        "member_agent_run_id",
        "member_route_key",
        "agent_definition_id",
        "workspace_id",
        "task_agent_instance_id",
        "task_agent_run_id",
        "task_id",
        "team_name",
        "agent_name",
        "run_summary",
        "run_created_at",
        "member_name",
        "runtime_kind",
        "model_provider",
        "provider_name",
        "model_identifier",
        "model_value",
        "ingestion_kind",
        "usage_scope",
        "snapshot_series_key",
        "previous_snapshot_event_id",
        "input_token_semantic",
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
        "cache_state",
        "reasoning_output_tokens",
        "billable_input_tokens",
        "billable_output_tokens",
        "raw_usage_json",
        "raw_event_json",
        "quality_flags_json",
        "cost_basis",
        "currency",
        "input_price_per_million",
        "output_price_per_million",
        "cached_input_read_price_per_million",
        "cached_input_write_price_per_million",
        "cached_input_write_5m_price_per_million",
        "cached_input_write_1h_price_per_million",
        "pricing_source",
        "pricing_status",
        "pricing_missing_reason",
        "pricing_snapshot_json",
        "pricing_policy_key",
        "selected_pricing_tier_id",
        "missing_price_dimensions_json",
        "estimated_api_input_cost",
        "estimated_api_standard_input_cost",
        "estimated_api_cache_read_input_cost",
        "estimated_api_cache_creation_input_cost",
        "estimated_api_cache_creation_5m_input_cost",
        "estimated_api_cache_creation_1h_input_cost",
        "estimated_api_output_cost",
        "estimated_api_reasoning_output_cost",
        "estimated_api_total_cost",
        "api_cost_status",
        "latest_prompt_tokens",
        "effective_context_window_tokens",
        "context_window_usage_percent"
      FROM "token_usage_ledger_events"
      ORDER BY "id" ASC
    `;
  }

  async listTokenUsageProviderNameBackfillCandidates(): Promise<RawTokenUsageProviderNameBackfillRow[]> {
    return this.client.$queryRaw<RawTokenUsageProviderNameBackfillRow[]>`
      SELECT
        "id",
        "usage_event_id",
        "idempotency_key",
        "observed_at",
        "persisted_at",
        "run_id",
        "turn_id",
        "llm_call_id",
        "call_sequence",
        "root_team_run_id",
        "execution_address_json",
        "member_agent_run_id",
        "member_route_key",
        "agent_definition_id",
        "workspace_id",
        "task_agent_instance_id",
        "task_agent_run_id",
        "task_id",
        "team_name",
        "agent_name",
        "run_summary",
        "run_created_at",
        "member_name",
        "runtime_kind",
        "model_provider",
        "provider_name",
        "model_identifier",
        "model_value",
        "ingestion_kind",
        "usage_scope",
        "snapshot_series_key",
        "previous_snapshot_event_id",
        "input_token_semantic",
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
        "cache_state",
        "reasoning_output_tokens",
        "billable_input_tokens",
        "billable_output_tokens",
        "raw_usage_json",
        "raw_event_json",
        "quality_flags_json",
        "cost_basis",
        "currency",
        "input_price_per_million",
        "output_price_per_million",
        "cached_input_read_price_per_million",
        "cached_input_write_price_per_million",
        "cached_input_write_5m_price_per_million",
        "cached_input_write_1h_price_per_million",
        "pricing_source",
        "pricing_status",
        "pricing_missing_reason",
        "pricing_snapshot_json",
        "pricing_policy_key",
        "selected_pricing_tier_id",
        "missing_price_dimensions_json",
        "estimated_api_input_cost",
        "estimated_api_standard_input_cost",
        "estimated_api_cache_read_input_cost",
        "estimated_api_cache_creation_input_cost",
        "estimated_api_cache_creation_5m_input_cost",
        "estimated_api_cache_creation_1h_input_cost",
        "estimated_api_output_cost",
        "estimated_api_reasoning_output_cost",
        "estimated_api_total_cost",
        "api_cost_status",
        "latest_prompt_tokens",
        "effective_context_window_tokens",
        "context_window_usage_percent"
      FROM "token_usage_ledger_events"
      WHERE "provider_name" IS NULL OR trim("provider_name") = ''
      ORDER BY "id" ASC
    `;
  }

  async countTokenUsageLedgerRows(): Promise<number> {
    const rows = await this.client.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(*) AS count FROM "token_usage_ledger_events"
    `;
    return Number(rows[0]?.count ?? 0);
  }

  async updateTokenUsageProviderName(input: {
    id: number;
    expectedProviderName: string | null;
    nextProviderName: string;
  }): Promise<number> {
    return this.client.$executeRaw`
      UPDATE "token_usage_ledger_events"
      SET "provider_name" = ${input.nextProviderName}
      WHERE "id" = ${input.id}
        AND (
          ("provider_name" IS NULL AND ${input.expectedProviderName} IS NULL)
          OR ("provider_name" = ${input.expectedProviderName} AND trim("provider_name") = '')
        )
    `;
  }

  async disconnect(): Promise<void> {
    if (this.ownsClient && this.prisma) await this.prisma.$disconnect();
  }
}

export class TokenUsageProviderNameSnapshotBackfillMigration implements AppDataMigrationDefinition {
  readonly id = TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID;
  readonly displayName = "Token usage provider-name snapshot backfill";
  readonly description = "Recovers exact provider display names for legacy AutoByteus ledger rows without snapshots.";
  readonly requiredOnStartup = true;
  private database: TokenUsageProviderNameSnapshotBackfillDatabase | null;
  private readonly providerNameReader: Pick<CustomProviderMigrationNameSnapshotReader, "read">;

  constructor(
    database?: TokenUsageProviderNameSnapshotBackfillDatabase,
    providerNameReader: Pick<CustomProviderMigrationNameSnapshotReader, "read"> =
      new CustomProviderMigrationNameSnapshotReader(),
  ) {
    this.database = database ?? null;
    this.providerNameReader = providerNameReader;
  }

  private getDatabase(): TokenUsageProviderNameSnapshotBackfillDatabase {
    this.database ??= new PrismaTokenUsageProviderNameSnapshotBackfillDatabase();
    return this.database;
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const database = this.getDatabase();
    let customProviderNames: Map<string, string>;
    try {
      const providers = await this.providerNameReader.read();
      customProviderNames = new Map(
        providers.map((provider) => [provider.id, provider.name] as const),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const summary = buildSummary({
        scannedCount: 0,
        migratedCount: 0,
        skippedDetails: [],
        failedDetails: [detail("token-usage-provider-name:provider-map", "FAILED", message)],
        failedCount: 1,
        invariantDetails: [],
      });
      return { status: "FAILED", summary, errorMessage: message };
    }

    let rows: RawTokenUsageProviderNameBackfillRow[];
    let beforeRows: RawTokenUsageProviderNameBackfillRow[];
    let beforeCount: number;
    try {
      rows = await database.listTokenUsageProviderNameBackfillCandidates();
      beforeRows = await database.listTokenUsageLedgerRows();
      beforeCount = await database.countTokenUsageLedgerRows();
      if (beforeRows.length !== beforeCount) {
        throw new Error(`Token usage ledger row count changed during preflight: listed ${beforeRows.length}, counted ${beforeCount}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const summary = buildSummary({
        scannedCount: 0,
        migratedCount: 0,
        skippedDetails: [],
        failedDetails: [detail("token-usage-provider-name:preflight", "FAILED", message)],
        failedCount: 1,
        invariantDetails: [],
      });
      return { status: "FAILED", summary, errorMessage: message };
    }

    const skippedDetails: AppDataMigrationItemDetail[] = [];
    const failedDetails: AppDataMigrationItemDetail[] = [];
    let migratedCount = 0;
    let failureCount = 0;

    for (const row of rows) {
      const classification = classifyTokenUsageProviderNameSnapshotRow(row, customProviderNames);
      if (classification.kind === "SKIP") {
        skippedDetails.push(detail(
          row.usage_event_id || `token-usage-row:${row.id}`,
          "SKIPPED",
          `reason=${classification.reason}; row ${row.id} was not changed.`,
        ));
        continue;
      }

      try {
        const affectedRows = await database.updateTokenUsageProviderName({
          id: row.id,
          expectedProviderName: row.provider_name,
          nextProviderName: classification.providerName,
        });
        if (affectedRows === 0) {
          skippedDetails.push(detail(
            row.usage_event_id || `token-usage-row:${row.id}`,
            "SKIPPED",
            "reason=SKIPPED_SOURCE_CHANGED; compare-and-set affected zero rows.",
          ));
          continue;
        }
        migratedCount += 1;
      } catch (error) {
        failureCount += 1;
        if (failedDetails.length < MAX_ROW_FAILURE_DETAILS) {
          const message = error instanceof Error ? error.message : String(error);
          failedDetails.push(detail(
            row.usage_event_id || `token-usage-row:${row.id}`,
            "FAILED",
            `reason=FAILED; row ${row.id} update failed: ${message}`,
          ));
        }
      }
    }

    const invariantDetails: AppDataMigrationItemDetail[] = [];
    try {
      const afterRows = await database.listTokenUsageLedgerRows();
      const afterCount = await database.countTokenUsageLedgerRows();
      const beforePreservedSnapshots = beforeRows
        .map(preservedRowSnapshot)
        .sort();
      const afterPreservedSnapshots = afterRows
        .map(preservedRowSnapshot)
        .sort();
      const preservedFieldsChanged = beforePreservedSnapshots.length !== afterPreservedSnapshots.length || beforePreservedSnapshots.some((value, index) => (
        value !== afterPreservedSnapshots[index]
      ));
      if (afterCount !== beforeCount || preservedFieldsChanged) {
        throw new Error(
          `Token usage ledger invariants changed: row count ${beforeCount} -> ${afterCount}; preserved fields changed=${preservedFieldsChanged}.`,
        );
      }
      invariantDetails.push(detail(
        "token-usage-provider-name:invariants",
        "SKIPPED",
        `Row count and every non-provider_name ledger field (identity, attribution, token/cost/accounting, timestamps, and raw JSON) preserved: ${beforeCount} rows; only eligible provider_name fields may change.`,
      ));
    } catch (error) {
      failureCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      failedDetails.push(detail("token-usage-provider-name:invariants", "FAILED", message));
    }

    const summary = buildSummary({
      scannedCount: rows.length,
      migratedCount,
      skippedDetails,
      failedDetails,
      failedCount: failureCount,
      invariantDetails,
    });
    const warning = failedDetails.length === 0 && skippedDetails.some((item) => (
      item.message.includes("SKIPPED_PROVIDER_NAME_UNRECOVERABLE")
    ));
    const status: AppDataMigrationExecutionResult["status"] = failureCount > 0
      ? "FAILED"
      : warning
        ? "SUCCEEDED_WITH_WARNINGS"
        : "SUCCEEDED";
    const reasonCounts = countReasons(skippedDetails);
    const errorMessage = failureCount > 0
      ? `Token usage provider-name snapshot backfill encountered ${failureCount} failure(s).`
      : null;
    summary.details.push(detail(
      "token-usage-provider-name:summary",
      status === "FAILED" ? "FAILED" : "SKIPPED",
      `Migrated ${migratedCount}; skipped ${skippedDetails.length}; failed ${failureCount}; reasons=${JSON.stringify(Object.fromEntries(reasonCounts))}.`,
    ));
    return { status, summary, errorMessage };
  }
}
