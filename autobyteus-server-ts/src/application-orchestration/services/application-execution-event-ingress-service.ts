import { toPublicApplicationAgentBinding, type ApplicationAgentBindingRecord } from "../domain/models.js";
import { randomUUID } from "node:crypto";
import type {
  ApplicationExecutionEventFamily,
  ApplicationExecutionProducer,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationExecutionEventJournalStore } from "../stores/application-execution-event-journal-store.js";
import type { ApplicationExecutionEventPayload } from "../domain/models.js";
import { ApplicationExecutionEventDispatchQueue } from "./application-execution-event-dispatch-queue.js";

export class ApplicationExecutionEventIngressService {
  constructor(
    private readonly dependencies: {
      journalStore: ApplicationExecutionEventJournalStore;
      dispatchQueue: ApplicationExecutionEventDispatchQueue;
    },
  ) {}

  private get journalStore(): ApplicationExecutionEventJournalStore {
    return this.dependencies.journalStore;
  }

  private get dispatchQueue(): ApplicationExecutionEventDispatchQueue {
    return this.dependencies.dispatchQueue;
  }

  async appendBindingLifecycleEvent(input: {
    family: ApplicationExecutionEventFamily;
    binding: ApplicationAgentBindingRecord;
    producer?: ApplicationExecutionProducer | null;
    payload?: { reason?: string | null; errorMessage?: string | null } | null;
  }): Promise<void> {
    await this.appendEvent({
      applicationId: input.binding.applicationId,
      family: input.family,
      binding: input.binding,
      producer: input.producer ?? null,
      payload: input.payload ?? {},
    });
  }

  private async appendEvent(input: {
    applicationId: string;
    family: ApplicationExecutionEventFamily;
    binding: ApplicationAgentBindingRecord;
    producer: ApplicationExecutionProducer | null;
    payload: ApplicationExecutionEventPayload;
  }): Promise<void> {
    await this.journalStore.appendEventAwaitable(input.applicationId, {
      eventId: randomUUID(),
      applicationId: input.applicationId,
      family: input.family,
      publishedAt: new Date().toISOString(),
      binding: toPublicApplicationAgentBinding(input.binding),
      producer: input.producer ? structuredClone(input.producer) : null,
      payload: structuredClone(input.payload),
    });
    this.dispatchQueue.enqueue(input.applicationId);
  }
}
