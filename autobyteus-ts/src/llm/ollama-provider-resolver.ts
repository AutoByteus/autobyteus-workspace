import { LLMProvider } from './providers.js';

export class OllamaProviderResolver {
  static readonly KEYWORD_PROVIDER_MAP: Array<[string[], LLMProvider]> = [
    [['gpt'], LLMProvider.OPENAI],
    [['gemma', 'gemini'], LLMProvider.GEMINI],
    [['mistral'], LLMProvider.MISTRAL],
    [['deepseek'], LLMProvider.DEEPSEEK],
    [['qwen'], LLMProvider.QWEN],
    [['glm'], LLMProvider.ZHIPU]
  ];

  static resolve(modelName: string): LLMProvider {
    const lowerName = modelName.toLowerCase();

    for (const [keywords, provider] of OllamaProviderResolver.KEYWORD_PROVIDER_MAP) {
      for (const keyword of keywords) {
        if (lowerName.includes(keyword)) {
          return provider;
        }
      }
    }

    return LLMProvider.OLLAMA;
  }
}
