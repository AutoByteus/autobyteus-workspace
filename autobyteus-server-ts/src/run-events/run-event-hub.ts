import type { RunEvent, RunEventKind } from "./run-event-types.js";
import type { RunEventLog } from "./run-event-log.js";

export type RunEventListener<K extends RunEventKind = RunEventKind> = (event: RunEvent<K>) => Promise<void>;

/**
 * The node's run event hub (autobyteus-646 C-1b). `publish` appends the event to the log first, then tells each listener
 * subscribed to its kind, in this process, one after another. A listener's failure is logged and never stops the
 * others, the run or the publisher; `publish` never throws. Listeners hear live events only: nothing is replayed after a
 * restart (a listener that needs the past reads the log).
 */
export class RunEventHub {
  private readonly listeners = new Map<RunEventKind, Set<RunEventListener>>();

  constructor(private readonly dependencies: Readonly<{ log: Pick<RunEventLog, "append"> }>) {}

  async publish(event: RunEvent): Promise<void> {
    console.info(`Run event ${event.kind} for agent run '${event.agentRunId}'`);
    try {
      await this.dependencies.log.append(event);
    } catch (error) {
      console.warn(`Run events: the ${event.kind} event of agent run '${event.agentRunId}' could not be logged: ${String(error)}`);
    }
    for (const listener of [...this.listeners.get(event.kind) ?? []]) {
      try {
        await listener(event);
      } catch (error) {
        console.warn(`Run events: a ${event.kind} listener failed for agent run '${event.agentRunId}': ${String(error)}`);
      }
    }
  }

  subscribe<K extends RunEventKind>(kind: K, listener: RunEventListener<K>): () => void {
    const listeners = this.listeners.get(kind) ?? new Set<RunEventListener>();
    listeners.add(listener as RunEventListener);
    this.listeners.set(kind, listeners);
    return () => { listeners.delete(listener as RunEventListener); };
  }
}
