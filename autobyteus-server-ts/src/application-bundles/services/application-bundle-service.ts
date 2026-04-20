import fs from "node:fs";
import path from "node:path";
import type { ApplicationBundle, ApplicationCatalogEntry, ApplicationOwnedDefinitionSource } from "../domain/models.js";
import type {
  ApplicationCatalogDiagnostic,
  ApplicationCatalogSnapshot,
} from "../domain/application-catalog-snapshot.js";
import { FileApplicationBundleProvider, BUILT_IN_APPLICATION_PACKAGE_ID } from "../providers/file-application-bundle-provider.js";
import { ApplicationPackageRootSettingsStore } from "../../application-packages/stores/application-package-root-settings-store.js";
import { ApplicationPackageRegistryStore } from "../../application-packages/stores/application-package-registry-store.js";
import { BuiltInApplicationPackageMaterializer } from "../../application-packages/services/built-in-application-package-materializer.js";
import { buildLocalApplicationPackageId } from "../../application-packages/utils/application-package-root-summary.js";
import { parseCanonicalApplicationId } from "../utils/application-bundle-identity.js";

const APPLICATION_ASSET_ROUTE_PREFIX = "/application-bundles";

type ApplicationBundleProvider = {
  getCatalogSnapshot: () => Promise<ApplicationCatalogSnapshot>;
  validatePackageRoot: (packageRootPath: string, packageId: string) => Promise<void>;
  buildApplicationOwnedAgentSources: (bundle: ApplicationBundle) => ApplicationOwnedDefinitionSource[];
  buildApplicationOwnedTeamSources: (bundle: ApplicationBundle) => ApplicationOwnedDefinitionSource[];
};

export class ApplicationBundleService {
  private static instance: ApplicationBundleService | null = null;

  static getInstance(
    dependencies: ConstructorParameters<typeof ApplicationBundleService>[0] = {},
  ): ApplicationBundleService {
    if (!ApplicationBundleService.instance) {
      ApplicationBundleService.instance = new ApplicationBundleService(dependencies);
    }
    return ApplicationBundleService.instance;
  }

  static resetInstance(): void {
    ApplicationBundleService.instance = null;
  }

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
      provider?: ApplicationBundleProvider;
      rootSettingsStore?: ApplicationPackageRootSettingsStore;
      registryStore?: ApplicationPackageRegistryStore;
      builtInMaterializer?: Pick<BuiltInApplicationPackageMaterializer, "ensureMaterialized">;
    } = {},
  ) {}

  private get provider(): ApplicationBundleProvider {
    return this.dependencies.provider ?? new FileApplicationBundleProvider();
  }

  private get rootSettingsStore(): ApplicationPackageRootSettingsStore {
    return this.dependencies.rootSettingsStore ?? new ApplicationPackageRootSettingsStore();
  }

  private get registryStore(): ApplicationPackageRegistryStore {
    return this.dependencies.registryStore ?? new ApplicationPackageRegistryStore();
  }

  private get builtInMaterializer(): Pick<
    BuiltInApplicationPackageMaterializer,
    "ensureMaterialized"
  > {
    return this.dependencies.builtInMaterializer
      ?? BuiltInApplicationPackageMaterializer.getInstance();
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

  private async populateCache(): Promise<void> {
    await this.builtInMaterializer.ensureMaterialized();
    this.populateFromSnapshot(await this.provider.getCatalogSnapshot());
    this.cachePopulated = true;
    this.populatePromise = null;
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

  async getCatalogSnapshot(): Promise<ApplicationCatalogSnapshot> {
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

  async reloadApplication(applicationId: string): Promise<ApplicationBundle | null> {
    await this.refresh();
    return this.getApplicationById(applicationId);
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

  async validatePackageRoot(packageRootPath: string): Promise<void> {
    const resolvedRootPath = path.resolve(packageRootPath);
    let packageId = buildLocalApplicationPackageId(resolvedRootPath);

    if (resolvedRootPath === this.rootSettingsStore.getBuiltInRootPath()) {
      await this.builtInMaterializer.ensureMaterialized();
      packageId = BUILT_IN_APPLICATION_PACKAGE_ID;
    } else {
      const record = await this.registryStore.findPackageByRootPath(resolvedRootPath);
      if (record?.packageId) {
        packageId = record.packageId;
      }
    }

    await this.provider.validatePackageRoot(resolvedRootPath, packageId);
  }

  async refresh(): Promise<void> {
    this.cachePopulated = false;
    this.populatePromise = null;
    this.bundleById.clear();
    this.applicationOwnedAgentSourceById.clear();
    this.applicationOwnedTeamSourceById.clear();
    await this.ensureCache();
  }
}
