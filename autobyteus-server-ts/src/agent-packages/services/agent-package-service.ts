import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { GitHubAgentPackageInstaller } from "../installers/github-agent-package-installer.js";
import { AgentPackageRecord, AgentPackage, AgentPackageImportInput } from "../types.js";
import { normalizeGitHubRepositorySource } from "../utils/github-repository-source.js";
import {
  buildPackageSummary,
  buildGitHubPackageId,
  buildLocalPackageId,
  BUILT_IN_AGENT_PACKAGE_ID,
  validatePackageRoot,
} from "../utils/package-root-summary.js";
import { AgentPackageRegistryStore } from "../stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../stores/agent-package-root-settings-store.js";

type RefreshCachesFn = () => Promise<void>;

const LOCAL_PATH_SOURCE_KIND = "LOCAL_PATH";
const GITHUB_SOURCE_KIND = "GITHUB_REPOSITORY";

const getLocalPackageDisplayName = (rootPath: string): string => {
  const baseName = path.basename(rootPath);
  return baseName || rootPath;
};

const getGitHubPackageDisplayName = (record: AgentPackageRecord): string => {
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

const mapBuiltInPackage = (rootPath: string): AgentPackage => ({
  packageId: BUILT_IN_AGENT_PACKAGE_ID,
  displayName: "Built-in Storage",
  path: rootPath,
  sourceKind: "BUILT_IN",
  source: rootPath,
  ...buildPackageSummary(rootPath),
  isDefault: true,
  isRemovable: false,
  managedInstallPath: null,
});

const mapLocalPackage = (
  rootPath: string,
  record?: AgentPackageRecord | null,
): AgentPackage => ({
  packageId: record?.packageId ?? buildLocalPackageId(rootPath),
  displayName: getLocalPackageDisplayName(rootPath),
  path: rootPath,
  sourceKind: LOCAL_PATH_SOURCE_KIND,
  source: record?.source ?? rootPath,
  ...buildPackageSummary(rootPath),
  isDefault: false,
  isRemovable: true,
  managedInstallPath: null,
});

const mapGitHubPackage = (record: AgentPackageRecord): AgentPackage => ({
  packageId: record.packageId,
  displayName: getGitHubPackageDisplayName(record),
  path: record.rootPath,
  sourceKind: GITHUB_SOURCE_KIND,
  source: record.source,
  ...buildPackageSummary(record.rootPath),
  isDefault: false,
  isRemovable: true,
  managedInstallPath: record.managedInstallPath,
});

export class AgentPackageService {
  private static instance: AgentPackageService | null = null;

  static getInstance(
    dependencies?: ConstructorParameters<typeof AgentPackageService>[0],
  ): AgentPackageService {
    if (!AgentPackageService.instance) {
      AgentPackageService.instance = new AgentPackageService(dependencies);
    }
    return AgentPackageService.instance;
  }

  static resetInstance(): void {
    AgentPackageService.instance = null;
  }

  private readonly rootSettingsStore: AgentPackageRootSettingsStore;
  private readonly registryStore: AgentPackageRegistryStore;
  private readonly installer: GitHubAgentPackageInstaller;
  private readonly refreshAgentDefinitions: RefreshCachesFn;
  private readonly refreshAgentTeams: RefreshCachesFn;
  private readonly refreshApplicationBundles: RefreshCachesFn;
  private readonly validateApplicationsInPackageRoot: (packageRoot: string) => Promise<void>;

  constructor(dependencies: {
    rootSettingsStore?: AgentPackageRootSettingsStore;
    registryStore?: AgentPackageRegistryStore;
    installer?: GitHubAgentPackageInstaller;
    refreshAgentDefinitions?: RefreshCachesFn;
    refreshAgentTeams?: RefreshCachesFn;
    refreshApplicationBundles?: RefreshCachesFn;
    validateApplicationsInPackageRoot?: (packageRoot: string) => Promise<void>;
  } = {}) {
    this.rootSettingsStore =
      dependencies.rootSettingsStore ?? new AgentPackageRootSettingsStore();
    this.registryStore =
      dependencies.registryStore ?? new AgentPackageRegistryStore();
    this.installer =
      dependencies.installer ?? new GitHubAgentPackageInstaller();
    this.refreshAgentDefinitions =
      dependencies.refreshAgentDefinitions ??
      (() => AgentDefinitionService.getInstance().refreshCache());
    this.refreshAgentTeams =
      dependencies.refreshAgentTeams ??
      (() => AgentTeamDefinitionService.getInstance().refreshCache());
    this.refreshApplicationBundles =
      dependencies.refreshApplicationBundles ??
      (() => ApplicationBundleService.getInstance().refresh());
    this.validateApplicationsInPackageRoot =
      dependencies.validateApplicationsInPackageRoot ??
      ((packageRoot) => ApplicationBundleService.getInstance().validatePackageRoot(packageRoot));
  }

  async listAgentPackages(): Promise<AgentPackage[]> {
    const defaultRootPath = this.rootSettingsStore.getDefaultRootPath();
    const additionalRootPaths = this.rootSettingsStore.listAdditionalRootPaths();
    const records = await this.registryStore.listPackageRecords();

    const recordByRootPath = new Map<string, AgentPackageRecord>();
    for (const record of records) {
      recordByRootPath.set(path.resolve(record.rootPath), record);
    }

    const packages: AgentPackage[] = [mapBuiltInPackage(defaultRootPath)];

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

  async importAgentPackage(input: AgentPackageImportInput): Promise<AgentPackage[]> {
    const source = input.source.trim();
    if (!source) {
      throw new Error("Agent package import source cannot be empty.");
    }

    if (input.sourceKind === LOCAL_PATH_SOURCE_KIND) {
      return this.importLocalPathPackage(source);
    }
    if (input.sourceKind === GITHUB_SOURCE_KIND) {
      return this.importGitHubPackage(source);
    }

    throw new Error(`Unsupported agent package source kind: ${input.sourceKind}`);
  }

  async removeAgentPackage(packageId: string): Promise<AgentPackage[]> {
    const normalizedPackageId = packageId.trim();
    if (!normalizedPackageId) {
      throw new Error("Agent package id cannot be empty.");
    }

    const targetPackage = await this.findPackageById(normalizedPackageId);
    if (!targetPackage) {
      throw new Error(`Agent package not found: ${normalizedPackageId}`);
    }
    if (!targetPackage.isRemovable) {
      throw new Error("Cannot remove the default agent package.");
    }

    const existingRecord = await this.registryStore.findPackageById(normalizedPackageId);

    this.rootSettingsStore.removeAdditionalRootPath(targetPackage.path);

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

      return this.listAgentPackages();
    } catch (error) {
      this.safeAddAdditionalRootPath(targetPackage.path);
      await this.restorePackageRecord(existingRecord);
      await this.refreshCatalogCaches().catch(() => undefined);
      throw error;
    }
  }

  private async importLocalPathPackage(source: string): Promise<AgentPackage[]> {
    const resolvedPath = validatePackageRoot(source);
    if (resolvedPath === this.rootSettingsStore.getDefaultRootPath()) {
      throw new Error("Path is already the default agent package.");
    }

    await this.validateApplicationsInPackageRoot(resolvedPath);

    this.rootSettingsStore.addAdditionalRootPath(resolvedPath);
    const packageId = buildLocalPackageId(resolvedPath);

    try {
      await this.registryStore.upsertLinkedLocalPackageRecord(resolvedPath);
      await this.refreshCatalogCaches();
      return this.listAgentPackages();
    } catch (error) {
      this.safeRemoveAdditionalRootPath(resolvedPath);
      await this.registryStore.removePackageRecord(packageId).catch(() => undefined);
      await this.refreshCatalogCaches().catch(() => undefined);
      throw error;
    }
  }

  private async importGitHubPackage(source: string): Promise<AgentPackage[]> {
    const repositorySource = normalizeGitHubRepositorySource(source);
    const existingPackage = await this.registryStore.findGitHubPackageBySource(
      repositorySource.normalizedRepository,
    );

    if (existingPackage) {
      throw new Error(
        `GitHub agent package already exists: ${existingPackage.source}`,
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
        `GitHub agent package already exists: ${repositorySource.canonicalUrl}`,
      );
    }

    const installedPackage = await this.installer.installPackage(repositorySource);
    const packageId = buildGitHubPackageId(repositorySource.normalizedRepository);

    try {
      validatePackageRoot(installedPackage.rootPath);
      await this.validateApplicationsInPackageRoot(installedPackage.rootPath);
      this.rootSettingsStore.addAdditionalRootPath(installedPackage.rootPath);

      await this.registryStore.upsertManagedGitHubPackageRecord({
        normalizedSource: repositorySource.normalizedRepository,
        source: installedPackage.canonicalSourceUrl,
        rootPath: installedPackage.rootPath,
        managedInstallPath: installedPackage.managedInstallPath,
      });

      await this.refreshCatalogCaches();
      return this.listAgentPackages();
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

  private async findPackageById(packageId: string): Promise<AgentPackage | null> {
    const packages = await this.listAgentPackages();
    return packages.find((entry) => entry.packageId === packageId) ?? null;
  }

  private sortPackageEntries(packages: AgentPackage[]): AgentPackage[] {
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

  private async refreshCatalogCaches(): Promise<void> {
    await this.refreshAgentDefinitions();
    await this.refreshAgentTeams();
    await this.refreshApplicationBundles();
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
    record: AgentPackageRecord | null,
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
