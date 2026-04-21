import type { ApplicationCatalogSnapshot } from "../../application-bundles/domain/application-catalog-snapshot.js";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import {
  ApplicationEngineHostService,
  getApplicationEngineHostService,
} from "../../application-engine/services/application-engine-host-service.js";
import {
  ApplicationExecutionEventDispatchService,
  getApplicationExecutionEventDispatchService,
} from "./application-execution-event-dispatch-service.js";
import {
  ApplicationOrchestrationRecoveryService,
  ApplicationRecoveryOutcome,
  getApplicationOrchestrationRecoveryService,
} from "./application-orchestration-recovery-service.js";

export type ApplicationAvailabilityState = "ACTIVE" | "QUARANTINED" | "REENTERING";
export type ApplicationStartupPresence = "CATALOG_ACTIVE" | "CATALOG_QUARANTINED" | "PERSISTED_ONLY";

export type ApplicationAvailabilityRecord = {
  applicationId: string;
  state: ApplicationAvailabilityState;
  detail: string | null;
  updatedAt: string;
};

export type ApplicationAvailabilityReconciliationOptions = {
  persistedKnownApplicationIds?: Iterable<string>;
  recoveryOutcomesByApplicationId?: ReadonlyMap<string, ApplicationRecoveryOutcome>;
};

export class ApplicationUnavailableError extends Error {
  constructor(
    public readonly applicationId: string,
    public readonly state: Exclude<ApplicationAvailabilityState, "ACTIVE">,
    detail: string | null,
  ) {
    super(
      detail
        ? `Application '${applicationId}' is currently ${state.toLowerCase()}: ${detail}`
        : `Application '${applicationId}' is currently ${state.toLowerCase()}. Please retry after repair/reload completes.`,
    );
    this.name = "ApplicationUnavailableError";
  }
}

const buildPersistedOnlyDetail = (applicationId: string): string =>
  `Persisted platform state still exists for application '${applicationId}', but the application is not present in the current catalog.`;

export class ApplicationAvailabilityService {
  private static instance: ApplicationAvailabilityService | null = null;

  static getInstance(
    dependencies: ConstructorParameters<typeof ApplicationAvailabilityService>[0] = {},
  ): ApplicationAvailabilityService {
    if (!ApplicationAvailabilityService.instance) {
      ApplicationAvailabilityService.instance = new ApplicationAvailabilityService(dependencies);
    }
    return ApplicationAvailabilityService.instance;
  }

  static resetInstance(): void {
    ApplicationAvailabilityService.instance = null;
    cachedApplicationAvailabilityService = null;
  }

  private readonly availabilityByApplicationId = new Map<string, ApplicationAvailabilityRecord>();

  constructor(
    private readonly dependencies: {
      applicationBundleService?: ApplicationBundleService;
      engineHostService?: ApplicationEngineHostService;
      recoveryService?: ApplicationOrchestrationRecoveryService;
      dispatchService?: ApplicationExecutionEventDispatchService;
    } = {},
  ) {}

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get recoveryService(): ApplicationOrchestrationRecoveryService {
    return this.dependencies.recoveryService ?? getApplicationOrchestrationRecoveryService();
  }

  private get engineHostService(): ApplicationEngineHostService {
    return this.dependencies.engineHostService ?? getApplicationEngineHostService();
  }

  private get dispatchService(): ApplicationExecutionEventDispatchService {
    return this.dependencies.dispatchService ?? getApplicationExecutionEventDispatchService();
  }

