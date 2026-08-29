import fs from "node:fs";
import path from "node:path";
import type { ApplicationBundle, ApplicationCatalogEntry, ApplicationOwnedDefinitionSource } from "../domain/models.js";
import type {
  ApplicationCatalogDiagnostic,
  ApplicationCatalogSnapshot,
} from "../domain/application-catalog-snapshot.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { FileApplicationBundleProvider } from "../providers/file-application-bundle-provider.js";
import type { ApplicationPackageRegistrySnapshot } from "../../application-packages/domain/application-package-registry-snapshot.js";
import { ApplicationPackageRegistryService } from "../../application-packages/services/application-package-registry-service.js";
import { ApplicationPackageRootSettingsStore } from "../../application-packages/stores/application-package-root-settings-store.js";
import { ApplicationPackageRegistryStore } from "../../application-packages/stores/application-package-registry-store.js";
import { BuiltInApplicationPackageMaterializer } from "../../application-packages/services/built-in-application-package-materializer.js";

const APPLICATION_ASSET_ROUTE_PREFIX = "/application-bundles";

type ApplicationBundleProvider = {
  getCatalogSnapshot: (registrySnapshot: ApplicationPackageRegistrySnapshot) => Promise<ApplicationCatalogSnapshot>;
  buildApplicationOwnedAgentSources: (bundle: ApplicationBundle) => ApplicationOwnedDefinitionSource[];
  buildApplicationOwnedTeamSources: (bundle: ApplicationBundle) => ApplicationOwnedDefinitionSource[];
};

export type ApplicationBundleCatalogCandidate = Readonly<{
  owner: ApplicationBundleService;
  scope:
    | Readonly<{ kind: "package"; packageId: string }>
    | Readonly<{ kind: "application"; applicationId: string; packageId: string }>;
  applications: readonly ApplicationBundle[];
  diagnostics: readonly ApplicationCatalogDiagnostic[];
  refreshedAt: string;
}>;

export type PreparedApplicationBundleCatalogSlice = Readonly<{
  owner: ApplicationBundleService;
  candidate: ApplicationBundleCatalogCandidate;
  removedApplicationIds: ReadonlySet<string>;
  nextSnapshot: ApplicationCatalogSnapshot;
  nextBundleById: Map<string, ApplicationBundle>;
  nextAgentSources: Map<string, ApplicationOwnedDefinitionSource>;
  nextTeamSources: Map<string, ApplicationOwnedDefinitionSource>;
}>;

export class ApplicationBundleService {
  private cachePopulated = false;
  private populatePromise: Promise<void> | null = null;
  private snapshot: ApplicationCatalogSnapshot = {
    applications: [],
    diagnostics: [],
    refreshedAt: new Date(0).toISOString(),
  };
  private bundleById = new Map<string, ApplicationBundle>();
  private applicationOwnedAgentSourceById = new Map<string, ApplicationOwnedDefinitionSource>();
  private applicationOwnedTeamSourceById = new Map<string, ApplicationOwnedDefinitionSource>();

  constructor(
    private readonly dependencies: {
      provider: ApplicationBundleProvider;
      packageRegistryService: Pick<ApplicationPackageRegistryService, "getRegistrySnapshot">;
    },
  ) {}

  private get provider(): ApplicationBundleProvider {
    return this.dependencies.provider;
  }

  private get packageRegistryService(): Pick<ApplicationPackageRegistryService, "getRegistrySnapshot"> {
    return this.dependencies.packageRegistryService;
  }

  private assetPath(applicationId: string, relativePath: string): string {
    return `${APPLICATION_ASSET_ROUTE_PREFIX}/${encodeURIComponent(applicationId)}/assets/${relativePath}`;
  }

  private withAssetPaths(bundle: ApplicationBundle): ApplicationBundle {
    return {
      ...bundle,
      entryHtmlAssetPath: this.assetPath(bundle.id, bundle.entryHtmlRelativePath),
      iconAssetPath: bundle.iconRelativePath ? this.assetPath(bundle.id, bundle.iconRelativePath) : null,
    };
  }

