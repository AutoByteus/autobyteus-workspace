import type { PreparedLocalExecutionTermination } from "../domain/prepared-local-execution-termination.js";

/**
 * A per-agent activation fence (AR-001): while an operation holds it, no activation of the agent
 * starts (activations wait for `held`). A pending activation is awaited once before the fence is
 * taken: a failed attempt kept for its retry never clears, so waiting on it again would spin; the
 * operation then reads the agent's state and decides itself.
 */
export class AgentActivationFence {
  private current: Promise<void> | null = null;

  get held(): Promise<void> | null { return this.current; }

  async run<T>(pendingActivation: () => Promise<unknown> | null, operation: () => Promise<T> | T): Promise<T> {
    let awaitedActivation = false;
    for (;;) {
      if (this.current) { await this.current; continue; }
      const pending = pendingActivation();
      if (pending && !awaitedActivation) {
        awaitedActivation = true;
        await pending.then(() => undefined, () => undefined);
        continue;
      }
      break;
    }
    let release!: () => void;
    this.current = new Promise<void>((resolve) => { release = resolve; });
    try { return await operation(); }
    finally { this.current = null; release(); }
  }
}

/**
 * The cause of an activation failure: its own code when it carries one, its message, and the
 * `<code>: <message>` description callers receive (the code is not repeated if the message starts with it).
 */
export const describeActivationFailure = (error: unknown): Readonly<{ code: string | null; message: string; description: string }> => {
  const message = error instanceof Error ? error.message : String(error);
  const raw = error instanceof Error && "code" in error ? (error as { code?: unknown }).code : undefined;
  const code = typeof raw === "string" && raw.trim() ? raw : null;
  return { code, message, description: code && !message.startsWith(code) ? `${code}: ${message}` : message };
};

export const completedLocalTermination = (
  finish: () => void,
): PreparedLocalExecutionTermination => Object.freeze({
  cancel: () => undefined,
  commit: () => Object.freeze({ finish: async () => {
    finish();
    return { accepted: true as const };
  } }),
});
