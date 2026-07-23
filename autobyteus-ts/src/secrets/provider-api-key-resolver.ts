import type { SecretValue } from './secret-value.js';

export type ProviderApiKeySlot =
  | 'apiKey'
  | 'geminiAiStudioApiKey'
  | 'geminiVertexExpressApiKey';

export type ProviderApiKeyStatus = 'MISSING' | 'CONFIGURED';

/**
 * Storage-neutral capability injected into provider clients.
 *
 * Implementations bind the provider/slot pair to an authorized subject. The
 * port intentionally exposes neither definitions nor backend/Store details.
 */
export interface ProviderApiKeyResolver {
  getStatus(providerId: string, slot?: ProviderApiKeySlot): Promise<ProviderApiKeyStatus>;
  resolve(providerId: string, slot?: ProviderApiKeySlot): Promise<SecretValue>;
}
