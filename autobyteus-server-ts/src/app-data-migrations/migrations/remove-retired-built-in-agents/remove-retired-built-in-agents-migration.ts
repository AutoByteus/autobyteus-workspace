import fs from "node:fs/promises";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../../domain/app-data-migration-types.js";

const MIGRATION_ID = "20261118_remove_retired_built_in_agents";

/** One retired built-in agent folder: the item id its report names, and its absolute path from the registry. */
export type RetiredBuiltInAgentFolder = Readonly<{ itemId: string; dirPath: string }>;

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

const removeFolder = async ({ itemId, dirPath }: RetiredBuiltInAgentFolder): Promise<AppDataMigrationItemDetail> => {
  try {
    await fs.lstat(dirPath);
  } catch (error) {
    if (isNotFound(error)) {
      return { itemId, filePath: dirPath, status: "SKIPPED", message: "Not present." };
    }
    return { itemId, filePath: dirPath, status: "FAILED", message: `Could not inspect: ${messageFromError(error)}` };
  }
  try {
    // rm removes a symbolic link itself and never follows it into its target.
    await fs.rm(dirPath, { recursive: true, force: true });
    return { itemId, filePath: dirPath, status: "MIGRATED", message: "Removed." };
  } catch (error) {
    return { itemId, filePath: dirPath, status: "FAILED", message: `Could not remove: ${messageFromError(error)}` };
  }
};

/**
 * Removes the installed copies of the retired built-in agents that earlier builds installed: the Skill Self-Evolver
 * (`<agentsDir>/autobyteus-skill-evolver`, with its own skill) and the Memory Compactor
 * (`<agentsDir>/autobyteus-memory-compactor`). The registry resolves the exact folder paths; nothing else in app data
 * is touched, and the agents' runs stay. A folder that cannot be removed fails the migration, which retries at the
 * next start.
 */
export class RemoveRetiredBuiltInAgentsMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Remove retired built-in agents";
  readonly description =
    "Permanently deletes the retired built-in agents Skill Self-Evolver (`agents/autobyteus-skill-evolver`) and Memory Compactor (`agents/autobyteus-memory-compactor`) from app data. Their runs stay. No backup is made.";
  readonly requiredOnStartup = true;
  // The agent catalog is built once at startup, so the removal only takes effect through a restart.
  readonly executionPolicy = "STARTUP_ONLY" as const;

  constructor(private readonly folders: readonly RetiredBuiltInAgentFolder[]) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    for (const folder of this.folders) details.push(await removeFolder(folder));
    const summary = buildSummary(details);
    return {
      status: summary.failedCount > 0 ? "FAILED" : "SUCCEEDED",
      summary,
      errorMessage: summary.failedCount > 0
        ? "A retired built-in agent folder could not be removed; the cleanup retries on the next start."
        : null,
    };
  }
}
