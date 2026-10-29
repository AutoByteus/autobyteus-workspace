import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../../domain/app-data-migration-types.js";
const TASK_AGENT_OWN_RUN_V1_MIGRATION_ID = "20261017_task_agent_own_run_v1";

const MIGRATION_ID = "20261019_remove_work_trace_exports";

/**
 * Frozen names of the retired export (`<run>/work_traces/`, `<run>/self_evolution/work_traces/`,
 * `<run>/skill_improvement/work_traces/`). Only this migration knows them; the Work Journal replaced
 * the export and nothing reads these folders.
 */
const RETIRED_EXPORT_DIR_NAME = "work_traces";
const RETIRED_EXPORT_MANIFEST_FILE_NAME = "work_traces_manifest.json";

const messageFromError = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const isNotFound = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const itemIdFor = (memoryDir: string, dirPath: string): string =>
  path.relative(memoryDir, dirPath).split(path.sep).join("/") || ".";

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

const hasRetiredManifest = async (dirPath: string): Promise<boolean> => {
  try {
    return (await fs.lstat(path.join(dirPath, RETIRED_EXPORT_MANIFEST_FILE_NAME))).isFile();
  } catch {
    return false;
  }
};

/**
 * Deletes the retired work-trace export folders under the memory folder (DS-005). Recognition is
 * structural: a directory named `work_traces` that holds `work_traces_manifest.json`. A folder
 * that cannot be deleted stays as inert residue and is reported.
 */
export class RemoveWorkTraceExportsMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Remove work-trace export folders";
  readonly description =
    "Deletes the retired work_traces export folders from run memory folders; the Work Journal is rendered from raw traces instead.";
  readonly requiredOnStartup = true;
  readonly prerequisiteMigrationIds = [TASK_AGENT_OWN_RUN_V1_MIGRATION_ID] as const;

  constructor(private readonly memoryDir: string) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    await this.walk(this.memoryDir, details);
    const summary = buildSummary(details);
    return {
      // Residue is inert and nothing else depends on this cleanup, so failures are warnings.
      status: summary.failedCount > 0 ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} work-trace folder${summary.failedCount === 1 ? "" : "s"} could not be removed; they are unused and can be deleted by hand.`
        : null,
    };
  }

  private async walk(dirPath: string, details: AppDataMigrationItemDetail[]): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (error) {
      if (isNotFound(error)) return;
      details.push({
        itemId: itemIdFor(this.memoryDir, dirPath),
        filePath: dirPath,
        status: "FAILED",
        message: `Could not inventory the folder: ${messageFromError(error)}`,
      });
      return;
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.name === RETIRED_EXPORT_DIR_NAME && entry.isSymbolicLink()) {
        details.push(this.detail(entryPath, "SKIPPED", "Symbolic link was not followed."));
      } else if (entry.name === RETIRED_EXPORT_DIR_NAME && entry.isDirectory()) {
        // N7: a recognized folder is deleted as a whole, never walked into first.
        details.push(await this.removeIfRecognized(entryPath));
      } else if (entry.isDirectory()) {
        await this.walk(entryPath, details);
      }
    }
  }

  private async removeIfRecognized(dirPath: string): Promise<AppDataMigrationItemDetail> {
    if (!(await hasRetiredManifest(dirPath))) {
      return this.detail(dirPath, "SKIPPED", `Kept: a folder named ${RETIRED_EXPORT_DIR_NAME} without ${RETIRED_EXPORT_MANIFEST_FILE_NAME} is not a work-trace export.`);
    }
    try {
      await fs.rm(dirPath, { recursive: true });
      return this.detail(dirPath, "MIGRATED", "Removed the work-trace export folder.");
    } catch (error) {
      return isNotFound(error)
        ? this.detail(dirPath, "SKIPPED", "The work-trace export folder was already absent.")
        : this.detail(dirPath, "FAILED", `Could not remove the work-trace export folder: ${messageFromError(error)}`);
    }
  }

  private detail(dirPath: string, status: AppDataMigrationItemDetail["status"], message: string): AppDataMigrationItemDetail {
    return { itemId: itemIdFor(this.memoryDir, dirPath), filePath: dirPath, status, message };
  }
}

export const REMOVE_WORK_TRACE_EXPORTS_MIGRATION_ID = MIGRATION_ID;
