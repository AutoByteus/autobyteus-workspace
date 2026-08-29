import type { ApplicationCatalogSnapshot } from "../../application-bundles/domain/application-catalog-snapshot.js";
import type { ApplicationAvailabilityService } from "../../application-orchestration/services/application-availability-service.js";
import type { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";

export class ApplicationCatalogReconciliationService {
  constructor(private readonly dependencies: {
    platformStateStore: Pick<ApplicationPlatformStateStore, "listKnownApplicationIds">;
    availabilityService: Pick<
      ApplicationAvailabilityService,
      "reconcileCatalogSnapshotWithKnownApplications"
    >;
  }) {}

  async reconcile(snapshot: ApplicationCatalogSnapshot): Promise<void> {
    const persistedKnownApplicationIds = await this.dependencies
      .platformStateStore.listKnownApplicationIds();
    this.dependencies.availabilityService
      .reconcileCatalogSnapshotWithKnownApplications(snapshot, {
        persistedKnownApplicationIds,
      });
  }
}
