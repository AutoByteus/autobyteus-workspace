import { randomUUID } from "node:crypto";
import type {
  ApplicationExecutionEventFamily,
  ApplicationExecutionProducer,
  ApplicationRunBindingSummary,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationExecutionEventJournalStore } from "../stores/application-execution-event-journal-store.js";
import type { ApplicationExecutionEventPayload } from "../domain/models.js";
import {
  ApplicationExecutionEventDispatchService,
  getApplicationExecutionEventDispatchService,
} from "./application-execution-event-dispatch-service.js";

export class ApplicationExecutionEventIngressService {
  constructor(
    private readonly dependencies: {
      journalStore?: ApplicationExecutionEventJournalStore;
      dispatchService?: ApplicationExecutionEventDispatchService;
    } = {},
  ) {}

  private get journalStore(): ApplicationExecutionEventJournalStore {
    return this.dependencies.journalStore ?? new ApplicationExecutionEventJournalStore();
  }

  private get dispatchService(): ApplicationExecutionEventDispatchService {
    return this.dependencies.dispatchService ?? getApplicationExecutionEventDispatchService();
  }

  async appendBindingLifecycleEvent(input: {
    family: ApplicationExecutionEventFamily;
    binding: ApplicationRunBindingSummary;
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
    binding: ApplicationRunBindingSummary;
    producer: ApplicationExecutionProducer | null;
    payload: ApplicationExecutionEventPayload;
  }): Promise<void> {
    await this.journalStore.appendEventAwaitable(input.applicationId, {
      eventId: randomUUID(),
      applicationId: input.applicationId,
      family: input.family,
      publishedAt: new Date().toISOString(),
      binding: structuredClone(input.binding),
      producer: input.producer ? structuredClone(input.producer) : null,
      payload: structuredClone(input.payload),
    });
    this.dispatchService.schedule(input.applicationId);
  }
}
