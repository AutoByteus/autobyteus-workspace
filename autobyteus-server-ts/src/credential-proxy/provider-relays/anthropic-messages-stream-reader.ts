import type { ProviderCallUsage } from "./provider-call-observation.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

/** Unparsed bytes kept between chunks; an event larger than this is skipped (usage events are small). */
const MAX_PENDING_CHARS = 1_048_576;

/**
 * Reads usage and stop reason from an Anthropic Messages SSE stream as it passes, without changing any byte:
 * `message_start` carries the input and cache counts, `message_delta` the output count and the stop reason.
 */
export class AnthropicMessagesStreamReader {
  private readonly decoder = new TextDecoder();
  private pending = "";
  private readonly counts: Record<string, number> = {};
  private stop: string | null = null;

  push(chunk: Uint8Array): void {
    this.pending += this.decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
    let end = this.pending.indexOf("\n\n");
    while (end >= 0) {
      this.readEvent(this.pending.slice(0, end));
      this.pending = this.pending.slice(end + 2);
      end = this.pending.indexOf("\n\n");
    }
    if (this.pending.length > MAX_PENDING_CHARS) this.pending = "";
  }

  /** The call's usage once the stream ended (`null` when it reported no input and output counts). */
  usage(): ProviderCallUsage | null {
    const inputTokens = this.counts.input_tokens;
    const outputTokens = this.counts.output_tokens;
    if (inputTokens === undefined || outputTokens === undefined) return null;
    return Object.freeze({
      inputTokens,
      outputTokens,
      cacheReadInputTokens: this.counts.cache_read_input_tokens ?? null,
      cacheCreationInputTokens: this.counts.cache_creation_input_tokens ?? null,
    });
  }

  stopReason(): string | null { return this.stop; }

  private readEvent(event: string): void {
    const data = event.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
    if (!data) return;
    let parsed: unknown;
    try { parsed = JSON.parse(data); } catch { return; }
    if (!isRecord(parsed)) return;
    if (parsed.type === "message_start" && isRecord(parsed.message)) this.readUsage(parsed.message.usage);
    if (parsed.type === "message_delta") {
      this.readUsage(parsed.usage);
      if (isRecord(parsed.delta) && typeof parsed.delta.stop_reason === "string") this.stop = parsed.delta.stop_reason;
    }
  }

  private readUsage(usage: unknown): void {
    if (!isRecord(usage)) return;
    for (const field of ["input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"]) {
      const value = count(usage[field]);
      if (value !== null) this.counts[field] = value;
    }
  }
}
