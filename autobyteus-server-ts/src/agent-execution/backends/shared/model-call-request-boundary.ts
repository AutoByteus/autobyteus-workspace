/**
 * Tracks when the current model call's request went out, for runtimes that only expose
 * request-side boundaries (turn start, the previous call's usage, a completed tool) and the
 * call's own output events. The latest boundary before the call's first output is its request
 * start; the call's first output freezes it, so a later boundary inside the call cannot move it.
 */
export class ModelCallRequestBoundary {
  private boundaryAtMs: number | null = null;
  private outputStarted = false;

  /** A point after which a new model request goes out. Ignored once the call's output started. */
  markBoundary(atMs: number): void {
    if (this.outputStarted) return;
    this.boundaryAtMs = atMs;
  }

  /** The current call produced output; its request start is now fixed. */
  markOutput(): void {
    this.outputStarted = true;
  }

  /**
   * Ends the current call at `atMs` and returns its request start, or null when no boundary was
   * seen. The next call's request boundary opens at `atMs`.
   */
  completeCall(atMs: number): number | null {
    const requestStartAtMs = this.boundaryAtMs;
    this.boundaryAtMs = atMs;
    this.outputStarted = false;
    return requestStartAtMs;
  }

  /** Forgets all state; the next call needs a fresh boundary. */
  reset(): void {
    this.boundaryAtMs = null;
    this.outputStarted = false;
  }
}
