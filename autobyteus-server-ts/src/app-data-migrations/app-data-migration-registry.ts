import { TeamContextFileExecutionLocatorsV1AppDataMigration } from "./migrations/team-context-file-execution-locators-v1/team-context-file-execution-locators-v1-app-data-migration.js";
import path from "node:path";
import { appConfigProvider } from "../config/app-config-provider.js";
import { getSecretVaultRuntime } from "../secret-management/secret-vault-runtime.js";
import { getBuiltInLlmProviderCatalog } from "../llm-management/llm-providers/builtins/built-in-llm-provider-catalog.js";
import { resetAgentRunHistoryCatalogState } from "../run-history/services/agent-run-history-catalog-service.js";
import { resetCollaborationRunHistoryCatalogState } from "../run-history/services/collaboration-run-history-catalog-core.js";
import { getAppDataMigrationRecordRepository } from "./repositories/app-data-migration-record-repository.js";
import type { DefinitionNameLookup } from "./domain/definition-name-lookup.js";
import type { RunHistoryCatalogInvalidation } from "./domain/run-history-catalog-invalidation.js";
import { CustomProviderMigrationNameSnapshotReader } from "./frozen/custom-provider-migration-name-snapshot.js";
import type { AppDataMigrationDefinition } from "./domain/app-data-migration-types.js";
import { RunHistoryIndexV2AppDataMigration } from "./migrations/run-history-index-v2/run-history-index-v2-migration.js";
import { RawTraceRotationLayoutMigration } from "./migrations/raw-trace-rotation-layout/raw-trace-rotation-layout-migration.js";
import { RawTraceActiveFileNameMigration } from "./migrations/raw-trace-active-file-name/raw-trace-active-file-name-migration.js";
import { TeamRunHistoryIndexV2AppDataMigration } from "./migrations/team-run-history-index-v2/team-run-history-index-v2-migration.js";
import { TeamRunMetadataMemberTreeMigration } from "./migrations/team-run-metadata-member-tree/team-run-metadata-member-tree-migration.js";
import { RemoveSelfEvolutionRunMetadataMigration } from "./migrations/remove-self-evolution-run-metadata/remove-self-evolution-run-metadata-migration.js";
import { TeamCommunicationProjectionAddressMigration } from "./migrations/team-communication-projection-address/team-communication-projection-address-migration.js";
import { TokenUsageCustomProviderModelValueBackfillMigration } from "./migrations/token-usage-custom-provider-model-value-backfill/token-usage-custom-provider-model-value-backfill-migration.js";
import { PrismaTokenUsageProviderNameSnapshotBackfillDatabase, TokenUsageProviderNameSnapshotBackfillMigration } from "./migrations/token-usage-provider-name-snapshot-backfill/token-usage-provider-name-snapshot-backfill-migration.js";
import { RemoveGlobalSkillDiscoveryModeMigration } from "./migrations/remove-global-skill-discovery-mode/remove-global-skill-discovery-mode-migration.js";
import { CustomProviderV1AppDataMigration } from "./migrations/custom-provider-v1/custom-provider-v1-app-data-migration.js";
import { RemoveExternalRuntimeWorkingContextSnapshotsMigration } from "./migrations/remove-external-runtime-working-context-snapshots/remove-external-runtime-working-context-snapshots-migration.js";
import { MigrateNativeWorkingContextSnapshotsV5Migration } from "./migrations/migrate-native-working-context-snapshots-v5/migrate-native-working-context-snapshots-v5-migration.js";
import { CustomProviderReadableIdAppDataMigration } from "./migrations/custom-provider-readable-id/custom-provider-readable-id-app-data-migration.js";
import { TeamRunExecutionTreeV1AppDataMigration } from "./migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-app-data-migration.js";
import { TokenUsageRunRecordsV1AppDataMigration } from "./migrations/token-usage-run-records-v1/token-usage-run-records-v1-app-data-migration.js";
import { TeamAgentMemoryLayoutAppDataMigration } from "./migrations/team-agent-memory-layout/team-agent-memory-layout-app-data-migration.js";
import { TeamRunExecutionTreeV2AppDataMigration } from "./migrations/team-run-execution-tree-v2/team-run-execution-tree-v2-app-data-migration.js";
import { AgentOrgFlatTeamFamiliesV1AppDataMigration } from "./migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import { AgentOrgHistoryFirstMessageSummaryV1AppDataMigration } from "./migrations/agent-org-history-first-message-summary-v1/agent-org-history-first-message-summary-v1-app-data-migration.js";
import { RemoveExternalMessagingDataMigration } from "./migrations/remove-external-messaging-data/remove-external-messaging-data-migration.js";
import { ProjectsPerFolderV1AppDataMigration } from "./migrations/projects-per-folder-v1/projects-per-folder-v1-app-data-migration.js";
import { ProjectTaskKeysV1AppDataMigration } from "./migrations/project-task-keys-v1/project-task-keys-v1-app-data-migration.js";
import { ProjectTaskTitlesAppDataMigration } from "./migrations/project-task-titles/project-task-titles-app-data-migration.js";
import { RemoveBuiltInProjectTaskManagerMigration } from "./migrations/remove-built-in-project-task-manager/remove-built-in-project-task-manager-migration.js";
import { TaskAgentOwnRunV1AppDataMigration } from "./migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.js";
import { CollaboratorsToDelegatedRunsV1AppDataMigration } from "./migrations/collaborators-to-delegated-runs-v1/collaborators-to-delegated-runs-v1-app-data-migration.js";
import { AppendOnlyMessageLogsV1AppDataMigration } from "./migrations/append-only-message-logs-v1/append-only-message-logs-v1-app-data-migration.js";
import { RemoveWorkTraceExportsMigration } from "./migrations/remove-work-trace-exports/remove-work-trace-exports-migration.js";
import { DelegatedCopyOwnFileCompleteV1AppDataMigration } from "./migrations/delegated-copy-own-file-complete-v1/delegated-copy-own-file-complete-v1-app-data-migration.js";
import { RemoveSkillImprovementDataMigration } from "./migrations/remove-skill-improvement-data/remove-skill-improvement-data-migration.js";
import { NodeIdentityFileNameMigration } from "./migrations/node-identity-file-name/node-identity-file-name-migration.js";
import { MemorySyncSourceIdNamesMigration } from "./migrations/memory-sync-source-id-names/memory-sync-source-id-names-migration.js";

