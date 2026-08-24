import { appConfigProvider } from "../config/app-config-provider.js";
import type { AppDataMigrationDefinition } from "./domain/app-data-migration-types.js";
import { RunHistoryIndexV2AppDataMigration } from "./migrations/run-history-index-v2-migration.js";
import { RawTraceRotationLayoutMigration } from "./migrations/raw-trace-rotation-layout-migration.js";
import { RawTraceActiveFileNameMigration } from "./migrations/raw-trace-active-file-name-migration.js";
import { TeamRunHistoryIndexV2AppDataMigration } from "./migrations/team-run-history-index-v2-migration.js";
import { TeamRunMetadataMemberTreeMigration } from "./migrations/team-run-metadata-member-tree-migration.js";
import { RemoveSelfEvolutionRunMetadataMigration } from "./migrations/remove-self-evolution-run-metadata-migration.js";
import { TeamCommunicationProjectionAddressMigration } from "./migrations/team-communication-projection-address-migration.js";
import { TokenUsageCustomProviderModelValueBackfillMigration } from "./migrations/token-usage-custom-provider-model-value-backfill-migration.js";
import { TokenUsageProviderNameSnapshotBackfillMigration } from "./migrations/token-usage-provider-name-snapshot-backfill-migration.js";
import { RemoveGlobalSkillDiscoveryModeMigration } from "./migrations/remove-global-skill-discovery-mode-migration.js";
import { CustomProviderV1AppDataMigration } from "./migrations/custom-provider-v1-app-data-migration.js";
import { RemoveExternalRuntimeWorkingContextSnapshotsMigration } from "./migrations/remove-external-runtime-working-context-snapshots-migration.js";
import { MigrateNativeWorkingContextSnapshotsV5Migration } from "./migrations/migrate-native-working-context-snapshots-v5-migration.js";
import { CustomProviderReadableIdAppDataMigration } from "./migrations/custom-provider-readable-id-app-data-migration.js";
import { TeamRunExecutionTreeV1AppDataMigration } from "./migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-app-data-migration.js";
import { TokenUsageRunRecordsV1AppDataMigration } from "./migrations/token-usage-run-records-v1/token-usage-run-records-v1-app-data-migration.js";
import { TeamAgentMemoryLayoutAppDataMigration } from "./migrations/team-agent-memory-layout-app-data-migration.js";

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
      new TeamRunExecutionTreeV1AppDataMigration(
        appConfigProvider.config.getMemoryDir(),
        appConfigProvider.config.getAppDataDir(),
      ),
      new TeamAgentMemoryLayoutAppDataMigration(
        appConfigProvider.config.getMemoryDir(),
      ),
      new RemoveExternalRuntimeWorkingContextSnapshotsMigration(
        appConfigProvider.config.getMemoryDir(),
      ),
      // Native snapshot conversion resolves provenance through the current raw-trace layout.
      new RawTraceRotationLayoutMigration(appConfigProvider.config.getMemoryDir()),
      new RawTraceActiveFileNameMigration(appConfigProvider.config.getMemoryDir()),
      new MigrateNativeWorkingContextSnapshotsV5Migration(
        appConfigProvider.config.getMemoryDir(),
      ),
      new TeamCommunicationProjectionAddressMigration(appConfigProvider.config.getMemoryDir()),
      new TokenUsageCustomProviderModelValueBackfillMigration(),
      new TokenUsageProviderNameSnapshotBackfillMigration(),
      new TokenUsageRunRecordsV1AppDataMigration(),
      new RemoveSelfEvolutionRunMetadataMigration(appConfigProvider.config.getMemoryDir()),
      new TeamRunHistoryIndexV2AppDataMigration(appConfigProvider.config.getMemoryDir()),
      new RunHistoryIndexV2AppDataMigration(appConfigProvider.config.getMemoryDir()),
      new CustomProviderReadableIdAppDataMigration(),
    ];
    this.validateDefinitions();
  }

  listDefinitions(): AppDataMigrationDefinition[] {
    return [...this.definitions];
  }

  getDefinition(migrationId: string): AppDataMigrationDefinition | null {
    const normalized = migrationId.trim();
    return this.definitions.find((definition) => definition.id === normalized) ?? null;
  }

  private validateDefinitions(): void {
    const seen = new Set<string>();
    for (const definition of this.definitions) {
      if (!definition.id.trim()) {
        throw new Error("App data migration ID is required.");
      }
      if (seen.has(definition.id)) {
        throw new Error(`Duplicate app data migration ID '${definition.id}'.`);
      }
      const uniquePrerequisites = new Set<string>();
      for (const prerequisiteId of definition.prerequisiteMigrationIds ?? []) {
        if (!prerequisiteId.trim()) {
          throw new Error(`App data migration '${definition.id}' has an empty prerequisite ID.`);
        }
        if (uniquePrerequisites.has(prerequisiteId)) {
          throw new Error(
            `App data migration '${definition.id}' repeats prerequisite '${prerequisiteId}'.`,
          );
        }
        if (!seen.has(prerequisiteId)) {
          throw new Error(
            `App data migration '${definition.id}' prerequisite '${prerequisiteId}' must be registered earlier.`,
          );
        }
        uniquePrerequisites.add(prerequisiteId);
      }
      seen.add(definition.id);
    }
  }
}

let cachedAppDataMigrationRegistry: AppDataMigrationRegistry | null = null;

export const getAppDataMigrationRegistry = (): AppDataMigrationRegistry => {
  if (!cachedAppDataMigrationRegistry) {
    cachedAppDataMigrationRegistry = new AppDataMigrationRegistry();
  }
  return cachedAppDataMigrationRegistry;
};
