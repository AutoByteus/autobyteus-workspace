import type {
  ApplicationAgentEventStreamObserver,
  ApplicationAgentEventStreamClose,
  ApplicationAgentEventStreamError,
  ApplicationAgentEvent,
} from "@autobyteus/application-sdk-contracts";

import { APPLICATION_AGENT_STREAM_OBSERVER_QUEUE_LIMIT } from "../../application-communication-limits.js";

export { APPLICATION_AGENT_STREAM_OBSERVER_QUEUE_LIMIT } from "../../application-communication-limits.js";

type ObserverNotification =
  | { kind: "event"; value: ApplicationAgentEvent }
  | { kind: "error"; value: ApplicationAgentEventStreamError }
  | { kind: "closed"; value: ApplicationAgentEventStreamClose };

type Registration = {
  state: "PENDING" | "ACTIVE";
  observer: ApplicationAgentEventStreamObserver;
  queue: ObserverNotification[];
  draining: boolean;
  cancel: () => Promise<void>;
  finalize: () => void;
};

export class ApplicationAgentStreamObserverRegistry {
  private readonly registrations = new Map<string, Registration>();

  registerPending(
    subscriptionId: string,
    observer: ApplicationAgentEventStreamObserver,
    cancel: () => Promise<void>,
    finalize: () => void = () => undefined,
  ): void {
    if (this.registrations.has(subscriptionId)) throw new Error("Agent stream observer ID is already registered.");
    this.registrations.set(subscriptionId, {
      state: "PENDING",
      observer,
      queue: [],
      draining: false,
      cancel,
      finalize,
    });
  }

  activate(subscriptionId: string): boolean {
    const registration = this.registrations.get(subscriptionId);
    if (!registration || registration.state !== "PENDING") return false;
    registration.state = "ACTIVE";
    setTimeout(() => this.scheduleDrain(subscriptionId, registration), 0);
    return true;
  }

  remove(subscriptionId: string): void {
    const registration = this.registrations.get(subscriptionId);
    if (!registration) return;
    this.registrations.delete(subscriptionId);
    registration.finalize();
  }

  dispatchEvent(subscriptionId: string, event: ApplicationAgentEvent): void {
    this.enqueue(subscriptionId, { kind: "event", value: event });
  }

  dispatchError(subscriptionId: string, error: ApplicationAgentEventStreamError): void {
    this.enqueue(subscriptionId, { kind: "error", value: error });
  }

  dispatchClosed(subscriptionId: string, close: ApplicationAgentEventStreamClose): void {
    this.enqueue(subscriptionId, { kind: "closed", value: close });
  }

  async closeAll(): Promise<void> {
    const registrations = Array.from(this.registrations.values());
    this.registrations.clear();
    for (const registration of registrations) registration.finalize();
    await Promise.allSettled(registrations.map((registration) => registration.cancel()));
  }

  private enqueue(subscriptionId: string, notification: ObserverNotification): void {
    const registration = this.registrations.get(subscriptionId);
    if (!registration) return;
    if (registration.queue.length >= APPLICATION_AGENT_STREAM_OBSERVER_QUEUE_LIMIT) {
      this.registrations.delete(subscriptionId);
      registration.finalize();
      void registration.cancel();
      return;
    }
    registration.queue.push(notification);
    if (registration.state === "ACTIVE") this.scheduleDrain(subscriptionId, registration);
  }

  private scheduleDrain(subscriptionId: string, registration: Registration): void {
    if (registration.draining || registration.state !== "ACTIVE") return;
    registration.draining = true;
    queueMicrotask(() => { void this.drain(subscriptionId, registration); });
  }

  private async drain(subscriptionId: string, registration: Registration): Promise<void> {
    try {
      while (this.registrations.get(subscriptionId) === registration && registration.queue.length > 0) {
        const notification = registration.queue.shift()!;
        if (notification.kind === "event") await registration.observer.onEvent(notification.value);
        if (notification.kind === "error") await registration.observer.onError?.(notification.value);
        if (notification.kind === "closed") {
          this.registrations.delete(subscriptionId);
          registration.finalize();
          await registration.observer.onClosed?.(notification.value);
          return;
        }
      }
    } catch {
      this.registrations.delete(subscriptionId);
      registration.finalize();
      await registration.cancel().catch(() => undefined);
    } finally {
      registration.draining = false;
      if (this.registrations.get(subscriptionId) === registration && registration.queue.length > 0) {
        this.scheduleDrain(subscriptionId, registration);
      }
    }
  }
}
