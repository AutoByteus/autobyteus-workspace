import type { RootAgentExecutionCallbacks } from "../domain/root-agent-execution-callbacks.js";

type TaskAgentDurabilityEventGateState = "prepared" | "releasing" | "live" | "aborted";
type TaskAgentEventPublisher = RootAgentExecutionCallbacks["publishAgentEvent"];
type TaskAgentDurabilityEvent = Readonly<{
  identity: Parameters<TaskAgentEventPublisher>[0];
  event: Parameters<TaskAgentEventPublisher>[1];
}>;

/** Keeps task-Agent events private until the durable activation is externally visible. */
export class TaskAgentDurabilityEventGate {
  private state: TaskAgentDurabilityEventGateState = "prepared";
  private readonly retainedEvents: TaskAgentDurabilityEvent[] = [];

  constructor(private readonly forward: TaskAgentEventPublisher) {}

  readonly publish: TaskAgentEventPublisher = (identity, event): void => {
    if (this.state === "aborted") return;
    if (this.state === "live") {
      this.forward(identity, event);
      return;
    }
    this.retainedEvents.push(Object.freeze({ identity, event }));
  };

  releaseToLive(): boolean {
    if (this.state !== "prepared") return this.state === "live";
    this.state = "releasing";
    while (this.state === "releasing") {
      const retained = this.retainedEvents.shift();
      if (!retained) {
        this.state = "live";
        return true;
      }
      this.forward(retained.identity, retained.event);
    }
    return false;
  }

  abort(): void {
    if (this.state === "aborted") return;
    this.state = "aborted";
    this.retainedEvents.length = 0;
  }
}
