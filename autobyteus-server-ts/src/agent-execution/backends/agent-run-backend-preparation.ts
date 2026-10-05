import type { AgentRunBackend } from "./agent-run-backend.js";

export type BackendPreparationRelease =
  | Readonly<{ kind: "released" | "pending" }>
  | Readonly<{ kind: "failed"; error: Error }>;
export interface AgentRunBackendPreparation {
  prepare(): Promise<AgentRunBackend>;
  cancel(): void;
  release(): Promise<BackendPreparationRelease>;
}

/** Sequencing only. The concrete factory retains every acquired provider resource. */
export function createBackendPreparation(input: {
  prepare(assertAccepting: () => void): Promise<AgentRunBackend>;
  releaseResources(): Promise<void>;
}): AgentRunBackendPreparation {
  let callbacks: typeof input | null = input;
  let cancelled = false;
  let settled = false;
  let preparation: Promise<AgentRunBackend> | null = null;
  let releasing: Promise<BackendPreparationRelease> | null = null;
  let released = false;
  const assertAccepting = () => {
    if (cancelled) throw new Error("AgentRun backend preparation was cancelled.");
  };
  const operation: AgentRunBackendPreparation = Object.freeze({
    prepare: () => {
      if (preparation) return preparation;
      try { assertAccepting(); } catch (error) { return Promise.reject(error); }
      preparation = callbacks!.prepare(assertAccepting).then((backend) => {
        assertAccepting();
        return backend;
      }).finally(() => {
        settled = true;
        if (cancelled) void operation.release();
      });
      return preparation;
    },
    cancel: () => { cancelled = true; },
    release: () => {
      cancelled = true;
      if (released) return Promise.resolve({ kind: "released" as const });
      if (releasing) return releasing;
      const attempt = (async (): Promise<BackendPreparationRelease> => {
        try {
          await callbacks!.releaseResources();
          if (preparation && !settled) return { kind: "pending" };
          released = true;
          callbacks = null; input = null as never; preparation = null;
          return { kind: "released" };
        } catch (error) {
          return { kind: "failed", error: error instanceof Error ? error : new Error(String(error)) };
        }
      })();
      releasing = attempt;
      void attempt.finally(() => { if (releasing === attempt) releasing = null; });
      return attempt;
    },
  });
  return operation;
}
