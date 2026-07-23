import type { SupportedModelDefinition } from './supported-model-definition.js';
export type { SupportedModelDefinition } from './supported-model-definition.js';
import { LLMConfig, TokenPricingConfig, type TokenPricingConfigInput } from './utils/llm-config.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../utils/parameter-schema.js';

import { OpenAILLM } from './api/openai-llm.js';
import { AnthropicLLM } from './api/anthropic-llm.js';
import { MistralLLM } from './api/mistral-llm.js';
import { GrokLLM } from './api/grok-llm.js';
import { DeepSeekLLM } from './api/deepseek-llm.js';
import { GeminiLLM } from './api/gemini-llm.js';
import { KimiLLM } from './api/kimi-llm.js';
import { createKimiK27CodeDefaultConfig } from './api/kimi-k2-7-code-policy.js';
import { QwenLLM } from './api/qwen-llm.js';
import { GlmLLM } from './api/glm-llm.js';
import { MinimaxLLM } from './api/minimax-llm.js';
import { LLMProvider } from './providers.js';

const pricing = (input: number, output: number, options: Omit<TokenPricingConfigInput, 'inputTokenPricing' | 'outputTokenPricing'> = {}) =>
  new TokenPricingConfig({
    currency: 'USD',
    pricingSource: 'autobyteus_model_catalog',
    pricingEffectiveDate: '2026-06-25',
    ...options,
    inputTokenPricing: input,
    outputTokenPricing: output,
  });

