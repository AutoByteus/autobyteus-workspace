import { ServerMessage } from "../models.js";
import type {
  AgentStreamEgressControlComposition,
  AgentStreamEgressControlExtensions,
  AgentStreamEgressObservation,
  StreamEgressMessage,
} from "./agent-stream-egress-control.js";
import { createAgentStreamEgressControlMessage } from "./agent-stream-egress-control.js";
import { createDefaultAgentStreamEgressControlComposition } from "./agent-stream-egress-control-composition.js";

export interface AgentStreamServerMessageSink<
  M extends StreamEgressMessage = ServerMessage,
> {
  send(message: M): void;
}

export type AgentStreamWebSocketEgressOptions<M extends StreamEgressMessage = ServerMessage> = {
  sendRaw: (payload: string) => void;
  serialize?: (message: M) => string;
  readIntervalMs?: () => number;
  onSendError?: (error: unknown) => void;
  onObserverError?: (error: unknown) => void;
  controlExtensions?: AgentStreamEgressControlExtensions;
};

export class AgentStreamWebSocketEgress<
  M extends StreamEgressMessage = ServerMessage,
> implements AgentStreamServerMessageSink<M> {
  private disposed = false;
  private readonly controls: AgentStreamEgressControlComposition<M>;
  private readonly onObserverError: (error: unknown) => void;

  constructor(private readonly options: AgentStreamWebSocketEgressOptions<M>) {
    this.controls = createDefaultAgentStreamEgressControlComposition<M>({
      readIntervalMs: options.readIntervalMs,
      onScheduledError: options.onSendError,
      extensions: options.controlExtensions,
    });
    this.onObserverError = options.onObserverError ?? (() => undefined);
  }

  send(message: M): void {
    if (this.disposed) {
      return;
    }

    const controlMessage = createAgentStreamEgressControlMessage(message);
    this.observe({ type: "MESSAGE_RECEIVED", message: controlMessage });
    for (const filter of this.controls.filters) {
      const decision = filter.evaluate(controlMessage);
      if (decision.action === "SUPPRESS") {
        this.observe({
          type: "MESSAGE_SUPPRESSED",
          message: controlMessage,
          reason: decision.reason,
        });
        return;
      }
    }
    this.controls.scheduler.accept(message, this.forward);
  }

  flush(): void {
    if (this.disposed) return;
    this.controls.scheduler.flush(this.forward);
    this.observe({ type: "FLUSHED" });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.controls.scheduler.dispose();
    this.controls.filters.forEach((filter) => filter.dispose?.());
    this.observe({ type: "DISPOSED" });
    this.controls.observers.forEach((observer) => {
      try {
        observer.dispose?.();
      } catch (error) {
        this.onObserverError(error);
      }
    });
  }

  private readonly forward = (message: M): void => {
    const serialized = this.options.serialize
      ? this.options.serialize(message)
      : (message as unknown as ServerMessage).toJson();
    this.options.sendRaw(serialized);
    this.observe({
      type: "MESSAGE_FORWARDED",
      message: createAgentStreamEgressControlMessage(message),
    });
  };

  private observe(observation: AgentStreamEgressObservation): void {
    const immutableObservation = Object.freeze(observation);
    this.controls.observers.forEach((observer) => {
      try {
        observer.observe(immutableObservation);
      } catch (error) {
        this.onObserverError(error);
      }
    });
  }
}
