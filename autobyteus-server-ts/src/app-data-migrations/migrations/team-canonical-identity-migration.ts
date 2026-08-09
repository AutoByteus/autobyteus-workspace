import fs from "node:fs/promises";
import path from "node:path";
import { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import { normalizeTaskDelegationRecordsFile } from "../../agent-team-execution/task-delegation/records/task-delegation-records-normalizer.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";
import { migrateCanonicalApplicationDatabase } from "./team-canonical-application-db-migrator.js";
import { convertLegacyTeamRunMetadata } from "./team-canonical-metadata-converter.js";
import { convertExternalChannelBindings, convertTaskDelegationFile } from "./team-canonical-structured-file-converter.js";
import {
  TokenUsageCanonicalExecutionAddressMigrator,
  type TokenUsageCanonicalExecutionAddressMigratorLike,
} from "./token-usage-canonical-execution-address-migrator.js";

const MIGRATION_ID = "20260801_team_canonical_identity";
const json = (value: unknown): string => JSON.stringify(value, null, 2);
const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const backupAndReplace = async (filePath: string, value: unknown): Promise<string> => {
  const backupPath = `${filePath}.backup-${Date.now()}`;
  await fs.copyFile(filePath, backupPath);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, json(value), "utf8");
  await fs.rename(tempPath, filePath);
  return backupPath;
};
const summary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

export class TeamCanonicalIdentityMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "AgentTeam canonical identity migration";
  readonly description = "Converts required TeamRun, task, token, channel, and application platform state to canonical schema v3 identity.";
  readonly requiredOnStartup = true;

  constructor(
    private readonly memoryDir: string,
    private readonly appDataDir: string,
    private readonly platformStateStore = new ApplicationPlatformStateStore(),
    private readonly suppliedTokenMigrator?: TokenUsageCanonicalExecutionAddressMigratorLike,
  ) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    const teamRoot = path.join(this.memoryDir, "agent_teams");
    let teamRunIds: string[] = [];
    try {
      teamRunIds = (await fs.readdir(teamRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    } catch (error) {
      if (!missing(error)) throw error;
    }
    for (const teamRunId of teamRunIds) await this.migrateTeamFiles(teamRoot, teamRunId, details);
    const teamIdentityFailed = details.some((detail) =>
      detail.status === "FAILED"
      && (detail.itemId.startsWith("team-metadata:") || detail.itemId.startsWith("task-records:"))
    );
    if (teamIdentityFailed) {
      details.push({
        itemId: "token-usage:team-identity-dependency",
        status: "FAILED",
        message: "Canonical token planning was not started because required TeamRun or task identity conversion failed.",
      });
    } else {
      const tokenMigrator = this.suppliedTokenMigrator
        ?? new TokenUsageCanonicalExecutionAddressMigrator(this.memoryDir);
      details.push(...await tokenMigrator.migrate());
    }
    await this.migrateBindings(details);
    this.migrateApplicationDatabases(details);
    const resultSummary = summary(details);
    return {
      status: resultSummary.failedCount ? "FAILED" : "SUCCEEDED",
      summary: resultSummary,
      errorMessage: resultSummary.failedCount
        ? `${resultSummary.failedCount} required canonical identity item(s) failed. Runtime startup remains blocked.`
        : null,
    };
  }

  private async migrateTeamFiles(
    teamRoot: string,
    teamRunId: string,
    details: AppDataMigrationItemDetail[],
  ): Promise<void> {
    const metadataPath = path.join(teamRoot, teamRunId, "team_run_metadata.json");
    await this.migrateJsonFile({
      itemId: `team-metadata:${teamRunId}`,
      filePath: metadataPath,
      convert: (value) => convertLegacyTeamRunMetadata(value, teamRunId),
      details,
    });
    const taskPath = path.join(teamRoot, teamRunId, "task_delegation_records.json");
    await this.migrateJsonFile({
      itemId: `task-records:${teamRunId}`,
      filePath: taskPath,
      optional: true,
      convert: (value) => {
        const converted = convertTaskDelegationFile(value, teamRunId);
        return normalizeTaskDelegationRecordsFile(converted, { teamRunId });
      },
      details,
    });
  }

  private async migrateBindings(details: AppDataMigrationItemDetail[]): Promise<void> {
    await this.migrateJsonFile({
      itemId: "external-channel-bindings",
      filePath: path.join(this.appDataDir, "external-channel", "bindings.json"),
      optional: true,
      convert: convertExternalChannelBindings,
      details,
    });
  }

  private migrateApplicationDatabases(details: AppDataMigrationItemDetail[]): void {
    for (const databasePath of this.platformStateStore.listExistingPlatformDatabasePaths()) {
      const itemId = `application-db:${databasePath}`;
      try {
        const applicationId = this.platformStateStore.resolveApplicationIdForPlatformDatabasePath(databasePath);
        if (!applicationId) throw new Error(`Cannot recover application identity from physical platform database '${databasePath}'.`);
        const outcome = migrateCanonicalApplicationDatabase(databasePath, applicationId);
        details.push({ itemId, filePath: databasePath, backupPath: outcome.backupPath, status: "MIGRATED", message: `Migrated application '${applicationId}' in a blocking transaction.` });
      } catch (error) {
        details.push({ itemId, filePath: databasePath, status: "FAILED", message: message(error) });
      }
    }
  }

  private async migrateJsonFile(input: {
    itemId: string;
    filePath: string;
    optional?: boolean;
    convert: (value: unknown) => unknown;
    details: AppDataMigrationItemDetail[];
  }): Promise<void> {
    try {
      const raw = JSON.parse(await fs.readFile(input.filePath, "utf8")) as unknown;
      const converted = input.convert(raw);
      if (JSON.stringify(raw) === JSON.stringify(converted)) {
        input.details.push({ itemId: input.itemId, filePath: input.filePath, status: "SKIPPED", message: "Already canonical." });
        return;
      }
      const backupPath = await backupAndReplace(input.filePath, converted);
      input.details.push({ itemId: input.itemId, filePath: input.filePath, backupPath, status: "MIGRATED", message: "Converted and validated canonical identity." });
    } catch (error) {
      if (input.optional && missing(error)) return;
      input.details.push({ itemId: input.itemId, filePath: input.filePath, status: "FAILED", message: message(error) });
    }
  }
}

export const TEAM_CANONICAL_IDENTITY_MIGRATION_ID = MIGRATION_ID;
