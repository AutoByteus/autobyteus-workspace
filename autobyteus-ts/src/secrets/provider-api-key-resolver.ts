import type { SecretValue } from './secret-value.js';

export type ProviderApiKeySlot =
  | 'apiKey'
  | 'geminiAiStudioApiKey'
  | 'geminiVertexExpressApiKey';

/** Storage-neutral point-of-use capability injected into provider clients. */
export interface ProviderApiKeyResolver {
  resolve(providerId: string, slot?: ProviderApiKeySlot): Promise<SecretValue>;
}
