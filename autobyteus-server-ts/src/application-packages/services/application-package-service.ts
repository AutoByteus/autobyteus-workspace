import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { BUILT_IN_APPLICATION_PACKAGE_ID } from "../../application-bundles/providers/file-application-bundle-provider.js";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { getApplicationAvailabilityService } from "../../application-orchestration/services/application-availability-service.js";
import { BuiltInApplicationPackageMaterializer } from "./built-in-application-package-materializer.js";
import { GitHubApplicationPackageInstaller } from "../installers/github-application-package-installer.js";
import {
  ApplicationPackageDebugDetails,
  ApplicationPackageImportInput,
  ApplicationPackageListItem,
  ApplicationPackageRecord,
  ApplicationPackageSourceRecord,
} from "../types.js";
import { ApplicationPackageRegistryStore } from "../stores/application-package-registry-store.js";
import { ApplicationPackageRootSettingsStore } from "../stores/application-package-root-settings-store.js";
import { normalizeGitHubRepositorySource } from "../utils/github-repository-source.js";
import {
  buildApplicationPackageSummary,
  buildGitHubApplicationPackageId,
  buildLocalApplicationPackageId,
  validateApplicationPackageRoot,
} from "../utils/application-package-root-summary.js";

type RefreshBundlesFn = () => Promise<void>;

type BuiltInMaterializerLike = Pick<
  BuiltInApplicationPackageMaterializer,
  "ensureMaterialized" | "getBundledSourceRootPath"
>;

const LOCAL_PATH_SOURCE_KIND = "LOCAL_PATH";
const GITHUB_SOURCE_KIND = "GITHUB_REPOSITORY";
const PLATFORM_SOURCE_SUMMARY = "Managed by AutoByteus";

const getLocalPackageDisplayName = (rootPath: string): string => {
  const baseName = path.basename(rootPath);
  return baseName || rootPath;
};

const getGitHubPackageDisplayName = (record: ApplicationPackageRecord): string => {
  try {
    const url = new URL(record.source);
    const segments = url.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 2);
    if (segments.length === 2) {
      return `${segments[0]}/${segments[1].replace(/\.git$/i, "")}`;
    }
  } catch {
    // Fall back to normalized identity below.
  }

  return record.normalizedSource;
};

const mapBuiltInPackageRecord = (
  rootPath: string,
  bundledSourceRootPath: string,
): ApplicationPackageSourceRecord => ({
  packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
  displayName: "Platform Applications",
  rootPath,
  sourceKind: "BUILT_IN",
  source: bundledSourceRootPath,
  ...buildApplicationPackageSummary(rootPath),
  isPlatformOwned: true,
  isRemovable: false,
  managedInstallPath: rootPath,
  bundledSourceRootPath,
});

const mapLocalPackageRecord = (
  rootPath: string,
  record?: ApplicationPackageRecord | null,
): ApplicationPackageSourceRecord => ({
  packageId: record?.packageId ?? buildLocalApplicationPackageId(rootPath),
  displayName: getLocalPackageDisplayName(rootPath),
  rootPath,
  sourceKind: LOCAL_PATH_SOURCE_KIND,
  source: record?.source ?? rootPath,
  ...buildApplicationPackageSummary(rootPath),
  isPlatformOwned: false,
  isRemovable: true,
  managedInstallPath: null,
  bundledSourceRootPath: null,
});

const mapGitHubPackageRecord = (
  record: ApplicationPackageRecord,
): ApplicationPackageSourceRecord => ({
  packageId: record.packageId,
  displayName: getGitHubPackageDisplayName(record),
  rootPath: record.rootPath,
  sourceKind: GITHUB_SOURCE_KIND,
  source: record.source,
  ...buildApplicationPackageSummary(record.rootPath),
  isPlatformOwned: false,
  isRemovable: true,
  managedInstallPath: record.managedInstallPath,
  bundledSourceRootPath: null,
});

const buildSourceSummary = (
  record: ApplicationPackageSourceRecord,
): string | null => {
  switch (record.sourceKind) {
    case "BUILT_IN":
      return PLATFORM_SOURCE_SUMMARY;
    case "LOCAL_PATH":
      return record.rootPath;
    case "GITHUB_REPOSITORY":
      return record.source;
    default:
      return null;
  }
};

