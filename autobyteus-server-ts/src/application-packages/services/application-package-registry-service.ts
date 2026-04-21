import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import {
  ApplicationAvailabilityService,
  getApplicationAvailabilityService,
} from "../../application-orchestration/services/application-availability-service.js";
import { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import type {
  ApplicationPackageRegistryDiagnostic,
  ApplicationPackageRegistryEntry,
  ApplicationPackageRegistrySnapshot,
} from "../domain/application-package-registry-snapshot.js";
import { GitHubApplicationPackageInstaller } from "../installers/github-application-package-installer.js";
import { BuiltInApplicationPackageMaterializer } from "./built-in-application-package-materializer.js";
import {
  GITHUB_SOURCE_KIND,
  LOCAL_PATH_SOURCE_KIND,
  createDiagnostic,
  mapBuiltInPackageEntry,
  mapGitHubPackageEntry,
  mapLocalPackageEntry,
  toDebugDetails,
  toListItem,
} from "./application-package-registry-entry-utils.js";
import { ApplicationPackageRegistryStore } from "../stores/application-package-registry-store.js";
import { ApplicationPackageRootSettingsStore } from "../stores/application-package-root-settings-store.js";
import type {
  ApplicationPackageDebugDetails,
  ApplicationPackageImportInput,
  ApplicationPackageListItem,
  ApplicationPackageRecord,
} from "../types.js";
import { normalizeGitHubRepositorySource } from "../utils/github-repository-source.js";
import {
  buildGitHubApplicationPackageId,
  buildLocalApplicationPackageId,
  validateApplicationPackageRoot,
} from "../utils/application-package-root-summary.js";

type RefreshBundlesFn = () => Promise<void>;

type BuiltInMaterializerLike = Pick<
  BuiltInApplicationPackageMaterializer,
  "ensureMaterialized" | "getBundledSourceRootPath"
>;

export class ApplicationPackageRegistryService {
  private static instance: ApplicationPackageRegistryService | null = null;

  static getInstance(
    dependencies?: ConstructorParameters<typeof ApplicationPackageRegistryService>[0],
  ): ApplicationPackageRegistryService {
    if (!ApplicationPackageRegistryService.instance) {
      ApplicationPackageRegistryService.instance = new ApplicationPackageRegistryService(dependencies);
    }
    return ApplicationPackageRegistryService.instance;
  }

  static resetInstance(): void {
    ApplicationPackageRegistryService.instance = null;
  }

  private readonly rootSettingsStore: ApplicationPackageRootSettingsStore;
  private readonly registryStore: ApplicationPackageRegistryStore;
  private readonly installer: GitHubApplicationPackageInstaller;
  private readonly refreshApplicationBundles: RefreshBundlesFn;
  private readonly refreshAgentDefinitions: RefreshBundlesFn;
  private readonly refreshAgentTeams: RefreshBundlesFn;
  private readonly validateApplicationPackageContents: (
    packageRoot: string,
    packageId?: string,
  ) => Promise<void>;
  private readonly injectedBuiltInMaterializer?: BuiltInMaterializerLike;
  private readonly injectedApplicationBundleService?: Pick<ApplicationBundleService, "getCatalogSnapshot">;
  private readonly injectedAvailabilityService?: Pick<
    ApplicationAvailabilityService,
    "reconcileCatalogSnapshotWithKnownApplications"
  >;
  private readonly injectedPlatformStateStore?: Pick<ApplicationPlatformStateStore, "listKnownApplicationIds">;

  constructor(dependencies: {
    rootSettingsStore?: ApplicationPackageRootSettingsStore;
    registryStore?: ApplicationPackageRegistryStore;
    installer?: GitHubApplicationPackageInstaller;
    refreshApplicationBundles?: RefreshBundlesFn;
    refreshAgentDefinitions?: RefreshBundlesFn;
    refreshAgentTeams?: RefreshBundlesFn;
    validateApplicationPackageContents?: (packageRoot: string, packageId?: string) => Promise<void>;
    builtInMaterializer?: BuiltInMaterializerLike;
    applicationBundleService?: Pick<ApplicationBundleService, "getCatalogSnapshot">;
    availabilityService?: Pick<ApplicationAvailabilityService, "reconcileCatalogSnapshotWithKnownApplications">;
    platformStateStore?: Pick<ApplicationPlatformStateStore, "listKnownApplicationIds">;
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
      ((packageRoot, packageId) => ApplicationBundleService.getInstance().validatePackageRoot(packageRoot, packageId));
    this.injectedBuiltInMaterializer = dependencies.builtInMaterializer;
    this.injectedApplicationBundleService = dependencies.applicationBundleService;
    this.injectedAvailabilityService = dependencies.availabilityService;
    this.injectedPlatformStateStore = dependencies.platformStateStore;
  }

  private get builtInMaterializer(): BuiltInMaterializerLike {
    return this.injectedBuiltInMaterializer
      ?? BuiltInApplicationPackageMaterializer.getInstance();
  }

  private get applicationBundleService(): Pick<ApplicationBundleService, "getCatalogSnapshot"> {
    return this.injectedApplicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get availabilityService(): Pick<
    ApplicationAvailabilityService,
    "reconcileCatalogSnapshotWithKnownApplications"
  > {
    return this.injectedAvailabilityService ?? getApplicationAvailabilityService();
  }

  private get platformStateStore(): Pick<ApplicationPlatformStateStore, "listKnownApplicationIds"> {
    return this.injectedPlatformStateStore ?? new ApplicationPlatformStateStore();
  }

  async getRegistrySnapshot(): Promise<ApplicationPackageRegistrySnapshot> {
    await this.builtInMaterializer.ensureMaterialized();

    const builtInRootPath = path.resolve(this.rootSettingsStore.getBuiltInRootPath());
    const bundledSourceRootPath = path.resolve(this.builtInMaterializer.getBundledSourceRootPath());
    const additionalRootPaths = this.rootSettingsStore.listAdditionalRootPaths().map((rootPath) => path.resolve(rootPath));
    const records = await this.registryStore.listPackageRecords();
    const recordByRootPath = new Map(
      records.map((record) => [path.resolve(record.rootPath), record]),
    );
    const additionalRootSet = new Set(additionalRootPaths);
    const packages: ApplicationPackageRegistryEntry[] = [
      mapBuiltInPackageEntry(builtInRootPath, bundledSourceRootPath),
    ];
    const diagnostics: ApplicationPackageRegistryDiagnostic[] = [];

    for (const additionalRootPath of additionalRootPaths) {
      const record = recordByRootPath.get(additionalRootPath);
      const packageEntry = record?.sourceKind === GITHUB_SOURCE_KIND
        ? mapGitHubPackageEntry(record)
        : mapLocalPackageEntry(additionalRootPath, record);
      packages.push(packageEntry);
      diagnostics.push(...await this.collectEntryDiagnostics(packageEntry, record, true));
    }

    for (const record of records) {
      const packageRootPath = path.resolve(record.rootPath);
      if (additionalRootSet.has(packageRootPath)) {
        continue;
      }
      const packageEntry = record.sourceKind === GITHUB_SOURCE_KIND
        ? mapGitHubPackageEntry(record)
        : mapLocalPackageEntry(packageRootPath, record);
      packages.push(packageEntry);
      diagnostics.push(
        createDiagnostic(
          packageEntry,
          "Application package registry/settings mismatch: package root is registered in the registry but not present in configured roots.",
        ),
      );
      diagnostics.push(...await this.collectEntryDiagnostics(packageEntry, record, false));
    }

    return {
      packages: this.sortRegistryEntries(packages),
      diagnostics: this.sortDiagnostics(diagnostics),
      refreshedAt: new Date().toISOString(),
    };
  }

  async listApplicationPackages(): Promise<ApplicationPackageListItem[]> {
    const snapshot = await this.getRegistrySnapshot();
    return snapshot.packages
      .filter((record) => !record.isPlatformOwned || record.applicationCount > 0)
      .map(toListItem);
  }

  async getApplicationPackageDetails(
    packageId: string,
  ): Promise<ApplicationPackageDebugDetails | null> {
    const targetPackage = await this.findRegistryEntryById(packageId.trim());
    return targetPackage ? toDebugDetails(targetPackage) : null;
  }

  async importPackage(
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

  async importApplicationPackage(
    input: ApplicationPackageImportInput,
  ): Promise<ApplicationPackageListItem[]> {
    return this.importPackage(input);
  }

  async removePackage(packageId: string): Promise<ApplicationPackageListItem[]> {
    const normalizedPackageId = packageId.trim();
    if (!normalizedPackageId) {
      throw new Error("Application package id cannot be empty.");
    }

    const targetPackage = await this.findRegistryEntryById(normalizedPackageId);
    if (!targetPackage) {
      throw new Error(`Application package not found: ${normalizedPackageId}`);
    }
    if (!targetPackage.isRemovable) {
      throw new Error("Cannot remove the built-in application package.");
    }

    const existingRecord = await this.registryStore.findPackageById(normalizedPackageId);

    this.rootSettingsStore.removeAdditionalRootPath(targetPackage.packageRootPath);

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
      this.safeAddAdditionalRootPath(targetPackage.packageRootPath);
      await this.restorePackageRecord(existingRecord);
      await this.refreshCatalogCaches().catch(() => undefined);
      throw error;
    }
  }

  async removeApplicationPackage(packageId: string): Promise<ApplicationPackageListItem[]> {
    return this.removePackage(packageId);
  }

  async reloadPackage(packageId: string): Promise<ApplicationPackageListItem[]> {
    const normalizedPackageId = packageId.trim();
    if (!normalizedPackageId) {
      throw new Error("Application package id cannot be empty.");
    }

    const targetPackage = await this.findRegistryEntryById(normalizedPackageId);
    if (!targetPackage) {
      throw new Error(`Application package not found: ${normalizedPackageId}`);
    }

    if (targetPackage.isPlatformOwned) {
      await this.builtInMaterializer.ensureMaterialized();
    }

    await this.refreshCatalogCaches();
    return this.listApplicationPackages();
  }

  private async collectEntryDiagnostics(
    record: ApplicationPackageRegistryEntry,
    registryRecord: ApplicationPackageRecord | undefined,
    presentInSettings: boolean,
  ): Promise<ApplicationPackageRegistryDiagnostic[]> {
    const diagnostics: ApplicationPackageRegistryDiagnostic[] = [];

    if (!record.isPlatformOwned && presentInSettings && !registryRecord) {
      diagnostics.push(
        createDiagnostic(
          record,
          "Application package registry/settings mismatch: package root is configured but no registry record exists.",
        ),
      );
    }

    try {
      const stats = await fsPromises.stat(record.packageRootPath);
      if (!stats.isDirectory()) {
        diagnostics.push(
          createDiagnostic(
            record,
            `Application package root is not a directory: ${record.packageRootPath}`,
          ),
        );
      } else {
        await fsPromises.access(record.packageRootPath, fs.constants.R_OK);
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      diagnostics.push(
        createDiagnostic(
          record,
          code === "ENOENT"
            ? `Application package root is missing: ${record.packageRootPath}`
            : `Application package root is unreadable: ${record.packageRootPath}`,
        ),
      );
    }

    if (registryRecord?.sourceKind === GITHUB_SOURCE_KIND) {
      if (!registryRecord.managedInstallPath) {
        diagnostics.push(
          createDiagnostic(
            record,
            "GitHub application package registry record is missing managedInstallPath.",
          ),
        );
      } else if (path.resolve(registryRecord.managedInstallPath) !== record.packageRootPath) {
        diagnostics.push(
          createDiagnostic(
            record,
            "GitHub application package registry/settings mismatch: managed install path does not match the configured package root.",
          ),
        );
      }
    }

    return diagnostics;
  }

  private async importLocalPathPackage(source: string): Promise<ApplicationPackageListItem[]> {
    const resolvedPath = validateApplicationPackageRoot(source);
    if (resolvedPath === this.rootSettingsStore.getBuiltInRootPath()) {
      throw new Error("Path is already the built-in application package root.");
    }
    if (resolvedPath === this.builtInMaterializer.getBundledSourceRootPath()) {
      throw new Error("Path is already the bundled platform application source root.");
    }

    await this.validateApplicationPackageContents(
      resolvedPath,
      buildLocalApplicationPackageId(resolvedPath),
    );

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
      await this.validateApplicationPackageContents(
        installedPackage.rootPath,
        packageId,
      );
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

  private async findRegistryEntryById(
    packageId: string,
  ): Promise<ApplicationPackageRegistryEntry | null> {
    const snapshot = await this.getRegistrySnapshot();
    return snapshot.packages.find((entry) => entry.packageId === packageId) ?? null;
  }

  private sortRegistryEntries(
    packages: ApplicationPackageRegistryEntry[],
  ): ApplicationPackageRegistryEntry[] {
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

      return left.packageRootPath.localeCompare(right.packageRootPath);
    });
  }

  private sortDiagnostics(
    diagnostics: ApplicationPackageRegistryDiagnostic[],
  ): ApplicationPackageRegistryDiagnostic[] {
    return [...diagnostics].sort((left, right) => {
      const packageCompare = left.packageId.localeCompare(right.packageId);
      if (packageCompare !== 0) {
        return packageCompare;
      }
      return left.message.localeCompare(right.message);
    });
  }

  private async refreshCatalogCaches(): Promise<void> {
    await this.refreshApplicationBundles();
    const snapshot = await this.applicationBundleService.getCatalogSnapshot();
    const persistedKnownApplicationIds = await this.platformStateStore.listKnownApplicationIds();
    this.availabilityService.reconcileCatalogSnapshotWithKnownApplications(snapshot, {
      persistedKnownApplicationIds,
    });
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
