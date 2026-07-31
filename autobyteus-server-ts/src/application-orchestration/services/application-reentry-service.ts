import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationEngineLauncher } from "../../application-engine/services/application-engine-launcher.js";
import type { ApplicationAvailabilityRecord, ApplicationAvailabilityService } from "./application-availability-service.js";
import type { ApplicationExecutionEventDispatchService } from "./application-execution-event-dispatch-service.js";
import type { ApplicationOrchestrationRecoveryService } from "./application-orchestration-recovery-service.js";

export class ApplicationReentryService {
  constructor(private readonly dependencies: {
    bundleService: ApplicationBundleService;
    availabilityService: ApplicationAvailabilityService;
    recoveryService: Pick<ApplicationOrchestrationRecoveryService, "resumeApplication">;
    eventDispatchService: Pick<ApplicationExecutionEventDispatchService, "resumePendingEventsForApplication">;
    engineLauncher: Pick<ApplicationEngineLauncher, "stop">;
  }) {}

  async reloadAndReenter(
    applicationId: string,
  ): Promise<ApplicationAvailabilityRecord> {
    this.dependencies.availabilityService.beginReentry(applicationId);
    try {
      await this.dependencies.engineLauncher.stop(applicationId);
      await this.dependencies.bundleService.reloadApplication(applicationId);
      const snapshot = await this.dependencies.bundleService.getCatalogSnapshot();
      this.dependencies.availabilityService.synchronizeWithCatalogSnapshot(snapshot);
      const application = snapshot.applications.find(
        (candidate) => candidate.id === applicationId,
      );
      const diagnostic = snapshot.diagnostics.find(
        (candidate) => candidate.applicationId === applicationId,
      );
      if (!application) {
        return this.dependencies.availabilityService.quarantineApplication(
          applicationId,
          diagnostic?.message ?? "Application bundle is currently unavailable.",
        );
      }
      await this.dependencies.recoveryService.resumeApplication(applicationId);
      await this.dependencies.eventDispatchService
        .resumePendingEventsForApplication(applicationId);
      return this.dependencies.availabilityService.activateApplication(applicationId);
    } catch (error) {
      return this.dependencies.availabilityService.quarantineApplication(
        applicationId,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
