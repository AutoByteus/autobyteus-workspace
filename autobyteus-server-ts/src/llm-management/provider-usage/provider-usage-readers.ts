import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { createLlmProviderApiKeyResolver } from "../../secret-management/resolution/runtime-provider-api-key-resolvers.js";
import { createAnthropicProviderUsageReader } from "./anthropic-provider-usage.js";
import { createDeepSeekProviderUsageReader } from "./deepseek-provider-usage.js";
import { createKimiProviderUsageReader } from "./kimi-provider-usage.js";
import type { ProviderUsageAccess, ProviderUsageReader } from "./provider-usage-reader.js";
import { createXaiProviderUsageReader } from "./xai-provider-usage.js";

/** The built-in providers whose usage can be read; any other provider (and every custom one) is "not reported". */
export type ProviderUsageReaders = Readonly<{ readerFor(providerId: string): ProviderUsageReader | null }>;

/** The server's key resolver (the same vault AutoByteus agents read keys from) and the global `fetch`. */
const serverAccess = (): ProviderUsageAccess => {
  const resolver = createLlmProviderApiKeyResolver();
  return {
    resolveApiKey: async (providerId) => (await resolver.resolve(providerId)).revealToTrustedConsumer().trim(),
    fetch: (...args) => globalThis.fetch(...args),
  };
};

export const createProviderUsageReaders = (access: ProviderUsageAccess = serverAccess()): ProviderUsageReaders => {
  const readers = new Map<string, ProviderUsageReader>([
    [LLMProvider.DEEPSEEK, createDeepSeekProviderUsageReader(access)],
    [LLMProvider.KIMI, createKimiProviderUsageReader(access)],
    [LLMProvider.ANTHROPIC, createAnthropicProviderUsageReader(access)],
    [LLMProvider.GROK, createXaiProviderUsageReader(access)],
  ]);
  return Object.freeze({ readerFor: (providerId: string) => readers.get(providerId) ?? null });
};