const createOpenAIReasoningSchema = (efforts: string[], defaultEffort: string) => new ParameterSchema([
  new ParameterDefinition({
    name: 'reasoning_effort',
    type: ParameterType.ENUM,
    description: 'Controls how hard the model thinks. Higher effort improves quality but can increase latency and cost.',
    required: false,
    defaultValue: defaultEffort,
    enumValues: efforts
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

const openaiReasoningSchema = createOpenAIReasoningSchema(
  ['none', 'low', 'medium', 'high', 'xhigh'],
  'none',
);
const openaiGpt56ReasoningSchema = createOpenAIReasoningSchema(
  ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
  'medium',
);

const createOpenAIGpt56Pricing = (input: number, output: number): TokenPricingConfig => {
  const cacheRead = input * 0.1;
  const cacheWrite = input * 1.25;
  return pricing(input, output, {
    pricingEffectiveDate: '2026-06-26',
    cachedInputReadTokenPricing: cacheRead,
    cachedInputWriteTokenPricing: cacheWrite,
    inputTokenPricingTiers: [
      {
        tierId: 'standard_le_272k',
        maxInputTokens: 272_000,
        inputTokenPricing: input,
        outputTokenPricing: output,
        cachedInputReadTokenPricing: cacheRead,
        cachedInputWriteTokenPricing: cacheWrite,
      },
      {
        tierId: 'long_context_gt_272k',
        maxInputTokens: null,
        inputTokenPricing: input * 2,
        outputTokenPricing: output * 1.5,
        cachedInputReadTokenPricing: cacheRead * 2,
        cachedInputWriteTokenPricing: cacheWrite * 2,
      },
    ],
  });
};

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

const claudeAdaptiveThinkingSchema = new ParameterSchema([
  new ParameterDefinition({
    name: 'thinking_enabled',
    type: ParameterType.BOOLEAN,
    description: 'Request Anthropic adaptive thinking for current Claude models. No fixed budget is sent.',
    required: false,
    defaultValue: false
  }),
  new ParameterDefinition({
    name: 'thinking_display',
    type: ParameterType.ENUM,
    description: 'Controls whether adaptive thinking content is omitted or summarized when an explicit adaptive thinking request is sent.',
    required: false,
    defaultValue: 'omitted',
    enumValues: ['omitted', 'summarized']
  })
]);

const deepseekV4Schema = new ParameterSchema([
  new ParameterDefinition({
    name: 'reasoning_effort',
    type: ParameterType.ENUM,
    description: 'Controls DeepSeek V4 thinking effort when thinking mode is enabled.',
    required: false,
    defaultValue: 'high',
    enumValues: ['high', 'max']
  }),
  new ParameterDefinition({
    name: 'thinking_type',
    type: ParameterType.ENUM,
    description: 'Enable or disable DeepSeek V4 thinking mode.',
    required: false,
    defaultValue: 'enabled',
    enumValues: ['enabled', 'disabled']
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
    name: 'reasoning_effort',
    type: ParameterType.ENUM,
    description: 'Controls GLM-5.2 thinking effort when thinking mode is enabled.',
    required: false,
    defaultValue: 'max',
    enumValues: ['high', 'max']
  }),
  new ParameterDefinition({
    name: 'thinking_type',
    type: ParameterType.ENUM,
    description: 'Enable or disable GLM-5.2 thinking mode.',
    required: false,
    defaultValue: 'enabled',
    enumValues: ['enabled', 'disabled']
  })
]);

const grokReasoningSchema = new ParameterSchema([
  new ParameterDefinition({
    name: 'reasoning_effort',
    type: ParameterType.ENUM,
    description: 'Controls Grok 4.5 reasoning effort. Reasoning is always enabled.',
    required: false,
    defaultValue: 'high',
    enumValues: ['low', 'medium', 'high']
  })
]);


export const supportedModelDefinitions: SupportedModelDefinition[] = [
  ...([
    ['gpt-5.6-sol', 5.0, 30.0],
    ['gpt-5.6-terra', 2.5, 15.0],
    ['gpt-5.6-luna', 1.0, 6.0],
  ] as const).map(([modelId, inputPrice, outputPrice]) => ({
    name: modelId,
    value: modelId,
    provider: LLMProvider.OPENAI,
    llmClass: OpenAILLM,
    canonicalName: modelId,
    defaultConfig: new LLMConfig({ pricingConfig: createOpenAIGpt56Pricing(inputPrice, outputPrice) }),
    configSchema: openaiGpt56ReasoningSchema,
  })),
  {
    name: 'gpt-5.5',
    value: 'gpt-5.5',
    provider: LLMProvider.OPENAI,
    llmClass: OpenAILLM,
    canonicalName: 'gpt-5.5',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(5.0, 30.0, { cachedInputReadTokenPricing: 0.5 }) }),
    configSchema: openaiReasoningSchema
  },
  {
    name: 'gpt-5.4',
    value: 'gpt-5.4',
    provider: LLMProvider.OPENAI,
    llmClass: OpenAILLM,
    canonicalName: 'gpt-5.4',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(2.5, 15.0, { cachedInputReadTokenPricing: 0.25 }) }),
    configSchema: openaiReasoningSchema
  },
  {
    name: 'gpt-5.4-mini',
    value: 'gpt-5.4-mini',
    provider: LLMProvider.OPENAI,
    llmClass: OpenAILLM,
    canonicalName: 'gpt-5.4-mini',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.75, 4.5, { cachedInputReadTokenPricing: 0.075 }) }),
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
    name: 'grok-4.5',
    value: 'grok-4.5',
    provider: LLMProvider.GROK,
    llmClass: GrokLLM,
    canonicalName: 'grok-4.5',
    defaultConfig: new LLMConfig({
      extraParams: { reasoning_effort: 'high' },
      pricingConfig: pricing(2.0, 6.0, {
        pricingEffectiveDate: '2026-07-08',
        cachedInputReadTokenPricing: 0.5,
      }),
    }),
    configSchema: grokReasoningSchema,
  },
  {
    name: 'claude-fable-5',
    value: 'claude-fable-5',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    canonicalName: 'claude-fable-5',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(10.0, 50.0, {
      pricingEffectiveDate: '2026-07-07',
      cachedInputReadTokenPricing: 1.0,
      cachedInputWrite5mTokenPricing: 12.5,
      cachedInputWrite1hTokenPricing: 20.0,
    }) }),
    configSchema: claudeAdaptiveThinkingSchema
  },
  {
    name: 'claude-opus-4.8',
    value: 'claude-opus-4-8',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    canonicalName: 'claude-opus-4.8',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(5.0, 25.0, {
      pricingEffectiveDate: '2026-07-07',
      cachedInputReadTokenPricing: 0.5,
      cachedInputWrite5mTokenPricing: 6.25,
      cachedInputWrite1hTokenPricing: 10.0,
    }) }),
    configSchema: claudeAdaptiveThinkingSchema
  },
  {
    name: 'claude-opus-4.7',
    value: 'claude-opus-4-7',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    canonicalName: 'claude-opus-4.7',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(5.0, 25.0, {
      cachedInputReadTokenPricing: 0.5,
      cachedInputWrite5mTokenPricing: 6.25,
      cachedInputWrite1hTokenPricing: 10.0,
    }) }),
    configSchema: claudeAdaptiveThinkingSchema
  },
  {
    name: 'claude-sonnet-5',
    value: 'claude-sonnet-5',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    canonicalName: 'claude-sonnet-5',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(3.0, 15.0, {
      pricingEffectiveDate: '2026-07-07',
      cachedInputReadTokenPricing: 0.3,
      cachedInputWrite5mTokenPricing: 3.75,
      cachedInputWrite1hTokenPricing: 6.0,
    }) }),
    configSchema: claudeAdaptiveThinkingSchema
  },
  {
    name: 'claude-sonnet-4.6',
    value: 'claude-sonnet-4-6',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    canonicalName: 'claude-sonnet-4.6',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(3.0, 15.0, {
      cachedInputReadTokenPricing: 0.3,
      cachedInputWrite5mTokenPricing: 3.75,
      cachedInputWrite1hTokenPricing: 6.0,
    }) }),
    configSchema: claudeSchema
  },
  {
    name: 'deepseek-v4-flash',
    value: 'deepseek-v4-flash',
    provider: LLMProvider.DEEPSEEK,
    llmClass: DeepSeekLLM,
    canonicalName: 'deepseek-v4-flash',
    defaultConfig: new LLMConfig({
      rateLimit: 60,
      pricingConfig: pricing(0.14, 0.28, { cachedInputReadTokenPricing: 0.0028 })
    }),
    configSchema: deepseekV4Schema
  },
  {
    name: 'deepseek-v4-pro',
    value: 'deepseek-v4-pro',
    provider: LLMProvider.DEEPSEEK,
    llmClass: DeepSeekLLM,
    canonicalName: 'deepseek-v4-pro',
    defaultConfig: new LLMConfig({
      rateLimit: 60,
      pricingConfig: pricing(0.435, 0.87, { cachedInputReadTokenPricing: 0.003625 })
    }),
    configSchema: deepseekV4Schema
  },
  {
    name: 'gemini-3.1-pro-preview',
    value: 'gemini-3.1-pro-preview',
    provider: LLMProvider.GEMINI,
    llmClass: GeminiLLM,
    canonicalName: 'gemini-3.1-pro-preview',
    defaultConfig: new LLMConfig({
      pricingConfig: pricing(2.25, 18.0, {
        cachedInputReadTokenPricing: 0.225,
        inputTokenPricingTiers: [
          {
            tierId: 'prompt_le_200k',
            maxInputTokens: 200_000,
            inputTokenPricing: 2.25,
            outputTokenPricing: 18.0,
            cachedInputReadTokenPricing: 0.225,
          },
          {
            tierId: 'prompt_gt_200k',
            maxInputTokens: null,
            inputTokenPricing: 4.5,
            outputTokenPricing: 27.0,
            cachedInputReadTokenPricing: 0.45,
          },
        ],
      })
    }),
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
    name: 'gemini-3.5-flash',
    value: 'gemini-3.5-flash',
    provider: LLMProvider.GEMINI,
    llmClass: GeminiLLM,
    canonicalName: 'gemini-3.5-flash',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(1.5, 9.0, { cachedInputReadTokenPricing: 0.15 }) }),
    configSchema: geminiSchema
  },
  {
    name: 'kimi-k2.6',
    value: 'kimi-k2.6',
    provider: LLMProvider.KIMI,
    llmClass: KimiLLM,
    canonicalName: 'kimi-k2.6',
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.95, 4.0, { cachedInputReadTokenPricing: 0.16 }) })
  },
  {
    name: 'kimi-k2.7-code',
    value: 'kimi-k2.7-code',
    provider: LLMProvider.KIMI,
    llmClass: KimiLLM,
    canonicalName: 'kimi-k2.7-code',
    defaultConfig: createKimiK27CodeDefaultConfig(
      pricing(0.95, 4.0, { cachedInputReadTokenPricing: 0.19 }),
    )
  },
  {
    name: 'kimi-k2.7-code-highspeed',
    value: 'kimi-k2.7-code-highspeed',
    provider: LLMProvider.KIMI,
    llmClass: KimiLLM,
    canonicalName: 'kimi-k2.7-code-highspeed',
    defaultConfig: createKimiK27CodeDefaultConfig(
      pricing(1.90, 8.0, { cachedInputReadTokenPricing: 0.38 }),
    )
  },
  {
    name: 'qwen3.7-max',
    value: 'qwen3.7-max',
    provider: LLMProvider.QWEN,
    llmClass: QwenLLM,
    canonicalName: 'qwen3.7-max'
  },
  {
    name: 'qwen3-max',
    value: 'qwen3-max',
    provider: LLMProvider.QWEN,
    llmClass: QwenLLM,
    canonicalName: 'qwen3-max'
  },
  {
    name: 'glm-5.2',
    value: 'glm-5.2',
    provider: LLMProvider.GLM,
    llmClass: GlmLLM,
    canonicalName: 'glm-5.2',
    defaultConfig: new LLMConfig({
      pricingConfig: pricing(8.0, 28.0, {
        currency: 'CNY',
        cachedInputReadTokenPricing: 2.0,
        pricingSource: 'bigmodel_direct_pricing_2026_06_25',
      })
    }),
    configSchema: glmSchema
  },
  {
    name: 'minimax-m3',
    value: 'MiniMax-M3',
    provider: LLMProvider.MINIMAX,
    llmClass: MinimaxLLM,
    canonicalName: 'minimax-m3',
    defaultConfig: new LLMConfig({
      pricingConfig: pricing(0.3, 1.2, {
        cachedInputReadTokenPricing: 0.06,
        inputTokenPricingTiers: [
          {
            tierId: 'standard_le_512k',
            maxInputTokens: 512_000,
            inputTokenPricing: 0.3,
            outputTokenPricing: 1.2,
            cachedInputReadTokenPricing: 0.06,
          },
          {
            tierId: 'standard_gt_512k',
            maxInputTokens: null,
            inputTokenPricing: 0.6,
            outputTokenPricing: 2.4,
            cachedInputReadTokenPricing: 0.12,
          },
        ],
      })
    })
  }
];
