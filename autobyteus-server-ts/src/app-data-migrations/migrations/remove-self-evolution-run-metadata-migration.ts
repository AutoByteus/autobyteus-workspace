import fs from "node:fs/promises";
import path from "node:path";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";

const MIGRATION_ID = "20260623_remove_self_evolution_run_metadata";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const createBackupPath = (metadataPath: string): string =>
  `${metadataPath}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const createTempPath = (metadataPath: string): string =>
  `${metadataPath}.${process.pid}.${Date.now()}.tmp`;

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

const safeDirectoryName = (value: string): string | null => {
  if (!value || value === "." || value === ".." || value.includes("/") || value.includes("\\")) {
    return null;
  }
  return value;
};

const removeFromMemberTree = (members: unknown): boolean => {
  if (!Array.isArray(members)) {
    return false;
  }
  let changed = false;
  for (const member of members) {
    const record = asRecord(member);
    if (!record) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(record, "selfEvolutionEffective")) {
      delete record.selfEvolutionEffective;
      changed = true;
    }
    if (removeFromMemberTree(record.memberTree)) {
      changed = true;
    }
  }
  return changed;
};

const listMetadataFiles = async (memoryDir: string): Promise<Array<{ itemId: string; filePath: string }>> => {
  const files: Array<{ itemId: string; filePath: string }> = [];
  const agentsRoot = path.join(memoryDir, "agents");
  try {
    for (const entry of await fs.readdir(agentsRoot, { withFileTypes: true })) {
      const runId = entry.isDirectory() ? safeDirectoryName(entry.name) : null;
      if (runId) {
        files.push({ itemId: `agent:${runId}`, filePath: path.join(agentsRoot, runId, "run_metadata.json") });
      }
    }
  } catch (error) {
    if (!String(error).includes("ENOENT")) {
      throw error;
    }
  }

  const teamsRoot = path.join(memoryDir, "agent_teams");
  try {
    for (const entry of await fs.readdir(teamsRoot, { withFileTypes: true })) {
      const teamRunId = entry.isDirectory() ? safeDirectoryName(entry.name) : null;
      if (teamRunId) {
        files.push({ itemId: `team:${teamRunId}`, filePath: path.join(teamsRoot, teamRunId, "team_run_metadata.json") });
      }
    }
  } catch (error) {
    if (!String(error).includes("ENOENT")) {
      throw error;
    }
  }
  return files;
};

export class RemoveSelfEvolutionRunMetadataMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Remove self-evolution run metadata migration";
  readonly description = "Removes obsolete selfEvolutionEffective fields from standalone run metadata and recursive team member metadata.";
  readonly requiredOnStartup = true;

  constructor(private readonly memoryDir: string) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    for (const file of await listMetadataFiles(this.memoryDir)) {
      try {
        const raw = await fs.readFile(file.filePath, "utf-8");
        const payload = JSON.parse(raw) as unknown;
        const record = asRecord(payload);
        if (!record) {
          throw new Error("Metadata JSON root is not an object.");
        }
        let changed = false;
        if (Object.prototype.hasOwnProperty.call(record, "selfEvolutionEffective")) {
          delete record.selfEvolutionEffective;
          changed = true;
        }
        if (removeFromMemberTree(record.memberTree)) {
          changed = true;
        }
        if (!changed) {
          details.push({
            itemId: file.itemId,
            filePath: file.filePath,
            status: "SKIPPED",
            message: "No obsolete selfEvolutionEffective fields found.",
          });
          continue;
        }
        const backupPath = createBackupPath(file.filePath);
        await fs.copyFile(file.filePath, backupPath);
        const tempPath = createTempPath(file.filePath);
        await fs.writeFile(tempPath, `${JSON.stringify(record, null, 2)}\n`, "utf-8");
        await fs.rename(tempPath, file.filePath);
        details.push({
          itemId: file.itemId,
          filePath: file.filePath,
          status: "MIGRATED",
          message: "Removed obsolete selfEvolutionEffective metadata fields.",
          backupPath,
        });
      } catch (error) {
        if (String(error).includes("ENOENT")) {
          details.push({
            itemId: file.itemId,
            filePath: file.filePath,
            status: "SKIPPED",
            message: "Metadata file was not found.",
          });
          continue;
        }
        details.push({
          itemId: file.itemId,
          filePath: file.filePath,
          status: "FAILED",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const summary = buildSummary(details);
    const status = summary.failedCount > 0
      ? summary.migratedCount + summary.skippedCount > 0 ? "SUCCEEDED_WITH_WARNINGS" : "FAILED"
      : "SUCCEEDED";
    return {
      status,
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} metadata file(s) could not be migrated.`
        : null,
    };
  }
}

export const REMOVE_SELF_EVOLUTION_RUN_METADATA_MIGRATION_ID = MIGRATION_ID;
