import { appConfigProvider } from "../config/app-config-provider.js";
import type { AppDataMigrationDefinition } from "./domain/app-data-migration-types.js";
import { TeamRunMetadataMemberTreeMigration } from "./migrations/team-run-metadata-member-tree-migration.js";

export class AppDataMigrationRegistry {
  private readonly definitions: AppDataMigrationDefinition[];

  constructor(definitions?: AppDataMigrationDefinition[]) {
    this.definitions = definitions ?? [
      new TeamRunMetadataMemberTreeMigration(appConfigProvider.config.getMemoryDir()),
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
