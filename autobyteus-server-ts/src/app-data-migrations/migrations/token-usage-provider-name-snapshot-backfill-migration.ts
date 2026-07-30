import { getLlmProviderDisplayName, isBuiltInLlmProviderId } from "autobyteus-ts/llm/provider-display-names.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { CustomLlmProviderStore } from "../../llm-management/llm-providers/stores/custom-llm-provider-store.js";
import { getCustomLlmProviderStore } from "../../llm-management/llm-providers/stores/custom-llm-provider-store.js";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";
import { parseTokenUsageCompositeModelValue } from "../../token-usage/projections/token-usage-model-display-projection.js";

export const TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID =
  "20260730_token_usage_provider_name_snapshot_backfill";

const MAX_ROW_FAILURE_DETAILS = 50;

export type RawTokenUsageProviderNameBackfillRow = {
  id: number;
  usage_event_id: string;
  runtime_kind: string;
  model_provider: string | null;
  provider_name: string | null;
  model_identifier: string | null;
  model_value: string | null;
};

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

type Classification =
  | { kind: "MIGRATE"; providerName: string }
  | { kind: "SKIP"; reason: SkipReason };

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
        "runtime_kind",
        "model_provider",
        "provider_name",
        "model_identifier",
        "model_value"
      FROM "token_usage_ledger_events"
      ORDER BY "id" ASC
    `;
  }

  async listTokenUsageProviderNameBackfillCandidates(): Promise<RawTokenUsageProviderNameBackfillRow[]> {
    return this.client.$queryRaw<RawTokenUsageProviderNameBackfillRow[]>`
      SELECT
        "id",
        "usage_event_id",
        "runtime_kind",
        "model_provider",
        "provider_name",
        "model_identifier",
        "model_value"
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
  private readonly customProviderStore: Pick<CustomLlmProviderStore, "listProviders">;

  constructor(
    database?: TokenUsageProviderNameSnapshotBackfillDatabase,
    customProviderStore: Pick<CustomLlmProviderStore, "listProviders"> = getCustomLlmProviderStore(),
  ) {
    this.database = database ?? null;
    this.customProviderStore = customProviderStore;
  }

  private getDatabase(): TokenUsageProviderNameSnapshotBackfillDatabase {
    this.database ??= new PrismaTokenUsageProviderNameSnapshotBackfillDatabase();
    return this.database;
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const database = this.getDatabase();
    let customProviderNames: Map<string, string>;
    try {
      const providers = await this.customProviderStore.listProviders();
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
      const beforeIdentity = beforeRows
        .map((row) => JSON.stringify([row.id, row.model_provider, row.model_identifier, row.model_value]))
        .sort();
      const afterIdentity = afterRows
        .map((row) => JSON.stringify([row.id, row.model_provider, row.model_identifier, row.model_value]))
        .sort();
      const rawIdentityChanged = beforeIdentity.length !== afterIdentity.length || beforeIdentity.some((value, index) => (
        value !== afterIdentity[index]
      ));
      if (afterCount !== beforeCount || rawIdentityChanged) {
        throw new Error(
          `Token usage ledger invariants changed: row count ${beforeCount} -> ${afterCount}; raw identity/model value changed=${rawIdentityChanged}.`,
        );
      }
      invariantDetails.push(detail(
        "token-usage-provider-name:invariants",
        "SKIPPED",
        `Row count, provider type, model_identifier, and model_value preserved: ${beforeCount} rows; only eligible provider_name fields may change.`,
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
