import type { PrismaClient } from "@prisma/client";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import {
  parseTokenUsageCompositeModelValue,
  type TokenUsageCompositeModelValue,
} from "../../token-usage/projections/token-usage-model-display-projection.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";

export const TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID =
  "20260730_token_usage_custom_provider_model_value_backfill";

const MAX_ROW_FAILURE_DETAILS = 50;
const COMPOSITE_MODEL_PREFIX = "openai-compatible:";

export type RawTokenUsageCustomProviderModelValueRow = {
  id: number;
  usage_event_id: string;
  runtime_kind: string;
  model_provider: string | null;
  model_identifier: string | null;
  model_value: string | null;
};

export interface TokenUsageCustomProviderModelValueBackfillDatabase {
  listTokenUsageLedgerRows(): Promise<RawTokenUsageCustomProviderModelValueRow[]>;
  countTokenUsageLedgerRows(): Promise<number>;
  updateTokenUsageModelValue(input: {
    id: number;
    expectedModelValue: string;
    nextModelValue: string;
  }): Promise<number | void>;
  disconnect?(): Promise<void>;
}

type SkipReason =
  | "SKIPPED_SCOPE_MISMATCH"
  | "SKIPPED_INVALID_COMPOSITE_MODEL_VALUE"
  | "SKIPPED_VALID_NON_COMPOSITE"
  | "SKIPPED_RAW_IDENTITY_MISSING"
  | "SKIPPED_CONFLICTING_COMPOSITE_VALUES"
  | "SKIPPED_RAW_IDENTITY_NOT_COMPOSITE"
  | "SKIPPED_SOURCE_CHANGED";

type Classification =
  | { kind: "MIGRATE"; parsed: TokenUsageCompositeModelValue }
  | { kind: "SKIP"; reason: SkipReason };

const compact = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized || null;
};

const inMigrationScope = (row: RawTokenUsageCustomProviderModelValueRow): boolean => (
  compact(row.runtime_kind)?.toLowerCase() === "autobyteus" &&
  compact(row.model_provider)?.toUpperCase() === "OPENAI_COMPATIBLE"
);

const startsWithCompositeMarker = (value: string): boolean => value.startsWith(COMPOSITE_MODEL_PREFIX);

export const classifyTokenUsageCustomProviderModelValueRow = (
  row: RawTokenUsageCustomProviderModelValueRow,
): Classification => {
  if (!inMigrationScope(row)) return { kind: "SKIP", reason: "SKIPPED_SCOPE_MISMATCH" };

  const modelValue = compact(row.model_value);
  const modelIdentifier = compact(row.model_identifier);
  if (!modelValue) return { kind: "SKIP", reason: "SKIPPED_VALID_NON_COMPOSITE" };

  const valueComposite = parseTokenUsageCompositeModelValue(modelValue);
  if (!valueComposite) {
    return {
      kind: "SKIP",
      reason: startsWithCompositeMarker(modelValue)
        ? "SKIPPED_INVALID_COMPOSITE_MODEL_VALUE"
        : "SKIPPED_VALID_NON_COMPOSITE",
    };
  }

  if (!modelIdentifier) return { kind: "SKIP", reason: "SKIPPED_RAW_IDENTITY_MISSING" };
  const identifierComposite = parseTokenUsageCompositeModelValue(modelIdentifier);
  if (!identifierComposite) return { kind: "SKIP", reason: "SKIPPED_RAW_IDENTITY_NOT_COMPOSITE" };
  if (
    identifierComposite.providerId !== valueComposite.providerId ||
    identifierComposite.modelName !== valueComposite.modelName
  ) {
    return { kind: "SKIP", reason: "SKIPPED_CONFLICTING_COMPOSITE_VALUES" };
  }
  return { kind: "MIGRATE", parsed: valueComposite };
};

const detail = (
  itemId: string,
  status: AppDataMigrationItemDetail["status"],
  message: string,
): AppDataMigrationItemDetail => ({ itemId, status, message });

const isWarningReason = (reason: SkipReason): boolean => (
  reason !== "SKIPPED_SCOPE_MISMATCH" &&
  reason !== "SKIPPED_VALID_NON_COMPOSITE"
);

