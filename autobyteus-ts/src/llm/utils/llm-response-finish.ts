/**
 * How one LLM response ended, in provider-neutral terms. Adapters translate their
 * provider's stop vocabulary through their own mapping table; nothing above the
 * `BaseLLM` boundary reads provider stop strings.
 *
 * - `null` (where a finish is optional): the provider did not report how it ended.
 * - `other`: the provider reported a reason this adapter does not map.
 */
export type LlmFinishReason =
  | 'stop'
  | 'tool_calls'
  | 'output_limit'
  | 'content_filter'
  | 'context_window_exceeded'
  | 'other';

export type LlmResponseFinish = Readonly<{
  reason: LlmFinishReason;
  /** The provider's raw stop string, e.g. Anthropic `stop_reason` or OpenAI `finish_reason`. */
  providerReason: string | null;
}>;

export type LlmFinishTable = Readonly<Record<string, LlmFinishReason>>;

export const buildFinish = (reason: LlmFinishReason, providerReason: unknown): LlmResponseFinish => ({
  reason,
  providerReason: typeof providerReason === 'string' && providerReason ? providerReason : null,
});

/** Maps a raw provider reason through an adapter's table: unreported → `null`, unmapped → `other`. */
export const mapProviderFinish = (table: LlmFinishTable, providerReason: unknown): LlmResponseFinish | null => {
  if (typeof providerReason !== 'string' || !providerReason) return null;
  return buildFinish(Object.hasOwn(table, providerReason) ? table[providerReason]! : 'other', providerReason);
};

/** A plain stop that emitted tool calls is reported as `tool_calls`. */
export const withToolCallsFinish = (finish: LlmResponseFinish | null, emittedToolCalls: boolean): LlmResponseFinish | null =>
  emittedToolCalls && finish?.reason === 'stop' ? buildFinish('tool_calls', finish.providerReason) : finish;

export type LlmCompletionStatus = 'complete' | 'incomplete' | 'unknown';

/**
 * The compaction report's coarse status, derived from the finish: unreported → `unknown`,
 * `stop` → `complete`, anything else (tool calls, truncation, filtering, unmapped) → `incomplete`.
 */
export const completionStatusOf = (finish: LlmResponseFinish | null): LlmCompletionStatus =>
  finish === null ? 'unknown' : finish.reason === 'stop' ? 'complete' : 'incomplete';