  synchronizeWithCatalogSnapshot(snapshot: ApplicationCatalogSnapshot): void {
    const now = snapshot.refreshedAt || new Date().toISOString();
    const nextAvailabilityByApplicationId = new Map<string, ApplicationAvailabilityRecord>();

    for (const application of snapshot.applications) {
      const existing = this.availabilityByApplicationId.get(application.id);
      if (existing?.state === "REENTERING") {
        nextAvailabilityByApplicationId.set(application.id, { ...existing });
        continue;
      }
      nextAvailabilityByApplicationId.set(application.id, {
        applicationId: application.id,
        state: "ACTIVE",
        detail: null,
        updatedAt: now,
      });
    }

    for (const diagnostic of snapshot.diagnostics) {
      nextAvailabilityByApplicationId.set(diagnostic.applicationId, {
        applicationId: diagnostic.applicationId,
        state: "QUARANTINED",
        detail: diagnostic.message,
        updatedAt: diagnostic.discoveredAt || now,
      });
      this.dispatchService.suspendApplication(diagnostic.applicationId);
    }

    for (const [applicationId, record] of this.availabilityByApplicationId.entries()) {
      if (nextAvailabilityByApplicationId.has(applicationId)) {
        continue;
      }
      if (record.state !== "ACTIVE") {
        nextAvailabilityByApplicationId.set(applicationId, record);
      }
    }

    this.availabilityByApplicationId.clear();
    for (const [applicationId, record] of nextAvailabilityByApplicationId.entries()) {
      this.availabilityByApplicationId.set(applicationId, record);
    }
  }

  reconcileCatalogSnapshotWithKnownApplications(
    snapshot: ApplicationCatalogSnapshot,
    options: ApplicationAvailabilityReconciliationOptions = {},
  ): void {
    this.synchronizeWithCatalogSnapshot(snapshot);

    const persistedKnownApplicationIds = new Set(
      Array.from(options.persistedKnownApplicationIds ?? []),
    );
    const recoveryOutcomesByApplicationId = options.recoveryOutcomesByApplicationId;
    const activeApplicationIds = new Set(snapshot.applications.map((application) => application.id));
    const quarantinedApplicationIds = new Set(snapshot.diagnostics.map((diagnostic) => diagnostic.applicationId));
    const candidateApplicationIds = new Set<string>([
      ...persistedKnownApplicationIds,
      ...(recoveryOutcomesByApplicationId ? Array.from(recoveryOutcomesByApplicationId.keys()) : []),
    ]);

    for (const applicationId of Array.from(candidateApplicationIds).sort((left, right) => left.localeCompare(right))) {
      const startupPresence: ApplicationStartupPresence | null = activeApplicationIds.has(applicationId)
        ? "CATALOG_ACTIVE"
        : quarantinedApplicationIds.has(applicationId)
          ? "CATALOG_QUARANTINED"
          : persistedKnownApplicationIds.has(applicationId)
            ? "PERSISTED_ONLY"
            : null;
      if (!startupPresence) {
        continue;
      }

      const outcome = recoveryOutcomesByApplicationId?.get(applicationId)
        ?? (startupPresence === "PERSISTED_ONLY"
          ? {
              applicationId,
              status: "RECOVERED" as const,
              detail: null,
            }
          : null);
      if (!outcome) {
        continue;
      }

      this.applyStartupRecoveryOutcome(applicationId, startupPresence, outcome);
    }
  }

  applyStartupRecoveryOutcome(
    applicationId: string,
    startupPresence: ApplicationStartupPresence,
    outcome: ApplicationRecoveryOutcome,
  ): ApplicationAvailabilityRecord {
    const currentDetail = this.availabilityByApplicationId.get(applicationId)?.detail ?? null;

    switch (startupPresence) {
      case "CATALOG_ACTIVE":
        if (outcome.status === "QUARANTINED") {
          return this.setAvailability(
            applicationId,
            "QUARANTINED",
            outcome.detail ?? currentDetail ?? "Application recovery failed during startup.",
          );
        }
        return this.setAvailability(applicationId, "ACTIVE", null);
      case "CATALOG_QUARANTINED":
        return this.setAvailability(
          applicationId,
          "QUARANTINED",
          outcome.status === "QUARANTINED"
            ? outcome.detail ?? currentDetail ?? "Application remains quarantined after startup recovery."
            : currentDetail,
        );
      case "PERSISTED_ONLY":
        if (outcome.status === "NO_PERSISTED_STATE") {
          throw new Error(
            `Startup presence 'PERSISTED_ONLY' for '${applicationId}' cannot produce NO_PERSISTED_STATE.`,
          );
        }
        return this.setAvailability(
          applicationId,
          "QUARANTINED",
          outcome.status === "QUARANTINED"
            ? outcome.detail ?? buildPersistedOnlyDetail(applicationId)
            : buildPersistedOnlyDetail(applicationId),
        );
      default:
        return this.setAvailability(applicationId, "QUARANTINED", currentDetail);
    }
  }

