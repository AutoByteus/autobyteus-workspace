import type {
  ProviderApiKeyResolver,
  ProviderApiKeySlot,
  SecretValue,
} from 'autobyteus-ts';
import type { SecretConsumerIdentity } from '../domain/secret-id.js';
import type { SecretManagementService } from '../services/secret-management-service.js';
import { getSecretVaultRuntime } from '../secret-vault-runtime.js';

export type ProviderApiKeyResolverSubject =
  | { kind: 'llm' }
  | { kind: 'llmMetadata' }
  | { kind: 'media'; mediaKind: 'audio' | 'image' | 'video' };

export class SecretManagementProviderApiKeyResolver implements ProviderApiKeyResolver {
  constructor(
    private readonly subject: ProviderApiKeyResolverSubject,
    private readonly managementProvider: () => SecretManagementService = () =>
      getSecretVaultRuntime().requireService(),
  ) {}

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
