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
