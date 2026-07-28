import type {
  ProviderApiKeyResolver,
  ProviderApiKeySlot,
} from '../../src/secrets/provider-api-key-resolver.js';
import { SecretValue } from '../../src/secrets/secret-value.js';
import type {
  GeminiRuntimeResolver,
  GeminiRuntimeSelection,
} from '../../src/utils/gemini-runtime.js';

export const providerApiKeyResolver = (
  value = 'synthetic-test-key',
  status: 'MISSING' | 'CONFIGURED' = 'CONFIGURED',
): ProviderApiKeyResolver => ({
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

export const geminiRuntimeResolver = (
  selection: GeminiRuntimeSelection = { kind: 'aiStudio' },
): GeminiRuntimeResolver => async () => selection;
