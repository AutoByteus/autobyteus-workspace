import type { ApplicationRunBindingSummary } from "@autobyteus/application-sdk-contracts";
import type { ObservedRunLifecycleEvent } from "../../runtime-management/domain/observed-run-lifecycle-event.js";
import type { BoundRunRuntimeDescriptor } from "../domain/models.js";
import { ApplicationBoundRunLifecycleGateway } from "./application-bound-run-lifecycle-gateway.js";
import { ApplicationExecutionEventIngressService } from "./application-execution-event-ingress-service.js";
import { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../stores/application-run-lookup-store.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

type DeferredPromise = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};

type ObserverRegistration = {
  applicationId: string;
  stop: () => void;
  processing: Promise<void>;
  emitAttachedEventPending: boolean;
  initialAttachedEvent: Promise<void>;
  initialAttachedEventSettled: boolean;
  resolveInitialAttachedEvent: () => void;
  rejectInitialAttachedEvent: (error: unknown) => void;
};

const buildRuntimeDescriptor = (binding: ApplicationRunBindingSummary): BoundRunRuntimeDescriptor => ({
  runtimeSubject: binding.runtime.subject,
  runId: binding.runtime.runId,
});

const collectBindingRunIds = (binding: ApplicationRunBindingSummary): string[] =>
  Array.from(
    new Set([
      binding.runtime.runId,
      ...binding.runtime.members.map((member) => member.runId),
    ]),
  );

const createDeferredPromise = (): DeferredPromise => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

export class ApplicationRunObserverService {
  private static instance: ApplicationRunObserverService | null = null;

  static getInstance(
    dependencies: ConstructorParameters<typeof ApplicationRunObserverService>[0] = {},
  ): ApplicationRunObserverService {
    if (!ApplicationRunObserverService.instance) {
      ApplicationRunObserverService.instance = new ApplicationRunObserverService(dependencies);
    }
    return ApplicationRunObserverService.instance;
  }

  static resetInstance(): void {
    ApplicationRunObserverService.instance = null;
    cachedApplicationRunObserverService = null;
  }

  private readonly registrations = new Map<string, ObserverRegistration>();

  constructor(
    private readonly dependencies: {
      lifecycleGateway?: ApplicationBoundRunLifecycleGateway;
      bindingStore?: ApplicationRunBindingStore;
      lookupStore?: ApplicationRunLookupStore;
      ingressService?: ApplicationExecutionEventIngressService;
    } = {},
  ) {}

  private get lifecycleGateway(): ApplicationBoundRunLifecycleGateway {
    return this.dependencies.lifecycleGateway ?? new ApplicationBoundRunLifecycleGateway();
  }

  private get bindingStore(): ApplicationRunBindingStore {
    return this.dependencies.bindingStore ?? new ApplicationRunBindingStore();
  }

  private get lookupStore(): ApplicationRunLookupStore {
    return this.dependencies.lookupStore ?? new ApplicationRunLookupStore();
  }

  private get ingressService(): ApplicationExecutionEventIngressService {
    return this.dependencies.ingressService ?? new ApplicationExecutionEventIngressService();
  }

  async attachBinding(
    binding: ApplicationRunBindingSummary,
    options: { emitAttachedEvent?: boolean } = {},
  ): Promise<boolean> {
    await this.detachBinding(binding.bindingId);

    const emitAttachedEvent = Boolean(options.emitAttachedEvent);
    const initialAttachedEventDeferred = createDeferredPromise();
    const registration: ObserverRegistration = {
      applicationId: binding.applicationId,
      stop: () => undefined,
      processing: Promise.resolve(),
      emitAttachedEventPending: emitAttachedEvent,
      initialAttachedEvent: emitAttachedEvent ? initialAttachedEventDeferred.promise : Promise.resolve(),
      initialAttachedEventSettled: !emitAttachedEvent,
      resolveInitialAttachedEvent: () => {
        if (registration.initialAttachedEventSettled) {
          return;
        }
        registration.initialAttachedEventSettled = true;
        initialAttachedEventDeferred.resolve();
      },
      rejectInitialAttachedEvent: (error) => {
        if (registration.initialAttachedEventSettled) {
          return;
        }
        registration.initialAttachedEventSettled = true;
        initialAttachedEventDeferred.reject(error);
      },
    };
    this.registrations.set(binding.bindingId, registration);

    try {
      const stop = await this.lifecycleGateway.observeBoundRun(
        buildRuntimeDescriptor(binding),
        (event) => this.queueObservedEvent(binding.bindingId, event),
      );
      if (!stop) {
        this.registrations.delete(binding.bindingId);
        return false;
      }
      registration.stop = stop;
      if (emitAttachedEvent) {
        await registration.initialAttachedEvent;
      }
      return true;
    } catch (error) {
      registration.rejectInitialAttachedEvent(error);
      this.registrations.delete(binding.bindingId);
      throw error;
    }
  }

  async detachBinding(bindingId: string): Promise<void> {
    const registration = this.registrations.get(bindingId);
    if (!registration) {
      return;
    }
    this.registrations.delete(bindingId);
    try {
      registration.stop();
    } catch {
      // no-op
    }
    await registration.processing.catch(() => undefined);
  }

