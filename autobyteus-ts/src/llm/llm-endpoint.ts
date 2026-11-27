import { LLMProvider } from './providers.js';

/**
 * Where a provider client sends its calls instead of the provider's own origin, for example a provider relay
 * (`http://127.0.0.1:<port>/relay/openai`). `baseUrl` replaces only the origin of the provider's address: the provider's
 * own path is kept after it, so one relay serves every client of that provider unchanged. Absent: the provider's own
 * address.
 */
export type LLMEndpoint = Readonly<{ baseUrl: string }>;

/** The provider's address with its origin replaced by the endpoint's base (unchanged without an endpoint). */
export const providerAddressThrough = (providerUrl: string, endpoint: LLMEndpoint | undefined): string => {
  if (!endpoint) return providerUrl;
  const providerPath = new URL(providerUrl).pathname.replace(/^\/+/, '');
  const base = endpoint.baseUrl.replace(/\/+$/, '');
  return providerPath ? `${base}/${providerPath}` : base;
};

/** The providers whose clients take an endpoint (Gemini: AI Studio only). Local and custom endpoints have their own address. */
export const LLM_ENDPOINT_PROVIDERS: ReadonlySet<LLMProvider> = new Set([
  LLMProvider.OPENAI, LLMProvider.ANTHROPIC, LLMProvider.MISTRAL, LLMProvider.GEMINI, LLMProvider.DEEPSEEK,
  LLMProvider.GROK, LLMProvider.KIMI, LLMProvider.QWEN, LLMProvider.GLM, LLMProvider.MINIMAX,
]);