const toListItem = (
  record: ApplicationPackageSourceRecord,
): ApplicationPackageListItem => ({
  packageId: record.packageId,
  displayName: record.displayName,
  sourceKind: record.sourceKind,
  sourceSummary: buildSourceSummary(record),
  applicationCount: record.applicationCount,
  isPlatformOwned: record.isPlatformOwned,
  isRemovable: record.isRemovable,
});

const toDebugDetails = (
  record: ApplicationPackageSourceRecord,
): ApplicationPackageDebugDetails => ({
  ...record,
  sourceSummary: buildSourceSummary(record),
});

export class ApplicationPackageService {
  private static instance: ApplicationPackageService | null = null;

  static getInstance(
    dependencies?: ConstructorParameters<typeof ApplicationPackageService>[0],
  ): ApplicationPackageService {
    if (!ApplicationPackageService.instance) {
      ApplicationPackageService.instance = new ApplicationPackageService(dependencies);
    }
    return ApplicationPackageService.instance;
  }

  static resetInstance(): void {
    ApplicationPackageService.instance = null;
  }

  private readonly rootSettingsStore: ApplicationPackageRootSettingsStore;
  private readonly registryStore: ApplicationPackageRegistryStore;
  private readonly installer: GitHubApplicationPackageInstaller;
  private readonly refreshApplicationBundles: RefreshBundlesFn;
  private readonly refreshAgentDefinitions: RefreshBundlesFn;
  private readonly refreshAgentTeams: RefreshBundlesFn;
  private readonly validateApplicationPackageContents: (packageRoot: string) => Promise<void>;
  private readonly injectedBuiltInMaterializer?: BuiltInMaterializerLike;

  constructor(dependencies: {
    rootSettingsStore?: ApplicationPackageRootSettingsStore;
    registryStore?: ApplicationPackageRegistryStore;
    installer?: GitHubApplicationPackageInstaller;
    refreshApplicationBundles?: RefreshBundlesFn;
    refreshAgentDefinitions?: RefreshBundlesFn;
    refreshAgentTeams?: RefreshBundlesFn;
    validateApplicationPackageContents?: (packageRoot: string) => Promise<void>;
    builtInMaterializer?: BuiltInMaterializerLike;
  } = {}) {
    this.rootSettingsStore =
      dependencies.rootSettingsStore ?? new ApplicationPackageRootSettingsStore();
    this.registryStore =
      dependencies.registryStore ?? new ApplicationPackageRegistryStore();
    this.installer =
      dependencies.installer ?? new GitHubApplicationPackageInstaller();
    this.refreshApplicationBundles =
      dependencies.refreshApplicationBundles ??
      (() => ApplicationBundleService.getInstance().refresh());
    this.refreshAgentDefinitions =
      dependencies.refreshAgentDefinitions ??
      (() => AgentDefinitionService.getInstance().refreshCache());
    this.refreshAgentTeams =
      dependencies.refreshAgentTeams ??
      (() => AgentTeamDefinitionService.getInstance().refreshCache());
    this.validateApplicationPackageContents =
      dependencies.validateApplicationPackageContents ??
      ((packageRoot) => ApplicationBundleService.getInstance().validatePackageRoot(packageRoot));
    this.injectedBuiltInMaterializer = dependencies.builtInMaterializer;
  }

  private get builtInMaterializer(): BuiltInMaterializerLike {
    return this.injectedBuiltInMaterializer
      ?? BuiltInApplicationPackageMaterializer.getInstance();
  }

  async listApplicationPackages(): Promise<ApplicationPackageListItem[]> {
    const records = await this.listSourceRecords();
    return records
      .filter((record) => !record.isPlatformOwned || record.applicationCount > 0)
      .map(toListItem);
  }

  async getApplicationPackageDetails(
    packageId: string,
  ): Promise<ApplicationPackageDebugDetails | null> {
    const targetPackage = await this.findSourceRecordById(packageId.trim());
    return targetPackage ? toDebugDetails(targetPackage) : null;
  }

