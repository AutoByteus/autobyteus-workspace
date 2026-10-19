import type { SupportedModelDefinition } from './supported-model-definition.js';
import { createStaticModelMetadata } from './supported-model-static-metadata.js';
import { LLMConfig } from './utils/llm-config.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../utils/parameter-schema.js';
import { AnthropicLLM } from './api/anthropic-llm.js';
import { LLMProvider } from './providers.js';
import { pricing } from './supported-model-pricing.js';

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

const claudeOpus55Schema = new ParameterSchema([
  new ParameterDefinition({
    name: 'thinking_display',
    type: ParameterType.ENUM,
    description: 'Adaptive thinking display mode. Claude Opus 5.5 always uses adaptive thinking.',
    required: false,
    defaultValue: 'omitted',
    enumValues: ['omitted', 'summarized'],
  }),
]);

const claudeSonnet55Schema = new ParameterSchema([
  new ParameterDefinition({
    name: 'thinking_enabled',
    type: ParameterType.BOOLEAN,
    description: 'Request Anthropic adaptive thinking. Off sends the lowest setting (between_tools): Claude still writes short progress notes between tool calls. No fixed budget is sent.',
    required: false,
    defaultValue: false
  }),
  new ParameterDefinition({
    name: 'thinking_display',
    type: ParameterType.ENUM,
    description: 'Controls whether adaptive thinking content is omitted or summarized. Summarized keeps the progress notes between tool calls visible.',
    required: false,
    defaultValue: 'summarized',
    enumValues: ['omitted', 'summarized']
  })
]);

