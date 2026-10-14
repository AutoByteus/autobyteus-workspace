import type { ChunkResponse } from '../../llm/utils/response-types.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';

/**
 * One model call's output speed as LlmPhase measured it. The server's run-side acceptance check
 * (`agent-execution/domain/model-call-throughput.ts`) owns validity and the minimum sample; this
 * package keeps its own copy of the shape and the window threshold because it cannot import the
 * server. A server test keeps the two thresholds equal.
 */
export type LlmCallThroughput = {
  method: 'generation' | 'end_to_end';
  output_tokens: number;
  duration_ms: number;
};

/** Shortest generation window used; shorter windows fall back to end to end. */
export const MIN_GENERATION_WINDOW_MS = 250;

const carriesResponseData = (chunk: ChunkResponse): boolean =>
  Boolean(chunk.content || chunk.reasoning || chunk.tool_calls?.length);

/**
 * Times one native model call on the process clock (DEC-002): generation speed (first streamed
 * response data → final chunk) when that first chunk provably precedes all generation, meaning it
 * carried reasoning or the call reports no reasoning tokens; otherwise end to end (request → final
 * chunk), because hidden reasoning ran before the first visible chunk.
 */
export class LlmCallTiming {
  private requestAtMs: number | null = null;
  private firstResponseAtMs: number | null = null;
  private firstResponseCarriedReasoning = false;
  private completedAtMs: number | null = null;

  constructor(private readonly now: () => number = Date.now) {}

  /** Called just before the request is sent. */
  start(): void {
    this.requestAtMs = this.now();
    this.firstResponseAtMs = null;
    this.firstResponseCarriedReasoning = false;
    this.completedAtMs = null;
  }

  observeChunk(chunk: ChunkResponse): void {
    const atMs = this.now();
    if (this.firstResponseAtMs === null && carriesResponseData(chunk)) {
      this.firstResponseAtMs = atMs;
      this.firstResponseCarriedReasoning = Boolean(chunk.reasoning);
    }
    if (chunk.is_complete) this.completedAtMs = atMs;
  }

  throughput(usage: LlmTokenUsageObservation): LlmCallThroughput | null {
    const { requestAtMs, firstResponseAtMs, completedAtMs } = this;
    const outputTokens = usage.output_tokens;
    if (completedAtMs === null || outputTokens === null) return null;
    const reasoningTokens = usage.reasoning_output_tokens ?? null;
    const responseStartTrusted = this.firstResponseCarriedReasoning || reasoningTokens === null || reasoningTokens === 0;
    if (firstResponseAtMs !== null && responseStartTrusted && completedAtMs - firstResponseAtMs >= MIN_GENERATION_WINDOW_MS) {
      return { method: 'generation', output_tokens: outputTokens, duration_ms: completedAtMs - firstResponseAtMs };
    }
    if (requestAtMs === null) return null;
    return { method: 'end_to_end', output_tokens: outputTokens, duration_ms: completedAtMs - requestAtMs };
  }
}
