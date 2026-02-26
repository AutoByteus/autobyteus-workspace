import { BaseLLM } from './base.js';
import { LLMModel, ModelInfo } from './models.js';
import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { LLMConfig, TokenPricingConfig } from './utils/llm-config.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../utils/parameter-schema.js';

import { OpenAILLM } from './api/openai-llm.js';
import { AnthropicLLM } from './api/anthropic-llm.js';
import { MistralLLM } from './api/mistral-llm.js';
import { GrokLLM } from './api/grok-llm.js';
import { DeepSeekLLM } from './api/deepseek-llm.js';
import { GeminiLLM } from './api/gemini-llm.js';
import { KimiLLM } from './api/kimi-llm.js';
import { QwenLLM } from './api/qwen-llm.js';
import { ZhipuLLM } from './api/zhipu-llm.js';
import { MinimaxLLM } from './api/minimax-llm.js';

import { OllamaModelProvider } from './ollama-provider.js';
import { LMStudioModelProvider } from './lmstudio-provider.js';
import { AutobyteusModelProvider } from './autobyteus-provider.js';

const pricing = (input: number, output: number) =>
  new TokenPricingConfig({ inputTokenPricing: input, outputTokenPricing: output });

const openaiReasoningSchema = new ParameterSchema([
  new ParameterDefinition({
    name: 'reasoning_effort',
    type: ParameterType.ENUM,
    description: 'Controls how hard the model thinks. Higher effort improves quality but can increase latency and cost.',
    required: false,
    defaultValue: 'none',
    enumValues: ['none', 'low', 'medium', 'high', 'xhigh']
  }),
  new ParameterDefinition({
    name: 'reasoning_summary',
    type: ParameterType.ENUM,
    description: 'Include a reasoning summary in the response when supported.',
    required: false,
    defaultValue: 'none',
    enumValues: ['none', 'auto', 'concise', 'detailed']
  })
]);

const claudeSchema = new ParameterSchema([
  new ParameterDefinition({
    name: 'thinking_enabled',
    type: ParameterType.BOOLEAN,
    description: 'Enable extended thinking summaries in Claude responses',
    required: false,
    defaultValue: false
  }),
  new ParameterDefinition({
    name: 'thinking_budget_tokens',
    type: ParameterType.INTEGER,
    description: 'Token budget for extended thinking (min 1024)',
    required: false,
    defaultValue: 1024,
    minValue: 1024
  })
]);

const geminiSchema = new ParameterSchema([
  new ParameterDefinition({
    name: 'thinking_level',
    type: ParameterType.ENUM,
    description: 'How deeply the model should reason before responding',
    required: false,
    defaultValue: 'minimal',
    enumValues: ['minimal', 'low', 'medium', 'high']
  }),
  new ParameterDefinition({
    name: 'include_thoughts',
    type: ParameterType.BOOLEAN,
    description: 'Include model thought summaries in responses',
    required: false,
    defaultValue: false
  })
]);

const zhipuSchema = new ParameterSchema([
  new ParameterDefinition({
    name: 'thinking_type',
    type: ParameterType.ENUM,
    description: 'Enable or disable deep thinking',
    required: false,
    defaultValue: 'enabled',
    enumValues: ['enabled', 'disabled']
  })
]);

export class LLMFactory {
  private static modelsByProvider = new Map<LLMProvider, LLMModel[]>();
  private static modelsByIdentifier = new Map<string, LLMModel>();
  private static initialized = false;

  static async ensureInitialized(): Promise<void> {
    if (!LLMFactory.initialized) {
      await LLMFactory.initializeRegistry();
      LLMFactory.initialized = true;
    }
  }

  static async reinitialize(): Promise<void> {
    LLMFactory.initialized = false;
    LLMFactory.modelsByProvider.clear();
    LLMFactory.modelsByIdentifier.clear();
    await LLMFactory.ensureInitialized();
  }

