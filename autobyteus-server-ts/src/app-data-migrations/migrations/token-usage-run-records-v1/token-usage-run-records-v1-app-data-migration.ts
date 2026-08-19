import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
} from "../../domain/app-data-migration-types.js";
import { TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID } from "../token-usage-custom-provider-model-value-backfill-migration.js";
import { TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID } from "../token-usage-provider-name-snapshot-backfill-migration.js";
import { TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE } from "../token-usage-source-shaping-constants.js";
import { LegacyTokenUsageConsolidationRepository } from "./legacy-token-usage-consolidation-repository.js";
import { LegacyTokenUsageRunFold } from "./legacy-token-usage-run-fold.js";
import { legacyRowId } from "./legacy-token-usage-row.js";

export const TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID =
  "20260819_token_usage_run_records_v1";

const safeCount = (value: bigint, field: string): number => {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`Token usage migration ${field} exceeds JavaScript SafeInt.`);
  }
  return count;
};

export class TokenUsageRunRecordsV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID;
  readonly displayName = "Token usage one-row run records V1";
  readonly description = "Consolidates the released token event ledger into one current record per canonical run.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;
  readonly prerequisiteMigrationIds = [
    TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID,
    TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID,
  ] as const;

  constructor(
    private readonly repository = new LegacyTokenUsageConsolidationRepository(),
  ) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    let scannedCount = 0;
    try {
      const outcome = await this.repository.runTransaction(async (transaction) => {
        let transactionScannedCount = 0;
        let transactionMigratedCount = 0;
        const legacyRows = await transaction.countLegacyRows();
        if (legacyRows === 0n) {
          return { scannedCount: 0, migratedCount: 0, alreadyCurrent: true };
        }
        if (await transaction.countBlankLegacyRunIds() !== 0n) {
          throw new Error("Legacy token usage contains a blank canonical run ID.");
        }
        if (await transaction.hasRunIdOverlap()) {
          throw new Error("TOKEN_USAGE_RUN_ID_INTERSECTION: legacy and current run IDs overlap; no rows were imported or deleted.");
        }

        const legacyRuns = await transaction.countLegacyRuns();
        const currentRowsBefore = await transaction.countCurrentRows();
        let afterRunId: string | null = null;
        while (true) {
          const runId = await transaction.nextLegacyRunId(afterRunId);
          if (runId === null) break;
          const fold = new LegacyTokenUsageRunFold();
          let afterId = 0;
          while (true) {
            const rows = await transaction.listLegacyRunBatch(runId, afterId);
            if (rows.length > TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE) {
              throw new Error("Legacy consolidation batch exceeded 250 rows.");
            }
            if (rows.length === 0) break;
            for (const row of rows) {
              fold.add(row);
              transactionScannedCount += 1;
              if (!Number.isSafeInteger(transactionScannedCount)) throw new Error("Legacy consolidation scan count exceeds SafeInt.");
            }
            afterId = safeCount(legacyRowId(rows.at(-1)!), "row cursor");
            if (rows.length < TOKEN_USAGE_SOURCE_SHAPING_BATCH_SIZE) break;
          }
          const record = fold.finish();
          await transaction.validateRunAggregate(record);
          await transaction.insertCurrentRecord(record);
          transactionMigratedCount += 1;
          afterRunId = runId;
        }

        if (BigInt(transactionScannedCount) !== legacyRows || BigInt(transactionMigratedCount) !== legacyRuns) {
          throw new Error(`Legacy consolidation coverage mismatch: rows ${transactionScannedCount}/${legacyRows}, runs ${transactionMigratedCount}/${legacyRuns}.`);
        }
        const expectedCurrentRows = currentRowsBefore + legacyRuns;
        if (await transaction.countCurrentRows() !== expectedCurrentRows) {
          throw new Error("Current token usage row-count validation failed before cleanup.");
        }
        const deleted = await transaction.deleteLegacyRows();
        if (BigInt(deleted) !== legacyRows || await transaction.countLegacyRows() !== 0n) {
          throw new Error("Legacy token usage cleanup validation failed.");
        }
        return {
          scannedCount: transactionScannedCount,
          migratedCount: transactionMigratedCount,
          alreadyCurrent: false,
        };
      });
      scannedCount = outcome.scannedCount;

      return {
        status: "SUCCEEDED",
        summary: {
          scannedCount: outcome.scannedCount,
          migratedCount: outcome.migratedCount,
          skippedCount: 0,
          failedCount: 0,
          details: [{
            itemId: "token-usage-run-records-v1:summary",
            status: "MIGRATED",
            message: outcome.alreadyCurrent
              ? "Legacy token usage source was already empty; current state was retained."
              : `Consolidated ${outcome.scannedCount} legacy rows into ${outcome.migratedCount} current run records and emptied the source atomically.`,
          }],
        },
        errorMessage: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: "FAILED",
        summary: {
          scannedCount,
          migratedCount: 0,
          skippedCount: 0,
          failedCount: 1,
          details: [{
            itemId: "token-usage-run-records-v1:failure",
            status: "FAILED",
            message,
          }],
        },
        errorMessage: message,
      };
    }
  }
}
