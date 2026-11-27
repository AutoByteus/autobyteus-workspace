import { AgentRunEventType, type AgentRunEvent } from "../../domain/agent-run-event.js";
import { USAGE_LIMIT_ERROR_KIND } from "../../domain/agent-run-error-kind.js";

/** Whether a runtime's model is blocked now, by its limits read (0 tokens); the composition binds the node's reading. */
export type ModelBlockedReading = Readonly<{ isModelBlocked(runtimeKind: string, llmModelIdentifier: string): Promise<boolean> }>;

let bound: ModelBlockedReading | null = null;

/** Binds the node's limits reading until `close()` (the server composition). */
export const configureModelBlockedReading = (reading: ModelBlockedReading): Readonly<{ close(): void }> => {
  if (bound) throw new Error("The model-blocked reading is already configured.");
  bound = reading;
  return Object.freeze({ close: () => { if (bound === reading) bound = null; } });
};

/** The process's reading: nothing is blocked on a server that does not compose it. */
export const PROCESS_MODEL_BLOCKED_READING: ModelBlockedReading = Object.freeze({
  isModelBlocked: (runtimeKind: string, llmModelIdentifier: string) => bound?.isModelBlocked(runtimeKind, llmModelIdentifier) ?? Promise.resolve(false),
});

const isTerminalUnclassified = (event: AgentRunEvent): boolean => event.eventType === AgentRunEventType.ERROR
  && event.payload.error_effect === "terminal" && event.payload.error_kind === undefined;

const turnOf = (event: AgentRunEvent): string | null =>
  typeof event.payload.turn_id === "string" && event.payload.turn_id.trim() ? event.payload.turn_id.trim() : null;

/**
 * The late usage-limit classification of a backend whose runtime gives no structured signal (autobyteus-646 R-13, R-16:
 * Antigravity, Grok, and Claude, whose Agent SDK signal has no recorded payload yet). The backend's `ERROR` goes out at
 * once, as before; for each terminal one of a turn, this asks the runtime's limits read, detached, and when the run's
 * model shows blocked, delivers `ERROR_CLASSIFIED { turn_id, error_kind: "usage_limit" }` through the backend's own
 * delivery. Nothing is emitted for an unrelated error. Each turn is read at most once.
 */
export class LateUsageLimitClassification {
  private readonly readTurns = new Set<string>();

  constructor(private readonly options: Readonly<{
    runId: string;
    runtimeKind: string;
    llmModelIdentifier: () => string;
    /** The backend's own delivery, in its event order. */
    deliver(events: readonly AgentRunEvent[]): void;
    reading?: ModelBlockedReading;
  }>) {}

  /** Looks at a batch the backend delivered. */
  observe(events: readonly AgentRunEvent[]): void {
    for (const event of events) {
      if (!isTerminalUnclassified(event)) continue;
      const turnId = turnOf(event) ?? `at:${new Date().toISOString().slice(0, 19)}`;
      if (this.readTurns.has(turnId)) continue;
      this.readTurns.add(turnId);
      if (this.readTurns.size > 32) this.readTurns.delete(this.readTurns.values().next().value!);
      void this.classify(turnOf(event));
    }
  }

  private async classify(turnId: string | null): Promise<void> {
    const model = this.options.llmModelIdentifier();
    const blocked = await (this.options.reading ?? PROCESS_MODEL_BLOCKED_READING).isModelBlocked(this.options.runtimeKind, model).catch((error: unknown) => {
      console.debug(`Run '${this.options.runId}': the ${this.options.runtimeKind} limits read after a turn error failed: ${String(error)}`);
      return false;
    });
    console.debug(`Run '${this.options.runId}': ${this.options.runtimeKind} · ${model} is ${blocked ? "blocked: a usage limit" : "not blocked"} after a turn error.`);
    if (!blocked) return;
    this.options.deliver([{ eventType: AgentRunEventType.ERROR_CLASSIFIED, runId: this.options.runId, statusHint: null,
      payload: { ...(turnId ? { turn_id: turnId } : {}), error_kind: USAGE_LIMIT_ERROR_KIND } }]);
  }
}
