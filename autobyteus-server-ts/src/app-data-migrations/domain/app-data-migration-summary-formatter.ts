import type { AppDataMigrationSummary } from "./app-data-migration-types.js";

export const formatAppDataMigrationSummary = (
  summary: AppDataMigrationSummary,
): string =>
  `Scanned ${summary.scannedCount}; migrated ${summary.migratedCount}; skipped ${summary.skippedCount}; failed ${summary.failedCount}.`;
