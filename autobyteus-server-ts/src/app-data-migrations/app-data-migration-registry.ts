import { appConfigProvider } from "../config/app-config-provider.js";
import type { AppDataMigrationDefinition } from "./domain/app-data-migration-types.js";
import { RunHistoryIndexV2AppDataMigration } from "./migrations/run-history-index-v2-migration.js";
import { RawTraceRotationLayoutMigration } from "./migrations/raw-trace-rotation-layout-migration.js";
import { RawTraceActiveFileNameMigration } from "./migrations/raw-trace-active-file-name-migration.js";
import { TeamRunHistoryIndexV2AppDataMigration } from "./migrations/team-run-history-index-v2-migration.js";
import { TeamRunMetadataMemberTreeMigration } from "./migrations/team-run-metadata-member-tree-migration.js";
import { RemoveSelfEvolutionRunMetadataMigration } from "./migrations/remove-self-evolution-run-metadata-migration.js";
import { TeamCommunicationProjectionAddressMigration } from "./migrations/team-communication-projection-address-migration.js";
import { TokenUsageExecutionAddressBackfillMigration } from "./migrations/token-usage-execution-address-backfill-migration.js";
import { TokenUsageLegacyPathColumnsDropMigration } from "./migrations/token-usage-legacy-path-columns-drop-migration.js";
import { RemoveGlobalSkillDiscoveryModeMigration } from "./migrations/remove-global-skill-discovery-mode-migration.js";
import { CustomProviderV1AppDataMigration } from "./migrations/custom-provider-v1-app-data-migration.js";
import { ResetPreLineageMemoryAppDataMigration } from "./migrations/reset-pre-lineage-memory-app-data-migration.js";

export class AppDataMigrationRegistry {
  private readonly definitions: AppDataMigrationDefinition[];

  constructor(definitions?: AppDataMigrationDefinition[]) {
    this.definitions = definitions ?? [
      new CustomProviderV1AppDataMigration(),
      new RemoveGlobalSkillDiscoveryModeMigration(
        appConfigProvider.config.getMemoryDir(),
        appConfigProvider.config.getAppDataDir(),
      ),
      new TeamRunMetadataMemberTreeMigration(appConfigProvider.config.getMemoryDir()),
      new TeamCommunicationProjectionAddressMigration(appConfigProvider.config.getMemoryDir()),
      new TokenUsageExecutionAddressBackfillMigration(appConfigProvider.config.getMemoryDir()),
      new TokenUsageLegacyPathColumnsDropMigration(),
      new RawTraceRotationLayoutMigration(appConfigProvider.config.getMemoryDir()),
      new RawTraceActiveFileNameMigration(appConfigProvider.config.getMemoryDir()),
      new ResetPreLineageMemoryAppDataMigration(appConfigProvider.config.getMemoryDir()),
      new RemoveSelfEvolutionRunMetadataMigration(appConfigProvider.config.getMemoryDir()),
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
