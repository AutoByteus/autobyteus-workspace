import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { GitHubApplicationPackageInstaller } from "../installers/github-application-package-installer.js";
import {
  ApplicationPackage,
  ApplicationPackageImportInput,
  ApplicationPackageRecord,
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
import { BUILT_IN_APPLICATION_PACKAGE_ID } from "../../application-bundles/providers/file-application-bundle-provider.js";

type RefreshBundlesFn = () => Promise<void>;

const LOCAL_PATH_SOURCE_KIND = "LOCAL_PATH";
const GITHUB_SOURCE_KIND = "GITHUB_REPOSITORY";

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

const mapBuiltInPackage = (rootPath: string): ApplicationPackage => ({
  packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
  displayName: "Built-in Applications",
  path: rootPath,
  sourceKind: "BUILT_IN",
  source: rootPath,
  ...buildApplicationPackageSummary(rootPath),
  isDefault: true,
  isRemovable: false,
  managedInstallPath: null,
});

const mapLocalPackage = (
  rootPath: string,
  record?: ApplicationPackageRecord | null,
): ApplicationPackage => ({
  packageId: record?.packageId ?? buildLocalApplicationPackageId(rootPath),
  displayName: getLocalPackageDisplayName(rootPath),
  path: rootPath,
  sourceKind: LOCAL_PATH_SOURCE_KIND,
  source: record?.source ?? rootPath,
  ...buildApplicationPackageSummary(rootPath),
  isDefault: false,
  isRemovable: true,
  managedInstallPath: null,
});

const mapGitHubPackage = (record: ApplicationPackageRecord): ApplicationPackage => ({
  packageId: record.packageId,
  displayName: getGitHubPackageDisplayName(record),
  path: record.rootPath,
  sourceKind: GITHUB_SOURCE_KIND,
  source: record.source,
  ...buildApplicationPackageSummary(record.rootPath),
  isDefault: false,
  isRemovable: true,
  managedInstallPath: record.managedInstallPath,
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
  private readonly validateApplicationPackageContents: (packageRoot: string) => Promise<void>;

  constructor(dependencies: {
    rootSettingsStore?: ApplicationPackageRootSettingsStore;
    registryStore?: ApplicationPackageRegistryStore;
    installer?: GitHubApplicationPackageInstaller;
    refreshApplicationBundles?: RefreshBundlesFn;
    validateApplicationPackageContents?: (packageRoot: string) => Promise<void>;
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
    this.validateApplicationPackageContents =
      dependencies.validateApplicationPackageContents ??
      ((packageRoot) => ApplicationBundleService.getInstance().validatePackageRoot(packageRoot));
  }

  async listApplicationPackages(): Promise<ApplicationPackage[]> {
    const builtInRootPath = this.rootSettingsStore.getBuiltInRootPath();
    const additionalRootPaths = this.rootSettingsStore.listAdditionalRootPaths();
    const records = await this.registryStore.listPackageRecords();

    const recordByRootPath = new Map<string, ApplicationPackageRecord>();
    for (const record of records) {
      recordByRootPath.set(path.resolve(record.rootPath), record);
    }

    const packages: ApplicationPackage[] = [mapBuiltInPackage(builtInRootPath)];

    for (const rootPath of additionalRootPaths) {
      const resolvedRootPath = path.resolve(rootPath);
      const record = recordByRootPath.get(resolvedRootPath);

      if (record?.sourceKind === GITHUB_SOURCE_KIND) {
        packages.push(mapGitHubPackage(record));
        continue;
      }

      packages.push(mapLocalPackage(resolvedRootPath, record));
    }

    return this.sortPackageEntries(packages);
  }

  async importApplicationPackage(input: ApplicationPackageImportInput): Promise<ApplicationPackage[]> {
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

  async removeApplicationPackage(packageId: string): Promise<ApplicationPackage[]> {
    const normalizedPackageId = packageId.trim();
    if (!normalizedPackageId) {
      throw new Error("Application package id cannot be empty.");
    }

    const targetPackage = await this.findPackageById(normalizedPackageId);
    if (!targetPackage) {
      throw new Error(`Application package not found: ${normalizedPackageId}`);
    }
    if (!targetPackage.isRemovable) {
      throw new Error("Cannot remove the built-in application package.");
    }

    const existingRecord = await this.registryStore.findPackageById(normalizedPackageId);

    this.rootSettingsStore.removeAdditionalRootPath(targetPackage.path);

    try {
      await this.registryStore.removePackageRecord(normalizedPackageId);
      await this.refreshApplicationBundles();

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
      this.safeAddAdditionalRootPath(targetPackage.path);
      await this.restorePackageRecord(existingRecord);
      await this.refreshApplicationBundles().catch(() => undefined);
      throw error;
    }
  }

  private async importLocalPathPackage(source: string): Promise<ApplicationPackage[]> {
    const resolvedPath = validateApplicationPackageRoot(source);
    if (resolvedPath === this.rootSettingsStore.getBuiltInRootPath()) {
      throw new Error("Path is already the built-in application package root.");
    }

    await this.validateApplicationPackageContents(resolvedPath);

    this.rootSettingsStore.addAdditionalRootPath(resolvedPath);
    const packageId = buildLocalApplicationPackageId(resolvedPath);

    try {
      await this.registryStore.upsertLinkedLocalPackageRecord(resolvedPath);
      await this.refreshApplicationBundles();
      return this.listApplicationPackages();
    } catch (error) {
      this.safeRemoveAdditionalRootPath(resolvedPath);
      await this.registryStore.removePackageRecord(packageId).catch(() => undefined);
      await this.refreshApplicationBundles().catch(() => undefined);
      throw error;
    }
  }

  private async importGitHubPackage(source: string): Promise<ApplicationPackage[]> {
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

      await this.refreshApplicationBundles();
      return this.listApplicationPackages();
    } catch (error) {
      this.safeRemoveAdditionalRootPath(installedPackage.rootPath);
      await this.registryStore.removePackageRecord(packageId).catch(() => undefined);
      await fsPromises.rm(installedPackage.managedInstallPath, {
        recursive: true,
        force: true,
      }).catch(() => undefined);
      await this.refreshApplicationBundles().catch(() => undefined);
      throw error;
    }
  }

  private async findPackageById(packageId: string): Promise<ApplicationPackage | null> {
    const packages = await this.listApplicationPackages();
    return packages.find((entry) => entry.packageId === packageId) ?? null;
  }

  private sortPackageEntries(packages: ApplicationPackage[]): ApplicationPackage[] {
    return [...packages].sort((left, right) => {
      if (left.isDefault) {
        return -1;
      }
      if (right.isDefault) {
        return 1;
      }

      const displayCompare = left.displayName.localeCompare(right.displayName);
      if (displayCompare !== 0) {
        return displayCompare;
      }

      return left.path.localeCompare(right.path);
    });
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