/**
 * Definition names as the application resolves them. The definition providers are loaded only when a migration needs a
 * name, as the migrations' own lookup did before it was a port.
 */
export const liveDefinitionNames: DefinitionNameLookup = {
  agentDefinitionName: async (agentDefinitionId) => {
    const { FileAgentDefinitionProvider } = await import("../agent-definition/providers/file-agent-definition-provider.js");
    return (await new FileAgentDefinitionProvider().getById(agentDefinitionId))?.name ?? null;
  },
  teamDefinitionName: async (teamDefinitionId) => {
    const { FileAgentTeamDefinitionProvider } = await import("../agent-team-definition/providers/file-agent-team-definition-provider.js");
    return (await new FileAgentTeamDefinitionProvider().getById(teamDefinitionId))?.name ?? null;
  },
};

export const liveRunHistoryCatalogs: RunHistoryCatalogInvalidation = {
  agentRunHistoryChanged: (memoryDir) => resetAgentRunHistoryCatalogState(memoryDir),
  collaborationRunHistoryChanged: (memoryDir, family) => resetCollaborationRunHistoryCatalogState(memoryDir, family),
};

/**
 * The one place that wires migrations to the application: it reads configuration and passes each migration its paths,
 * ports and live inputs.
 */
const registeredMigrations = (): AppDataMigrationDefinition[] => {
  const config = appConfigProvider.config;
  const memoryDir = config.getMemoryDir();
  const appDataDir = config.getAppDataDir();
  const ledger = getAppDataMigrationRecordRepository();
  return [
    new CustomProviderV1AppDataMigration(appDataDir),
    new RemoveGlobalSkillDiscoveryModeMigration(memoryDir),
    new TeamRunMetadataMemberTreeMigration(memoryDir),
    new TeamRunExecutionTreeV1AppDataMigration(
      memoryDir,
      appDataDir,
    ),
    new TeamAgentMemoryLayoutAppDataMigration(
      memoryDir,
    ),
    new TeamRunExecutionTreeV2AppDataMigration(
      memoryDir,
    ),
    new TokenUsageCustomProviderModelValueBackfillMigration(),
    new TokenUsageProviderNameSnapshotBackfillMigration(
      new PrismaTokenUsageProviderNameSnapshotBackfillDatabase(),
      new CustomProviderMigrationNameSnapshotReader(appDataDir),
    ),
    new TokenUsageRunRecordsV1AppDataMigration(),
    new AgentOrgFlatTeamFamiliesV1AppDataMigration(memoryDir, config, liveRunHistoryCatalogs),
    new RemoveExternalRuntimeWorkingContextSnapshotsMigration(
      memoryDir,
    ),
    // Native snapshot conversion resolves provenance through the current raw-trace layout.
    new RawTraceRotationLayoutMigration(memoryDir),
    new RawTraceActiveFileNameMigration(memoryDir),
    new TeamContextFileExecutionLocatorsV1AppDataMigration(
      memoryDir,
      () => appConfigProvider.config.getBaseUrl(),
    ),
    new MigrateNativeWorkingContextSnapshotsV5Migration(
      memoryDir,
    ),
    new AgentOrgHistoryFirstMessageSummaryV1AppDataMigration(
      memoryDir,
    ),
    new TeamCommunicationProjectionAddressMigration(memoryDir),
    new RemoveSelfEvolutionRunMetadataMigration(memoryDir),
    new TeamRunHistoryIndexV2AppDataMigration(memoryDir, liveDefinitionNames, liveRunHistoryCatalogs),
    new RunHistoryIndexV2AppDataMigration(memoryDir, liveDefinitionNames, liveRunHistoryCatalogs),
    new CustomProviderReadableIdAppDataMigration(
      appDataDir,
      // The live vault stays the only writer of secrets; it is ready only once startup opened it.
      () => getSecretVaultRuntime().requireService(),
      [appDataDir, ...config.getAdditionalAgentPackageRoots(), ...config.getAdditionalApplicationPackageRoots()],
      getBuiltInLlmProviderCatalog().listProviders().map(({ name }) => name),
    ),
    new RemoveExternalMessagingDataMigration({
      bindingDataDir: path.join(appDataDir, "external-channel"),
      gatewayInstallDir: path.join(appDataDir, "extensions", "messaging-gateway"),
      gatewayDownloadDir: path.join(config.getDownloadDir(), "messaging-gateway"),
      gatewayLogsDir: path.join(config.getLogsDir(), "messaging-gateway"),
    }),
    new ProjectsPerFolderV1AppDataMigration(appDataDir),
    // Keys existing Project Tasks; needs the per-Project folders.
    new ProjectTaskKeysV1AppDataMigration(appDataDir),
    // Titles existing Project Tasks from their descriptions' first lines; needs the per-Project folders, not the
    // Task keys (SR-012): an unkeyable Project must not leave every Project untitled. keys-v1 keeps a title it finds.
    new ProjectTaskTitlesAppDataMigration(appDataDir),
    new RemoveBuiltInProjectTaskManagerMigration(
      path.join(config.getAgentsDir(), "autobyteus-project-task-manager"),
    ),
    // Converts stored collaborators into delegated runs; must stay after every tree-shape migration above.
    new CollaboratorsToDelegatedRunsV1AppDataMigration(memoryDir),
    // On every start each pending or failed predecessor runs before it (contract §5.4).
    new TaskAgentOwnRunV1AppDataMigration(memoryDir, { ledger }),
    // Registered after every released migration that may still write a JSON message log: converts
    // each one on the same start (append-only message logs, DS-005).
    new AppendOnlyMessageLogsV1AppDataMigration(memoryDir, { ledger }),
    // Deletes the retired work-trace export folders once run folders are in their current place.
    new RemoveWorkTraceExportsMigration(memoryDir),
    // Completes delegated copies' own files so each restores on its own, and removes their origin field.
    new DelegatedCopyOwnFileCompleteV1AppDataMigration(memoryDir, { ledger }),
    // Deletes the removed Skill Improvement feature's data once (records, sessions, helper runs, built-in agent).
    new RemoveSkillImprovementDataMigration(
      memoryDir,
      config.getAgentsDir(),
    ),
    // The node identity file follows the code's name (autobyteus-290 SM-1); holds back `node_identity`.
    new NodeIdentityFileNameMigration(appDataDir),
    // Memory Sync's stored names follow the code (autobyteus-290 SM-2 … SM-5); holds back `memory_sync`.
    new MemorySyncSourceIdNamesMigration(appDataDir, memoryDir),
  ];
};

export class AppDataMigrationRegistry {
  private readonly definitions: AppDataMigrationDefinition[];

  constructor(definitions?: AppDataMigrationDefinition[]) {
    this.definitions = definitions ?? registeredMigrations();
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
