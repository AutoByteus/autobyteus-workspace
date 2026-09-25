import fs from "node:fs/promises";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";

const MIGRATION_ID = "20260924_remove_external_messaging_data";

/**
 * The exact platform-owned external messaging data roots removed by this migration.
 * The registry resolves them from the configured app-data, download, and logs directories.
 */
export type ExternalMessagingDataRoots = Readonly<{
  bindingDataDir: string;
  gatewayInstallDir: string;
  gatewayDownloadDir: string;
  gatewayLogsDir: string;
}>;

const messageFromError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isNotFound = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

const removeRoot = async (itemId: string, rootPath: string): Promise<AppDataMigrationItemDetail> => {
  try {
    await fs.lstat(rootPath);
  } catch (error) {
    if (isNotFound(error)) {
      return { itemId, filePath: rootPath, status: "SKIPPED", message: "Not present." };
    }
    return {
      itemId,
      filePath: rootPath,
      status: "FAILED",
      message: `Could not inspect: ${messageFromError(error)}`,
    };
  }
  try {
    // rm removes a symbolic link itself and never follows it into its target.
    await fs.rm(rootPath, { recursive: true, force: true });
    return { itemId, filePath: rootPath, status: "MIGRATED", message: "Removed." };
  } catch (error) {
    return {
      itemId,
      filePath: rootPath,
      status: "FAILED",
      message: `Could not remove: ${messageFromError(error)}`,
    };
  }
};

export class RemoveExternalMessagingDataMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Remove external messaging data";
  readonly description =
    "Permanently deletes the removed external messaging feature's bindings, gateway installations, gateway configuration, download cache, and logs. No backup is made.";
  readonly requiredOnStartup = true;

  constructor(private readonly roots: ExternalMessagingDataRoots) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    for (const [itemId, rootPath] of Object.entries(this.roots)) {
      details.push(await removeRoot(itemId, rootPath));
    }
    const summary = buildSummary(details);
    return {
      status: summary.failedCount > 0 ? "FAILED" : "SUCCEEDED",
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} external messaging data root${summary.failedCount === 1 ? "" : "s"} could not be removed; the cleanup retries on the next start.`
        : null,
    };
  }
}

export const REMOVE_EXTERNAL_MESSAGING_DATA_MIGRATION_ID = MIGRATION_ID;
