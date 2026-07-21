import type { SecretDefinitionId } from './secret-binding.js';

export type SecretDefinitionStorageState = 'MISSING' | 'CONFIGURED';

export type WritableSecretLifecycleCapability = { kind: 'WRITABLE' };
export type ExternallyManagedSecretLifecycleCapability = {
  kind: 'EXTERNALLY_MANAGED';
  instructionCode: string;
};
export type SecretLifecycleCapability =
  | WritableSecretLifecycleCapability
  | ExternallyManagedSecretLifecycleCapability;

export type SecretBackendHealth =
  | { state: 'READY' }
  | { state: 'LOCKED'; instructionCode: 'SECRET_BACKEND_LOCKED' }
  | {
      state: 'UNAVAILABLE';
      instructionCode: 'SECRET_BACKEND_UNAVAILABLE' | 'SECRET_BACKEND_KIND_NOT_INSTALLED';
    }
  | { state: 'CORRUPT'; instructionCode: 'SECRET_BACKEND_CORRUPT' }
  | { state: 'INCOMPATIBLE'; instructionCode: 'SECRET_BACKEND_INCOMPATIBLE' };

export type ManagedSecretStatus = {
  storageState: SecretDefinitionStorageState;
  lifecycle: SecretLifecycleCapability;
};

export type ManagedSecretStatusResult =
  | { health: { state: 'READY' }; secret: ManagedSecretStatus }
  | { health: Exclude<SecretBackendHealth, { state: 'READY' }>; secret: null };

export type BackendSecretStatus = { storageState: SecretDefinitionStorageState };

export type SecretStorageErrorCode =
  | 'NOT_FOUND'
  | 'ACCESS_DENIED'
  | 'EXTERNALLY_MANAGED'
  | 'BACKEND_UNAVAILABLE'
  | 'BACKEND_LOCKED'
  | 'INCOMPATIBLE_STORE_FORMAT'
  | 'INVALID_BACKEND_CONFIG'
  | 'CORRUPT_STORE'
  | 'CORRUPT_STORED_VALUE';

export class SecretStorageError extends Error {
  constructor(
    readonly code: SecretStorageErrorCode,
    readonly retryable: boolean,
    readonly messageCode: string,
    options?: { cause?: unknown },
  ) {
    super(messageCode, options);
    this.name = 'SecretStorageError';
  }

  toJSON(): { code: SecretStorageErrorCode; retryable: boolean; messageCode: string } {
    return { code: this.code, retryable: this.retryable, messageCode: this.messageCode };
  }
}

export const READY_SECRET_BACKEND_HEALTH: SecretBackendHealth = Object.freeze({
  state: 'READY',
});

export const backendHealthFromError = (error: unknown): SecretBackendHealth => {
  if (!(error instanceof SecretStorageError)) {
    return { state: 'UNAVAILABLE', instructionCode: 'SECRET_BACKEND_UNAVAILABLE' };
  }
  switch (error.code) {
    case 'BACKEND_LOCKED':
      return { state: 'LOCKED', instructionCode: 'SECRET_BACKEND_LOCKED' };
    case 'INCOMPATIBLE_STORE_FORMAT':
      return { state: 'INCOMPATIBLE', instructionCode: 'SECRET_BACKEND_INCOMPATIBLE' };
    case 'CORRUPT_STORE':
    case 'CORRUPT_STORED_VALUE':
      return { state: 'CORRUPT', instructionCode: 'SECRET_BACKEND_CORRUPT' };
    default:
      return { state: 'UNAVAILABLE', instructionCode: 'SECRET_BACKEND_UNAVAILABLE' };
  }
};
