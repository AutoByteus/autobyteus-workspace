import type {
  ProviderApiKeyResolver,
  ProviderApiKeySlot,
  ProviderApiKeyStatus,
  SecretValue,
} from 'autobyteus-ts';
import type { SecretConsumerIdentity } from '../domain/secret-binding.js';
import type { SecretManagementService } from '../services/secret-management-service.js';
import { getSecretStorageConfigurationService } from '../configuration/secret-storage-configuration-service.js';
import { SecretStorageError } from '../domain/secret-storage-types.js';

export type ProviderApiKeyResolverSubject =
  | { kind: 'llm' }
  | { kind: 'llmMetadata' }
  | { kind: 'media'; mediaKind: 'audio' | 'image' | 'video' };

export class SecretManagementProviderApiKeyResolver implements ProviderApiKeyResolver {
  constructor(
    private readonly subject: ProviderApiKeyResolverSubject,
    private readonly managementProvider: () => SecretManagementService = () =>
      getSecretStorageConfigurationService().requireManagementService(),
  ) {}

  async getStatus(
    providerId: string,
    slot: ProviderApiKeySlot = 'apiKey',
  ): Promise<ProviderApiKeyStatus> {
    const result = await this.managementProvider().getStatusForConsumer(
      this.consumer(providerId, slot),
    );
    if (result.health.state !== 'READY') {
      const code = {
        LOCKED: 'BACKEND_LOCKED',
        UNAVAILABLE: 'BACKEND_UNAVAILABLE',
        CORRUPT: 'CORRUPT_STORE',
        INCOMPATIBLE: 'INCOMPATIBLE_STORE_FORMAT',
      }[result.health.state] as
        | 'BACKEND_LOCKED'
        | 'BACKEND_UNAVAILABLE'
        | 'CORRUPT_STORE'
        | 'INCOMPATIBLE_STORE_FORMAT';
      throw new SecretStorageError(
        code,
        result.health.state === 'UNAVAILABLE',
        result.health.instructionCode,
      );
    }
    const status = result.secret;
    if (!status) {
      throw new SecretStorageError(
        'BACKEND_UNAVAILABLE',
        false,
        'SECRET_BACKEND_STATUS_UNAVAILABLE',
      );
    }
    return status.storageState;
  }

  resolve(providerId: string, slot: ProviderApiKeySlot = 'apiKey'): Promise<SecretValue> {
    return this.managementProvider().resolveForUse(this.consumer(providerId, slot));
  }

  private consumer(providerId: string, credentialSlot: ProviderApiKeySlot): SecretConsumerIdentity {
    switch (this.subject.kind) {
      case 'llm':
        return { kind: 'llm', providerId, credentialSlot };
      case 'llmMetadata':
        return { kind: 'llmMetadata', providerId, credentialSlot };
      case 'media':
        return {
          kind: 'media',
          mediaKind: this.subject.mediaKind,
          providerId,
          credentialSlot,
        };
    }
  }
}

export const createLlmProviderApiKeyResolver = (): ProviderApiKeyResolver =>
  new SecretManagementProviderApiKeyResolver({ kind: 'llm' });

export const createMediaProviderApiKeyResolver = (
  mediaKind: 'audio' | 'image' | 'video',
): ProviderApiKeyResolver =>
  new SecretManagementProviderApiKeyResolver({ kind: 'media', mediaKind });

export const createLlmMetadataProviderApiKeyResolver = (): ProviderApiKeyResolver =>
  new SecretManagementProviderApiKeyResolver({ kind: 'llmMetadata' });
