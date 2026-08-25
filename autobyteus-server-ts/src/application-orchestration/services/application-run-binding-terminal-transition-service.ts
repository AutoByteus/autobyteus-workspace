import type { ApplicationAgentBindingRecord } from "../domain/models.js";
import { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../stores/application-run-lookup-store.js";
import { ApplicationExecutionEventIngressService } from "./application-execution-event-ingress-service.js";
import {
  ApplicationRunBindingLifecycleHub,
  type ApplicationRunBindingTerminalStatus,
} from "./application-run-binding-lifecycle-hub.js";

const cloneBinding = (binding: ApplicationAgentBindingRecord): ApplicationAgentBindingRecord =>
  structuredClone(binding);

export class ApplicationRunBindingTerminalTransitionService {
  private readonly tails = new Map<string, Promise<void>>();

  constructor(private readonly dependencies: {
    bindingStore: ApplicationRunBindingStore;
    lookupStore: ApplicationRunLookupStore;
    ingressService: ApplicationExecutionEventIngressService;
    lifecycleHub: ApplicationRunBindingLifecycleHub;
  }) {}

  private get bindingStore(): ApplicationRunBindingStore {
    return this.dependencies.bindingStore;
  }

  private get lookupStore(): ApplicationRunLookupStore {
    return this.dependencies.lookupStore;
  }

  private get ingressService(): ApplicationExecutionEventIngressService {
    return this.dependencies.ingressService;
  }

  private get lifecycleHub(): ApplicationRunBindingLifecycleHub {
    return this.dependencies.lifecycleHub;
  }

  async transition(input: {
    applicationId: string;
    bindingId: string;
    status: ApplicationRunBindingTerminalStatus;
    occurredAt?: string;
    reason: string;
    errorMessage?: string | null;
  }): Promise<ApplicationAgentBindingRecord | null> {
    const key = `${input.applicationId}\u0000${input.bindingId}`;
    const previous = this.tails.get(key) ?? Promise.resolve();
    let releaseTail!: () => void;
    const tail = new Promise<void>((resolve) => { releaseTail = resolve; });
    const chain = previous.catch(() => undefined).then(() => tail);
    this.tails.set(key, chain);
    await previous.catch(() => undefined);
    try {
      return await this.performTransition(input);
    } finally {
      releaseTail();
      if (this.tails.get(key) === chain) this.tails.delete(key);
    }
  }

  private async performTransition(input: {
    applicationId: string;
    bindingId: string;
    status: ApplicationRunBindingTerminalStatus;
    occurredAt?: string;
    reason: string;
    errorMessage?: string | null;
  }): Promise<ApplicationAgentBindingRecord | null> {
    const current = await this.bindingStore.getBinding(input.applicationId, input.bindingId);
    if (!current) return null;
    if (current.status === "TERMINATED" || current.status === "ORPHANED") {
      return cloneBinding(current);
    }

    const occurredAt = input.occurredAt ?? new Date().toISOString();
    const terminal: ApplicationAgentBindingRecord = {
      ...current,
      status: input.status,
      updatedAt: occurredAt,
      terminatedAt: occurredAt,
      lastErrorMessage: input.errorMessage ?? current.lastErrorMessage,
    };
    await this.bindingStore.persistBinding(terminal);
    this.lookupStore.removeBindingLookups(input.applicationId, input.bindingId);

    let journalFailure: unknown = null;
    try {
      await this.ingressService.appendBindingLifecycleEvent({
        family: input.status === "TERMINATED" ? "RUN_TERMINATED" : "RUN_ORPHANED",
        binding: terminal,
        payload: {
          reason: input.reason,
          ...(input.status === "ORPHANED" ? { errorMessage: input.errorMessage ?? current.lastErrorMessage } : {}),
        },
      });
    } catch (error) {
      journalFailure = error;
    }

    this.lifecycleHub.publishTerminal({
      applicationId: input.applicationId,
      bindingId: input.bindingId,
      status: input.status,
    });
    if (journalFailure) throw journalFailure;
    return cloneBinding(terminal);
  }
}
