import { randomUUID } from "node:crypto";
import type {
  ApplicationExecutionEventFamily,
  ApplicationExecutionProducer,
  ApplicationRunBindingSummary,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../stores/application-run-lookup-store.js";
import { ApplicationExecutionEventJournalStore } from "../stores/application-execution-event-journal-store.js";
import type { ApplicationExecutionContext, ApplicationExecutionEventPayload } from "../domain/models.js";
import { APPLICATION_EXECUTION_CONTEXT_KEY } from "../domain/models.js";
import { normalizeArtifactPublication } from "./application-artifact-publication-validator.js";
import {
  ApplicationExecutionEventDispatchService,
  getApplicationExecutionEventDispatchService,
} from "./application-execution-event-dispatch-service.js";

const normalizeExecutionContext = (value: unknown): ApplicationExecutionContext | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const producer = record.producer;
  if (!producer || typeof producer !== "object" || Array.isArray(producer)) {
    return null;
  }
  const producerRecord = producer as Record<string, unknown>;
  if (
    typeof record.applicationId !== "string"
    || typeof record.bindingId !== "string"
    || typeof record.executionRef !== "string"
    || typeof producerRecord.memberRouteKey !== "string"
    || (producerRecord.memberName !== null && producerRecord.memberName !== undefined && typeof producerRecord.memberName !== "string")
    || (producerRecord.displayName !== null && producerRecord.displayName !== undefined && typeof producerRecord.displayName !== "string")
    || !Array.isArray(producerRecord.teamPath)
    || (producerRecord.runtimeKind !== "AGENT" && producerRecord.runtimeKind !== "AGENT_TEAM_MEMBER")
  ) {
    return null;
  }

  return {
    applicationId: record.applicationId,
    bindingId: record.bindingId,
    executionRef: record.executionRef,
    producer: {
      memberRouteKey: producerRecord.memberRouteKey,
      memberName: typeof producerRecord.memberName === "string" ? producerRecord.memberName : null,
      displayName: typeof producerRecord.displayName === "string" ? producerRecord.displayName : null,
      teamPath: producerRecord.teamPath.filter((entry): entry is string => typeof entry === "string"),
      runtimeKind: producerRecord.runtimeKind,
    },
  };
};

export class ApplicationExecutionEventIngressService {
  constructor(
    private readonly dependencies: {
      bindingStore?: ApplicationRunBindingStore;
      lookupStore?: ApplicationRunLookupStore;
      journalStore?: ApplicationExecutionEventJournalStore;
      dispatchService?: ApplicationExecutionEventDispatchService;
    } = {},
  ) {}

  private get bindingStore(): ApplicationRunBindingStore {
    return this.dependencies.bindingStore ?? new ApplicationRunBindingStore();
  }

  private get lookupStore(): ApplicationRunLookupStore {
    return this.dependencies.lookupStore ?? new ApplicationRunLookupStore();
  }

  private get journalStore(): ApplicationExecutionEventJournalStore {
    return this.dependencies.journalStore ?? new ApplicationExecutionEventJournalStore();
  }

  private get dispatchService(): ApplicationExecutionEventDispatchService {
    return this.dependencies.dispatchService ?? getApplicationExecutionEventDispatchService();
  }

  async appendRuntimeArtifactEvent(input: {
    runId: string;
    customData?: Record<string, unknown> | null;
    publication: unknown;
  }): Promise<ApplicationRunBindingSummary> {
    const lookup = this.lookupStore.getLookupByRunId(input.runId);
    if (!lookup) {
      throw new Error(`Runtime run '${input.runId}' is not bound to an application.`);
    }

    const binding = await this.bindingStore.getBinding(lookup.applicationId, lookup.bindingId);
    if (!binding) {
      throw new Error(`Application run binding '${lookup.bindingId}' was not found.`);
    }

    const executionContext = normalizeExecutionContext(
      input.customData?.[APPLICATION_EXECUTION_CONTEXT_KEY],
    );
    const publication = await normalizeArtifactPublication({
      publication: input.publication,
      applicationId: binding.applicationId,
    });

    await this.appendEvent({
      applicationId: binding.applicationId,
      executionRef: binding.executionRef,
      family: "ARTIFACT",
      binding,
      producer: executionContext?.producer ?? null,
      payload: publication,
    });

    return binding;
  }

  async appendBindingLifecycleEvent(input: {
    family: Exclude<ApplicationExecutionEventFamily, "ARTIFACT">;
    binding: ApplicationRunBindingSummary;
    producer?: ApplicationExecutionProducer | null;
    payload?: { reason?: string | null; errorMessage?: string | null } | null;
  }): Promise<void> {
    await this.appendEvent({
      applicationId: input.binding.applicationId,
      executionRef: input.binding.executionRef,
      family: input.family,
      binding: input.binding,
      producer: input.producer ?? null,
      payload: input.payload ?? {},
    });
  }

  private async appendEvent(input: {
    applicationId: string;
    executionRef: string;
    family: ApplicationExecutionEventFamily;
    binding: ApplicationRunBindingSummary;
    producer: ApplicationExecutionProducer | null;
    payload: unknown;
  }): Promise<void> {
    await this.journalStore
      .appendEventAwaitable(input.applicationId, {
        eventId: randomUUID(),
        applicationId: input.applicationId,
        executionRef: input.executionRef,
        family: input.family,
        publishedAt: new Date().toISOString(),
        binding: structuredClone(input.binding),
        producer: input.producer ? structuredClone(input.producer) : null,
        payload: structuredClone(input.payload) as ApplicationExecutionEventPayload,
      });
    this.dispatchService.schedule(input.applicationId);
  }
}
