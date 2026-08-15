import fs from "node:fs/promises";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";
import { TeamRunMetadataStore } from "../legacy/team-run-metadata-store.js";
import {
  decodeFlatTeamRunMetadataToMemberTree,
  isLegacyFlatTeamRunMetadata,
} from "./team-run-member-tree-prerequisite-converter.js";
import { convertLegacyTeamRunMetadata } from "./team-canonical-metadata-converter.js";

const MIGRATION_ID = "20260517_team_run_metadata_member_tree";
const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Team metadata JSON root is not an object.");
  }
  return value as Record<string, unknown>;
};
const summary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});
const backupAndReplace = async (filePath: string, value: unknown): Promise<string> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${filePath}.backup-${timestamp}`;
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.copyFile(filePath, backupPath);
  try {
    await fs.writeFile(tempPath, JSON.stringify(value, null, 2), "utf-8");
    await fs.rename(tempPath, filePath);
    return backupPath;
  } finally {
    await fs.unlink(tempPath).catch((error: unknown) => {
      if (!missing(error)) throw error;
    });
  }
};

export class TeamRunMetadataMemberTreeMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Team run metadata member tree migration";
  readonly description = "Converts safe historical flat TeamRun metadata to the recursive memberTree prerequisite.";
  readonly requiredOnStartup = true;
  private readonly store: TeamRunMetadataStore;
  constructor(memoryDir: string) { this.store = new TeamRunMetadataStore(memoryDir); }
  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    for (const teamRunId of await this.store.listTeamRunIds()) {
      const filePath = this.store.getMetadataPath(teamRunId);
      try {
        const payload = record(JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown);
        if (!isLegacyFlatTeamRunMetadata(payload)) {
          convertLegacyTeamRunMetadata(payload, teamRunId);
          details.push({ itemId: teamRunId, filePath, status: "SKIPPED", message: "Metadata already has a valid memberTree." });
          continue;
        }
        const converted = decodeFlatTeamRunMetadataToMemberTree(payload, teamRunId);
        // Staged successor-contract validation must finish before backup or replacement.
        convertLegacyTeamRunMetadata(converted, teamRunId);
        const backupPath = await backupAndReplace(filePath, converted);
        details.push({ itemId: teamRunId, filePath, backupPath, status: "MIGRATED", message: "Converted flat memberMetadata to validated memberTree metadata." });
      } catch (error) {
        details.push(missing(error)
          ? { itemId: teamRunId, filePath, status: "SKIPPED", message: "No team_run_metadata.json file found." }
          : { itemId: teamRunId, filePath, status: "FAILED", message: message(error) });
      }
    }
    const resultSummary = summary(details);
    const status = resultSummary.failedCount === 0
      ? "SUCCEEDED"
      : resultSummary.migratedCount + resultSummary.skippedCount > 0
        ? "SUCCEEDED_WITH_WARNINGS"
        : "FAILED";
    return {
      status,
      summary: resultSummary,
      errorMessage: resultSummary.failedCount
        ? `${resultSummary.failedCount} team metadata file(s) could not be migrated.`
        : null,
    };
  }
}
export const TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID = MIGRATION_ID;
