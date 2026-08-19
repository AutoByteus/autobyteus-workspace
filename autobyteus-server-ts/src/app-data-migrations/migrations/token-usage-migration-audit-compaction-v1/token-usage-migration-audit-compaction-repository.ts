import type { Prisma, PrismaClient } from "@prisma/client";
import { createConfiguredPrismaClient } from "../../../config/prisma-client-factory.js";
import type { AppDataMigrationStatus } from "../../domain/app-data-migration-types.js";
import { MAX_APP_DATA_MIGRATION_SUMMARY_BYTES } from "../../repositories/app-data-migration-summary-projection.js";

type ScalarInteger = string | null;

type RawAuditRecord = {
  migration_id: string;
  display_name: string;
  status: string;
  attempts_text: ScalarInteger;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  error_message: string | null;
  log_path: string | null;
  summary_bytes_text: ScalarInteger;
  summary_supported: bigint | number;
  scanned_count_text: ScalarInteger;
  migrated_count_text: ScalarInteger;
  skipped_count_text: ScalarInteger;
  failed_count_text: ScalarInteger;
  detail_count_text: ScalarInteger;
};

export type TerminalMigrationAuditCounts = Readonly<{
  scannedCount: number;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
}>;

export type TerminalMigrationAuditRecord = Readonly<{
  migrationId: string;
  displayName: string;
  status: AppDataMigrationStatus;
  attempts: number;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  logPath: string | null;
  summaryBytes: number;
  summary: null | Readonly<{
    counts: TerminalMigrationAuditCounts;
    detailCount: number;
  }>;
}>;

const toDate = (value: Date | string | null): Date | null =>
  value === null ? null : value instanceof Date ? value : new Date(value);

