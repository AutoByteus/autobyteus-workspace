/** Immutable exact-run admission callback, with permanent force-release closure. */
export class AgentRunExecutionAdmissionFence {
  private assertAllowed: (() => void) | null = null;
  private closed = false;
  bind(assertAllowed: () => void): void {
    if (this.assertAllowed && this.assertAllowed !== assertAllowed) throw new Error('AgentRun input ownership cannot be rebound.');
    this.assertAllowed = assertAllowed;
  }
  close(): void { this.closed = true; }
  assertOpen(): void {
    if (this.closed) throw new Error('TASK_LIFETIME_CLOSED: exact runtime release has fenced input.');
    this.assertAllowed?.();
  }
}