  async importApplicationPackage(
    input: ApplicationPackageImportInput,
  ): Promise<ApplicationPackageListItem[]> {
    const source = input.source.trim();
    if (!source) {
      throw new Error("Application package import source cannot be empty.");
    }

    if (input.sourceKind === LOCAL_PATH_SOURCE_KIND) {
      return this.importLocalPathPackage(source);
    }
    if (input.sourceKind === GITHUB_SOURCE_KIND) {
      return this.importGitHubPackage(source);
    }

    throw new Error(`Unsupported application package source kind: ${input.sourceKind}`);
  }

  async removeApplicationPackage(packageId: string): Promise<ApplicationPackageListItem[]> {
    const normalizedPackageId = packageId.trim();
    if (!normalizedPackageId) {
      throw new Error("Application package id cannot be empty.");
    }

    const targetPackage = await this.findSourceRecordById(normalizedPackageId);
    if (!targetPackage) {
      throw new Error(`Application package not found: ${normalizedPackageId}`);
    }
    if (!targetPackage.isRemovable) {
      throw new Error("Cannot remove the built-in application package.");
    }

    const existingRecord = await this.registryStore.findPackageById(normalizedPackageId);

    this.rootSettingsStore.removeAdditionalRootPath(targetPackage.rootPath);

    try {
      await this.registryStore.removePackageRecord(normalizedPackageId);
      await this.refreshCatalogCaches();

      if (
        targetPackage.sourceKind === GITHUB_SOURCE_KIND &&
        targetPackage.managedInstallPath
      ) {
        await fsPromises.rm(targetPackage.managedInstallPath, {
          recursive: true,
          force: true,
        });
      }

      return this.listApplicationPackages();
    } catch (error) {
      this.safeAddAdditionalRootPath(targetPackage.rootPath);
      await this.restorePackageRecord(existingRecord);
      await this.refreshCatalogCaches().catch(() => undefined);
      throw error;
    }
  }

  private async listSourceRecords(): Promise<ApplicationPackageSourceRecord[]> {
    await this.builtInMaterializer.ensureMaterialized();

    const builtInRootPath = this.rootSettingsStore.getBuiltInRootPath();
    const bundledSourceRootPath = this.builtInMaterializer.getBundledSourceRootPath();
    const additionalRootPaths = this.rootSettingsStore.listAdditionalRootPaths();
    const records = await this.registryStore.listPackageRecords();

    const recordByRootPath = new Map<string, ApplicationPackageRecord>();
    for (const record of records) {
      recordByRootPath.set(path.resolve(record.rootPath), record);
    }

    const packages: ApplicationPackageSourceRecord[] = [
      mapBuiltInPackageRecord(builtInRootPath, bundledSourceRootPath),
    ];

    for (const rootPath of additionalRootPaths) {
      const resolvedRootPath = path.resolve(rootPath);
      const record = recordByRootPath.get(resolvedRootPath);

      if (record?.sourceKind === GITHUB_SOURCE_KIND) {
        packages.push(mapGitHubPackageRecord(record));
        continue;
      }

      packages.push(mapLocalPackageRecord(resolvedRootPath, record));
    }

    return this.sortSourceRecords(packages);
  }

  private async importLocalPathPackage(source: string): Promise<ApplicationPackageListItem[]> {
    const resolvedPath = validateApplicationPackageRoot(source);
    if (resolvedPath === this.rootSettingsStore.getBuiltInRootPath()) {
      throw new Error("Path is already the built-in application package root.");
    }
    if (resolvedPath === this.builtInMaterializer.getBundledSourceRootPath()) {
      throw new Error("Path is already the bundled platform application source root.");
    }

    await this.validateApplicationPackageContents(resolvedPath);

    this.rootSettingsStore.addAdditionalRootPath(resolvedPath);
    const packageId = buildLocalApplicationPackageId(resolvedPath);

    try {
      await this.registryStore.upsertLinkedLocalPackageRecord(resolvedPath);
      await this.refreshCatalogCaches();
      return this.listApplicationPackages();
    } catch (error) {
      this.safeRemoveAdditionalRootPath(resolvedPath);
      await this.registryStore.removePackageRecord(packageId).catch(() => undefined);
      await this.refreshCatalogCaches().catch(() => undefined);
      throw error;
    }
  }