const toSafeInt = (value: ScalarInteger, field: string): number => {
  if (value === null || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`Audit scalar '${field}' is not a canonical nonnegative integer.`);
  }
  const exact = BigInt(value);
  if (exact > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Audit scalar '${field}' exceeds JavaScript SafeInt.`);
  }
  return Number(exact);
};

const supportedSummarySql = `CASE
  WHEN summary_json IS NULL THEN 0
  WHEN json_valid(summary_json) = 0 THEN 0
  WHEN json_type(summary_json, '$') IS NOT 'object' THEN 0
  WHEN json_type(summary_json, '$.scannedCount') IS NOT 'integer' THEN 0
  WHEN json_extract(summary_json, '$.scannedCount') < 0
    OR json_extract(summary_json, '$.scannedCount') > 9007199254740991 THEN 0
  WHEN json_type(summary_json, '$.migratedCount') IS NOT 'integer' THEN 0
  WHEN json_extract(summary_json, '$.migratedCount') < 0
    OR json_extract(summary_json, '$.migratedCount') > 9007199254740991 THEN 0
  WHEN json_type(summary_json, '$.skippedCount') IS NOT 'integer' THEN 0
  WHEN json_extract(summary_json, '$.skippedCount') < 0
    OR json_extract(summary_json, '$.skippedCount') > 9007199254740991 THEN 0
  WHEN json_type(summary_json, '$.failedCount') IS NOT 'integer' THEN 0
  WHEN json_extract(summary_json, '$.failedCount') < 0
    OR json_extract(summary_json, '$.failedCount') > 9007199254740991 THEN 0
  WHEN json_type(summary_json, '$.details') IS NOT 'array' THEN 0
  ELSE 1
END`;

const recordSql = `
  WITH source AS (
    SELECT migration_id, display_name, status, CAST(attempts AS TEXT) AS attempts_text,
           started_at, completed_at, error_message, log_path, summary_json,
           CAST(COALESCE(length(CAST(summary_json AS BLOB)), 0) AS TEXT) AS summary_bytes_text,
           ${supportedSummarySql} AS summary_supported
      FROM app_data_migration_records
     WHERE migration_id = ?
     LIMIT 1
  )
  SELECT migration_id, display_name, status, attempts_text, started_at, completed_at,
         error_message, log_path, summary_bytes_text, summary_supported,
         CASE WHEN summary_supported = 1 THEN CAST(json_extract(summary_json, '$.scannedCount') AS TEXT) END AS scanned_count_text,
         CASE WHEN summary_supported = 1 THEN CAST(json_extract(summary_json, '$.migratedCount') AS TEXT) END AS migrated_count_text,
         CASE WHEN summary_supported = 1 THEN CAST(json_extract(summary_json, '$.skippedCount') AS TEXT) END AS skipped_count_text,
         CASE WHEN summary_supported = 1 THEN CAST(json_extract(summary_json, '$.failedCount') AS TEXT) END AS failed_count_text,
         CASE WHEN summary_supported = 1 THEN CAST(json_array_length(summary_json, '$.details') AS TEXT) END AS detail_count_text
    FROM source`;

const toRecord = (row: RawAuditRecord): TerminalMigrationAuditRecord => ({
  migrationId: row.migration_id,
  displayName: row.display_name,
  status: row.status as AppDataMigrationStatus,
  attempts: toSafeInt(row.attempts_text, "attempts"),
  startedAt: toDate(row.started_at),
  completedAt: toDate(row.completed_at),
  errorMessage: row.error_message,
  logPath: row.log_path,
  summaryBytes: toSafeInt(row.summary_bytes_text, "summary_bytes"),
  summary: Number(row.summary_supported) === 1 ? {
    counts: {
      scannedCount: toSafeInt(row.scanned_count_text, "scannedCount"),
      migratedCount: toSafeInt(row.migrated_count_text, "migratedCount"),
      skippedCount: toSafeInt(row.skipped_count_text, "skippedCount"),
      failedCount: toSafeInt(row.failed_count_text, "failedCount"),
    },
    detailCount: toSafeInt(row.detail_count_text, "details.length"),
  } : null,
});

export interface TokenUsageMigrationAuditCompactionRepositoryLike {
  inspect(migrationId: string): Promise<TerminalMigrationAuditRecord | null>;
  replaceOversizedSummary(record: TerminalMigrationAuditRecord, summaryJson: string): Promise<void>;
}

export class TokenUsageMigrationAuditCompactionRepository
implements TokenUsageMigrationAuditCompactionRepositoryLike {
  private prisma: PrismaClient | null;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? null;
  }

  private get client(): PrismaClient {
    return this.prisma ??= createConfiguredPrismaClient();
  }

  async inspect(migrationId: string): Promise<TerminalMigrationAuditRecord | null> {
    const rows = await this.client.$queryRawUnsafe<RawAuditRecord[]>(recordSql, migrationId);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async replaceOversizedSummary(
    record: TerminalMigrationAuditRecord,
    summaryJson: string,
  ): Promise<void> {
    const sourceSummary = record.summary;
    if (!sourceSummary || Buffer.byteLength(summaryJson, "utf8") > MAX_APP_DATA_MIGRATION_SUMMARY_BYTES) {
      throw new Error("Compacted audit summary is invalid or exceeds 65536 bytes.");
    }
    await this.client.$transaction(async (transaction) => {
      const affected = await transaction.$executeRawUnsafe(
        `UPDATE app_data_migration_records
            SET summary_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE migration_id = ? AND status = ? AND attempts = ?
            AND length(CAST(summary_json AS BLOB)) = ?
            AND length(CAST(summary_json AS BLOB)) > ?
            AND ${supportedSummarySql} = 1
            AND json_extract(summary_json, '$.scannedCount') = ?
            AND json_extract(summary_json, '$.migratedCount') = ?
            AND json_extract(summary_json, '$.skippedCount') = ?
            AND json_extract(summary_json, '$.failedCount') = ?
            AND json_array_length(summary_json, '$.details') = ?`,
        summaryJson,
        record.migrationId,
        record.status,
        record.attempts,
        record.summaryBytes,
        MAX_APP_DATA_MIGRATION_SUMMARY_BYTES,
        sourceSummary.counts.scannedCount,
        sourceSummary.counts.migratedCount,
        sourceSummary.counts.skippedCount,
        sourceSummary.counts.failedCount,
        sourceSummary.detailCount,
      );
      if (affected !== 1) {
        throw new Error(`Audit summary source changed for '${record.migrationId}'.`);
      }
      await this.assertCompacted(transaction, record, summaryJson);
    });
  }

  private async assertCompacted(
    transaction: Prisma.TransactionClient,
    source: TerminalMigrationAuditRecord,
    expectedSummaryJson: string,
  ): Promise<void> {
    const rows = await transaction.$queryRawUnsafe<RawAuditRecord[]>(recordSql, source.migrationId);
    const exactRows = await transaction.$queryRawUnsafe<Array<{ exact_match: bigint | number }>>(
      `SELECT CASE WHEN summary_json = ? THEN 1 ELSE 0 END AS exact_match
         FROM app_data_migration_records WHERE migration_id = ?`,
      expectedSummaryJson,
      source.migrationId,
    );
    const stored = rows[0] ? toRecord(rows[0]) : null;
    const expected = source.summary?.counts;
    if (!stored?.summary || stored.summaryBytes > MAX_APP_DATA_MIGRATION_SUMMARY_BYTES ||
        stored.summary.detailCount !== 1 || !expected ||
        Number(exactRows[0]?.exact_match ?? 0) !== 1 ||
        JSON.stringify(stored.summary.counts) !== JSON.stringify(expected) ||
        stored.displayName !== source.displayName || stored.status !== source.status ||
        stored.attempts !== source.attempts || stored.errorMessage !== source.errorMessage ||
        stored.logPath !== source.logPath ||
        stored.startedAt?.getTime() !== source.startedAt?.getTime() ||
        stored.completedAt?.getTime() !== source.completedAt?.getTime()) {
      throw new Error(`Compacted audit summary validation failed for '${source.migrationId}'.`);
    }
  }
}
