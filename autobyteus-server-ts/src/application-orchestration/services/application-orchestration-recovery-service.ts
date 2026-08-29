import type { ApplicationAgentBindingRecord } from "../domain/models.js";
import type { ApplicationCatalogSnapshot } from "../../application-bundles/domain/application-catalog-snapshot.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import type { ApplicationExecutionEventIngressService } from "./application-execution-event-ingress-service.js";
import type { ApplicationRunObserverService } from "./application-run-observer-service.js";
import type { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import type { ApplicationRunLookupStore } from "../stores/application-run-lookup-store.js";
import type { ApplicationRunBindingTerminalTransitionService } from "./application-run-binding-terminal-transition-service.js";

export type ApplicationRecoveryOutcomeStatus = "RECOVERED" | "QUARANTINED" | "NO_PERSISTED_STATE";

export type ApplicationRecoveryOutcome = {
  applicationId: string;
  status: ApplicationRecoveryOutcomeStatus;
  detail: string | null;
};

const collectBindingRunIds = (binding: ApplicationAgentBindingRecord): string[] =>
  Array.from(
    new Set([
      binding.runtime.subject === "AGENT_RUN" ? binding.runtime.agentRunId : binding.runtime.teamRunId,
      ...binding.runtime.members.map((member) => member.agentRunId),
    ]),
  );

export class ApplicationOrchestrationRecoveryService {
  constructor(
    private readonly dependencies: {
      applicationBundleService: ApplicationBundleService;
      platformStateStore: ApplicationPlatformStateStore;
      bindingStore: ApplicationRunBindingStore;
      lookupStore: ApplicationRunLookupStore;
      runObserverService: ApplicationRunObserverService;
      ingressService: ApplicationExecutionEventIngressService;
      terminalTransitionService: ApplicationRunBindingTerminalTransitionService;
    },
  ) {}

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService;
  }

  private get platformStateStore(): ApplicationPlatformStateStore {
    return this.dependencies.platformStateStore;
  }

  private get bindingStore(): ApplicationRunBindingStore {
    return this.dependencies.bindingStore;
  }

  private get lookupStore(): ApplicationRunLookupStore {
    return this.dependencies.lookupStore;
  }

  private get runObserverService(): ApplicationRunObserverService {
    return this.dependencies.runObserverService;
  }

  private get ingressService(): ApplicationExecutionEventIngressService {
    return this.dependencies.ingressService;
  }

  private get terminalTransitionService(): ApplicationRunBindingTerminalTransitionService {
    return this.dependencies.terminalTransitionService;
  }

  async resumeBindings(
    snapshot?: ApplicationCatalogSnapshot | null,
    knownApplicationIds?: Iterable<string>,
  ): Promise<ApplicationRecoveryOutcome[]> {
    const effectiveSnapshot = snapshot ?? await this.applicationBundleService.getCatalogSnapshot();
    const persistedKnownApplicationIds = knownApplicationIds
      ? Array.from(knownApplicationIds)
      : await this.platformStateStore.listKnownApplicationIds();
    const applicationIds = new Set<string>([
      ...effectiveSnapshot.applications.map((application) => application.id),
      ...effectiveSnapshot.diagnostics.map((diagnostic) => diagnostic.applicationId),
      ...persistedKnownApplicationIds,
    ]);

    const outcomes: ApplicationRecoveryOutcome[] = [];
    for (const applicationId of Array.from(applicationIds).sort((left, right) => left.localeCompare(right))) {
      outcomes.push(await this.resumeStartupApplication(applicationId));
    }
    return outcomes;
  }

  async resumeApplication(applicationId: string): Promise<void> {
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
    binding: ApplicationAgentBindingRecord,
    reason: string,
    errorMessage: string | null,
  ): Promise<ApplicationAgentBindingRecord> {
    await this.runObserverService.detachBinding(binding.bindingId);
    const orphanedBinding = await this.terminalTransitionService.transition({
      applicationId: binding.applicationId,
      bindingId: binding.bindingId,
      status: "ORPHANED",
      reason,
      errorMessage,
    });
    if (!orphanedBinding) throw new Error(`Application run binding '${binding.bindingId}' was not found.`);
    return orphanedBinding;
  }

  private async resumeStartupApplication(applicationId: string): Promise<ApplicationRecoveryOutcome> {
    const presence = await this.platformStateStore.getExistingStatePresence(applicationId);
    if (presence === "ABSENT") {
      return {
        applicationId,
        status: "NO_PERSISTED_STATE",
        detail: null,
      };
    }

    try {
      await this.resumeApplication(applicationId);
      return {
        applicationId,
        status: "RECOVERED",
        detail: null,
      };
    } catch (error) {
      return {
        applicationId,
        status: "QUARANTINED",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
