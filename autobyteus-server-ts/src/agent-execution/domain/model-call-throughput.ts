/**
 * One model call's output speed (TPS) as its runtime adapter measured it.
 *
 * - `generation`: from the call's first streamed response event to its end. Adapters report it
 *   only when that first event provably precedes all of the call's generation, hidden reasoning
 *   included.
 * - `end_to_end`: from the call's request (or a provider-reported call duration) to its end.
 *
 * `output_tokens` is the call's own reported output; `duration_ms` is integer milliseconds.
 */
export type ModelCallThroughputMethod = "generation" | "end_to_end";

export interface ModelCallThroughput {
  method: ModelCallThroughputMethod;
  output_tokens: number;
  duration_ms: number;
}

/** Minimum sample: smaller calls carry no TPS (DEC-003). */
export const MIN_TPS_OUTPUT_TOKENS = 20;
export const MIN_TPS_DURATION_MS = 250;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

/**
 * The run's only TPS validity and minimum-sample check. Returns the adapter-reported value
 * unchanged when it is a well-formed model-call reading with a qualifying sample; otherwise null.
 */
export const acceptModelCallThroughput = (input: {
  reportsModelCall: boolean;
  value: unknown;
}): ModelCallThroughput | null => {
  if (!input.reportsModelCall) return null;
  const record = asRecord(input.value);
  if (!record) return null;
  const { method, output_tokens: outputTokens, duration_ms: durationMs } = record;
  if (method !== "generation" && method !== "end_to_end") return null;
  if (!isCount(outputTokens) || !isCount(durationMs)) return null;
  if (outputTokens < MIN_TPS_OUTPUT_TOKENS || durationMs < MIN_TPS_DURATION_MS) return null;
  return { method, output_tokens: outputTokens, duration_ms: durationMs };
};
