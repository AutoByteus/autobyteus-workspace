import type { ApplicationRunBindingSummary } from "@autobyteus/application-sdk-contracts";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { ApplicationExecutionEventIngressService } from "./application-execution-event-ingress-service.js";
import { ApplicationRunObserverService, getApplicationRunObserverService } from "./application-run-observer-service.js";
import { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../stores/application-run-lookup-store.js";

const collectBindingRunIds = (binding: ApplicationRunBindingSummary): string[] =>
  Array.from(
    new Set([
      binding.runtime.runId,
      ...binding.runtime.members.map((member) => member.runId),
    ]),
  );

export class ApplicationOrchestrationRecoveryService {
  private static instance: ApplicationOrchestrationRecoveryService | null = null;

  static getInstance(
    dependencies: ConstructorParameters<typeof ApplicationOrchestrationRecoveryService>[0] = {},
  ): ApplicationOrchestrationRecoveryService {
    if (!ApplicationOrchestrationRecoveryService.instance) {
      ApplicationOrchestrationRecoveryService.instance = new ApplicationOrchestrationRecoveryService(dependencies);
    }
    return ApplicationOrchestrationRecoveryService.instance;
  }

  static resetInstance(): void {
    ApplicationOrchestrationRecoveryService.instance = null;
    cachedApplicationOrchestrationRecoveryService = null;
  }

  constructor(
    private readonly dependencies: {
      applicationBundleService?: ApplicationBundleService;
      bindingStore?: ApplicationRunBindingStore;
      lookupStore?: ApplicationRunLookupStore;
      runObserverService?: ApplicationRunObserverService;
      ingressService?: ApplicationExecutionEventIngressService;
    } = {},
  ) {}

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get bindingStore(): ApplicationRunBindingStore {
    return this.dependencies.bindingStore ?? new ApplicationRunBindingStore();
  }

  private get lookupStore(): ApplicationRunLookupStore {
    return this.dependencies.lookupStore ?? new ApplicationRunLookupStore();
  }

  private get runObserverService(): ApplicationRunObserverService {
    return this.dependencies.runObserverService ?? getApplicationRunObserverService();
  }

  private get ingressService(): ApplicationExecutionEventIngressService {
    return this.dependencies.ingressService ?? new ApplicationExecutionEventIngressService();
  }

  async resumeBindings(): Promise<void> {
    const applications = await this.applicationBundleService.listApplications();
    for (const application of applications) {
      await this.resumeApplicationBindings(application.id);
    }
  }

  private async resumeApplicationBindings(applicationId: string): Promise<void> {
    const bindings = await this.bindingStore.listNonterminalBindings(applicationId);
    this.lookupStore.clearApplication(applicationId);

    for (const binding of bindings) {
      this.lookupStore.replaceBindingLookups(applicationId, binding.bindingId, collectBindingRunIds(binding));
      let attached = false;
      let errorMessage: string | null = null;
      try {
        attached = await this.runObserverService.attachBinding(binding, { emitAttachedEvent: false });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }
      if (attached) {
        continue;
      }
      await this.markBindingOrphaned(binding, "recovery_unavailable", errorMessage);
    }
  }

  async markBindingOrphaned(
    binding: ApplicationRunBindingSummary,
    reason: string,
    errorMessage: string | null,
  ): Promise<ApplicationRunBindingSummary> {
    await this.runObserverService.detachBinding(binding.bindingId);
    const now = new Date().toISOString();
    const orphanedBinding: ApplicationRunBindingSummary = {
      ...binding,
      status: "ORPHANED",
      updatedAt: now,
      terminatedAt: now,
      lastErrorMessage: errorMessage ?? binding.lastErrorMessage,
    };
    await this.bindingStore.persistBinding(orphanedBinding);
    this.lookupStore.removeBindingLookups(orphanedBinding.applicationId, orphanedBinding.bindingId);
    await this.ingressService.appendBindingLifecycleEvent({
      family: "RUN_ORPHANED",
      binding: orphanedBinding,
      payload: {
        reason,
        errorMessage: errorMessage ?? binding.lastErrorMessage,
      },
    });
    return orphanedBinding;
  }
}

let cachedApplicationOrchestrationRecoveryService: ApplicationOrchestrationRecoveryService | null = null;

export const getApplicationOrchestrationRecoveryService = (): ApplicationOrchestrationRecoveryService => {
  if (!cachedApplicationOrchestrationRecoveryService) {
    cachedApplicationOrchestrationRecoveryService = ApplicationOrchestrationRecoveryService.getInstance();
  }
  return cachedApplicationOrchestrationRecoveryService;
};
