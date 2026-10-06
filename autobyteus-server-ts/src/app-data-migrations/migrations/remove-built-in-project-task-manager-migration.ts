import fs from "node:fs/promises";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";

const MIGRATION_ID = "20261006_remove_built_in_project_task_manager";
const ITEM_ID = "installedAgentDir";

const messageFromError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isNotFound = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const buildSummary = (detail: AppDataMigrationItemDetail): AppDataMigrationSummary => ({
  scannedCount: 1,
  migratedCount: detail.status === "MIGRATED" ? 1 : 0,
  skippedCount: detail.status === "SKIPPED" ? 1 : 0,
  failedCount: detail.status === "FAILED" ? 1 : 0,
  details: [detail],
});

const removeInstalledAgentDir = async (dirPath: string): Promise<AppDataMigrationItemDetail> => {
  try {
    await fs.lstat(dirPath);
  } catch (error) {
    if (isNotFound(error)) {
      return { itemId: ITEM_ID, filePath: dirPath, status: "SKIPPED", message: "Not present." };
    }
    return {
      itemId: ITEM_ID,
      filePath: dirPath,
      status: "FAILED",
      message: `Could not inspect: ${messageFromError(error)}`,
    };
  }
  try {
    // rm removes a symbolic link itself and never follows it into its target.
    await fs.rm(dirPath, { recursive: true, force: true });
    return { itemId: ITEM_ID, filePath: dirPath, status: "MIGRATED", message: "Removed." };
  } catch (error) {
    return {
      itemId: ITEM_ID,
      filePath: dirPath,
      status: "FAILED",
      message: `Could not remove: ${messageFromError(error)}`,
    };
  }
};

/**
 * Removes the installed copy of the retired built-in Project Task Manager
 * (`<agentsDir>/autobyteus-project-task-manager`) that earlier builds wrote on every startup.
 * The registry resolves the exact folder path; nothing else in app data is touched.
 */
export class RemoveBuiltInProjectTaskManagerMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Remove built-in Project Task Manager";
  readonly description =
    "Permanently deletes the retired built-in Project Task Manager agent folder (`agents/autobyteus-project-task-manager`) from app data. No backup is made.";
  readonly requiredOnStartup = true;
  // The agent catalog is built once at startup, so the removal only takes effect through a restart.
  readonly executionPolicy = "STARTUP_ONLY" as const;

  constructor(private readonly installedAgentDir: string) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const summary = buildSummary(await removeInstalledAgentDir(this.installedAgentDir));
    return {
      status: summary.failedCount > 0 ? "FAILED" : "SUCCEEDED",
      summary,
      errorMessage: summary.failedCount > 0
        ? "The retired built-in Project Task Manager folder could not be removed; the cleanup retries on the next start."
        : null,
    };
  }
}

export const REMOVE_BUILT_IN_PROJECT_TASK_MANAGER_MIGRATION_ID = MIGRATION_ID;