  private queueObservedEvent(bindingId: string, event: ObservedRunLifecycleEvent): void {
    const registration = this.registrations.get(bindingId);
    if (!registration) {
      return;
    }

    const nextProcessing = registration.processing.then(() => this.handleObservedEvent(bindingId, event));
    registration.processing = nextProcessing.catch((error) => {
      registration.rejectInitialAttachedEvent(error);
      logger.error(`Failed to process bound run lifecycle event for '${bindingId}': ${String(error)}`);
    });
  }

  private async handleObservedEvent(
    bindingId: string,
    event: ObservedRunLifecycleEvent,
  ): Promise<void> {
    const registration = this.registrations.get(bindingId);
    if (!registration) {
      return;
    }

    const currentBinding = await this.findBinding(bindingId);
    if (!currentBinding) {
      this.releaseRegistration(bindingId);
      return;
    }

    if (event.phase === "ATTACHED") {
      await this.handleAttached(bindingId, currentBinding);
      return;
    }
    if (event.phase === "FAILED") {
      await this.handleFailed(bindingId, currentBinding, event);
      return;
    }
    await this.handleTerminated(bindingId, currentBinding, event);
  }

  private async handleAttached(
    bindingId: string,
    binding: ApplicationRunBindingSummary,
  ): Promise<void> {
    const registration = this.registrations.get(bindingId);
    if (!registration) {
      return;
    }

    const attachedBinding: ApplicationRunBindingSummary = binding.status === "ATTACHED"
      ? binding
      : {
          ...binding,
          status: "ATTACHED",
          updatedAt: new Date().toISOString(),
          terminatedAt: null,
          lastErrorMessage: null,
        };

    if (attachedBinding !== binding) {
      await this.bindingStore.persistBinding(attachedBinding);
    }
    this.lookupStore.replaceBindingLookups(
      attachedBinding.applicationId,
      attachedBinding.bindingId,
      collectBindingRunIds(attachedBinding),
    );

    if (!registration.emitAttachedEventPending) {
      registration.resolveInitialAttachedEvent();
      return;
    }

    registration.emitAttachedEventPending = false;
    try {
      await this.ingressService.appendBindingLifecycleEvent({
        family: "RUN_STARTED",
        binding: attachedBinding,
        payload: {},
      });
      registration.resolveInitialAttachedEvent();
    } catch (error) {
      registration.rejectInitialAttachedEvent(error);
      throw error;
    }
  }

  private async handleFailed(
    bindingId: string,
    binding: ApplicationRunBindingSummary,
    event: ObservedRunLifecycleEvent,
  ): Promise<void> {
    if (binding.status === "TERMINATED" || binding.status === "ORPHANED") {
      this.releaseRegistration(bindingId);
      return;
    }

    const failedBinding: ApplicationRunBindingSummary = {
      ...binding,
      status: "FAILED",
      updatedAt: event.occurredAt,
      terminatedAt: null,
      lastErrorMessage: event.errorMessage ?? binding.lastErrorMessage,
    };
    await this.bindingStore.persistBinding(failedBinding);
    await this.ingressService.appendBindingLifecycleEvent({
      family: "RUN_FAILED",
      binding: failedBinding,
      payload: {
        errorMessage: event.errorMessage ?? binding.lastErrorMessage,
      },
    });
  }

  private async handleTerminated(
    bindingId: string,
    binding: ApplicationRunBindingSummary,
    event: ObservedRunLifecycleEvent,
  ): Promise<void> {
    if (binding.status === "TERMINATED" || binding.status === "ORPHANED") {
      this.releaseRegistration(bindingId);
      return;
    }

    const terminatedBinding: ApplicationRunBindingSummary = {
      ...binding,
      status: "TERMINATED",
      updatedAt: event.occurredAt,
      terminatedAt: event.occurredAt,
    };
    await this.bindingStore.persistBinding(terminatedBinding);
    this.lookupStore.removeBindingLookups(terminatedBinding.applicationId, terminatedBinding.bindingId);
    await this.ingressService.appendBindingLifecycleEvent({
      family: "RUN_TERMINATED",
      binding: terminatedBinding,
      payload: { reason: "runtime_terminated" },
    });
    this.releaseRegistration(bindingId);
  }

  private async findBinding(bindingId: string): Promise<ApplicationRunBindingSummary | null> {
    const registration = this.registrations.get(bindingId);
    if (!registration) {
      return null;
    }
    return this.bindingStore.getBinding(registration.applicationId, bindingId);
  }

  private releaseRegistration(bindingId: string): void {
    const registration = this.registrations.get(bindingId);
    if (!registration) {
      return;
    }
    this.registrations.delete(bindingId);
    registration.resolveInitialAttachedEvent();
    try {
      registration.stop();
    } catch {
      // no-op
    }
  }
}

let cachedApplicationRunObserverService: ApplicationRunObserverService | null = null;

export const getApplicationRunObserverService = (): ApplicationRunObserverService => {
  if (!cachedApplicationRunObserverService) {
    cachedApplicationRunObserverService = ApplicationRunObserverService.getInstance();
  }
  return cachedApplicationRunObserverService;
};
