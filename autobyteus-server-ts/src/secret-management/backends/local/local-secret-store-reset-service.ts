import fsp from 'node:fs/promises';
import path from 'node:path';
import { SecretStorageError } from '../../domain/secret-storage-types.js';
import type { LocalStoreConfiguration } from './local-secret-store-initializer.js';
import type { SecretStorageBackend } from '../secret-storage-backend.js';

export type ExactLocalStoreResetConfirmation = {
  databasePath: string;
  keyPath: string;
};

export class LocalSecretStoreResetService {
  constructor(
    private readonly configuration: LocalStoreConfiguration,
    private readonly backend: SecretStorageBackend,
  ) {}

  async resetExact(confirmation: ExactLocalStoreResetConfirmation): Promise<void> {
    const databasePath = path.resolve(this.configuration.databasePath);
    const keyPath = path.resolve(this.configuration.keyPath);
    if (
      path.resolve(confirmation.databasePath) !== databasePath
      || path.resolve(confirmation.keyPath) !== keyPath
    ) {
      throw new SecretStorageError('ACCESS_DENIED', false, 'SECRET_STORE_RESET_CONFIRMATION_MISMATCH');
    }
    await this.backend.close();
    await Promise.all([
      fsp.rm(databasePath, { force: true }),
      fsp.rm(keyPath, { force: true }),
      fsp.rm(`${databasePath}-wal`, { force: true }),
      fsp.rm(`${databasePath}-shm`, { force: true }),
      fsp.rm(`${databasePath}-journal`, { force: true }),
    ]);
  }
}
