import { vi } from "vitest";
import type {
  ClaudeSdkInterruptOutcome,
  ClaudeSdkStreamingSession,
  ClaudeSdkUserMessage,
} from "../../src/runtime-management/claude/client/claude-sdk-streaming-session.js";
import type { ClaudeSdkStreamingSessionOptions } from "../../src/runtime-management/claude/client/claude-sdk-client.js";

export const DEFAULT_FAKE_CAPABILITIES = [
  "interrupt_receipt_v1",
  "interrupt_cancel_queued_v1",
  "msg_lifecycle_v1",
];

/**
 * Scripted stand-in for one Claude CLI process behind an SDK streaming-input query.
 * Tests push raw SDK frames with `emit`, then `await flush()` so the session pump
 * has processed them.
 */
export class FakeClaudeStreamingSession implements ClaudeSdkStreamingSession {
  readonly sent: ClaudeSdkUserMessage[] = [];
  readonly messages: AsyncIterable<unknown>;
  readonly interruptAndCancelQueued = vi.fn(
    async (): Promise<ClaudeSdkInterruptOutcome> => this.nextInterruptOutcome(),
  );
  readonly close = vi.fn(() => this.end());
  readonly resolveSelectedModel = vi.fn(async (_selectedValue: string) => ({
    resolvedRawModelId: this.resolvedRawModelId,
    resolution: (this.resolvedRawModelId ? "resolved" : "missing") as "resolved" | "missing",
  }));
  resolvedRawModelId: string | null = null;
  interruptOutcomes: Array<ClaudeSdkInterruptOutcome | ((session: FakeClaudeStreamingSession) => ClaudeSdkInterruptOutcome)> = [];
  onSend: ((message: ClaudeSdkUserMessage, session: FakeClaudeStreamingSession) => void) | null = null;
  private readonly queue: unknown[] = [];
  private wake: (() => void) | null = null;
  private ended = false;
  private failure: Error | null = null;
  private capabilitySnapshot: ReadonlySet<string> | null = null;

  constructor(readonly sessionId: string, private readonly advertisedCapabilities = DEFAULT_FAKE_CAPABILITIES) {
    this.messages = { [Symbol.asyncIterator]: () => this.read() };
  }

  get capabilities(): ReadonlySet<string> | null {
    return this.capabilitySnapshot;
  }

  get isEnded(): boolean {
    return this.ended;
  }

  send(message: ClaudeSdkUserMessage): void {
    if (this.ended) throw new Error("CLAUDE_SESSION_INPUT_CLOSED: fake input closed.");
    this.sent.push(message);
    this.onSend?.(message, this);
  }

  emit(...frames: unknown[]): void {
    this.queue.push(...frames);
    this.signal();
  }

  /** Emits `system/init` for a new CLI turn. */
  init(): void {
    this.emit({ type: "system", subtype: "init", session_id: this.sessionId, capabilities: this.advertisedCapabilities });
  }

  assistantText(text: string, id = `msg-${Math.random().toString(16).slice(2)}`): void {
    this.emit({
      type: "assistant",
      session_id: this.sessionId,
      message: { id, role: "assistant", content: [{ type: "text", text }] },
    });
  }

  result(answers: string[], extra: Record<string, unknown> = {}): void {
    this.emit({
      type: "result",
      subtype: "success",
      session_id: this.sessionId,
      user_message_uuids: answers,
      terminal_reason: "completed",
      ...extra,
    });
  }

  /** A full CLI turn answering every message sent so far and not yet answered. */
  completeTurn(text: string, answers: string[] = this.sent.map((message) => message.uuid)): void {
    this.init();
    this.assistantText(text);
    this.result(answers);
  }

  end(): void {
    this.ended = true;
    this.signal();
  }

  fail(error: Error): void {
    this.failure = error;
    this.ended = true;
    this.signal();
  }

  private nextInterruptOutcome(): ClaudeSdkInterruptOutcome {
    const next = this.interruptOutcomes.shift();
    if (!next) return { stillQueued: [], cancelled: [] };
    return typeof next === "function" ? next(this) : next;
  }

  private async *read(): AsyncGenerator<unknown> {
    while (true) {
      const frame = this.queue.shift();
      if (frame !== undefined) {
        const payload = frame as Record<string, unknown>;
        if (!this.capabilitySnapshot && payload.type === "system" && payload.subtype === "init") {
          this.capabilitySnapshot = new Set((payload.capabilities as string[] | undefined) ?? []);
        }
        yield frame;
        continue;
      }
      if (this.failure) throw this.failure;
      if (this.ended) return;
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

export type FakeClaudeSdkClient = {
  openStreamingSession: ReturnType<typeof vi.fn>;
  getSessionMessages: ReturnType<typeof vi.fn>;
  listModels: ReturnType<typeof vi.fn>;
  sessions: Array<{ options: ClaudeSdkStreamingSessionOptions; session: FakeClaudeStreamingSession }>;
  /** Most recently opened fake process. */
  readonly current: FakeClaudeStreamingSession;
};

export const createFakeClaudeSdkClient = (input: {
  /** Session id the fake CLI reports; defaults to the binding's session id. */
  providerSessionId?: string;
  capabilities?: string[];
  onOpen?: (session: FakeClaudeStreamingSession, options: ClaudeSdkStreamingSessionOptions) => void;
}): FakeClaudeSdkClient => {
  const sessions: FakeClaudeSdkClient["sessions"] = [];
  const client = {
    sessions,
    openStreamingSession: vi.fn(async (options: ClaudeSdkStreamingSessionOptions) => {
      const session = new FakeClaudeStreamingSession(
        input.providerSessionId ?? options.sessionBinding.sessionId,
        input.capabilities,
      );
      sessions.push({ options, session });
      input.onOpen?.(session, options);
      return session;
    }),
    getSessionMessages: vi.fn(async () => null),
    listModels: vi.fn(async () => []),
    get current(): FakeClaudeStreamingSession {
      const last = sessions.at(-1);
      if (!last) throw new Error("No fake Claude streaming session has been opened.");
      return last.session;
    },
  };
  return client;
};

/** Lets the session pump drain every emitted frame (it awaits per frame). */
export const flushClaudeSession = async (rounds = 8): Promise<void> => {
  for (let index = 0; index < rounds; index += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
};
