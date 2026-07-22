import type { SecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import type { SecretDefinitionId } from '../../domain/secret-binding.js';
import {
  backendHealthFromError,
  READY_SECRET_BACKEND_HEALTH,
  SecretStorageError,
  type BackendSecretStatus,
  type SecretBackendHealth,
} from '../../domain/secret-storage-types.js';
import type {
  ExternallyManagedSecretStorageBackend,
  SecretStorageBackend,
  WritableSecretStorageBackend,
} from '../secret-storage-backend.js';
import { LocalEncryptedSecretRepository } from './local-encrypted-secret-repository.js';
import type { LocalEncryptedSecretBatchEntry } from './local-encrypted-secret-repository.js';
import {
  LocalSecretStoreInitializer,
  type LocalStoreConfiguration,
} from './local-secret-store-initializer.js';

abstract class LocalSecretStorageBackendBase {
  protected repository: LocalEncryptedSecretRepository | null = null;
  protected currentHealth: SecretBackendHealth = READY_SECRET_BACKEND_HEALTH;
  protected closed = false;

  protected async initialize(
    configuration: LocalStoreConfiguration,
    options: { initializeIfAbsent?: boolean } = {},
  ): Promise<void> {
    try {
      const opened = await LocalSecretStoreInitializer.open(configuration, options);
      this.repository = new LocalEncryptedSecretRepository(
        opened.database,
        opened.rootKey,
        opened.configuration.accessMode,
        () => this.transitionToCorrupt(),
      );
      this.currentHealth = READY_SECRET_BACKEND_HEALTH;
    } catch (error) {
      this.currentHealth = backendHealthFromError(error);
      this.repository = null;
    }
  }

  async health(): Promise<SecretBackendHealth> {
    return this.closed
      ? { state: 'UNAVAILABLE', instructionCode: 'SECRET_BACKEND_UNAVAILABLE' }
      : this.currentHealth;
  }

  async getStatus(definitionId: SecretDefinitionId): Promise<BackendSecretStatus> {
    return this.run(() => this.requireRepository().getStatus(definitionId));
  }

  async resolve(definitionId: SecretDefinitionId): Promise<SecretValue> {
    return this.run(() => this.requireRepository().resolve(definitionId));
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.repository?.close();
    this.repository = null;
  }

  protected async run<T>(action: () => T): Promise<T> {
    if (this.currentHealth.state !== 'READY') throw this.errorForCurrentHealth();
    try {
      return action();
    } catch (error) {
      if (error instanceof SecretStorageError && error.code !== 'NOT_FOUND' && error.code !== 'EXTERNALLY_MANAGED') {
        this.currentHealth = backendHealthFromError(error);
      }
      throw error;
    }
  }

  protected requireRepository(): LocalEncryptedSecretRepository {
    if (this.closed || !this.repository) throw this.errorForCurrentHealth();
    return this.repository;
  }

  private transitionToCorrupt(): void {
    this.currentHealth = { state: 'CORRUPT', instructionCode: 'SECRET_BACKEND_CORRUPT' };
    this.repository?.close();
    this.repository = null;
  }

  private errorForCurrentHealth(): SecretStorageError {
    switch (this.currentHealth.state) {
      case 'LOCKED':
        return new SecretStorageError('BACKEND_LOCKED', true, 'SECRET_BACKEND_LOCKED');
      case 'CORRUPT':
        return new SecretStorageError('CORRUPT_STORE', false, 'SECRET_BACKEND_CORRUPT');
      case 'INCOMPATIBLE':
        return new SecretStorageError('INCOMPATIBLE_STORE_FORMAT', false, 'SECRET_BACKEND_INCOMPATIBLE');
      default:
        return new SecretStorageError('BACKEND_UNAVAILABLE', true, 'SECRET_BACKEND_UNAVAILABLE');
    }
  }
}

export class LocalWritableSecretStorageBackend
  extends LocalSecretStorageBackendBase
  implements WritableSecretStorageBackend {
  readonly lifecycle = { kind: 'WRITABLE' } as const;

  static async open(
    configuration: LocalStoreConfiguration,
    options: { initializeIfAbsent?: boolean } = {},
  ): Promise<LocalWritableSecretStorageBackend> {
    const backend = new LocalWritableSecretStorageBackend();
    await backend.initialize({ ...configuration, accessMode: 'READ_WRITE' }, options);
    return backend;
  }

  async save(definitionId: SecretDefinitionId, value: SecretValue): Promise<void> {
    await this.run(() => this.requireRepository().save(definitionId, value));
  }

  async remove(definitionId: SecretDefinitionId): Promise<void> {
    await this.run(() => this.requireRepository().remove(definitionId));
  }

  async checkpoint(): Promise<void> {
    await this.run(() => this.requireRepository().checkpoint());
  }

  async provisionBatchExact(entries: readonly LocalEncryptedSecretBatchEntry[]): Promise<{
    configuredCount: number;
    replacedCount: number;
  }> {
    return this.run(() => this.requireRepository().provisionBatchExact(entries));
  }
}

export class LocalReadOnlySecretStorageBackend
  extends LocalSecretStorageBackendBase
  implements ExternallyManagedSecretStorageBackend {
  readonly lifecycle = {
    kind: 'EXTERNALLY_MANAGED',
    instructionCode: 'SECRET_STORE_PROVISION_WITH_TRUSTED_SETUP',
  } as const;

  static async open(configuration: LocalStoreConfiguration): Promise<LocalReadOnlySecretStorageBackend> {
    const backend = new LocalReadOnlySecretStorageBackend();
    await backend.initialize({ ...configuration, accessMode: 'READ_ONLY' });
    return backend;
  }
}

export const openLocalSecretStorageBackend = async (
  configuration: LocalStoreConfiguration,
): Promise<SecretStorageBackend> => configuration.accessMode === 'READ_WRITE'
  ? LocalWritableSecretStorageBackend.open(configuration)
  : LocalReadOnlySecretStorageBackend.open(configuration);