  async getAvailability(applicationId: string): Promise<ApplicationAvailabilityRecord | null> {
    const existing = this.availabilityByApplicationId.get(applicationId);
    if (existing) {
      return { ...existing };
    }

    const application = await this.applicationBundleService.getApplicationById(applicationId);
    if (application) {
      const activeRecord = this.setAvailability(applicationId, "ACTIVE", null);
      return { ...activeRecord };
    }

    const diagnostic = await this.applicationBundleService.getDiagnosticByApplicationId(applicationId);
    if (diagnostic) {
      const quarantinedRecord = this.setAvailability(applicationId, "QUARANTINED", diagnostic.message);
      return { ...quarantinedRecord };
    }

    return null;
  }

  async isApplicationActive(applicationId: string): Promise<boolean> {
    return (await this.getAvailability(applicationId))?.state === "ACTIVE";
  }

  async requireApplicationActive(applicationId: string): Promise<void> {
    const availability = await this.getAvailability(applicationId);
    if (!availability || availability.state === "ACTIVE") {
      return;
    }
    throw new ApplicationUnavailableError(applicationId, availability.state, availability.detail);
  }

  async reloadAndReenter(applicationId: string): Promise<ApplicationAvailabilityRecord> {
    this.setAvailability(applicationId, "REENTERING", null);

    try {
      await this.engineHostService.stopApplicationEngine(applicationId);
      await this.applicationBundleService.reloadApplication(applicationId);
      const snapshot = await this.applicationBundleService.getCatalogSnapshot();
      this.synchronizeWithCatalogSnapshot(snapshot);
      const reloadedApplication = snapshot.applications.find((application) => application.id === applicationId) ?? null;
      const diagnostic = snapshot.diagnostics.find((entry) => entry.applicationId === applicationId) ?? null;

      if (!reloadedApplication) {
        return this.setAvailability(
          applicationId,
          "QUARANTINED",
          diagnostic?.message ?? "Application bundle is currently unavailable.",
        );
      }

      await this.recoveryService.resumeApplication(applicationId);
      await this.dispatchService.resumePendingEventsForApplication(applicationId);
      return this.setAvailability(applicationId, "ACTIVE", null);
    } catch (error) {
      return this.setAvailability(
        applicationId,
        "QUARANTINED",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private setAvailability(
    applicationId: string,
    state: ApplicationAvailabilityState,
    detail: string | null,
  ): ApplicationAvailabilityRecord {
    const record: ApplicationAvailabilityRecord = {
      applicationId,
      state,
      detail,
      updatedAt: new Date().toISOString(),
    };
    this.availabilityByApplicationId.set(applicationId, record);
    if (state !== "ACTIVE") {
      this.dispatchService.suspendApplication(applicationId);
    }
    return record;
  }
}

let cachedApplicationAvailabilityService: ApplicationAvailabilityService | null = null;

export const getApplicationAvailabilityService = (): ApplicationAvailabilityService => {
  if (!cachedApplicationAvailabilityService) {
    cachedApplicationAvailabilityService = ApplicationAvailabilityService.getInstance();
  }
  return cachedApplicationAvailabilityService;
};
