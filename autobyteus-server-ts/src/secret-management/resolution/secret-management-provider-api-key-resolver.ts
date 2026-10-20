import type {
  ProviderApiKeyResolver,
  ProviderApiKeySlot,
  SecretValue,
} from 'autobyteus-ts';
import { MissingApiKeyError as MissingApiKeyErrorClass } from 'autobyteus-ts';
import type { SecretConsumerIdentity } from '../domain/secret-id.js';
import { SecretVaultError } from 'autobyteus-ts/secrets/vault/secret-vault-types.js';
import type { SecretManagementService } from '../services/secret-management-service.js';

export type ProviderApiKeyResolverSubject =
  | { kind: 'llm' }
  | { kind: 'llmMetadata' }
  | { kind: 'media'; mediaKind: 'audio' | 'image' | 'video' };

/**
 * The autobyteus-ts `ProviderApiKeyResolver` over a `SecretManagementService`.
 * It knows nothing about which vault the service reads: the server binds it to
 * its runtime (`runtime-provider-api-key-resolvers.ts`), test setups to the test vault.
 */
export class SecretManagementProviderApiKeyResolver implements ProviderApiKeyResolver {
  constructor(
    private readonly subject: ProviderApiKeyResolverSubject,
    private readonly managementProvider: () => SecretManagementService,
  ) {}

  async resolve(providerId: string, slot: ProviderApiKeySlot = 'apiKey'): Promise<SecretValue> {
    try {
      const secret = await this.managementProvider().resolveForUse(this.consumer(providerId, slot));
      if (!secret.revealToTrustedConsumer().trim()) {
        throw new MissingApiKeyErrorClass(providerId);
      }
      return secret;
    } catch (error) {
      if (error instanceof SecretVaultError && error.code === 'NOT_FOUND') {
        throw new MissingApiKeyErrorClass(providerId);
      }
      throw error;
    }
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