export const anthropicSupportedModelDefinitions: SupportedModelDefinition[] = [
  {
    name: 'claude-fable-5-1', value: 'claude-fable-5-1', provider: LLMProvider.ANTHROPIC, llmClass: AnthropicLLM,
    compactionSummaryMode: 'cached_conversation',
    canonicalName: 'claude-fable-5-1', staticMetadata: createStaticModelMetadata(1_000_000, 1_000_000, 128_000, 'https://platform.claude.com/docs/en/models/fable-5-1/overview', '2026-09-22'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(10, 50, {
      pricingEffectiveDate: '2026-09-01',
      cachedInputReadTokenPricing: 0.25, cachedInputWrite5mTokenPricing: 12.5, cachedInputWrite1hTokenPricing: 20,
    }) }),
  },
  {
    name: 'claude-fable-5',
    value: 'claude-fable-5',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    compactionSummaryMode: 'cached_conversation',
    canonicalName: 'claude-fable-5', staticMetadata: createStaticModelMetadata(1000000, 1000000, 128000, 'https://platform.claude.com/docs/en/about-claude/models/overview', '2026-07-07'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(10.0, 50.0, {
      pricingEffectiveDate: '2026-07-07',
      cachedInputReadTokenPricing: 1.0,
      cachedInputWrite5mTokenPricing: 12.5,
      cachedInputWrite1hTokenPricing: 20.0,
    }) }),
    configSchema: claudeAdaptiveThinkingSchema
  },
  {
    name: 'claude-opus-5',
    value: 'claude-opus-5',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    compactionSummaryMode: 'cached_conversation',
    canonicalName: 'claude-opus-5', staticMetadata: createStaticModelMetadata(1000000, 1000000, 128000, 'https://platform.claude.com/docs/en/about-claude/models/overview', '2026-07-31'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(5.0, 25.0, {
      pricingEffectiveDate: '2026-07-24',
      cachedInputReadTokenPricing: 0.5,
      cachedInputWrite5mTokenPricing: 6.25,
      cachedInputWrite1hTokenPricing: 10.0,
    }) }),
    configSchema: claudeAdaptiveThinkingSchema
  },
  {
    name: 'claude-opus-5-5',
    value: 'claude-opus-5-5',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    compactionSummaryMode: 'cached_conversation',
    canonicalName: 'claude-opus-5-5',
    staticMetadata: createStaticModelMetadata(1_000_000, 1_000_000, 128_000, 'https://platform.claude.com/docs/en/models/opus-5-5/overview', '2026-09-23'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(4, 20, {
      pricingEffectiveDate: '2026-09-23',
      cachedInputReadTokenPricing: 0.2,
      cachedInputWrite5mTokenPricing: 5,
      cachedInputWrite1hTokenPricing: 8,
    }) }),
    configSchema: claudeOpus55Schema,
  },
  {
    name: 'claude-opus-4.8',
    value: 'claude-opus-4-8',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    compactionSummaryMode: 'cached_conversation',
    canonicalName: 'claude-opus-4.8', staticMetadata: createStaticModelMetadata(1000000, 1000000, 128000, 'https://platform.claude.com/docs/en/about-claude/models/overview', '2026-07-07'),
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
    compactionSummaryMode: 'cached_conversation',
    canonicalName: 'claude-opus-4.7', staticMetadata: createStaticModelMetadata(1000000, 1000000, 128000, 'https://platform.claude.com/docs/en/about-claude/models/overview', '2026-04-25'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(5.0, 25.0, {
      cachedInputReadTokenPricing: 0.5,
      cachedInputWrite5mTokenPricing: 6.25,
      cachedInputWrite1hTokenPricing: 10.0,
    }) }),
    configSchema: claudeAdaptiveThinkingSchema
  },
  {
    name: 'claude-sonnet-5-5',
    value: 'claude-sonnet-5-5',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    compactionSummaryMode: 'cached_conversation',
    canonicalName: 'claude-sonnet-5-5',
    staticMetadata: createStaticModelMetadata(1_000_000, 1_000_000, 128_000, 'https://platform.claude.com/docs/en/models/sonnet-5-5/overview', '2026-10-09'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(2, 10, {
      pricingEffectiveDate: '2026-09-28',
      cachedInputReadTokenPricing: 0.1,
      cachedInputWrite5mTokenPricing: 2.5,
      cachedInputWrite1hTokenPricing: 4,
    }) }),
    configSchema: claudeSonnet55Schema,
  },
  {
    name: 'claude-sonnet-5',
    value: 'claude-sonnet-5',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    compactionSummaryMode: 'cached_conversation',
    canonicalName: 'claude-sonnet-5', staticMetadata: createStaticModelMetadata(1000000, 1000000, 128000, 'https://platform.claude.com/docs/en/about-claude/models/overview', '2026-07-07'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(2.0, 10.0, {
      pricingEffectiveDate: '2026-07-07',
      cachedInputReadTokenPricing: 0.2,
      cachedInputWrite5mTokenPricing: 2.5,
      cachedInputWrite1hTokenPricing: 4.0,
    }) }),
    configSchema: claudeAdaptiveThinkingSchema
  },
  {
    name: 'claude-sonnet-4.6',
    value: 'claude-sonnet-4-6',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    compactionSummaryMode: 'cached_conversation',
    canonicalName: 'claude-sonnet-4.6', staticMetadata: createStaticModelMetadata(1000000, 1000000, 64000, 'https://platform.claude.com/docs/en/about-claude/models/overview', '2026-04-09'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(3.0, 15.0, {
      cachedInputReadTokenPricing: 0.3,
      cachedInputWrite5mTokenPricing: 3.75,
      cachedInputWrite1hTokenPricing: 6.0,
    }) }),
    configSchema: claudeSchema
  },
  {
    name: 'claude-haiku-5-5',
    value: 'claude-haiku-5-5',
    provider: LLMProvider.ANTHROPIC,
    llmClass: AnthropicLLM,
    compactionSummaryMode: 'cached_conversation',
    canonicalName: 'claude-haiku-5-5',
    staticMetadata: createStaticModelMetadata(1_000_000, 1_000_000, 128_000, 'https://platform.claude.com/docs/en/models/haiku-5-5/overview', '2026-10-09'),
    // Prompt size for the tier counts all input tokens, including cache reads and writes.
    defaultConfig: new LLMConfig({ pricingConfig: pricing(0.1, 0.5, {
      pricingEffectiveDate: '2026-10-07',
      cachedInputReadTokenPricing: 0.01,
      cachedInputWrite5mTokenPricing: 0.125,
      cachedInputWrite1hTokenPricing: 0.2,
      inputTokenPricingTiers: [
        {
          tierId: 'prompt_le_100k', maxInputTokens: 100_000, inputTokenPricing: 0.1, outputTokenPricing: 0.5,
          cachedInputReadTokenPricing: 0.01, cachedInputWrite5mTokenPricing: 0.125, cachedInputWrite1hTokenPricing: 0.2,
        },
        {
          tierId: 'prompt_gt_100k', maxInputTokens: null, inputTokenPricing: 0.5, outputTokenPricing: 2.5,
          cachedInputReadTokenPricing: 0.05, cachedInputWrite5mTokenPricing: 0.625, cachedInputWrite1hTokenPricing: 1,
        },
      ],
    }) }),
    configSchema: claudeAdaptiveThinkingSchema,
  },
];
