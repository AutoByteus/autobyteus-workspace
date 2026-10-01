import { asObject, asString } from "../../../agent-execution/backends/claude/claude-runtime-shared.js";
import { resolveClaudeSdkSelectedModelForQuery } from "./claude-sdk-selected-model-binding.js";
import type { ClaudeSdkQueryLike } from "./claude-sdk-client.js";

export type ClaudeSdkUserContentBlock =
  | Readonly<{ type: "text"; text: string }>
  | Readonly<{
      type: "image";
      source:
        | Readonly<{ type: "base64"; media_type: string; data: string }>
        | Readonly<{ type: "url"; url: string }>;
    }>;

/** SDK streaming-input user message; `uuid` is echoed in `result.user_message_uuids`. */
export type ClaudeSdkUserMessage = Readonly<{
  type: "user";
  uuid: string;
  parent_tool_use_id: null;
  message: Readonly<{ role: "user"; content: readonly ClaudeSdkUserContentBlock[] }>;
}>;

export type ClaudeSdkInterruptOutcome = Readonly<{
  stillQueued: readonly string[];
  cancelled: readonly string[];
}>;

export type ClaudeSdkSelectedModelResolution = Awaited<
  ReturnType<typeof resolveClaudeSdkSelectedModelForQuery>
>;

/** One long-lived Claude CLI process fed through the SDK streaming-input channel. */
export interface ClaudeSdkStreamingSession {
  /** Raw SDK frames. The session process pump is the single consumer. */
  readonly messages: AsyncIterable<unknown>;
  /** Capabilities advertised by the first `system/init`; null until it arrives. */
  readonly capabilities: ReadonlySet<string> | null;
  send(message: ClaudeSdkUserMessage): void;
  interruptAndCancelQueued(): Promise<ClaudeSdkInterruptOutcome>;
  resolveSelectedModel(selectedValue: string): Promise<ClaudeSdkSelectedModelResolution>;
  /** Ends the input channel and closes the query (kills the CLI process). */
  close(): void;
}

export const CLAUDE_CANCEL_QUEUED_CAPABILITY = "interrupt_cancel_queued_v1";

/** Async input queue handed to `query({ prompt })`. The SDK is its single reader. */
export class ClaudeSdkInputChannel implements AsyncIterable<ClaudeSdkUserMessage> {
  private readonly buffered: ClaudeSdkUserMessage[] = [];
  private wake: (() => void) | null = null;
  private ended = false;

  push(message: ClaudeSdkUserMessage): void {
    if (this.ended) {
      throw new Error("CLAUDE_SESSION_INPUT_CLOSED: Claude session input channel is closed.");
    }
    this.buffered.push(message);
    this.signal();
  }

  end(): void {
    this.ended = true;
    this.signal();
  }

  async *[Symbol.asyncIterator](): AsyncIterator<ClaudeSdkUserMessage> {
    while (true) {
      const next = this.buffered.shift();
      if (next) {
        yield next;
        continue;
      }
      if (this.ended) {
        return;
      }
      await new Promise<void>((resolve) => {
        this.wake = resolve;
      });
    }
  }

  private signal(): void {
    const wake = this.wake;
    this.wake = null;
    wake?.();
  }
}

const asUuidList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((entry) => asString(entry)).filter((entry): entry is string => entry !== null)
    : [];

const readInitCapabilities = (frame: unknown): ReadonlySet<string> | null => {
  const payload = asObject(frame);
  if (payload?.type !== "system" || payload.subtype !== "init") {
    return null;
  }
  return new Set(asUuidList(payload.capabilities));
};

type InterruptWithOptions = (options: { cancelQueued: true }) => Promise<unknown>;

class ClaudeSdkStreamingSessionHandle implements ClaudeSdkStreamingSession {
  readonly messages: AsyncIterable<unknown>;
  private capabilitySnapshot: ReadonlySet<string> | null = null;

  constructor(
    private readonly query: ClaudeSdkQueryLike,
    private readonly input: ClaudeSdkInputChannel,
  ) {
    this.messages = { [Symbol.asyncIterator]: () => this.readMessages() };
  }

  get capabilities(): ReadonlySet<string> | null {
    return this.capabilitySnapshot;
  }

  send(message: ClaudeSdkUserMessage): void {
    this.input.push(message);
  }

  async interruptAndCancelQueued(): Promise<ClaudeSdkInterruptOutcome> {
    // RSK-006: SDK 0.3.280 passes `cancelQueued` through (`cancel_queued` control field,
    // capability `interrupt_cancel_queued_v1`) but its d.ts omits the parameter. Keep that
    // undeclared call confined to this adapter.
    const interrupt = this.query.interrupt as unknown as InterruptWithOptions;
    const response = asObject(await interrupt.call(this.query, { cancelQueued: true }));
    return {
      stillQueued: asUuidList(response?.still_queued),
      cancelled: asUuidList(response?.cancelled),
    };
  }

  resolveSelectedModel(selectedValue: string): Promise<ClaudeSdkSelectedModelResolution> {
    return resolveClaudeSdkSelectedModelForQuery(this.query, selectedValue);
  }

  close(): void {
    this.input.end();
    try {
      this.query.close();
    } catch {
      // best-effort cleanup
    }
  }

  private async *readMessages(): AsyncGenerator<unknown> {
    for await (const frame of this.query) {
      if (!this.capabilitySnapshot) {
        this.capabilitySnapshot = readInitCapabilities(frame);
      }
      yield frame;
    }
  }
}

export const createClaudeSdkStreamingSession = (
  query: ClaudeSdkQueryLike,
  input: ClaudeSdkInputChannel,
): ClaudeSdkStreamingSession => new ClaudeSdkStreamingSessionHandle(query, input);
