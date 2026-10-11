/**
 * Per-model Anthropic Messages API request capabilities, keyed by the exact API model value.
 * `AnthropicLLM` is the only consumer; it turns these facts into request shaping.
 */

/** The `thinking` value sent when the thinking toggle is off (`omit` sends none). */
export type AnthropicThinkingOffShape = 'disabled' | 'between_tools' | 'omit';

/**
 * Keyed by `thinkingMode`. On every variant, `rejectsForcedToolChoice` means `tool_choice`
 * `any`/`tool` fails locally before the SDK call.
 */
export type AnthropicModelRequestPolicy =
  /** Fixed `budget_tokens` thinking; sampling parameters allowed. */
  | { thinkingMode: 'legacy_budget'; rejectsForcedToolChoice: boolean }
  /** Adaptive thinking; sampling parameters are stripped; toggle off sends `thinkingOffShape`. */
  | { thinkingMode: 'adaptive'; thinkingOffShape: AnthropicThinkingOffShape; rejectsForcedToolChoice: boolean }
  /**
   * Adaptive thinking is always sent; disabling it, a manual budget or explicit sampling
   * parameters fail locally.
   */
  | { thinkingMode: 'adaptive_required'; rejectsForcedToolChoice: boolean };

const adaptive = (
  thinkingOffShape: AnthropicThinkingOffShape,
  rejectsForcedToolChoice = false,
): AnthropicModelRequestPolicy => ({ thinkingMode: 'adaptive', thinkingOffShape, rejectsForcedToolChoice });

const LEGACY_BUDGET_POLICY: AnthropicModelRequestPolicy = {
  thinkingMode: 'legacy_budget',
  rejectsForcedToolChoice: false,
};

const ANTHROPIC_MODEL_REQUEST_POLICIES: Readonly<Record<string, AnthropicModelRequestPolicy>> = {
  'claude-opus-5-5': { thinkingMode: 'adaptive_required', rejectsForcedToolChoice: true },
  'claude-sonnet-5-5': adaptive('between_tools', true),
  'claude-haiku-5-5': adaptive('disabled'),
  'claude-sonnet-5': adaptive('disabled'),
  'claude-opus-5': adaptive('omit'),
  'claude-opus-4-8': adaptive('omit'),
  'claude-opus-4-7': adaptive('omit'),
  'claude-fable-5': adaptive('omit'),
  'claude-fable-5-1': adaptive('omit'),
  'claude-sonnet-4-6': LEGACY_BUDGET_POLICY,
};

/**
 * Exact-value lookup. Every catalog row has an entry; a value without one (only non-catalog
 * test fixtures) gets the fixed-budget policy so the function stays total.
 */
export const resolveAnthropicModelRequestPolicy = (modelValue: string): AnthropicModelRequestPolicy =>
  Object.prototype.hasOwnProperty.call(ANTHROPIC_MODEL_REQUEST_POLICIES, modelValue)
    ? ANTHROPIC_MODEL_REQUEST_POLICIES[modelValue]!
    : LEGACY_BUDGET_POLICY;