  private populateFromSnapshot(snapshot: ApplicationCatalogSnapshot): void {
    const applications = snapshot.applications.map((bundle) => this.withAssetPaths(bundle));
    const nextBundleById = new Map<string, ApplicationBundle>();
    const nextApplicationOwnedAgentSourceById = new Map<string, ApplicationOwnedDefinitionSource>();
    const nextApplicationOwnedTeamSourceById = new Map<string, ApplicationOwnedDefinitionSource>();

    for (const bundle of applications) {
      nextBundleById.set(bundle.id, bundle);
      for (const source of this.provider.buildApplicationOwnedAgentSources(bundle)) {
        nextApplicationOwnedAgentSourceById.set(source.definitionId, source);
      }
      for (const source of this.provider.buildApplicationOwnedTeamSources(bundle)) {
        nextApplicationOwnedTeamSourceById.set(source.definitionId, source);
      }
    }

    this.snapshot = {
      ...snapshot,
      applications,
    };
    this.bundleById = nextBundleById;
    this.applicationOwnedAgentSourceById = nextApplicationOwnedAgentSourceById;
    this.applicationOwnedTeamSourceById = nextApplicationOwnedTeamSourceById;
  }

  private async populateCacheFromRegistrySnapshot(
    registrySnapshot: ApplicationPackageRegistrySnapshot,
  ): Promise<void> {
    this.populateFromSnapshot(await this.provider.getCatalogSnapshot(registrySnapshot));
    this.cachePopulated = true;
    this.populatePromise = null;
  }

  private async populateCache(): Promise<void> {
    await this.populateCacheFromRegistrySnapshot(await this.packageRegistryService.getRegistrySnapshot());
  }

  private async ensureCache(): Promise<void> {
    if (this.cachePopulated) {
      return;
    }
    if (!this.populatePromise) {
      this.populatePromise = this.populateCache();
    }
    await this.populatePromise;
  }

  async getCatalogSnapshot(
    registrySnapshot?: ApplicationPackageRegistrySnapshot,
  ): Promise<ApplicationCatalogSnapshot> {
    if (registrySnapshot) {
      await this.populateCacheFromRegistrySnapshot(registrySnapshot);
      return structuredClone(this.snapshot);
    }
    await this.ensureCache();
    return structuredClone(this.snapshot);
  }

  async listApplications(): Promise<ApplicationCatalogEntry[]> {
    await this.ensureCache();
    return Array.from(this.bundleById.values()).sort((left, right) =>
      left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
    );
  }

  async listDiagnostics(): Promise<ApplicationCatalogDiagnostic[]> {
    await this.ensureCache();
    return structuredClone(this.snapshot.diagnostics).sort((left, right) =>
      left.localApplicationId.localeCompare(right.localApplicationId) || left.applicationId.localeCompare(right.applicationId),
    );
  }

  async hasDiscoverableApplications(): Promise<boolean> {
    await this.ensureCache();
    return this.bundleById.size > 0;
  }

  async getApplicationById(applicationId: string): Promise<ApplicationBundle | null> {
    await this.ensureCache();
    return this.bundleById.get(applicationId) ?? null;
  }

  async getDiagnosticByApplicationId(applicationId: string): Promise<ApplicationCatalogDiagnostic | null> {
    await this.ensureCache();
    return this.snapshot.diagnostics.find((diagnostic) => diagnostic.applicationId === applicationId) ?? null;
  }

  async stagePackageCatalog(packageId: string): Promise<ApplicationBundleCatalogCandidate> {
    await this.ensureCache();
    const normalizedPackageId = packageId.trim();
    if (!normalizedPackageId) throw new Error("packageId is required.");
    const staged = await this.provider.getCatalogSnapshot(
      await this.packageRegistryService.getRegistrySnapshot(),
    );
    return Object.freeze({
      owner: this,
      scope: Object.freeze({ kind: "package" as const, packageId: normalizedPackageId }),
      applications: Object.freeze(staged.applications
        .filter((application) => application.packageId === normalizedPackageId)
        .map((application) => this.withAssetPaths(application))),
      diagnostics: Object.freeze(staged.diagnostics
        .filter((diagnostic) => diagnostic.packageId === normalizedPackageId)),
      refreshedAt: staged.refreshedAt,
    });
  }

