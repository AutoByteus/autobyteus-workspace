import type {
  ProviderApiKeyResolver,
  ProviderApiKeySlot,
  ProviderApiKeyStatus,
} from '../../src/secrets/provider-api-key-resolver.js';
import { SecretValue } from '../../src/secrets/secret-value.js';

export const providerApiKeyResolver = (
  value = 'synthetic-test-key',
  status: ProviderApiKeyStatus = 'CONFIGURED',
): ProviderApiKeyResolver => ({
  async getStatus(): Promise<ProviderApiKeyStatus> {
    return status;
  },
  async resolve(): Promise<SecretValue> {
    if (status === 'MISSING') throw new Error('SYNTHETIC_API_KEY_MISSING');
    return SecretValue.fromString(value);
  },
});

export const missingProviderApiKeyResolver = (): ProviderApiKeyResolver =>
  providerApiKeyResolver('unused', 'MISSING');

export const geminiProviderApiKeyResolver = (input: {
  aiStudio?: string;
  vertexExpress?: string;
}): ProviderApiKeyResolver => ({
  async getStatus(_providerId: string, slot: ProviderApiKeySlot = 'apiKey') {
    if (slot === 'geminiAiStudioApiKey') {
      return input.aiStudio === undefined ? 'MISSING' : 'CONFIGURED';
    }
    if (slot === 'geminiVertexExpressApiKey') {
      return input.vertexExpress === undefined ? 'MISSING' : 'CONFIGURED';
    }
    return 'MISSING';
  },
  async resolve(_providerId: string, slot: ProviderApiKeySlot = 'apiKey') {
    const value = slot === 'geminiAiStudioApiKey'
      ? input.aiStudio
      : slot === 'geminiVertexExpressApiKey'
        ? input.vertexExpress
        : undefined;
    if (value === undefined) throw new Error('SYNTHETIC_API_KEY_MISSING');
    return SecretValue.fromString(value);
  },
});
