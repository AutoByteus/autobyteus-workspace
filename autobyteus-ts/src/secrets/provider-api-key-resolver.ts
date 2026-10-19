import { MissingApiKeyError } from './provider-api-key-error.js';
import type { SecretValue } from './secret-value.js';

export type ProviderApiKeySlot =
  | 'apiKey'
  | 'geminiAiStudioApiKey'
  | 'geminiVertexExpressApiKey';

/** Storage-neutral point-of-use capability injected into provider clients. */
export interface ProviderApiKeyResolver {
  resolve(providerId: string, slot?: ProviderApiKeySlot): Promise<SecretValue>;
}

/*
 * The process default for clients built without a resolver. It is empty unless
 * a live test setup installs one (the test vault); production callers always
 * pass their resolver explicitly.
 */
let defaultProviderApiKeyResolver: ProviderApiKeyResolver | null = null;

/** Installs (or with `null`, clears) the process default resolver. */
export const setDefaultProviderApiKeyResolver = (resolver: ProviderApiKeyResolver | null): void => {
  defaultProviderApiKeyResolver = resolver;
};

const processDefaultProviderApiKeyResolver: ProviderApiKeyResolver = Object.freeze({
  async resolve(providerId: string, slot?: ProviderApiKeySlot): Promise<SecretValue> {
    if (!defaultProviderApiKeyResolver) throw new MissingApiKeyError(providerId);
    return defaultProviderApiKeyResolver.resolve(providerId, slot);
  },
});

/**
 * The resolver a client uses: the one it was given, else the process default,
 * looked up at the moment a key is needed. With neither, resolution fails with
 * `MissingApiKeyError` for the provider.
 */
export const resolveProviderApiKeyResolver = (
  explicit?: ProviderApiKeyResolver,
): ProviderApiKeyResolver => explicit ?? processDefaultProviderApiKeyResolver;
