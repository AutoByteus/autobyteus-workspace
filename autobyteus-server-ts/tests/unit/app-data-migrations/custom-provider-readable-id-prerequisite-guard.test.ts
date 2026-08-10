import { describe, expect, it } from 'vitest';
import type { AppDataMigrationRecordSnapshot } from '../../../src/app-data-migrations/domain/app-data-migration-types.js';
import { AppDataMigrationRegistry } from '../../../src/app-data-migrations/app-data-migration-registry.js';
import { CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID } from '../../../src/app-data-migrations/migrations/custom-provider-readable-id-app-data-migration.js';
import {
  CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS,
  CustomProviderReadableIdPrerequisiteGuard,
} from '../../../src/app-data-migrations/migrations/custom-provider-readable-id-prerequisite-guard.js';

const record = (
  migrationId: string,
  status: AppDataMigrationRecordSnapshot['status'],
): AppDataMigrationRecordSnapshot => ({
  migrationId,
  displayName: migrationId,
  status,
  attempts: 1,
  startedAt: new Date(),
  completedAt: new Date(),
  summaryJson: null,
  errorMessage: null,
  logPath: null,
});

describe('CustomProviderReadableIdPrerequisiteGuard', () => {
  it('keeps every exact prerequisite before readable identity and readable identity final', () => {
    const requiredIds = new AppDataMigrationRegistry()
      .listDefinitions()
      .filter(({ requiredOnStartup }) => requiredOnStartup)
      .map(({ id }) => id);
    const readableIndex = requiredIds.indexOf(CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID);

    expect(readableIndex).toBe(requiredIds.length - 1);
    for (const prerequisiteId of CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS) {
      expect(requiredIds.indexOf(prerequisiteId)).toBeGreaterThanOrEqual(0);
      expect(requiredIds.indexOf(prerequisiteId)).toBeLessThan(readableIndex);
    }
  });

  it('accepts only exact terminal successes for all five IDs', async () => {
    const statuses = new Map(CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS.map(
      (id, index) => [id, record(id, index === 0 ? 'SUCCEEDED_WITH_WARNINGS' : 'SUCCEEDED')],
    ));
    const guard = new CustomProviderReadableIdPrerequisiteGuard({
      getRecord: async (id) => statuses.get(id as typeof CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS[number]) ?? null,
    });
    await expect(guard.requireTerminalSuccess()).resolves.toBeUndefined();
  });

  it('returns only allowlisted ID/status pairs when incomplete', async () => {
    const guard = new CustomProviderReadableIdPrerequisiteGuard({
      getRecord: async (id) => id === CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS[0]
        ? record(id, 'FAILED')
        : null,
    });
    await expect(guard.requireTerminalSuccess()).rejects.toMatchObject({
      message: 'CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_INCOMPLETE',
      incomplete: expect.arrayContaining([
        { migrationId: CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS[0], status: 'FAILED' },
        { migrationId: CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS[1], status: 'NOT_RUN' },
      ]),
    });
  });
});
