import type { ClaudeSdkSessionBinding } from "../../../../runtime-management/claude/client/claude-sdk-session-binding.js";
import type { ClaudeSdkSessionOpening } from "../../../../runtime-management/claude/client/claude-sdk-session-opening.js";
import type { ClaudeSdkInterruptOutcome, ClaudeSdkStreamingSession, ClaudeSdkUserMessage } from "../../../../runtime-management/claude/client/claude-sdk-streaming-session.js";
import type { ClaudeProviderSessionLifecycle } from "./claude-provider-session-lifecycle.js";
import { ClaudeProcessDiagnostics, enrichClaudeRuntimeErrorWithDiagnostics } from "./claude-process-diagnostics.js";

export type ClaudeSessionProcessState = "NOT_OPEN" | "OPENING" | "OPEN" | "CLOSED" | "EXITED";
export type ClaudeSessionProcessOpened = Readonly<{ session: ClaudeSdkStreamingSession; binding: ClaudeSdkSessionBinding }>;
export type ClaudeSessionProcessInput = {
  lifecycle: ClaudeProviderSessionLifecycle;
  beginOpenSession(binding: ClaudeSdkSessionBinding, diagnostics: ClaudeProcessDiagnostics): ClaudeSdkSessionOpening;
  onOpened(opened: ClaudeSessionProcessOpened): void;
  onFrame(frame: unknown): void | Promise<void>;
  onExit(error: Error): void;
};
type Generation = { opening: ClaudeSdkSessionOpening; session: ClaudeSdkStreamingSession | null; pump: Promise<void> | null; releasing: Promise<void> | null };

/** Lazy CLI acquisition, exact retained generations, one frame consumer and bounded close proof. */
export class ClaudeSessionProcess {
  private currentState: ClaudeSessionProcessState = "NOT_OPEN";
  private current: Generation | null = null;
  private readonly generations = new Set<Generation>();
  private opening: Promise<void> | null = null;
  private closing = false;

  constructor(private readonly input: ClaudeSessionProcessInput) {}
  get state(): ClaudeSessionProcessState { return this.currentState; }
  get isOpen(): boolean { return this.currentState === "OPEN" && !this.closing && this.current?.session != null; }
  get capabilities(): ReadonlySet<string> | null { return this.current?.session?.capabilities ?? null; }

  ensureOpen(): Promise<void> {
    if (this.closing) return Promise.reject(new Error("CLAUDE_SESSION_CLOSED: Process closed."));
    if (this.isOpen) return Promise.resolve();
    this.opening ??= this.open().finally(() => {
      this.opening = null;
      if (this.closing) void this.close().catch(() => undefined);
    });
    return this.opening;
  }
  send(message: ClaudeSdkUserMessage): void {
    if (!this.isOpen) throw new Error("CLAUDE_SESSION_NOT_OPEN: Process is not open.");
    this.current!.session!.send(message);
  }
  interruptAndCancelQueued(): Promise<ClaudeSdkInterruptOutcome> {
    if (!this.isOpen) return Promise.reject(new Error("CLAUDE_SESSION_NOT_OPEN: Process is not open."));
    return this.current!.session!.interruptAndCancelQueued();
  }

  async close(): Promise<void> {
    this.closing = true;
    const deadline = Date.now() + 10_000;
    // release starts cancellation now, not after outstanding acquisition/pump drain.
    const results = await Promise.allSettled([...this.generations].map(generation => this.releaseGeneration(generation, deadline)));
    const errors = results.flatMap(result => result.status === "rejected" ? [result.reason] : []);
    if (errors.length) throw new AggregateError(errors, "Claude exact generation cleanup pending/failed.");
    if (this.opening) throw new Error("Claude acquisition continuation still pending.");
    this.current = null;
    this.currentState = "CLOSED";
  }

  private async open(): Promise<void> {
    // Unexpected old stream ending cannot be replaced while its physical proof is unresolved.
    await Promise.all([...this.generations].map(generation => this.releaseGeneration(generation, Date.now() + 10_000)));
    if (this.closing) throw new Error("CLAUDE_SESSION_CLOSED: Cancelled before opening.");
    this.currentState = "OPENING";
    const binding = this.input.lifecycle.buildOpenBinding();
    const diagnostics = new ClaudeProcessDiagnostics();
    const generation: Generation = { opening: this.input.beginOpenSession(binding, diagnostics), session: null, pump: null, releasing: null };
    this.generations.add(generation);
    this.current = generation;
    try {
      generation.session = await generation.opening.open(); // retain before any fallible binding/capture
      if (this.closing) throw new Error("CLAUDE_SESSION_CLOSED: Cancelled while opening.");
      this.input.lifecycle.noteProcessOpened(binding);
      this.input.onOpened({ session: generation.session, binding });
      this.currentState = "OPEN";
      generation.pump = this.runPump(generation, diagnostics);
    } catch (error) {
      this.currentState = "EXITED";
      let cleanupError: unknown;
      try { await this.releaseGeneration(generation, Date.now() + 10_000); } catch (fault) { cleanupError = fault; }
      throw enrichClaudeRuntimeErrorWithDiagnostics(cleanupError ? new AggregateError([error, cleanupError], "Claude opening and cleanup failed.") : error, diagnostics);
    }
  }

  private async runPump(generation: Generation, diagnostics: ClaudeProcessDiagnostics): Promise<void> {
    let failure: unknown = null;
    try {
      for await (const frame of generation.session!.messages) {
        if (this.closing || this.current !== generation) break;
        await this.input.onFrame(frame);
      }
    } catch (error) { failure = error; }
    this.input.lifecycle.noteProcessClosed();
    if (this.closing || this.current !== generation) return;
    this.currentState = "EXITED";
    // Do not await our own pump in its body. A subsequent lazy open joins this retained release.
    queueMicrotask(() => { void this.releaseGeneration(generation, Date.now() + 10_000).catch(() => undefined); });
    const cause = failure ?? new Error("CLAUDE_PROCESS_EXITED: Claude Code ended unexpectedly.");
    const enriched = enrichClaudeRuntimeErrorWithDiagnostics(cause, diagnostics);
    this.input.onExit(enriched instanceof Error ? enriched : new Error(String(enriched)));
  }

  private releaseGeneration(generation: Generation, deadline: number): Promise<void> {
    if (!this.generations.has(generation)) return Promise.resolve();
    if (generation.releasing) return generation.releasing;
    const release = generation.opening.release(); // sticky fence before any await
    const attempt = (async () => {
      const result = await release;
      if (result.kind !== "released") throw new Error(`${result.code}: ${result.message}`);
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([generation.pump ?? Promise.resolve(), new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Claude frame pump close proof pending.")), Math.max(0, deadline - Date.now()));
        })]);
      } finally { clearTimeout(timeout); }
      this.generations.delete(generation);
      generation.session = null; generation.pump = null;
    })();
    generation.releasing = attempt;
    void attempt.finally(() => { if (generation.releasing === attempt) generation.releasing = null; }).catch(() => undefined);
    return attempt;
  }
}
