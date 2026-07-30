import type { ApplicationCatalogSnapshot } from "../../application-bundles/domain/application-catalog-snapshot.js";
import type {
  ApplicationPlatformLifecycleDependencies,
  ApplicationPlatformLifecycleState,
} from "./application-platform-lifecycle-contracts.js";
export type { ApplicationPlatformLifecycleState } from "./application-platform-lifecycle-contracts.js";

export class ApplicationPlatformLifecycle {
  private state: ApplicationPlatformLifecycleState = "constructed";
  private failure: Error | null = null;
  private preparePromise: Promise<void> | null = null;
  private recoveryPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private catalogSnapshot: ApplicationCatalogSnapshot | null = null;
  private readyApplicationIds = new Set<string>();

  constructor(private readonly dependencies: ApplicationPlatformLifecycleDependencies) {}

  getState(): ApplicationPlatformLifecycleState {
    return this.state;
  }

  getFailure(): Error | null {
    return this.failure;
  }

  prepareBeforeListen(): Promise<void> {
    if (this.preparePromise) {
      return this.preparePromise;
    }
    if (this.state !== "constructed") {
      return Promise.reject(new Error(`Cannot prepare application lifecycle from '${this.state}'.`));
    }
    this.preparePromise = this.runPreparation();
    return this.preparePromise;
  }

  private async runPreparation(): Promise<void> {
    this.state = "preparing_runtime";
    try {
      await this.dependencies.preparation.prepareWorkspaceRuntime();
      await this.dependencies.preparation.prepareAgentCustomizations();
      await this.dependencies.preparation.toolReadiness.registerRequiredGroups();
      this.dependencies.preparation.agentToolsSessionManager.assertReady();
      const snapshot = await this.dependencies.bundleService.getCatalogSnapshot();
      this.assertSelectedCatalogIsValid(snapshot);
      this.catalogSnapshot = snapshot;
      this.state = "catalog_ready";
      await this.dependencies.preparation.bootstrapBuiltInAgents();
      await this.dependencies.preparation.definitionRuntimeReadiness.prepare();
      this.readyApplicationIds = new Set(
        snapshot.applications
          .map((application) => application.id)
          .filter((applicationId) =>
            this.isSelected(applicationId)
            && this.dependencies.preparation.definitionRuntimeReadiness
              .isApplicationReady(applicationId)),
      );
      this.state = "waiting_for_listener";
    } catch (error) {
      this.fail(error);
      throw this.failure;
    }
  }

  recoverAfterListen(): Promise<void> {
    if (this.recoveryPromise) {
      return this.recoveryPromise;
    }
    if (this.state !== "waiting_for_listener" || !this.catalogSnapshot) {
      return Promise.reject(new Error(`Cannot recover application lifecycle from '${this.state}'.`));
    }
    this.recoveryPromise = this.runRecovery(this.catalogSnapshot);
    return this.recoveryPromise;
  }

  private async runRecovery(snapshot: ApplicationCatalogSnapshot): Promise<void> {
    this.state = "recovering";
    try {
      await this.dependencies.startupGate.runStartupRecovery(async () => {
        const persistedKnownApplicationIds = (
          await this.dependencies.platformStateStore.listKnownApplicationIds()
        ).filter((applicationId) => this.isSelected(applicationId));
        const recoveryOutcomes = await this.dependencies.recoveryService.resumeBindings(
          {
            ...snapshot,
            applications: snapshot.applications.filter((application) =>
              this.isSelected(application.id)
              && this.dependencies.preparation.definitionRuntimeReadiness
                .isApplicationReady(application.id)),
            diagnostics: snapshot.diagnostics.filter((diagnostic) =>
              this.isSelected(diagnostic.applicationId)),
          },
          persistedKnownApplicationIds,
        );
        this.dependencies.availabilityService.reconcileCatalogSnapshotWithKnownApplications(
          snapshot,
          {
            persistedKnownApplicationIds,
            recoveryOutcomesByApplicationId: new Map(
              recoveryOutcomes.map((outcome) => [outcome.applicationId, outcome]),
            ),
          },
        );
        for (const [applicationId, diagnostics] of
          this.dependencies.preparation.definitionRuntimeReadiness
            .getDiagnosticsByApplicationId()) {
          this.dependencies.availabilityService.quarantineApplication(
            applicationId,
            `Application setup is required: ${diagnostics.join("; ")}`,
          );
        }
        for (const applicationId of this.readyApplicationIds) {
          await this.dependencies.eventDispatchService
            .resumePendingEventsForApplication(applicationId);
        }
      });
      this.state = "ready";
    } catch (error) {
      this.fail(error);
      throw this.failure;
    }
  }

  async awaitReady(): Promise<void> {
    if (this.state === "ready") {
      return;
    }
    if (this.state === "failed") {
      throw this.failure ?? new Error("Application platform lifecycle failed.");
    }
    if (this.recoveryPromise) {
      await this.recoveryPromise;
      return;
    }
    throw new Error(`Application platform lifecycle is not recovering (state '${this.state}').`);
  }

  stop(): Promise<void> {
    this.stopPromise ??= this.runStop();
    return this.stopPromise;
  }

  private async runStop(): Promise<void> {
    if (this.state === "stopped") {
      return;
    }
    this.state = "stopping";
    const errors: unknown[] = [];
    const runStep = async (step: () => void | Promise<void>): Promise<void> => {
      try {
        await step();
      } catch (error) {
        errors.push(error);
      }
    };

    this.dependencies.preparation.agentToolsSessionManager.blockNewSessions();
    await runStep(() => this.dependencies.eventDispatchService.stop());
    await runStep(() => this.dependencies.agentCommunicationService.closeAll());
    await runStep(() => this.dependencies.backendGateway.dispose());
    await runStep(() => this.dependencies.backendWebSocketSessionService.dispose());
    await runStep(() => this.dependencies.notificationHub.closeAll());
    await runStep(() => this.dependencies.runObserverService.dispose());
    await runStep(() => this.dependencies.engineHostService.stopAllApplicationEngines());
    await runStep(() => this.dependencies.runShutdownCoordinator.stopAllRuns());
    await runStep(() =>
      this.dependencies.preparation.agentToolsSessionManager.close());
    await runStep(() =>
      this.dependencies.preparation.publishedArtifactPublisher.close());
    await runStep(() => this.dependencies.streamingService.stopAll());
    this.state = "stopped";
    if (errors.length > 0) {
      throw new AggregateError(errors, "Application platform lifecycle cleanup failed.");
    }
  }

  private isSelected(applicationId: string): boolean {
    return !this.dependencies.selectedApplicationIds
      || this.dependencies.selectedApplicationIds.has(applicationId);
  }

  private assertSelectedCatalogIsValid(snapshot: ApplicationCatalogSnapshot): void {
    if (!this.dependencies.selectedApplicationIds) {
      return;
    }
    for (const applicationId of this.dependencies.selectedApplicationIds) {
      const diagnostic = snapshot.diagnostics.find((entry) => entry.applicationId === applicationId);
      if (diagnostic) {
        throw new Error(diagnostic.message);
      }
      if (!snapshot.applications.some((application) => application.id === applicationId)) {
        throw new Error(`Selected application '${applicationId}' is absent from the catalog.`);
      }
    }
  }

  private fail(error: unknown): void {
    this.failure = error instanceof Error ? error : new Error(String(error));
    this.state = "failed";
  }
}
