import type { CodexThread } from "./codex-thread.js";

/** Fences actual provider input, owns finite RPC continuations and requires canonical turn end. */
export class CodexThreadReleaseScope {
  private closed = false;
  private readonly pending = new Set<Promise<unknown>>();
  private releaseAttempt: Promise<void> | null = null;
  private unknownInputOutcome = false;
  constructor(private readonly thread: CodexThread) {}
  get isClosed(): boolean { return this.closed; }
  assertOpen(): void { if (this.closed) throw new Error("CODEX_THREAD_CLOSED: Provider input admission is closed."); }
  noteUnknownInputOutcome(): void { this.unknownInputOutcome = true; }
  observeCanonicalState(): void { this.unknownInputOutcome = false; }
  run<T>(action: () => Promise<T>): Promise<T> {
    try { this.assertOpen(); } catch (error) { return Promise.reject(error); }
    const work = action();
    this.pending.add(work);
    void work.finally(() => this.pending.delete(work)).catch(() => undefined);
    return work;
  }
  close(): void { this.closed = true; }
  release(): Promise<void> {
    this.close();
    if (this.releaseAttempt) return this.releaseAttempt;
    const deadline = Date.now() + 10_000;
    const attempt = (async () => {
      await this.bounded(Promise.allSettled([...this.pending]), deadline);
      if (this.unknownInputOutcome) throw new Error("Codex input outcome lacks canonical owned-turn proof.");
      const turnId = this.thread.activeTurnId;
      if (turnId) {
        await this.bounded(this.thread.interrupt(turnId), deadline);
        while (this.thread.activeTurnId) {
          await this.bounded(new Promise<void>(resolve => setTimeout(resolve, 20)), deadline);
        }
      }
    })();
    this.releaseAttempt = attempt;
    void attempt.finally(() => { if (this.releaseAttempt === attempt) this.releaseAttempt = null; }).catch(() => undefined);
    return attempt;
  }
  private async bounded<T>(work: Promise<T>, deadline: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([work, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Codex exact input/turn close proof pending.")), Math.max(0, deadline - Date.now()));
      })]);
    } finally { clearTimeout(timer); }
  }
}
