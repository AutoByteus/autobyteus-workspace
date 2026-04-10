import type { LLMModelOptions } from './models.js';
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
import { GlmLLM } from './api/glm-llm.js';
import { MinimaxLLM } from './api/minimax-llm.js';
import { LLMProvider } from './providers.js';

export type SupportedModelDefinition = Omit<
  LLMModelOptions,
  'maxContextTokens' | 'activeContextTokens' | 'maxInputTokens' | 'maxOutputTokens' | 'runtime' | 'hostUrl'
>;

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

const glmSchema = new ParameterSchema([
  new ParameterDefinition({
    name: 'thinking_type',
    type: ParameterType.ENUM,
    description: 'Enable or disable deep thinking',
    required: false,
    defaultValue: 'enabled',
    enumValues: ['enabled', 'disabled']
  })
]);

export const supportedModelDefinitions: SupportedModelDefinition[] = [
  {
    name: 'gpt-5.4',
    value: 'gpt-5.4',
    provider: LLMProvider.OPENAI,
    llmClass: OpenAILLM,
    canonicalName: 'gpt-5.4',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(2.5, 15.0) }),
    configSchema: openaiReasoningSchema
  },
  {
    name: 'gpt-5.4-mini',
    value: 'gpt-5.4-mini',
    provider: LLMProvider.OPENAI,
    llmClass: OpenAILLM,
    canonicalName: 'gpt-5.4-mini',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.75, 4.5) }),
    configSchema: openaiReasoningSchema
  },
  {
    name: 'mistral-large-3',
    value: 'mistral-large-2512',
    provider: LLMProvider.MISTRAL,
    llmClass: MistralLLM,
    canonicalName: 'mistral-large-3',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(2.0, 6.0) })
  },
  {
    name: 'devstral-2',
    value: 'devstral-2512',
    provider: LLMProvider.MISTRAL,
    llmClass: MistralLLM,
    canonicalName: 'devstral-2',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.4, 2.0) })
  },
  {
    name: 'grok-4-1-fast-reasoning',
    value: 'grok-4-1-fast-reasoning',
    provider: LLMProvider.GROK,
    llmClass: GrokLLM,
    canonicalName: 'grok-4-1-fast-reasoning',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.2, 0.5) })
  },
  {
    name: 'grok-code-fast-1',
    value: 'grok-code-fast-1',
    provider: LLMProvider.GROK,
    llmClass: GrokLLM,
    canonicalName: 'grok-code-fast-1',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.2, 1.5) })
  },
  {
    name: 'claude-opus-4.6',
    value: 'claude-opus-4-6',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    canonicalName: 'claude-opus-4.6',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(5.0, 25.0) }),
    configSchema: claudeSchema
  },
  {
    name: 'claude-sonnet-4.6',
    value: 'claude-sonnet-4-6',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    canonicalName: 'claude-sonnet-4.6',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(3.0, 15.0) }),
    configSchema: claudeSchema
  },
  {
    name: 'claude-haiku-4.5',
    value: 'claude-haiku-4-5',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    canonicalName: 'claude-haiku-4.5',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(1.0, 5.0) }),
    configSchema: claudeSchema
  },
  {
    name: 'deepseek-chat',
    value: 'deepseek-chat',
    provider: LLMProvider.DEEPSEEK,
    llmClass: DeepSeekLLM,
    canonicalName: 'deepseek-chat',
    defaultConfig: new LLMConfig({
      rateLimit: 60,
      pricingConfig: pricing(0.014, 0.28)
    })
  },
  {
    name: 'deepseek-reasoner',
    value: 'deepseek-reasoner',
    provider: LLMProvider.DEEPSEEK,
    llmClass: DeepSeekLLM,
    canonicalName: 'deepseek-reasoner',
    defaultConfig: new LLMConfig({
      rateLimit: 60,
      pricingConfig: pricing(0.14, 2.19)
    })
  },
  {
    name: 'gemini-3.1-pro-preview',
    value: 'gemini-3.1-pro-preview',
    provider: LLMProvider.GEMINI,
    llmClass: GeminiLLM,
    canonicalName: 'gemini-3.1-pro-preview',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(2.0, 12.0) }),
    configSchema: geminiSchema
  },
  {
    name: 'gemini-3-flash-preview',
    value: 'gemini-3-flash-preview',
    provider: LLMProvider.GEMINI,
    llmClass: GeminiLLM,
    canonicalName: 'gemini-3-flash-preview',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.5, 3.0) }),
    configSchema: geminiSchema
  },
  {
    name: 'kimi-k2.5',
    value: 'kimi-k2.5',
    provider: LLMProvider.KIMI,
    llmClass: KimiLLM,
    canonicalName: 'kimi-k2.5',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.6, 3.0) })
  },
  {
    name: 'kimi-k2-thinking',
    value: 'kimi-k2-thinking',
    provider: LLMProvider.KIMI,
    llmClass: KimiLLM,
    canonicalName: 'kimi-k2-thinking',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.6, 2.5) })
  },
  {
    name: 'qwen3-max',
    value: 'qwen3-max',
    provider: LLMProvider.QWEN,
    llmClass: QwenLLM,
    canonicalName: 'qwen3-max',
    defaultConfig: new LLMConfig({
      pricingConfig: new TokenPricingConfig({ inputTokenPricing: 2.4, outputTokenPricing: 12.0 })
    })
  },
  {
    name: 'glm-5.1',
    value: 'glm-5.1',
    provider: LLMProvider.GLM,
    llmClass: GlmLLM,
    canonicalName: 'glm-5.1',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(13.8, 13.8) }),
    configSchema: glmSchema
  },
  {
    name: 'minimax-m2.7',
    value: 'MiniMax-M2.7',
    provider: LLMProvider.MINIMAX,
    llmClass: MinimaxLLM,
    canonicalName: 'minimax-m2.7',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.15, 0.45) })
  }
];
