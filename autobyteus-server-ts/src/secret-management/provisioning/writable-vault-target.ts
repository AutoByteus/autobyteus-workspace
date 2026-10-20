import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializePrisma, shutdownPrisma } from 'repository_prisma';
import type { ApplicationDatabaseLocation } from '../../config/application-database-location.js';
import { runMigrations } from '../../startup/migrations.js';
import { SecretVaultRuntime } from '../secret-vault-runtime.js';

/** An application vault opened for writing at an explicit database location. */
export type WritableVaultTarget = Readonly<{
  runtime: SecretVaultRuntime;
  close(): Promise<void>;
}>;

const serverAppRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);

/**
 * Migrates the database at `targetLocation`, binds Prisma to it and opens its
 * vault as the application source. `close` releases both. Used by the
 * provisioning commands (`secrets:import`, `test-vault setup`), which run as
 * their own processes.
 */
export const openWritableVaultTarget = async (
  targetLocation: ApplicationDatabaseLocation,
): Promise<WritableVaultTarget> => {
  runMigrations({
    appRoot: serverAppRoot,
    databaseUrl: targetLocation.databaseUrl,
  });
  try {
    await initializePrisma({
      datasourceUrl: targetLocation.databaseUrl,
    });
  } catch (error) {
    try {
      await shutdownPrisma();
    } finally {
      throw error;
    }
  }
  const runtime = new SecretVaultRuntime();
  try {
    await runtime.initialize({ kind: 'application', location: targetLocation });
    return {
      runtime,
      close: async () => {
        try {
          await runtime.close();
        } finally {
          await shutdownPrisma();
        }
      },
    };
  } catch (error) {
    try {
      await runtime.close();
    } finally {
      await shutdownPrisma();
    }
    throw error;
  }
};
