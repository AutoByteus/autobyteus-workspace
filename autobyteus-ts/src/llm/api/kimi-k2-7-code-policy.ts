import { LLMConfig, TokenPricingConfig, type TokenPricingConfigInput } from '../utils/llm-config.js';

export const KIMI_K2_7_CODE_MODEL = 'kimi-k2.7-code';
export const KIMI_K2_7_CODE_HIGHSPEED_MODEL = 'kimi-k2.7-code-highspeed';

const KIMI_K2_7_CODE_MODEL_VALUES = new Set([
  KIMI_K2_7_CODE_MODEL,
  KIMI_K2_7_CODE_HIGHSPEED_MODEL,
]);

export const KIMI_K2_7_CODE_FIXED_CONSTRAINTS = {
  temperature: 1.0,
  topP: 0.95,
  resultCount: 1,
  presencePenalty: 0.0,
  frequencyPenalty: 0.0,
} as const;

export const KIMI_K2_7_CODE_ALLOWED_TOOL_CHOICES = new Set(['auto', 'none']);

const KIMI_K2_7_FIXED_SAMPLING_KEYS = new Set([
  'top_p',
  'n',
  'presence_penalty',
  'frequency_penalty',
]);

export function isKimiK27CodeModel(modelValue: string): boolean {
  return KIMI_K2_7_CODE_MODEL_VALUES.has(modelValue);
}

export function isKimiK27FixedSamplingKey(key: string): boolean {
  return KIMI_K2_7_FIXED_SAMPLING_KEYS.has(key);
}

export function createKimiK27CodeDefaultConfig(
  pricingConfig?: TokenPricingConfig | TokenPricingConfigInput,
): LLMConfig {
  return new LLMConfig({
    temperature: KIMI_K2_7_CODE_FIXED_CONSTRAINTS.temperature,
    topP: KIMI_K2_7_CODE_FIXED_CONSTRAINTS.topP,
    presencePenalty: KIMI_K2_7_CODE_FIXED_CONSTRAINTS.presencePenalty,
    frequencyPenalty: KIMI_K2_7_CODE_FIXED_CONSTRAINTS.frequencyPenalty,
    extraParams: {
      n: KIMI_K2_7_CODE_FIXED_CONSTRAINTS.resultCount,
    },
    ...(pricingConfig ? { pricingConfig } : {}),
  });
}
