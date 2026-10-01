import type { ClaudeSdkSessionBinding } from "../../../../runtime-management/claude/client/claude-sdk-session-binding.js";
import type {
  ClaudeSdkInterruptOutcome,
  ClaudeSdkStreamingSession,
  ClaudeSdkUserMessage,
} from "../../../../runtime-management/claude/client/claude-sdk-streaming-session.js";
import type { ClaudeProviderSessionLifecycle } from "./claude-provider-session-lifecycle.js";
import {
  ClaudeProcessDiagnostics,
  enrichClaudeRuntimeErrorWithDiagnostics,
} from "./claude-process-diagnostics.js";

export type ClaudeSessionProcessState = "NOT_OPEN" | "OPENING" | "OPEN" | "CLOSED" | "EXITED";

export type ClaudeSessionProcessOpened = Readonly<{
  session: ClaudeSdkStreamingSession;
  binding: ClaudeSdkSessionBinding;
}>;

export type ClaudeSessionProcessInput = {
  lifecycle: ClaudeProviderSessionLifecycle;
  openSession: (
    binding: ClaudeSdkSessionBinding,
    diagnostics: ClaudeProcessDiagnostics,
  ) => Promise<ClaudeSdkStreamingSession>;
  onOpened: (opened: ClaudeSessionProcessOpened) => void;
  onFrame: (frame: unknown) => void | Promise<void>;
  onExit: (error: Error) => void;
};

const asError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

/**
 * Owns the one Claude CLI process of a run: lazy open (create, then resume), the single
 * frame pump, unexpected-exit detection, and close. It knows nothing about turns.
 */
export class ClaudeSessionProcess {
  private currentState: ClaudeSessionProcessState = "NOT_OPEN";
  private session: ClaudeSdkStreamingSession | null = null;
  private opening: Promise<void> | null = null;
  private pump: Promise<void> | null = null;
  private closing = false;

  constructor(private readonly input: ClaudeSessionProcessInput) {}

  get state(): ClaudeSessionProcessState {
    return this.currentState;
  }

  get isOpen(): boolean {
    return this.currentState === "OPEN" && this.session !== null;
  }

  get capabilities(): ReadonlySet<string> | null {
    return this.session?.capabilities ?? null;
  }

  ensureOpen(): Promise<void> {
    if (this.closing || this.currentState === "CLOSED") {
      return Promise.reject(new Error("CLAUDE_SESSION_CLOSED: Claude session process is closed."));
    }
    if (this.isOpen) {
      return Promise.resolve();
    }
    this.opening ??= this.open().finally(() => {
      this.opening = null;
    });
    return this.opening;
  }

  send(message: ClaudeSdkUserMessage): void {
    if (!this.isOpen) {
      throw new Error("CLAUDE_SESSION_NOT_OPEN: Claude session process is not open.");
    }
    this.session!.send(message);
  }

  interruptAndCancelQueued(): Promise<ClaudeSdkInterruptOutcome> {
    if (!this.isOpen) {
      return Promise.reject(new Error("CLAUDE_SESSION_NOT_OPEN: Claude session process is not open."));
    }
    return this.session!.interruptAndCancelQueued();
  }

  /** Terminate/close path: stops the CLI (and its background tasks) without emitting errors. */
  async close(): Promise<void> {
    this.closing = true;
    await this.opening?.catch(() => undefined);
    const session = this.session;
    session?.close();
    await this.pump?.catch(() => undefined);
    this.session = null;
    this.currentState = "CLOSED";
  }

  private async open(): Promise<void> {
    const previousState = this.currentState;
    this.currentState = "OPENING";
    const binding = this.input.lifecycle.buildOpenBinding();
    const diagnostics = new ClaudeProcessDiagnostics();
    let session: ClaudeSdkStreamingSession;
    try {
      session = await this.input.openSession(binding, diagnostics);
    } catch (error) {
      this.currentState = previousState;
      throw enrichClaudeRuntimeErrorWithDiagnostics(error, diagnostics);
    }
    if (this.closing) {
      session.close();
      throw new Error("CLAUDE_SESSION_CLOSED: Claude session process closed while opening.");
    }
    this.input.lifecycle.noteProcessOpened(binding);
    this.session = session;
    this.currentState = "OPEN";
    this.input.onOpened({ session, binding });
    this.pump = this.runPump(session, diagnostics);
  }

  private async runPump(
    session: ClaudeSdkStreamingSession,
    diagnostics: ClaudeProcessDiagnostics,
  ): Promise<void> {
    let failure: unknown = null;
    try {
      for await (const frame of session.messages) {
        await this.input.onFrame(frame);
      }
    } catch (error) {
      failure = error;
    }
    if (this.session !== session) {
      return;
    }
    this.session = null;
    this.input.lifecycle.noteProcessClosed();
    if (this.closing) {
      this.currentState = "CLOSED";
      return;
    }
    session.close();
    this.currentState = "EXITED";
    const cause = failure ?? new Error("CLAUDE_PROCESS_EXITED: Claude Code process ended unexpectedly.");
    this.input.onExit(asError(enrichClaudeRuntimeErrorWithDiagnostics(cause, diagnostics)));
  }
}
