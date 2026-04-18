import { LLMProvider } from './providers.js';

export const LLM_PROVIDER_DISPLAY_NAMES: Record<LLMProvider, string> = {
  [LLMProvider.OPENAI]: 'OpenAI',
  [LLMProvider.OPENAI_COMPATIBLE]: 'OpenAI-Compatible',
  [LLMProvider.ANTHROPIC]: 'Anthropic',
  [LLMProvider.MISTRAL]: 'Mistral',
  [LLMProvider.GEMINI]: 'Gemini',
  [LLMProvider.OLLAMA]: 'Ollama',
  [LLMProvider.DEEPSEEK]: 'DeepSeek',
  [LLMProvider.GROK]: 'Grok',
  [LLMProvider.AUTOBYTEUS]: 'AutoByteus',
  [LLMProvider.KIMI]: 'Kimi',
  [LLMProvider.QWEN]: 'Qwen',
  [LLMProvider.LMSTUDIO]: 'LM Studio',
  [LLMProvider.GLM]: 'GLM',
  [LLMProvider.MINIMAX]: 'MiniMax',
};

export const getLlmProviderDisplayName = (provider: LLMProvider): string =>
  LLM_PROVIDER_DISPLAY_NAMES[provider] ?? provider;

export const BUILT_IN_LLM_PROVIDER_IDS: LLMProvider[] = Object.values(LLMProvider).filter(
  (provider) => provider !== LLMProvider.OPENAI_COMPATIBLE,
);

export const isBuiltInLlmProviderId = (providerId: string): providerId is LLMProvider =>
  BUILT_IN_LLM_PROVIDER_IDS.includes(providerId as LLMProvider);
