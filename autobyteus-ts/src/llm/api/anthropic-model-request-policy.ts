/**
 * Per-model Anthropic Messages API request capabilities, keyed by the exact API model value.
 * `AnthropicLLM` is the only consumer; it turns these facts into request shaping.
 */

/**
 * - `legacy_budget`: fixed `budget_tokens` thinking; sampling parameters allowed.
 * - `adaptive`: adaptive thinking; sampling parameters are stripped.
 * - `adaptive_required`: adaptive thinking is always sent; disabling it, a manual budget or
 *   explicit sampling parameters fail locally.
 */
export type AnthropicThinkingMode = 'legacy_budget' | 'adaptive' | 'adaptive_required';

/** The `thinking` value sent when the thinking toggle is off (`omit` sends none). */
export type AnthropicThinkingOffShape = 'disabled' | 'between_tools' | 'omit';

export type AnthropicModelRequestPolicy = {
  thinkingMode: AnthropicThinkingMode;
  /** What to send when the thinking toggle is off. Only meaningful for `adaptive`. */
  thinkingOffShape: AnthropicThinkingOffShape;
  /** `tool_choice` `any`/`tool` fails locally before the SDK call. */
  rejectsForcedToolChoice: boolean;
};

const adaptive = (
  thinkingOffShape: AnthropicThinkingOffShape,
  rejectsForcedToolChoice = false,
): AnthropicModelRequestPolicy => ({ thinkingMode: 'adaptive', thinkingOffShape, rejectsForcedToolChoice });

const ANTHROPIC_MODEL_REQUEST_POLICIES: Readonly<Record<string, AnthropicModelRequestPolicy>> = {
  'claude-opus-5-5': { thinkingMode: 'adaptive_required', thinkingOffShape: 'omit', rejectsForcedToolChoice: true },
  'claude-sonnet-5-5': adaptive('between_tools', true),
  'claude-haiku-5-5': adaptive('disabled'),
  'claude-sonnet-5': adaptive('disabled'),
  'claude-opus-5': adaptive('omit'),
  'claude-opus-4-8': adaptive('omit'),
  'claude-opus-4-7': adaptive('omit'),
  'claude-fable-5': adaptive('omit'),
  'claude-fable-5-1': adaptive('omit'),
};

const LEGACY_BUDGET_POLICY: AnthropicModelRequestPolicy = {
  thinkingMode: 'legacy_budget',
  thinkingOffShape: 'omit',
  rejectsForcedToolChoice: false,
};

/** Exact-value lookup; any value without a row uses the legacy fixed-budget policy. */
export const resolveAnthropicModelRequestPolicy = (modelValue: string): AnthropicModelRequestPolicy =>
  Object.prototype.hasOwnProperty.call(ANTHROPIC_MODEL_REQUEST_POLICIES, modelValue)
    ? ANTHROPIC_MODEL_REQUEST_POLICIES[modelValue]!
    : LEGACY_BUDGET_POLICY;
