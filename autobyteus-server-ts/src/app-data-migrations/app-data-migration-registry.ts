import { appConfigProvider } from "../config/app-config-provider.js";
import type { AppDataMigrationDefinition } from "./domain/app-data-migration-types.js";
import { RunHistoryIndexV2AppDataMigration } from "./migrations/run-history-index-v2-migration.js";
import { RawTraceRotationLayoutMigration } from "./migrations/raw-trace-rotation-layout-migration.js";
import { TeamRunHistoryIndexV2AppDataMigration } from "./migrations/team-run-history-index-v2-migration.js";
import { TeamRunMetadataMemberTreeMigration } from "./migrations/team-run-metadata-member-tree-migration.js";

export class AppDataMigrationRegistry {
  private readonly definitions: AppDataMigrationDefinition[];

  constructor(definitions?: AppDataMigrationDefinition[]) {
    this.definitions = definitions ?? [
      new TeamRunMetadataMemberTreeMigration(appConfigProvider.config.getMemoryDir()),
      new RawTraceRotationLayoutMigration(appConfigProvider.config.getMemoryDir()),
      new TeamRunHistoryIndexV2AppDataMigration(appConfigProvider.config.getMemoryDir()),
      new RunHistoryIndexV2AppDataMigration(appConfigProvider.config.getMemoryDir()),
    ];
  }

  listDefinitions(): AppDataMigrationDefinition[] {
    return [...this.definitions];
  }

  getDefinition(migrationId: string): AppDataMigrationDefinition | null {
    const normalized = migrationId.trim();
    return this.definitions.find((definition) => definition.id === normalized) ?? null;
  }
}

let cachedAppDataMigrationRegistry: AppDataMigrationRegistry | null = null;

export const getAppDataMigrationRegistry = (): AppDataMigrationRegistry => {
  if (!cachedAppDataMigrationRegistry) {
    cachedAppDataMigrationRegistry = new AppDataMigrationRegistry();
  }
  return cachedAppDataMigrationRegistry;
};
