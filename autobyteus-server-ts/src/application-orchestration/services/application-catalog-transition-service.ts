import type {
  ApplicationBundleCatalogCandidate,
  ApplicationBundleService,
} from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationAgentToolCatalog } from "../../application-agent-tools/services/application-agent-tool-catalog.js";
import type { ApplicationCatalogReconciliationService } from "../../application-platform/runtime/application-catalog-reconciliation-service.js";
import type { ApplicationDefinitionRuntimeReadiness } from "../../application-platform/runtime/application-definition-runtime-readiness.js";
import {
  buildApplicationCatalogTransitionPlan,
} from "../domain/application-catalog-transition-plan.js";
import type {
  ApplicationAvailabilityRecord,
  ApplicationAvailabilityService,
} from "./application-availability-service.js";
import {
  ApplicationReentryPreparationError,
  type ApplicationReentryParticipantToken,
  type ApplicationReentryService,
} from "./application-reentry-service.js";

export type ApplicationPackageCatalogMutation<T> = Readonly<{
  kind: "import" | "reload" | "remove";
  packageId: string;
  applyBeforeStage: () => Promise<T>;
  finalizeAfterCommit?: (value: T) => Promise<void>;
  rollbackSource: (value: T | undefined, cause: unknown) => Promise<void>;
}>;

export class ApplicationCatalogTransitionService {
  private transitionTail: Promise<void> = Promise.resolve();

  constructor(private readonly dependencies: Readonly<{
    bundleService: ApplicationBundleService;
    applicationAgentToolCatalog: ApplicationAgentToolCatalog;
    reentryService: ApplicationReentryService;
    catalogReconciliation: ApplicationCatalogReconciliationService;
    definitionReadiness: ApplicationDefinitionRuntimeReadiness;
    availabilityService: ApplicationAvailabilityService;
  }>) {}

  runPackageTransition<T>(mutation: ApplicationPackageCatalogMutation<T>): Promise<T> {
    return this.runExclusive(() => this.runPackageTransitionExclusive(mutation));
  }

  reloadAndReenter(applicationId: string): Promise<ApplicationAvailabilityRecord> {
    return this.runExclusive(async () => {
      const normalizedApplicationId = applicationId.trim();
      if (!normalizedApplicationId) throw new Error("applicationId is required.");
      let token: ApplicationReentryParticipantToken;
      try {
        token = await this.dependencies.reentryService
          .prepareParticipants([normalizedApplicationId]);
      } catch (error) {
        if (error instanceof ApplicationReentryPreparationError) {
          await this.dependencies.reentryService
            .quarantineParticipants(error.token, error);
        }
        return this.requireAvailability(normalizedApplicationId);
      }

      try {
        const candidate = await this.dependencies.bundleService
          .stageApplicationCatalog(normalizedApplicationId);
        await this.commitAndRecover(token, candidate, {
          recoverPreviouslyInactive: true,
        });
      } catch (error) {
        await this.dependencies.reentryService.quarantineParticipants(token, error);
      }
      return this.requireAvailability(normalizedApplicationId);
    });
  }

  private async runPackageTransitionExclusive<T>(
    mutation: ApplicationPackageCatalogMutation<T>,
  ): Promise<T> {
    const packageId = mutation.packageId.trim();
    if (!packageId) throw new Error("packageId is required.");
    const liveSnapshot = await this.dependencies.bundleService.getCatalogSnapshot();
    const oldApplicationIds = liveSnapshot.applications
      .filter((application) => application.packageId === packageId)
      .map((application) => application.id);
    let token: ApplicationReentryParticipantToken;
    try {
      token = await this.dependencies.reentryService
        .prepareParticipants(oldApplicationIds);
    } catch (error) {
      if (error instanceof ApplicationReentryPreparationError) {
        await this.dependencies.reentryService
          .quarantineParticipants(error.token, error);
      }
      throw error;
    }

    let appliedValue: T | undefined;
    try {
      appliedValue = await mutation.applyBeforeStage();
      const candidate = await this.dependencies.bundleService.stagePackageCatalog(packageId);
      await this.commitAndRecover(token, candidate);
    } catch (cause) {
      try {
        await mutation.rollbackSource(appliedValue, cause);
        const restored = await this.dependencies.bundleService.stagePackageCatalog(packageId);
        await this.commitAndRecover(token, restored);
      } catch (rollbackError) {
        await this.dependencies.reentryService.quarantineParticipants(token, rollbackError);
        throw new AggregateError(
          [cause, rollbackError],
          `Application package '${packageId}' transition and rollback failed.`,
        );
      }
      throw cause;
    }
    await mutation.finalizeAfterCommit?.(appliedValue as T);
    return appliedValue as T;
  }

  private async commitAndRecover(
    token: ApplicationReentryParticipantToken,
    candidate: ApplicationBundleCatalogCandidate,
    recoveryOptions: Readonly<{ recoverPreviouslyInactive?: boolean }> = {},
  ): Promise<void> {
    const transitionPlan = buildApplicationCatalogTransitionPlan({
      oldApplicationIds: token.participants.map((participant) => participant.applicationId),
      candidate,
    });
    const bundlePlan = this.dependencies.bundleService.prepareCatalogSlice(candidate);
    const toolDelta = this.dependencies.applicationAgentToolCatalog.prepareDelta({
      applications: candidate.applications,
      removeApplicationIds: transitionPlan.removedApplicationIds,
    });

    // Both commits apply already-validated in-memory assignments and must not yield.
    this.dependencies.bundleService.commitPreparedCatalogSlice(bundlePlan);
    this.dependencies.applicationAgentToolCatalog.commitPreparedDelta(toolDelta);

    const snapshot = await this.dependencies.bundleService.getCatalogSnapshot();
    await this.dependencies.catalogReconciliation.reconcile(snapshot);
    let readinessFailure: unknown = null;
    try {
      await this.dependencies.definitionReadiness.prepare();
    } catch (error) {
      readinessFailure = error;
    }
    const recoverableApplicationIds = transitionPlan.currentApplicationIds.filter(
      (applicationId) => this.dependencies.definitionReadiness
        .isApplicationReady(applicationId),
    );
    await this.dependencies.reentryService.recoverParticipants(
      token,
      transitionPlan.currentApplicationIds,
      recoverableApplicationIds,
      recoveryOptions,
    );
    if (readinessFailure) throw readinessFailure;
  }

  private async requireAvailability(
    applicationId: string,
  ): Promise<ApplicationAvailabilityRecord> {
    const availability = await this.dependencies.availabilityService
      .getAvailability(applicationId);
    if (!availability) {
      throw new Error(`Application '${applicationId}' is absent from availability state.`);
    }
    return availability;
  }

  private runExclusive<TResult>(work: () => Promise<TResult>): Promise<TResult> {
    const previous = this.transitionTail;
    let release!: () => void;
    this.transitionTail = new Promise<void>((resolve) => { release = resolve; });
    return previous
      .catch(() => undefined)
      .then(work)
      .finally(release);
  }
}
