import type { SupportedModelDefinition } from './supported-model-definition.js';
import { createStaticModelMetadata } from './supported-model-static-metadata.js';
import { LLMConfig } from './utils/llm-config.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../utils/parameter-schema.js';
import { AnthropicLLM } from './api/anthropic-llm.js';
import { ANTHROPIC_EFFORT_LEVELS, type AnthropicEffortLevel } from './api/anthropic-model-request-policy.js';
import { LLMProvider } from './providers.js';
import { pricing } from './supported-model-pricing.js';

/** Anthropic effort (`output_config.effort`); the default equals the model's API default. */
const claudeEffortParameter = (defaultValue: AnthropicEffortLevel): ParameterDefinition =>
  new ParameterDefinition({
    name: 'reasoning_effort',
    type: ParameterType.ENUM,
    description: 'Anthropic effort: how much Claude spends on thinking, text and tool calls. Sent only while thinking is on.',
    required: false,
    defaultValue,
    enumValues: [...ANTHROPIC_EFFORT_LEVELS],
  });

/** A Claude row with a thinking switch: Off sends the model's off shape and no effort. */
const claudeThinkingSwitchSchema = (switchDescription: string, effortDefault: AnthropicEffortLevel): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: 'thinking_enabled',
      type: ParameterType.BOOLEAN,
      description: switchDescription,
      required: false,
      defaultValue: false,
    }),
    claudeEffortParameter(effortDefault),
  ]);

const ADAPTIVE_THINKING_SWITCH_DESCRIPTION = 'Request Anthropic adaptive thinking for current Claude models. No fixed budget is sent.';

/** A Claude row whose adaptive thinking is always on (Opus 5.5, Fable 5.1): effort is its only setting. */
const claudeEffortOnlySchema = (effortDefault: AnthropicEffortLevel): ParameterSchema =>
  new ParameterSchema([claudeEffortParameter(effortDefault)]);

export const anthropicSupportedModelDefinitions: SupportedModelDefinition[] = [
  {
    name: 'claude-fable-5-1', value: 'claude-fable-5-1', provider: LLMProvider.ANTHROPIC, llmClass: AnthropicLLM,
    compactionSummaryMode: 'cached_conversation',
    canonicalName: 'claude-fable-5-1', staticMetadata: createStaticModelMetadata(1_000_000, 1_000_000, 128_000, 'https://platform.claude.com/docs/en/models/fable-5-1/overview', '2026-09-22'),
    defaultConfig: new LLMConfig({ pricingConfig: pricing(10, 50, {
      pricingEffectiveDate: '2026-09-01',
      cachedInputReadTokenPricing: 0.25, cachedInputWrite5mTokenPricing: 12.5, cachedInputWrite1hTokenPricing: 20,
    }) }),
    configSchema: claudeEffortOnlySchema('high'),
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
    configSchema: claudeThinkingSwitchSchema(ADAPTIVE_THINKING_SWITCH_DESCRIPTION, 'high')
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
    configSchema: claudeThinkingSwitchSchema(ADAPTIVE_THINKING_SWITCH_DESCRIPTION, 'high')
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
    configSchema: claudeEffortOnlySchema('medium'),
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
    configSchema: claudeThinkingSwitchSchema(
      'Request Anthropic adaptive thinking. Off sends the lowest setting (between_tools): Claude still writes short progress notes between tool calls. No fixed budget is sent.',
      'high',
    ),
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
    configSchema: claudeThinkingSwitchSchema(ADAPTIVE_THINKING_SWITCH_DESCRIPTION, 'high')
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
    configSchema: claudeThinkingSwitchSchema(ADAPTIVE_THINKING_SWITCH_DESCRIPTION, 'medium'),
  },
];
