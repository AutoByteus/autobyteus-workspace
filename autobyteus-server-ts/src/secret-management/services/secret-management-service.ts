import { randomUUID } from 'node:crypto';
import type { SecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import { defaultSecretCatalog, type SecretCatalog } from '../catalog/secret-catalog.js';
import type { SecretConsumerIdentity } from '../domain/secret-binding.js';
import type {
  ManagedSecretStatusResult,
  SecretBackendHealth,
  SecretLifecycleCapability,
} from '../domain/secret-storage-types.js';
import { SecretStorageError } from '../domain/secret-storage-types.js';
import {
  isWritableSecretStorageBackend,
  type SecretStorageBackend,
} from '../backends/secret-storage-backend.js';

export type SecretOperationEvent = {
  operation: 'SAVE' | 'REMOVE' | 'STATUS' | 'RESOLVE';
  outcome: 'SUCCEEDED' | 'FAILED';
  correlationId: string;
};

export type SecretOperationEventSink = (event: SecretOperationEvent) => void;

export class SecretManagementService {
  constructor(
    private readonly backend: SecretStorageBackend,
    private readonly catalog: SecretCatalog = defaultSecretCatalog,
    private readonly eventSink: SecretOperationEventSink = () => undefined,
  ) {}

  getLifecycleCapability(): SecretLifecycleCapability {
    return this.backend.lifecycle;
  }

  async getBackendHealth(): Promise<SecretBackendHealth> {
    return this.backend.health();
  }

  async saveForConsumer(request: {
    consumer: SecretConsumerIdentity;
    value: SecretValue;
  }): Promise<ManagedSecretStatusResult> {
    const definitionId = this.resolveDefinition(request.consumer);
    const backend = this.requireWritable();
    await this.withEvent('SAVE', () => backend.save(definitionId, request.value));
    return this.getStatusForDefinition(definitionId);
  }

  async removeForConsumer(consumer: SecretConsumerIdentity): Promise<ManagedSecretStatusResult> {
    const definitionId = this.resolveDefinition(consumer);
    const backend = this.requireWritable();
    await this.withEvent('REMOVE', () => backend.remove(definitionId));
    return this.getStatusForDefinition(definitionId);
  }

  async getStatusForConsumer(consumer: SecretConsumerIdentity): Promise<ManagedSecretStatusResult> {
    return this.getStatusForDefinition(this.resolveDefinition(consumer));
  }

  async resolveForUse(consumer: SecretConsumerIdentity): Promise<SecretValue> {
    const definitionId = this.resolveDefinition(consumer);
    return this.withEvent('RESOLVE', () => this.backend.resolve(definitionId));
  }

  private async getStatusForDefinition(definitionId: ReturnType<SecretCatalog['resolve']>): Promise<ManagedSecretStatusResult> {
    const health = await this.backend.health();
    if (health.state !== 'READY') return { health, secret: null };
    const status = await this.withEvent('STATUS', () => this.backend.getStatus(definitionId));
    return {
      health,
      secret: {
        storageState: status.storageState,
        lifecycle: this.backend.lifecycle,
      },
    };
  }

  private resolveDefinition(consumer: SecretConsumerIdentity) {
    try {
      return this.catalog.resolve(consumer);
    } catch (cause) {
      throw new SecretStorageError('ACCESS_DENIED', false, 'SECRET_CONSUMER_NOT_AUTHORIZED', { cause });
    }
  }

  private requireWritable(): Extract<SecretStorageBackend, { lifecycle: { kind: 'WRITABLE' } }> {
    if (!isWritableSecretStorageBackend(this.backend)) {
      throw new SecretStorageError('EXTERNALLY_MANAGED', false, 'SECRET_EXTERNALLY_MANAGED');
    }
    return this.backend;
  }

  private async withEvent<T>(operation: SecretOperationEvent['operation'], action: () => Promise<T>): Promise<T> {
    const correlationId = randomUUID();
    try {
      const result = await action();
      this.eventSink({ operation, outcome: 'SUCCEEDED', correlationId });
      return result;
    } catch (error) {
      this.eventSink({ operation, outcome: 'FAILED', correlationId });
      throw error;
    }
  }
}
