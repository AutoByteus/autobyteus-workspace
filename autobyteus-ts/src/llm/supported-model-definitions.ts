import type { SupportedModelDefinition } from './supported-model-definition.js';
import { createStaticModelMetadata, DEEPSEEK_MEDIA_CAPABILITIES, GEMINI_MEDIA_CAPABILITIES } from './supported-model-static-metadata.js';
export type {
  SupportedModelDefinition,
  StaticModelMetadata,
  StaticModelMetadataProvenance,
} from './supported-model-definition.js';
import { LLMConfig, TokenPricingConfig } from './utils/llm-config.js';
import { createDeepSeekV4PricingScheduleHistory } from './utils/token-pricing-schedule.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../utils/parameter-schema.js';

import { OpenAILLM } from './api/openai-llm.js';
import { MistralLLM } from './api/mistral-llm.js';
import { GrokLLM } from './api/grok-llm.js';
import { DeepSeekLLM } from './api/deepseek-llm.js';
import { GeminiLLM } from './api/gemini-llm.js';
import { KimiLLM } from './api/kimi-llm.js';
import { GlmLLM } from './api/glm-llm.js';
import { MinimaxLLM } from './api/minimax-llm.js';
import { LLMProvider } from './providers.js';
import { qwenSupportedModelDefinitions } from './qwen-supported-model-definitions.js';
import { anthropicSupportedModelDefinitions } from './anthropic-supported-model-definitions.js';
import { pricing } from './supported-model-pricing.js';

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
const openaiAstraReasoningSchema = createOpenAIReasoningSchema(['low', 'medium', 'high', 'xhigh', 'max'], 'medium');

const roundCatalogPrice = (value: number): number => Number(value.toFixed(10));

const createOpenAILongContextPricing = (input: number, output: number, pricingEffectiveDate: string): TokenPricingConfig => {
  const cacheRead = roundCatalogPrice(input * 0.1);
  const cacheWrite = roundCatalogPrice(input * 1.25);
  return pricing(input, output, {
    pricingEffectiveDate,
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
        inputTokenPricing: roundCatalogPrice(input * 2),
        outputTokenPricing: roundCatalogPrice(output * 1.5),
        cachedInputReadTokenPricing: roundCatalogPrice(cacheRead * 2),
        cachedInputWriteTokenPricing: roundCatalogPrice(cacheWrite * 2),
      },
    ],
  });
};

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
    defaultValue: 'medium',
    enumValues: ['low', 'medium', 'high']
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
    description: 'Controls GLM-5.3 thinking effort. Thinking is always enabled.',
    required: false,
    defaultValue: 'max',
    enumValues: ['low', 'high', 'max']
  }),
  new ParameterDefinition({
    name: 'thinking_type',
    type: ParameterType.ENUM,
    description: 'GLM-5.3 thinking is always enabled.',
    required: false,
    defaultValue: 'enabled',
    enumValues: ['enabled']
  })
]);

const grokReasoningSchema = new ParameterSchema([
  new ParameterDefinition({
    name: 'reasoning_effort',
    type: ParameterType.ENUM,
    description: 'Controls Grok 4.6 reasoning effort. Reasoning is always enabled.',
    required: false,
    defaultValue: 'high',
    enumValues: ['low', 'medium', 'high', 'xhigh']
  })
]);


