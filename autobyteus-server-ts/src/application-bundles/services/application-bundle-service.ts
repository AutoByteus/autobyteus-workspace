import fs from "node:fs";
import path from "node:path";
import type { ApplicationBundle, ApplicationCatalogEntry, ApplicationOwnedDefinitionSource } from "../domain/models.js";
import { FileApplicationBundleProvider, BUILT_IN_APPLICATION_PACKAGE_ID } from "../providers/file-application-bundle-provider.js";
import { ApplicationPackageRootSettingsStore } from "../../application-packages/stores/application-package-root-settings-store.js";
import { ApplicationPackageRegistryStore } from "../../application-packages/stores/application-package-registry-store.js";
import { buildLocalApplicationPackageId } from "../../application-packages/utils/application-package-root-summary.js";

const APPLICATION_ASSET_ROUTE_PREFIX = "/application-bundles";

type ApplicationBundleProvider = {
  listBundles: () => Promise<ApplicationBundle[]>;
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
  private bundleById = new Map<string, ApplicationBundle>();
  private applicationOwnedAgentSourceById = new Map<string, ApplicationOwnedDefinitionSource>();
  private applicationOwnedTeamSourceById = new Map<string, ApplicationOwnedDefinitionSource>();

  constructor(
    private readonly dependencies: {
      provider?: ApplicationBundleProvider;
      rootSettingsStore?: ApplicationPackageRootSettingsStore;
      registryStore?: ApplicationPackageRegistryStore;
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

  private async populateCache(): Promise<void> {
    const bundles = (await this.provider.listBundles()).map((bundle) => this.withAssetPaths(bundle));

    const nextBundleById = new Map<string, ApplicationBundle>();
    const nextApplicationOwnedAgentSourceById = new Map<string, ApplicationOwnedDefinitionSource>();
    const nextApplicationOwnedTeamSourceById = new Map<string, ApplicationOwnedDefinitionSource>();

    for (const bundle of bundles) {
      nextBundleById.set(bundle.id, bundle);
      for (const source of this.provider.buildApplicationOwnedAgentSources(bundle)) {
        nextApplicationOwnedAgentSourceById.set(source.definitionId, source);
      }
      for (const source of this.provider.buildApplicationOwnedTeamSources(bundle)) {
        nextApplicationOwnedTeamSourceById.set(source.definitionId, source);
      }
    }

    this.bundleById = nextBundleById;
    this.applicationOwnedAgentSourceById = nextApplicationOwnedAgentSourceById;
    this.applicationOwnedTeamSourceById = nextApplicationOwnedTeamSourceById;
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

  async listApplications(): Promise<ApplicationCatalogEntry[]> {
    await this.ensureCache();
    return Array.from(this.bundleById.values()).sort((left, right) =>
      left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
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