const countReasons = (details: readonly AppDataMigrationItemDetail[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const item of details) {
    const reason = item.message.match(/reason=([^;]+)/)?.[1];
    if (reason) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return counts;
};

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

export class PrismaTokenUsageCustomProviderModelValueBackfillDatabase
  implements TokenUsageCustomProviderModelValueBackfillDatabase {
  private prisma: PrismaClient | null;
  private readonly ownsClient: boolean;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? null;
    this.ownsClient = prisma === undefined;
  }

  private get client(): PrismaClient {
    this.prisma ??= createConfiguredPrismaClient();
    return this.prisma;
  }

  async listTokenUsageLedgerRows(): Promise<RawTokenUsageCustomProviderModelValueRow[]> {
    return this.client.$queryRaw<RawTokenUsageCustomProviderModelValueRow[]>`
      SELECT
        "id",
        "usage_event_id",
        "runtime_kind",
        "model_provider",
        "model_identifier",
        "model_value"
      FROM "token_usage_ledger_events"
      ORDER BY "id" ASC
    `;
  }

  async countTokenUsageLedgerRows(): Promise<number> {
    const rows = await this.client.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(*) AS count FROM "token_usage_ledger_events"
    `;
    return Number(rows[0]?.count ?? 0);
  }

  async updateTokenUsageModelValue(input: {
    id: number;
    expectedModelValue: string;
    nextModelValue: string;
  }): Promise<number> {
    return this.client.$executeRaw`
      UPDATE "token_usage_ledger_events"
      SET "model_value" = ${input.nextModelValue}
      WHERE "id" = ${input.id} AND "model_value" = ${input.expectedModelValue}
    `;
  }

  async disconnect(): Promise<void> {
    if (this.ownsClient && this.prisma) await this.prisma.$disconnect();
  }
}

export class TokenUsageCustomProviderModelValueBackfillMigration implements AppDataMigrationDefinition {
  readonly id = TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID;
  readonly displayName = "Token usage custom-provider model value backfill";
  readonly description = "Normalizes validated legacy custom-provider model values without changing raw token-usage identity.";
  readonly requiredOnStartup = true;
  private database: TokenUsageCustomProviderModelValueBackfillDatabase | null;

  constructor(database?: TokenUsageCustomProviderModelValueBackfillDatabase) {
    this.database = database ?? null;
  }

  private getDatabase(): TokenUsageCustomProviderModelValueBackfillDatabase {
    this.database ??= new PrismaTokenUsageCustomProviderModelValueBackfillDatabase();
    return this.database;
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const database = this.getDatabase();
    let rows: RawTokenUsageCustomProviderModelValueRow[];
    let beforeCount: number;
    try {
      rows = await database.listTokenUsageLedgerRows();
      beforeCount = await database.countTokenUsageLedgerRows();
      if (rows.length !== beforeCount) {
        throw new Error(`Token usage ledger row count changed during preflight: listed ${rows.length}, counted ${beforeCount}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const summary = buildSummary({
        scannedCount: 0,
        migratedCount: 0,
        skippedDetails: [],
        failedDetails: [detail("token-usage-custom-provider-model-value:preflight", "FAILED", message)],
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
      const classification = classifyTokenUsageCustomProviderModelValueRow(row);
      if (classification.kind === "SKIP") {
        skippedDetails.push(detail(
          row.usage_event_id || `token-usage-row:${row.id}`,
          "SKIPPED",
          `reason=${classification.reason}; row ${row.id} was not changed.`,
        ));
        continue;
      }

      const expectedModelValue = row.model_value;
      if (expectedModelValue === null) {
        skippedDetails.push(detail(
          row.usage_event_id || `token-usage-row:${row.id}`,
          "SKIPPED",
          "reason=SKIPPED_SOURCE_CHANGED; row model_value disappeared before update.",
        ));
        continue;
      }
      try {
        const affectedRows = await database.updateTokenUsageModelValue({
          id: row.id,
          expectedModelValue,
          nextModelValue: classification.parsed.modelName,
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
        const message = error instanceof Error ? error.message : String(error);
        if (failedDetails.length < MAX_ROW_FAILURE_DETAILS) {
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
      const beforeRawIdentity = rows
        .map((row) => JSON.stringify([row.id, row.model_identifier]))
        .sort();
      const afterRawIdentity = afterRows
        .map((row) => JSON.stringify([row.id, row.model_identifier]))
        .sort();
      const rawIdentityChanged = beforeRawIdentity.length !== afterRawIdentity.length || beforeRawIdentity.some((value, index) => (
        value !== afterRawIdentity[index]
      ));
      if (afterCount !== beforeCount || rawIdentityChanged) {
        throw new Error(
          `Token usage ledger invariants changed: row count ${beforeCount} -> ${afterCount}; raw identity changed=${rawIdentityChanged}.`,
        );
      }
      invariantDetails.push(detail(
        "token-usage-custom-provider-model-value:invariants",
        "SKIPPED",
        `Row count and model_identifier preserved: ${beforeCount} rows; only eligible model_value fields may change.`,
      ));
    } catch (error) {
      failureCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      failedDetails.push(detail("token-usage-custom-provider-model-value:invariants", "FAILED", message));
    }

    const summary = buildSummary({
      scannedCount: rows.length,
      migratedCount,
      skippedDetails,
      failedDetails,
      failedCount: failureCount,
      invariantDetails,
    });
    const warning = failedDetails.length === 0 && skippedDetails.some((item) => {
      const reason = item.message.match(/reason=([^;]+)/)?.[1] as SkipReason | undefined;
      return reason ? isWarningReason(reason) : false;
    });
    const status: AppDataMigrationExecutionResult["status"] = failureCount > 0
      ? "FAILED"
      : warning
        ? "SUCCEEDED_WITH_WARNINGS"
        : "SUCCEEDED";
    const reasonCounts = countReasons(skippedDetails);
    const errorMessage = failureCount > 0
      ? `Token usage custom-provider model value backfill encountered ${failureCount} failure(s).`
      : null;
    summary.details.push(detail(
      "token-usage-custom-provider-model-value:summary",
      status === "FAILED" ? "FAILED" : "SKIPPED",
      `Migrated ${migratedCount}; skipped ${skippedDetails.length}; failed ${failureCount}; reasons=${JSON.stringify(Object.fromEntries(reasonCounts))}.`,
    ));
    return { status, summary, errorMessage };
  }
}
