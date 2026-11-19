/**
 * Work whose answer was lost with a connection that recovers (autobyteus-533 D-W7, generalized in autobyteus-540
 * D-3): its stream holds it at a retryable loss and settles it, once, when the rebind has brought what decides it
 * (a Stop: the new connection's status; an agent send: the new connection's snapshot), or at once when the stream
 * is closed for good. No answer can arrive for held work: its socket is gone.
 */
export class HeldUntilRebind {
  private held: Array<() => void> = [];

  /** Holds one piece of work; `settle` is called once, when the holder settles. */
  hold(settle: () => void): void {
    this.held.push(settle);
  }

  /** Settles everything held, once each. */
  settle(): void {
    const held = this.held;
    this.held = [];
    for (const settle of held) settle();
  }
}
