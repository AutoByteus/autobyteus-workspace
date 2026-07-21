import type { SecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import type { SecretDefinitionId } from '../domain/secret-binding.js';
import type {
  BackendSecretStatus,
  ExternallyManagedSecretLifecycleCapability,
  SecretBackendHealth,
  WritableSecretLifecycleCapability,
} from '../domain/secret-storage-types.js';

export interface SecretStorageBackendOperations {
  getStatus(definitionId: SecretDefinitionId): Promise<BackendSecretStatus>;
  resolve(definitionId: SecretDefinitionId): Promise<SecretValue>;
  health(): Promise<SecretBackendHealth>;
  close(): Promise<void>;
}

export interface WritableSecretStorageBackend extends SecretStorageBackendOperations {
  readonly lifecycle: WritableSecretLifecycleCapability;
  save(definitionId: SecretDefinitionId, value: SecretValue): Promise<void>;
  remove(definitionId: SecretDefinitionId): Promise<void>;
}

export interface ExternallyManagedSecretStorageBackend extends SecretStorageBackendOperations {
  readonly lifecycle: ExternallyManagedSecretLifecycleCapability;
}

export type SecretStorageBackend =
  | WritableSecretStorageBackend
  | ExternallyManagedSecretStorageBackend;

export const isWritableSecretStorageBackend = (
  backend: SecretStorageBackend,
): backend is WritableSecretStorageBackend => backend.lifecycle.kind === 'WRITABLE';
