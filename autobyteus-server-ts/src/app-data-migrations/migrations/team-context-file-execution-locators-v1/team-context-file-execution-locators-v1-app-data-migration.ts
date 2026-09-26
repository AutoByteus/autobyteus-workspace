import path from "node:path";
import type { AppDataMigrationDefinition, AppDataMigrationExecutionResult } from "../../domain/app-data-migration-types.js";
import { getAtomicRunPackageFileCommitWriter, type AtomicRunPackageFileCommitWriter } from "../../../run-history/store/atomic-run-package-file-commit-writer.js";
import { TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID } from "../team-run-execution-tree-v2-app-data-migration.js";
import { AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID } from "../agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import { RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID } from "../raw-trace-rotation-layout-migration.js";
import { RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID } from "../raw-trace-active-file-name-migration.js";
import { TeamContextFileLocatorTransition } from "./team-context-file-locator-transition.js";
import { TeamContextFileTransitionJournal } from "./team-context-file-transition-journal.js";

export const TEAM_CONTEXT_FILE_EXECUTION_LOCATORS_V1_MIGRATION_ID = "20260926_team_context_file_execution_locators_v1";
export class TeamContextFileExecutionLocatorsV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = TEAM_CONTEXT_FILE_EXECUTION_LOCATORS_V1_MIGRATION_ID;
  readonly displayName = "Exact Team attachment execution locators";
  readonly description = "Converts typed Team attachment references to proven exact execution ownership before startup.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;
  readonly prerequisiteMigrationIds = [TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID, AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID,
    RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID, RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID];
  constructor(private readonly memoryDir: string, private readonly appDataDir: string, private readonly baseUrl: () => string,
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter()) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const backupPath = path.join(this.appDataDir, "app-data-migration-backups", this.id);
    let scannedCount = 0;
    try {
      if (path.resolve(backupPath).startsWith(`${path.resolve(this.memoryDir)}${path.sep}`)) throw new Error("Migration backups must be outside live memory discovery.");
      const transition = new TeamContextFileLocatorTransition(this.memoryDir, this.baseUrl());
      const sources = await transition.discover();
      scannedCount = sources.length;
      const migratedCount = await new TeamContextFileTransitionJournal(backupPath, this.writer).execute(transition, sources);
      return { status: "SUCCEEDED", summary: { scannedCount, migratedCount, skippedCount: scannedCount - migratedCount, failedCount: 0,
        details: [{ itemId: this.id, status: "MIGRATED", message: "All typed references validated; manifest complete.", backupPath }] } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { status: "FAILED", errorMessage: message, summary: { scannedCount, migratedCount: 0, skippedCount: 0, failedCount: 1,
        details: [{ itemId: this.id, status: "FAILED", message, backupPath }] } };
    }
  }
}
