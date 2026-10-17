import type { ModelCallThroughput } from "../../../domain/model-call-throughput.js";
import { ModelCallRequestBoundary } from "../../shared/model-call-request-boundary.js";
import { CodexThreadEventName } from "../events/codex-thread-event-name.js";
import { asObject } from "../codex-app-server-json.js";

/** Only the model's own output items freeze the request boundary; tool items never do. */
const OUTPUT_ITEM_TYPES = new Set(["reasoning", "agentmessage"]);

const OUTPUT_DELTA_METHODS = new Set<string>([
  CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA,
  CodexThreadEventName.ITEM_REASONING_DELTA,
  CodexThreadEventName.ITEM_REASONING_SUMMARY_PART_ADDED,
  CodexThreadEventName.ITEM_REASONING_SUMMARY_TEXT_DELTA,
]);

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;

/**
 * Measures each Codex model call end to end (DEC-002, SR-006): from the call's request boundary to
 * its `rawResponse/completed`. Codex reports no call duration and does not prove when hidden
 * reasoning starts, so generation speed is never claimed.
 *
 * Request boundaries: `turn/started`, the previous call's end, every `item/completed` (user input,
 * compaction, a finished tool) and the server's reply to an app-server request (an approval).
 * The call's first reasoning/agentMessage item or delta freezes the boundary. A tool call's
 * `item/started` arrives after its model call ended, so it never freezes the next call.
 *
 * A tool-ending call's `thread/tokenUsage/updated` arrives only after the tool ran, so its arrival
 * is never a call end: the reading is held pending for the turn and paired with the next
 * model-call usage update whose `last.outputTokens` matches.
 */
export class CodexModelCallTiming {
  private readonly boundary = new ModelCallRequestBoundary();
  private pending: ModelCallThroughput | null = null;

  constructor(private readonly now: () => number = Date.now) {}

  observe(method: string, itemType: string | null, params: Readonly<Record<string, unknown>>): void {
    if (method === CodexThreadEventName.TURN_STARTED) {
      this.clear();
      this.boundary.markBoundary(this.now());
    } else if (method === CodexThreadEventName.TURN_COMPLETED) {
      this.clear();
    } else if (method === CodexThreadEventName.ITEM_COMPLETED) {
      this.boundary.markBoundary(this.now());
    } else if (method === CodexThreadEventName.ITEM_STARTED) {
      if (itemType && OUTPUT_ITEM_TYPES.has(itemType)) this.boundary.markOutput();
    } else if (OUTPUT_DELTA_METHODS.has(method)) {
      this.boundary.markOutput();
    } else if (method === CodexThreadEventName.RAW_RESPONSE_COMPLETED) {
      this.completeCall(count(asObject(params.usage)?.outputTokens));
    }
  }

  /** The server replied to an app-server request (an approval): Codex resumes after it. */
  markRequestReplyBoundary(): void {
    this.boundary.markBoundary(this.now());
  }

  /**
   * The reading for a model-call usage update, given its own `last.outputTokens`. The pending
   * reading is consumed; it is returned only when its output count matches.
   */
  takeForModelCallUsage(lastOutputTokens: number | null): ModelCallThroughput | null {
    const pending = this.pending;
    this.pending = null;
    return pending && pending.output_tokens === lastOutputTokens ? pending : null;
  }

  private completeCall(outputTokens: number | null): void {
    const completedAtMs = this.now();
    const requestStartAtMs = this.boundary.completeCall(completedAtMs);
    this.pending = requestStartAtMs === null || outputTokens === null
      ? null
      : { method: "end_to_end", output_tokens: outputTokens, duration_ms: completedAtMs - requestStartAtMs };
  }

  private clear(): void {
    this.boundary.reset();
    this.pending = null;
  }
}