  async stageApplicationCatalog(
    applicationId: string,
  ): Promise<ApplicationBundleCatalogCandidate> {
    await this.ensureCache();
    const normalizedApplicationId = applicationId.trim();
    const current = this.bundleById.get(normalizedApplicationId);
    const currentDiagnostic = this.snapshot.diagnostics.find(
      (diagnostic) => diagnostic.applicationId === normalizedApplicationId,
    );
    const packageId = current?.packageId ?? currentDiagnostic?.packageId;
    if (!packageId) {
      throw new Error(`Application '${normalizedApplicationId}' is absent from the live catalog.`);
    }
    const packageCandidate = await this.stagePackageCatalog(packageId);
    return Object.freeze({
      owner: this,
      scope: Object.freeze({
        kind: "application" as const,
        applicationId: normalizedApplicationId,
        packageId,
      }),
      applications: Object.freeze(packageCandidate.applications.filter(
        (application) => application.id === normalizedApplicationId,
      )),
      diagnostics: Object.freeze(packageCandidate.diagnostics.filter(
        (diagnostic) => diagnostic.applicationId === normalizedApplicationId,
      )),
      refreshedAt: packageCandidate.refreshedAt,
    });
  }

  prepareCatalogSlice(
    candidate: ApplicationBundleCatalogCandidate,
  ): PreparedApplicationBundleCatalogSlice {
    this.assertOwnedCandidate(candidate);
    const oldApplicationIds = candidate.scope.kind === "package"
      ? this.snapshot.applications
          .filter((application) => application.packageId === candidate.scope.packageId)
          .map((application) => application.id)
      : [candidate.scope.applicationId];
    const nextApplicationIds = new Set(candidate.applications.map((application) => application.id));
    const removedApplicationIds = new Set(oldApplicationIds.filter(
      (applicationId) => !nextApplicationIds.has(applicationId),
    ));
    const isTargetApplication = (application: ApplicationBundle): boolean =>
      candidate.scope.kind === "package"
        ? application.packageId === candidate.scope.packageId
        : application.id === candidate.scope.applicationId;
    const isTargetDiagnostic = (diagnostic: ApplicationCatalogDiagnostic): boolean =>
      candidate.scope.kind === "package"
        ? diagnostic.packageId === candidate.scope.packageId
        : diagnostic.applicationId === candidate.scope.applicationId;
    const nextSnapshot: ApplicationCatalogSnapshot = {
      applications: [
        ...this.snapshot.applications.filter((application) => !isTargetApplication(application)),
        ...candidate.applications,
      ],
      diagnostics: [
        ...this.snapshot.diagnostics.filter((diagnostic) => !isTargetDiagnostic(diagnostic)),
        ...candidate.diagnostics,
      ],
      refreshedAt: candidate.refreshedAt,
    };
    const nextBundleById = new Map(this.bundleById);
    const nextAgentSources = new Map(this.applicationOwnedAgentSourceById);
    const nextTeamSources = new Map(this.applicationOwnedTeamSourceById);
    const targetIds = new Set([
      ...removedApplicationIds,
      ...candidate.applications.map((application) => application.id),
    ]);
    for (const applicationId of targetIds) nextBundleById.delete(applicationId);
    for (const [definitionId, source] of nextAgentSources) {
      if (targetIds.has(source.applicationId)) nextAgentSources.delete(definitionId);
    }
    for (const [definitionId, source] of nextTeamSources) {
      if (targetIds.has(source.applicationId)) nextTeamSources.delete(definitionId);
    }
    for (const application of candidate.applications) {
      nextBundleById.set(application.id, application);
      for (const source of this.provider.buildApplicationOwnedAgentSources(application)) {
        nextAgentSources.set(source.definitionId, source);
      }
      for (const source of this.provider.buildApplicationOwnedTeamSources(application)) {
        nextTeamSources.set(source.definitionId, source);
      }
    }
    return Object.freeze({
      owner: this,
      candidate,
      removedApplicationIds,
      nextSnapshot,
      nextBundleById,
      nextAgentSources,
      nextTeamSources,
    });
  }