export const supportedModelDefinitions: SupportedModelDefinition[] = [
  {
    name: 'gpt-6-astra', value: 'gpt-6-astra', provider: LLMProvider.OPENAI, llmClass: OpenAILLM,
    canonicalName: 'gpt-6-astra', staticMetadata: createStaticModelMetadata(1_050_000, null, 128_000, 'https://developers.openai.com/api/docs/models/gpt-6-astra', '2026-09-22'),
    defaultConfig: new LLMConfig({ pricingConfig: createOpenAILongContextPricing(10, 50, '2026-09-22') }),
    configSchema: openaiAstraReasoningSchema,
  },
  ...([
    ['gpt-6-sol', 2, 10],
    ['gpt-6-luna', 0.1, 0.5],
  ] as const).map(([modelId, inputPrice, outputPrice]) => ({
    name: modelId,
    value: modelId,
    provider: LLMProvider.OPENAI,
    llmClass: OpenAILLM,
    canonicalName: modelId,
    staticMetadata: createStaticModelMetadata(1_050_000, null, 128_000, `https://developers.openai.com/api/docs/models/${modelId}`, '2026-09-23'),
    defaultConfig: new LLMConfig({ pricingConfig: createOpenAILongContextPricing(inputPrice, outputPrice, '2026-09-23') }),
    configSchema: openaiGpt56ReasoningSchema,
  })),
  ...([
    ['gpt-5.6-sol', 5.0, 30.0],
    ['gpt-5.6-terra', 2.0, 12.0],
    ['gpt-5.6-luna', 0.2, 1.2],
  ] as const).map(([modelId, inputPrice, outputPrice]) => ({
    name: modelId,
    value: modelId,
    provider: LLMProvider.OPENAI,
    llmClass: OpenAILLM,
    canonicalName: modelId, staticMetadata: createStaticModelMetadata(1050000, null, 128000, `https://developers.openai.com/api/docs/models/${modelId}`, '2026-07-10'),
    defaultConfig: new LLMConfig({ pricingConfig: createOpenAILongContextPricing(inputPrice, outputPrice, '2026-07-30') }),
    configSchema: openaiGpt56ReasoningSchema,
  })),
  {
    name: 'gpt-5.5',
    value: 'gpt-5.5',
    provider: LLMProvider.OPENAI,
    llmClass: OpenAILLM,
    canonicalName: 'gpt-5.5', staticMetadata: createStaticModelMetadata(1050000, null, 128000, 'https://developers.openai.com/api/docs/models/gpt-5.5', '2026-04-25'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(5.0, 30.0, { cachedInputReadTokenPricing: 0.5 }) }),
    configSchema: openaiReasoningSchema
  },
  {
    name: 'gpt-5.4',
    value: 'gpt-5.4',
    provider: LLMProvider.OPENAI,
    llmClass: OpenAILLM,
    canonicalName: 'gpt-5.4', staticMetadata: createStaticModelMetadata(1000000, null, 128000, 'https://developers.openai.com/api/docs/models/gpt-5.4', '2026-04-09'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(2.5, 15.0, { cachedInputReadTokenPricing: 0.25 }) }),
    configSchema: openaiReasoningSchema
  },
  {
    name: 'gpt-5.4-mini',
    value: 'gpt-5.4-mini',
    provider: LLMProvider.OPENAI,
    llmClass: OpenAILLM,
    canonicalName: 'gpt-5.4-mini', staticMetadata: createStaticModelMetadata(400000, null, 128000, 'https://developers.openai.com/api/docs/models/gpt-5.4-mini', '2026-04-09'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.75, 4.5, { cachedInputReadTokenPricing: 0.075 }) }),
    configSchema: openaiReasoningSchema
  },
  {
    name: 'mistral-large-3',
    value: 'mistral-large-2512',
    provider: LLMProvider.MISTRAL,
    llmClass: MistralLLM,
    canonicalName: 'mistral-large-3', staticMetadata: createStaticModelMetadata(256000, null, null, 'https://docs.mistral.ai/models/mistral-large-3-1-24-11/', '2026-04-09'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(2.0, 6.0) })
  },
  {
    name: 'devstral-2',
    value: 'devstral-2512',
    provider: LLMProvider.MISTRAL,
    llmClass: MistralLLM,
    canonicalName: 'devstral-2', staticMetadata: createStaticModelMetadata(256000, null, null, 'https://docs.mistral.ai/models/devstral-small-2507/', '2026-04-09'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.4, 2.0) })
  },
  {
    name: 'grok-4.6',
    value: 'grok-4.6',
    provider: LLMProvider.GROK,
    llmClass: GrokLLM,
    canonicalName: 'grok-4.6', staticMetadata: createStaticModelMetadata(500000, null, null, 'https://docs.x.ai/developers/models/grok-4.6', '2026-08-22'),
    defaultConfig: new LLMConfig({
      extraParams: { reasoning_effort: 'high' },
      pricingConfig: pricing(2.0, 6.0, {
        pricingEffectiveDate: '2026-08-22',
        cachedInputReadTokenPricing: 0.5,
        inputTokenPricingTiers: [
          { tierId: 'standard_le_200k', maxInputTokens: 200_000, inputTokenPricing: 2.0, outputTokenPricing: 6.0, cachedInputReadTokenPricing: 0.5 },
          { tierId: 'long_context_gt_200k', maxInputTokens: null, inputTokenPricing: 4.0, outputTokenPricing: 12.0, cachedInputReadTokenPricing: 1.0 },
        ],
      }),
    }),
    configSchema: grokReasoningSchema,
  },
  ...anthropicSupportedModelDefinitions,
  {
    name: 'deepseek-v4-flash',
    value: 'deepseek-v4-flash',
    provider: LLMProvider.DEEPSEEK,
    llmClass: DeepSeekLLM,
    canonicalName: 'deepseek-v4-flash', staticMetadata: createStaticModelMetadata(1000000, null, 384000, 'https://api-docs.deepseek.com/quick_start/pricing', '2026-04-25', DEEPSEEK_MEDIA_CAPABILITIES),
    defaultConfig: new LLMConfig({
      rateLimit: 60,
      pricingConfig: pricing(0.22, 0.66, {
        cachedInputReadTokenPricing: 0.007,
        pricingEffectiveDate: '2026-08-17',
        pricingScheduleHistory: createDeepSeekV4PricingScheduleHistory({
          priorInput: 0.14, priorOutput: 0.28, priorCacheRead: 0.0028,
          offPeakInput: 0.22, offPeakOutput: 0.66, offPeakCacheRead: 0.007,
          peakInput: 0.44, peakOutput: 1.32, peakCacheRead: 0.014,
        }),
      })
    }),
    configSchema: deepseekV4Schema
  },
  {
    name: 'deepseek-v4-pro',
    value: 'deepseek-v4-pro',
    provider: LLMProvider.DEEPSEEK,
    llmClass: DeepSeekLLM,
    canonicalName: 'deepseek-v4-pro', staticMetadata: createStaticModelMetadata(1000000, null, 384000, 'https://api-docs.deepseek.com/quick_start/pricing', '2026-04-25', DEEPSEEK_MEDIA_CAPABILITIES),
    defaultConfig: new LLMConfig({
      rateLimit: 60,
      pricingConfig: pricing(0.66, 1.98, {
        cachedInputReadTokenPricing: 0.022,
        pricingEffectiveDate: '2026-08-17',
        pricingScheduleHistory: createDeepSeekV4PricingScheduleHistory({
          priorInput: 0.435, priorOutput: 0.87, priorCacheRead: 0.003625,
          offPeakInput: 0.66, offPeakOutput: 1.98, offPeakCacheRead: 0.022,
          peakInput: 1.32, peakOutput: 3.96, peakCacheRead: 0.044,
        }),
      })
    }),
    configSchema: deepseekV4Schema
  },
  {
    name: 'gemini-3.1-pro-preview',
    value: 'gemini-3.1-pro-preview',
    provider: LLMProvider.GEMINI,
    llmClass: GeminiLLM,
    canonicalName: 'gemini-3.1-pro-preview', staticMetadata: createStaticModelMetadata(1048576, 1048576, 65536, 'https://ai.google.dev/gemini-api/docs/gemini-3', '2026-04-09', GEMINI_MEDIA_CAPABILITIES),
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
    name: 'gemini-3.8-flash',
    value: 'gemini-3.8-flash',
    provider: LLMProvider.GEMINI,
    llmClass: GeminiLLM,
    canonicalName: 'gemini-3.8-flash', staticMetadata: createStaticModelMetadata(1048576, 1048576, 65536, 'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash', '2026-09-02', GEMINI_MEDIA_CAPABILITIES),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.75, 3.75, {
      cachedInputReadTokenPricing: 0.075,
      pricingEffectiveDate: '2026-09-02',
      pricingScheduleHistory: [
        { kind: 'fixed', scheduleId: 'gemini-3-8-flash-introductory-2026-09-02', effectiveFrom: null,
          period: { periodId: 'introductory', inputTokenPricing: 0.75, outputTokenPricing: 3.75, cachedInputReadTokenPricing: 0.075,
            trustedDimensions: { input: true, output: true, cachedInputRead: true, cachedInputWrite: false, cachedInputWrite5m: false, cachedInputWrite1h: false } } },
        { kind: 'fixed', scheduleId: 'gemini-3-8-flash-standard-2027-01-01', effectiveFrom: '2027-01-01T00:00:00Z',
          period: { periodId: 'standard', inputTokenPricing: 1.5, outputTokenPricing: 7.5, cachedInputReadTokenPricing: 0.15,
            trustedDimensions: { input: true, output: true, cachedInputRead: true, cachedInputWrite: false, cachedInputWrite5m: false, cachedInputWrite1h: false } } },
      ],
    }) }),
    configSchema: geminiSchema
  },

  {
    name: 'kimi-k3',
    value: 'kimi-k3',
    provider: LLMProvider.KIMI,
    llmClass: KimiLLM,
    canonicalName: 'kimi-k3', staticMetadata: createStaticModelMetadata(1000000, null, null, 'https://platform.kimi.ai/docs/guide/kimi-k3-quickstart', '2026-08-22'),
    defaultConfig: new LLMConfig({
      extraParams: { reasoning_effort: 'max', thinking_type: 'enabled' },
      pricingConfig: pricing(3.0, 15.0, { cachedInputReadTokenPricing: 0.3, pricingEffectiveDate: '2026-08-22' }),
    }),
    configSchema: new ParameterSchema([
      new ParameterDefinition({ name: 'reasoning_effort', type: ParameterType.ENUM, description: 'Controls Kimi K3 reasoning effort. Thinking is always enabled.', required: false, defaultValue: 'max', enumValues: ['low', 'high', 'max'] }),
      new ParameterDefinition({ name: 'thinking_type', type: ParameterType.ENUM, description: 'Kimi K3 thinking is always enabled.', required: false, defaultValue: 'enabled', enumValues: ['enabled'] }),
    ]),
  },
  ...qwenSupportedModelDefinitions,
  {
    name: 'glm-5.3',
    value: 'glm-5.3',
    provider: LLMProvider.GLM,
    llmClass: GlmLLM,
    canonicalName: 'glm-5.3', staticMetadata: createStaticModelMetadata(1000000, 1000000, 128000, 'https://z.ai/blog/glm-5.3', '2026-08-22'),
    defaultConfig: new LLMConfig({
      extraParams: { thinking_type: 'enabled', reasoning_effort: 'max' },
      pricingConfig: new TokenPricingConfig({ pricingSource: 'unverified_glm_5_3_deployment_pricing' }),
    }),
    configSchema: glmSchema
  },
  {
    name: 'minimax-m3',
    value: 'MiniMax-M3',
    provider: LLMProvider.MINIMAX,
    llmClass: MinimaxLLM,
    canonicalName: 'minimax-m3', staticMetadata: createStaticModelMetadata(1000000, 1000000, null, 'https://www.minimaxi.com/models/text/m3', '2026-08-22'),
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
