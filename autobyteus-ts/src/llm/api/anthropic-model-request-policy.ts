/**
 * Per-model Anthropic Messages API request capabilities, keyed by the exact API model value.
 * `AnthropicLLM` is the only consumer; it turns these facts into request shaping.
 */

/** The `thinking` value sent when the thinking toggle is off (`omit` sends none). */
export type AnthropicThinkingOffShape = 'disabled' | 'between_tools' | 'omit';

/** Anthropic `output_config.effort` levels, from least to most effort. */
export const ANTHROPIC_EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;

export type AnthropicEffortLevel = (typeof ANTHROPIC_EFFORT_LEVELS)[number];

/** Effort levels that are never sent with the thinking switch off (Anthropic rejects them on several models). */
export const ANTHROPIC_THINKING_REQUIRED_EFFORT_LEVELS: readonly AnthropicEffortLevel[] = ['xhigh', 'max'];

/**
 * Keyed by `thinkingMode`. On every variant, `rejectsForcedToolChoice` means `tool_choice`
 * `any`/`tool` fails locally before the SDK call. Sampling parameters are always stripped.
 */
export type AnthropicModelRequestPolicy =
  /** Adaptive thinking; toggle off sends `thinkingOffShape`. */
  | { thinkingMode: 'adaptive'; thinkingOffShape: AnthropicThinkingOffShape; rejectsForcedToolChoice: boolean }
  /**
   * Adaptive thinking is always sent; disabling it, a non-adaptive thinking shape or explicit sampling
   * parameters fail locally.
   */
  | { thinkingMode: 'adaptive_required'; rejectsForcedToolChoice: boolean };

const adaptive = (
  thinkingOffShape: AnthropicThinkingOffShape,
  rejectsForcedToolChoice = false,
): AnthropicModelRequestPolicy => ({ thinkingMode: 'adaptive', thinkingOffShape, rejectsForcedToolChoice });

const ANTHROPIC_MODEL_REQUEST_POLICIES: Readonly<Record<string, AnthropicModelRequestPolicy>> = {
  'claude-opus-5-5': { thinkingMode: 'adaptive_required', rejectsForcedToolChoice: true },
  'claude-sonnet-5-5': adaptive('between_tools', true),
  'claude-haiku-5-5': adaptive('disabled'),
  'claude-sonnet-5': adaptive('disabled'),
  'claude-opus-5': adaptive('omit'),
  'claude-fable-5': adaptive('omit'),
  'claude-fable-5-1': adaptive('omit'),
};

/** Exact-value lookup. Every catalog row has an entry; any other value fails. */
export const resolveAnthropicModelRequestPolicy = (modelValue: string): AnthropicModelRequestPolicy => {
  if (!Object.prototype.hasOwnProperty.call(ANTHROPIC_MODEL_REQUEST_POLICIES, modelValue)) {
    throw new Error(`Anthropic model ${modelValue} is not in the AutoByteus Anthropic catalog.`);
  }
  return ANTHROPIC_MODEL_REQUEST_POLICIES[modelValue]!;
};
