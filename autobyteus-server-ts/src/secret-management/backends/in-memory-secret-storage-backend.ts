import type { SecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import type { SecretDefinitionId } from '../domain/secret-binding.js';
import {
  READY_SECRET_BACKEND_HEALTH,
  SecretStorageError,
  type SecretBackendHealth,
} from '../domain/secret-storage-types.js';
import type { WritableSecretStorageBackend } from './secret-storage-backend.js';

const errorForHealth = (health: SecretBackendHealth): SecretStorageError => {
  switch (health.state) {
    case 'LOCKED':
      return new SecretStorageError('BACKEND_LOCKED', true, 'SECRET_BACKEND_LOCKED');
    case 'CORRUPT':
      return new SecretStorageError('CORRUPT_STORE', false, 'SECRET_BACKEND_CORRUPT');
    case 'INCOMPATIBLE':
      return new SecretStorageError('INCOMPATIBLE_STORE_FORMAT', false, 'SECRET_BACKEND_INCOMPATIBLE');
    default:
      return new SecretStorageError('BACKEND_UNAVAILABLE', true, 'SECRET_BACKEND_UNAVAILABLE');
  }
};

export class InMemorySecretStorageBackend implements WritableSecretStorageBackend {
  readonly lifecycle = { kind: 'WRITABLE' } as const;
  readonly #records = new Map<SecretDefinitionId, SecretValue>();
  #health: SecretBackendHealth = READY_SECRET_BACKEND_HEALTH;
  #closed = false;

  setHealthForTests(health: SecretBackendHealth): void {
    this.#health = health;
  }

  async health(): Promise<SecretBackendHealth> {
    return this.#closed
      ? { state: 'UNAVAILABLE', instructionCode: 'SECRET_BACKEND_UNAVAILABLE' }
      : this.#health;
  }

  async getStatus(definitionId: SecretDefinitionId): Promise<{ storageState: 'MISSING' | 'CONFIGURED' }> {
    this.assertReady();
    return { storageState: this.#records.has(definitionId) ? 'CONFIGURED' : 'MISSING' };
  }

  async resolve(definitionId: SecretDefinitionId): Promise<SecretValue> {
    this.assertReady();
    const value = this.#records.get(definitionId);
    if (!value) throw new SecretStorageError('NOT_FOUND', false, 'SECRET_NOT_FOUND');
    return value;
  }

  async save(definitionId: SecretDefinitionId, value: SecretValue): Promise<void> {
    this.assertReady();
    this.#records.set(definitionId, value);
  }

  async remove(definitionId: SecretDefinitionId): Promise<void> {
    this.assertReady();
    this.#records.delete(definitionId);
  }

  async close(): Promise<void> {
    this.#records.clear();
    this.#closed = true;
  }

  private assertReady(): void {
    if (this.#closed) throw new SecretStorageError('BACKEND_UNAVAILABLE', false, 'SECRET_BACKEND_UNAVAILABLE');
    if (this.#health.state !== 'READY') throw errorForHealth(this.#health);
  }
}
