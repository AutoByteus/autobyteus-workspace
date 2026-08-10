import type {
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationStatus,
} from '../domain/app-data-migration-types.js';
import { getAppDataMigrationRecordRepository } from '../repositories/app-data-migration-record-repository.js';
import { CUSTOM_PROVIDER_V1_APP_DATA_MIGRATION_ID } from './custom-provider-v1-app-data-migration.js';
import { REMOVE_GLOBAL_SKILL_DISCOVERY_MODE_MIGRATION_ID } from './remove-global-skill-discovery-mode-migration.js';
import { TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID } from './team-run-metadata-member-tree-migration.js';
import { TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID } from './token-usage-provider-name-snapshot-backfill-migration.js';
import { REMOVE_SELF_EVOLUTION_RUN_METADATA_MIGRATION_ID } from './remove-self-evolution-run-metadata-migration.js';

export const CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_INCOMPLETE =
  'CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_INCOMPLETE';

export const CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS = [
  CUSTOM_PROVIDER_V1_APP_DATA_MIGRATION_ID,
  REMOVE_GLOBAL_SKILL_DISCOVERY_MODE_MIGRATION_ID,
  TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID,
  TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID,
  REMOVE_SELF_EVOLUTION_RUN_METADATA_MIGRATION_ID,
] as const;

type PrerequisiteStatus = {
  migrationId: typeof CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS[number];
  status: AppDataMigrationStatus;
};

export class CustomProviderReadableIdPrerequisiteError extends Error {
  constructor(readonly incomplete: PrerequisiteStatus[]) {
    super(CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_INCOMPLETE);
    this.name = 'CustomProviderReadableIdPrerequisiteError';
  }

  toJSON(): { code: string; prerequisites: PrerequisiteStatus[] } {
    return {
      code: CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_INCOMPLETE,
      prerequisites: this.incomplete,
    };
  }
}

export class CustomProviderReadableIdPrerequisiteGuard {
  constructor(
    private readonly repository: Pick<AppDataMigrationRecordRepositoryLike, 'getRecord'> =
      getAppDataMigrationRecordRepository(),
  ) {}

  async requireTerminalSuccess(): Promise<void> {
    const statuses = await Promise.all(
      CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS.map(async (migrationId) => ({
        migrationId,
        status: (await this.repository.getRecord(migrationId))?.status ?? 'NOT_RUN',
      })),
    );
    const incomplete = statuses.filter(
      ({ status }) => status !== 'SUCCEEDED' && status !== 'SUCCEEDED_WITH_WARNINGS',
    );
    if (incomplete.length > 0) throw new CustomProviderReadableIdPrerequisiteError(incomplete);
  }
}