  private static async initializeRegistry(): Promise<void> {
    const supportedModels: LLMModel[] = [
      new LLMModel({
        name: 'gpt-5.2',
        value: 'gpt-5.2',
        provider: LLMProvider.OPENAI,
        llmClass: OpenAILLM,
        canonicalName: 'gpt-5.2',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(1.75, 14.0) }),
        configSchema: openaiReasoningSchema
      }),
      new LLMModel({
        name: 'gpt-5.2-chat-latest',
        value: 'gpt-5.2-chat-latest',
        provider: LLMProvider.OPENAI,
        llmClass: OpenAILLM,
        canonicalName: 'gpt-5.2-chat-latest',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(1.75, 14.0) }),
        configSchema: openaiReasoningSchema
      }),
      new LLMModel({
        name: 'mistral-large',
        value: 'mistral-large-latest',
        provider: LLMProvider.MISTRAL,
        llmClass: MistralLLM,
        canonicalName: 'mistral-large',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(2.0, 6.0) })
      }),
      new LLMModel({
        name: 'devstral-2',
        value: 'devstral-2512',
        provider: LLMProvider.MISTRAL,
        llmClass: MistralLLM,
        canonicalName: 'devstral-2',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(0.4, 2.0) })
      }),
      new LLMModel({
        name: 'grok-4',
        value: 'grok-4',
        provider: LLMProvider.GROK,
        llmClass: GrokLLM,
        canonicalName: 'grok-4',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(3.0, 15.0) })
      }),
      new LLMModel({
        name: 'grok-4-1-fast-reasoning',
        value: 'grok-4-1-fast-reasoning',
        provider: LLMProvider.GROK,
        llmClass: GrokLLM,
        canonicalName: 'grok-4-1-fast-reasoning',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(0.2, 0.5) })
      }),
      new LLMModel({
        name: 'grok-4-1-fast-non-reasoning',
        value: 'grok-4-1-fast-non-reasoning',
        provider: LLMProvider.GROK,
        llmClass: GrokLLM,
        canonicalName: 'grok-4-1-fast-non-reasoning',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(0.2, 0.5) })
      }),
      new LLMModel({
        name: 'grok-code-fast-1',
        value: 'grok-code-fast-1',
        provider: LLMProvider.GROK,
        llmClass: GrokLLM,
        canonicalName: 'grok-code-fast-1',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(0.2, 1.5) })
      }),
      new LLMModel({
        name: 'claude-4.5-opus',
        value: 'claude-opus-4-5-20251101',
        provider: LLMProvider.ANTHROPIC,
        llmClass: AnthropicLLM,
        canonicalName: 'claude-4.5-opus',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(5.0, 25.0) }),
        configSchema: claudeSchema
      }),
      new LLMModel({
        name: 'claude-4.5-sonnet',
        value: 'claude-sonnet-4-5-20250929',
        provider: LLMProvider.ANTHROPIC,
        llmClass: AnthropicLLM,
        canonicalName: 'claude-4.5-sonnet',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(3.0, 15.0) }),
        configSchema: claudeSchema
      }),
      new LLMModel({
        name: 'claude-4.5-haiku',
        value: 'claude-haiku-4-5-20251001',
        provider: LLMProvider.ANTHROPIC,
        llmClass: AnthropicLLM,
        canonicalName: 'claude-4.5-haiku',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(1.0, 5.0) }),
        configSchema: claudeSchema
      }),
      new LLMModel({
        name: 'deepseek-chat',
        value: 'deepseek-chat',
        provider: LLMProvider.DEEPSEEK,
        llmClass: DeepSeekLLM,
        canonicalName: 'deepseek-chat',
        defaultConfig: new LLMConfig({
          rateLimit: 60,
          tokenLimit: 8000,
          pricingConfig: pricing(0.014, 0.28)
        })
      }),
      new LLMModel({
        name: 'deepseek-reasoner',
        value: 'deepseek-reasoner',
        provider: LLMProvider.DEEPSEEK,
        llmClass: DeepSeekLLM,
        canonicalName: 'deepseek-reasoner',
        defaultConfig: new LLMConfig({
          rateLimit: 60,
          tokenLimit: 8000,
          pricingConfig: pricing(0.14, 2.19)
        })
      }),
      new LLMModel({
        name: 'gemini-3-pro-preview',
        value: 'gemini-3-pro-preview',
        provider: LLMProvider.GEMINI,
        llmClass: GeminiLLM,
        canonicalName: 'gemini-3-pro',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(2.0, 12.0) }),
        configSchema: geminiSchema
      }),
      new LLMModel({
        name: 'gemini-3-flash-preview',
        value: 'gemini-3-flash-preview',
        provider: LLMProvider.GEMINI,
        llmClass: GeminiLLM,
        canonicalName: 'gemini-3-flash',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(0.5, 3.0) }),
        configSchema: geminiSchema
      }),
      new LLMModel({
        name: 'kimi-k2-0711-preview',
        value: 'kimi-k2-0711-preview',
        provider: LLMProvider.KIMI,
        llmClass: KimiLLM,
        canonicalName: 'kimi-k2-0711-preview',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(0.55, 2.21) })
      }),
      new LLMModel({
        name: 'kimi-k2-0905-preview',
        value: 'kimi-k2-0905-preview',
        provider: LLMProvider.KIMI,
        llmClass: KimiLLM,
        canonicalName: 'kimi-k2-0905-preview',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(0.55, 2.21) })
      }),
      new LLMModel({
        name: 'kimi-k2-turbo-preview',
        value: 'kimi-k2-turbo-preview',
        provider: LLMProvider.KIMI,
        llmClass: KimiLLM,
        canonicalName: 'kimi-k2-turbo-preview',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(2.76, 2.76) })
      }),
      new LLMModel({
        name: 'kimi-latest',
        value: 'kimi-latest',
        provider: LLMProvider.KIMI,
        llmClass: KimiLLM,
        canonicalName: 'kimi-latest',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(1.38, 4.14) })
      }),
      new LLMModel({
        name: 'kimi-thinking-preview',
        value: 'kimi-thinking-preview',
        provider: LLMProvider.KIMI,
        llmClass: KimiLLM,
        canonicalName: 'kimi-thinking-preview',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(27.59, 27.59) })
      }),
      new LLMModel({
        name: 'qwen3-max',
        value: 'qwen-max',
        provider: LLMProvider.QWEN,
        llmClass: QwenLLM,
        canonicalName: 'qwen3-max',
        defaultConfig: new LLMConfig({
          tokenLimit: 262144,
          pricingConfig: new TokenPricingConfig({ inputTokenPricing: 2.4, outputTokenPricing: 12.0 })
        })
      }),
      new LLMModel({
        name: 'glm-4.7',
        value: 'glm-4.7',
        provider: LLMProvider.ZHIPU,
        llmClass: ZhipuLLM,
        canonicalName: 'glm-4.7',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(13.8, 13.8) }),
        configSchema: zhipuSchema
      }),
      new LLMModel({
        name: 'minimax-m2.1',
        value: 'MiniMax-M2.1',
        provider: LLMProvider.MINIMAX,
        llmClass: MinimaxLLM,
        canonicalName: 'minimax-m2.1',
        defaultConfig: new LLMConfig({ pricingConfig: pricing(0.15, 0.45) })
      })
    ];

    for (const model of supportedModels) {
      LLMFactory.registerModel(model);
    }

    await OllamaModelProvider.discoverAndRegister();
    await LMStudioModelProvider.discoverAndRegister();
    await AutobyteusModelProvider.discoverAndRegister();
  }

  static registerModel(model: LLMModel): void {
    const identifier = model.modelIdentifier;
    const existing = LLMFactory.modelsByIdentifier.get(identifier);
    if (existing) {
      const providerModels = LLMFactory.modelsByProvider.get(existing.provider);
      if (providerModels) {
        const index = providerModels.indexOf(existing);
        if (index !== -1) {
          providerModels.splice(index, 1);
        }
      }
    }

    LLMFactory.modelsByIdentifier.set(identifier, model);
    const providerModels = LLMFactory.modelsByProvider.get(model.provider) ?? [];
    providerModels.push(model);
    LLMFactory.modelsByProvider.set(model.provider, providerModels);
  }

  static async createLLM(modelIdentifier: string, llmConfig?: LLMConfig): Promise<BaseLLM> {
    await LLMFactory.ensureInitialized();

    const model = LLMFactory.modelsByIdentifier.get(modelIdentifier);
    if (model) {
      const LLMClass = model.llmClass;
      if (!LLMClass) {
        throw new Error(`Model '${model.modelIdentifier}' does not have an LLM class registered yet.`);
      }
      const config = model.defaultConfig ? model.defaultConfig.clone() : new LLMConfig();
      if (llmConfig) {
        config.mergeWith(llmConfig);
      }
      return new LLMClass(model, config);
    }

    const foundByName = Array.from(LLMFactory.modelsByIdentifier.values()).filter(
      (entry) => entry.name === modelIdentifier
    );
    if (foundByName.length > 1) {
      const identifiers = foundByName.map((entry) => entry.modelIdentifier);
      throw new Error(
        `The model name '${modelIdentifier}' is ambiguous. Please use one of the unique model identifiers: ${identifiers}`
      );
    }

    throw new Error(`Model with identifier '${modelIdentifier}' not found.`);
  }

  static async listAvailableModels(): Promise<ModelInfo[]> {
    await LLMFactory.ensureInitialized();
    const models = Array.from(LLMFactory.modelsByIdentifier.values()).sort((a, b) =>
      a.modelIdentifier.localeCompare(b.modelIdentifier)
    );
    return models.map((model) => model.toModelInfo());
  }

  static async listModelsByProvider(provider: LLMProvider): Promise<ModelInfo[]> {
    await LLMFactory.ensureInitialized();
    const models = Array.from(LLMFactory.modelsByIdentifier.values())
      .filter((model) => model.provider === provider)
      .sort((a, b) => a.modelIdentifier.localeCompare(b.modelIdentifier));
    return models.map((model) => model.toModelInfo());
  }

  static async listModelsByRuntime(runtime: LLMRuntime): Promise<ModelInfo[]> {
    await LLMFactory.ensureInitialized();
    const models = Array.from(LLMFactory.modelsByIdentifier.values())
      .filter((model) => model.runtime === runtime)
      .sort((a, b) => a.modelIdentifier.localeCompare(b.modelIdentifier));
    return models.map((model) => model.toModelInfo());
  }

  static async getCanonicalName(modelIdentifier: string): Promise<string | null> {
    await LLMFactory.ensureInitialized();
    const model = LLMFactory.modelsByIdentifier.get(modelIdentifier);
    if (model) {
      return model.canonicalName;
    }

    console.warn(`Could not find model with identifier '${modelIdentifier}' to get its canonical name.`);
    return null;
  }

  static async getProvider(modelIdentifier: string): Promise<LLMProvider | null> {
    await LLMFactory.ensureInitialized();

    const model = LLMFactory.modelsByIdentifier.get(modelIdentifier);
    if (model) {
      return model.provider;
    }

    const foundByName = Array.from(LLMFactory.modelsByIdentifier.values()).filter(
      (entry) => entry.name === modelIdentifier
    );
    if (foundByName.length === 1) {
      return foundByName[0]?.provider ?? null;
    }
    if (foundByName.length > 1) {
      const identifiers = foundByName.map((entry) => entry.modelIdentifier);
      throw new Error(
        `The model name '${modelIdentifier}' is ambiguous. Please use one of the unique model identifiers: ${identifiers}`
      );
    }

    console.warn(`Could not find model with identifier '${modelIdentifier}' to get its provider.`);
    return null;
  }

  static async reloadModels(provider: LLMProvider): Promise<number> {
    await LLMFactory.ensureInitialized();

    const providerHandlers: Partial<Record<LLMProvider, { getModels: () => Promise<LLMModel[]> }>> = {
      [LLMProvider.LMSTUDIO]: LMStudioModelProvider,
      [LLMProvider.AUTOBYTEUS]: AutobyteusModelProvider,
      [LLMProvider.OLLAMA]: OllamaModelProvider
    };

    const handler = providerHandlers[provider];
    if (!handler) {
      const currentCount = LLMFactory.modelsByProvider.get(provider)?.length ?? 0;
      console.warn(`Reloading is not supported for provider: ${provider}`);
      return currentCount;
    }

    const currentProviderModels = LLMFactory.modelsByProvider.get(provider) ?? [];
    const idsToRemove = currentProviderModels.map((model) => model.modelIdentifier);

    console.log(`Clearing ${idsToRemove.length} models for provider ${provider} before discovery.`);

    for (const id of idsToRemove) {
      LLMFactory.modelsByIdentifier.delete(id);
    }
    LLMFactory.modelsByProvider.delete(provider);

    let newModels: LLMModel[] = [];
    try {
      newModels = await handler.getModels();
    } catch (error: any) {
      console.error(`Failed to fetch models for ${provider}. Registry for this provider is now empty.`, error?.message ?? error);
      return 0;
    }

    console.log(`Registering ${newModels.length} new models for provider ${provider}.`);
    for (const model of newModels) {
      LLMFactory.registerModel(model);
    }

    return newModels.length;
  }
}

export const defaultLlmFactory = LLMFactory;
