import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";
import {
  discoverPreLineageMemoryRunDirectories,
  removePreLineageDerivedMemoryFiles,
} from "./reset-pre-lineage-memory-files.js";

const MIGRATION_ID = "20260730_reset_pre_lineage_memory";

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter(({ status }) => status === "MIGRATED").length,
  skippedCount: details.filter(({ status }) => status === "SKIPPED").length,
  failedCount: details.filter(({ status }) => status === "FAILED").length,
  details,
});

export class ResetPreLineageMemoryAppDataMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Reset pre-lineage derived memory";
  readonly description =
    "Deletes obsolete episode, semantic, WorkingContext snapshot, and compacted-memory manifest files while preserving raw evidence.";
  readonly requiredOnStartup = true;

  constructor(private readonly memoryDir: string) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const discovery = await discoverPreLineageMemoryRunDirectories(this.memoryDir);
    const details = [...discovery.failures];
    for (const candidate of discovery.runDirectories) {
      details.push(...await removePreLineageDerivedMemoryFiles(candidate));
    }
    const summary = buildSummary(details);
    return {
      status: summary.failedCount > 0 ? "FAILED" : "SUCCEEDED",
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} pre-lineage derived-memory target or discovery operation failed.`
        : null,
    };
  }
}

export const RESET_PRE_LINEAGE_MEMORY_APP_DATA_MIGRATION_ID = MIGRATION_ID;
