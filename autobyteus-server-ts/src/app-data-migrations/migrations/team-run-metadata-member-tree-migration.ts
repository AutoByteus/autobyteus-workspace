import type { AppDataMigrationDefinition, AppDataMigrationExecutionResult, AppDataMigrationItemDetail } from "../domain/app-data-migration-types.js";
import { TeamRunMetadataStore } from "../../run-history/store/team-run-metadata-store.js";

const MIGRATION_ID = "20260517_team_run_metadata_member_tree";

/**
 * Retained as an ordered historical checkpoint. The later canonical-identity
 * migration owns all legacy metadata shapes so installations that already
 * recorded this checkpoint and fresh installations follow the same converter.
 */
export class TeamRunMetadataMemberTreeMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Team run metadata legacy checkpoint";
  readonly description = "Discovers Team metadata before the canonical schema-v3 migration.";
  readonly requiredOnStartup = true;
  private readonly store: TeamRunMetadataStore;
  constructor(memoryDir: string) { this.store = new TeamRunMetadataStore(memoryDir); }
  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = (await this.store.listTeamRunIds()).map((teamRunId) => ({
      itemId: teamRunId,
      filePath: this.store.getMetadataPath(teamRunId),
      status: "SKIPPED",
      message: "Discovered for the ordered canonical schema-v3 migration.",
    }));
    return {
      status: "SUCCEEDED",
      summary: { scannedCount: details.length, migratedCount: 0, skippedCount: details.length, failedCount: 0, details },
    };
  }
}
export const TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID = MIGRATION_ID;