  private async importGitHubPackage(source: string): Promise<ApplicationPackageListItem[]> {
    const repositorySource = normalizeGitHubRepositorySource(source);
    const existingPackage = await this.registryStore.findGitHubPackageBySource(
      repositorySource.normalizedRepository,
    );

    if (existingPackage) {
      throw new Error(
        `GitHub application package already exists: ${existingPackage.source}`,
      );
    }

    const managedInstallPath = this.installer.getManagedInstallDir(
      repositorySource.installKey,
    );
    if (
      fs.existsSync(managedInstallPath) ||
      this.rootSettingsStore.listAdditionalRootPaths().includes(managedInstallPath)
    ) {
      throw new Error(
        `GitHub application package already exists: ${repositorySource.canonicalUrl}`,
      );
    }

    const installedPackage = await this.installer.installPackage(repositorySource);
    const packageId = buildGitHubApplicationPackageId(repositorySource.normalizedRepository);

    try {
      validateApplicationPackageRoot(installedPackage.rootPath);
      await this.validateApplicationPackageContents(installedPackage.rootPath);
      this.rootSettingsStore.addAdditionalRootPath(installedPackage.rootPath);

      await this.registryStore.upsertManagedGitHubPackageRecord({
        normalizedSource: repositorySource.normalizedRepository,
        source: installedPackage.canonicalSourceUrl,
        rootPath: installedPackage.rootPath,
        managedInstallPath: installedPackage.managedInstallPath,
      });

      await this.refreshCatalogCaches();
      return this.listApplicationPackages();
    } catch (error) {
      this.safeRemoveAdditionalRootPath(installedPackage.rootPath);
      await this.registryStore.removePackageRecord(packageId).catch(() => undefined);
      await fsPromises.rm(installedPackage.managedInstallPath, {
        recursive: true,
        force: true,
      }).catch(() => undefined);
      await this.refreshCatalogCaches().catch(() => undefined);
      throw error;
    }
  }

  private async findSourceRecordById(
    packageId: string,
  ): Promise<ApplicationPackageSourceRecord | null> {
    const packages = await this.listSourceRecords();
    return packages.find((entry) => entry.packageId === packageId) ?? null;
  }

  private sortSourceRecords(
    packages: ApplicationPackageSourceRecord[],
  ): ApplicationPackageSourceRecord[] {
    return [...packages].sort((left, right) => {
      if (left.isPlatformOwned) {
        return -1;
      }
      if (right.isPlatformOwned) {
        return 1;
      }

      const displayCompare = left.displayName.localeCompare(right.displayName);
      if (displayCompare !== 0) {
        return displayCompare;
      }

      return left.rootPath.localeCompare(right.rootPath);
    });
  }

  private async refreshCatalogCaches(): Promise<void> {
    await this.refreshApplicationBundles();
    const snapshot = await ApplicationBundleService.getInstance().getCatalogSnapshot();
    getApplicationAvailabilityService().synchronizeWithCatalogSnapshot(snapshot);
    await this.refreshAgentDefinitions();
    await this.refreshAgentTeams();
  }

  private safeRemoveAdditionalRootPath(rootPath: string): void {
    try {
      this.rootSettingsStore.removeAdditionalRootPath(rootPath);
    } catch {
      // Best-effort rollback only.
    }
  }

  private safeAddAdditionalRootPath(rootPath: string): void {
    try {
      this.rootSettingsStore.addAdditionalRootPath(rootPath);
    } catch {
      // Best-effort rollback only.
    }
  }

  private async restorePackageRecord(
    record: ApplicationPackageRecord | null,
  ): Promise<void> {
    if (!record) {
      return;
    }

    if (record.sourceKind === LOCAL_PATH_SOURCE_KIND) {
      await this.registryStore.upsertLinkedLocalPackageRecord(record.rootPath);
      return;
    }

    await this.registryStore.upsertManagedGitHubPackageRecord({
      normalizedSource: record.normalizedSource,
      source: record.source,
      rootPath: record.rootPath,
      managedInstallPath: record.managedInstallPath ?? record.rootPath,
    });
  }
}