  commitPreparedCatalogSlice(plan: PreparedApplicationBundleCatalogSlice): void {
    if (plan.owner !== this) {
      throw new Error("Application bundle catalog plan belongs to another service.");
    }
    this.assertOwnedCandidate(plan.candidate);
    this.snapshot = plan.nextSnapshot;
    this.bundleById = plan.nextBundleById;
    this.applicationOwnedAgentSourceById = plan.nextAgentSources;
    this.applicationOwnedTeamSourceById = plan.nextTeamSources;
    this.cachePopulated = true;
    this.populatePromise = null;
  }

  private assertOwnedCandidate(candidate: ApplicationBundleCatalogCandidate): void {
    if (candidate.owner !== this) {
      throw new Error("Application bundle catalog candidate belongs to another service.");
    }
  }

  async resolveUiAsset(
    applicationId: string,
    relativeAssetPath: string,
  ): Promise<{ absolutePath: string; relativePath: string }> {
    const bundle = await this.getApplicationById(applicationId);
    if (!bundle) {
      throw new Error(`Application bundle not found: ${applicationId}`);
    }

    const normalizedRelativePath = relativeAssetPath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalizedRelativePath.startsWith("ui/")) {
      throw new Error("Application asset paths must stay under ui/.");
    }

    const absolutePath = path.resolve(bundle.applicationRootPath, normalizedRelativePath);
    const normalizedBundleRoot = path.resolve(bundle.applicationRootPath);
    if (
      absolutePath !== normalizedBundleRoot &&
      !absolutePath.startsWith(`${normalizedBundleRoot}${path.sep}`)
    ) {
      throw new Error("Application asset path must stay inside the owning bundle.");
    }

    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      throw new Error(`Application asset not found: ${normalizedRelativePath}`);
    }

    return {
      absolutePath,
      relativePath: normalizedRelativePath,
    };
  }

  async getApplicationOwnedAgentSourceById(
    definitionId: string,
  ): Promise<ApplicationOwnedDefinitionSource | null> {
    await this.ensureCache();
    return this.applicationOwnedAgentSourceById.get(definitionId) ?? null;
  }

  async getApplicationOwnedTeamSourceById(
    definitionId: string,
  ): Promise<ApplicationOwnedDefinitionSource | null> {
    await this.ensureCache();
    return this.applicationOwnedTeamSourceById.get(definitionId) ?? null;
  }

  async listApplicationOwnedAgentSources(): Promise<ApplicationOwnedDefinitionSource[]> {
    await this.ensureCache();
    return Array.from(this.applicationOwnedAgentSourceById.values());
  }

  async listApplicationOwnedTeamSources(): Promise<ApplicationOwnedDefinitionSource[]> {
    await this.ensureCache();
    return Array.from(this.applicationOwnedTeamSourceById.values());
  }

}

let generalProcessApplicationBundleService: ApplicationBundleService | null = null;

export const getGeneralProcessApplicationBundleService =
(): ApplicationBundleService => {
  if (!generalProcessApplicationBundleService) {
    const appConfig = appConfigProvider.config;
    generalProcessApplicationBundleService = new ApplicationBundleService({
      provider: new FileApplicationBundleProvider(),
      packageRegistryService: new ApplicationPackageRegistryService({
        rootSettingsStore: new ApplicationPackageRootSettingsStore(appConfig),
        registryStore: new ApplicationPackageRegistryStore(appConfig),
        builtInMaterializer: new BuiltInApplicationPackageMaterializer(appConfig),
      }),
    });
  }
  return generalProcessApplicationBundleService;
};
