import fs from "node:fs";
import fsPromises from "node:fs/promises";
import type { FileApplicationBundleProvider } from "../../application-bundles/providers/file-application-bundle-provider.js";
import { GitHubApplicationPackageInstaller } from "../installers/github-application-package-installer.js";
import type {
  ApplicationPackageImportInput,
  ApplicationPackageListItem,
} from "../types.js";
import { normalizeGitHubRepositorySource } from "../utils/github-repository-source.js";
import {
  buildGitHubApplicationPackageId,
  buildLocalApplicationPackageId,
  validateApplicationPackageRoot,
} from "../utils/application-package-root-summary.js";
import {
  GITHUB_SOURCE_KIND,
  LOCAL_PATH_SOURCE_KIND,
} from "./application-package-registry-entry-utils.js";
import type { ApplicationCatalogRefreshCoordinator } from "./application-catalog-refresh-coordinator.js";
import type { ApplicationPackageRegistryService } from "./application-package-registry-service.js";

export class ApplicationPackageCommandService {
  constructor(private readonly dependencies: {
    registry: ApplicationPackageRegistryService;
    provider: Pick<FileApplicationBundleProvider, "validatePackageRoot">;
    refreshCoordinator: Pick<ApplicationCatalogRefreshCoordinator, "refresh">;
    installer?: GitHubApplicationPackageInstaller;
  }) {}

  private get installer(): GitHubApplicationPackageInstaller {
    return this.dependencies.installer ?? new GitHubApplicationPackageInstaller();
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

  async reloadApplicationPackage(
    packageId: string,
  ): Promise<ApplicationPackageListItem[]> {
    const target = await this.requirePackage(packageId);
    if (target.isPlatformOwned) {
      await this.dependencies.registry.ensureBuiltInMaterialized();
    }
    await this.dependencies.refreshCoordinator.refresh();
    return this.dependencies.registry.listApplicationPackages();
  }

  async removeApplicationPackage(
    packageId: string,
  ): Promise<ApplicationPackageListItem[]> {
    const normalizedPackageId = packageId.trim();
    const target = await this.requirePackage(normalizedPackageId);
    if (!target.isRemovable) {
      throw new Error("Cannot remove the built-in application package.");
    }
    const existingRecord = await this.dependencies.registry
      .findPackageRecord(normalizedPackageId);
    const rootPresent = this.dependencies.registry.listAdditionalRootPaths()
      .includes(target.packageRootPath);
    let removedFromSettings = false;
    let removedFromRegistry = false;
    if (rootPresent) {
      this.dependencies.registry.removeAdditionalRootPath(target.packageRootPath);
      removedFromSettings = true;
    }
    try {
      if (existingRecord) {
        await this.dependencies.registry.removePackageRecord(normalizedPackageId);
        removedFromRegistry = true;
      }
      await this.dependencies.refreshCoordinator.refresh();
      if (target.sourceKind === GITHUB_SOURCE_KIND && target.managedInstallPath) {
        await fsPromises.rm(target.managedInstallPath, { recursive: true, force: true });
      }
      return this.dependencies.registry.listApplicationPackages();
    } catch (error) {
      if (removedFromSettings) {
        this.safeAddRoot(target.packageRootPath);
      }
      if (removedFromRegistry) {
        await this.dependencies.registry.restorePackageRecord(existingRecord);
      }
      await this.dependencies.refreshCoordinator.refresh().catch(() => undefined);
      throw error;
    }
  }

  private async importLocalPathPackage(
    source: string,
  ): Promise<ApplicationPackageListItem[]> {
    const resolvedPath = validateApplicationPackageRoot(source);
    if (resolvedPath === this.dependencies.registry.getBuiltInRootPath()) {
      throw new Error("Path is already the built-in application package root.");
    }
    if (resolvedPath === this.dependencies.registry.getBundledSourceRootPath()) {
      throw new Error("Path is already the bundled platform application source root.");
    }
    const packageId = buildLocalApplicationPackageId(resolvedPath);
    await this.dependencies.provider.validatePackageRoot(resolvedPath, packageId);
    this.dependencies.registry.addAdditionalRootPath(resolvedPath);
    try {
      await this.dependencies.registry.upsertLinkedLocalPackage(resolvedPath);
      await this.dependencies.refreshCoordinator.refresh();
      return this.dependencies.registry.listApplicationPackages();
    } catch (error) {
      this.safeRemoveRoot(resolvedPath);
      await this.dependencies.registry.removePackageRecord(packageId).catch(() => undefined);
      await this.dependencies.refreshCoordinator.refresh().catch(() => undefined);
      throw error;
    }
  }

  private async importGitHubPackage(
    source: string,
  ): Promise<ApplicationPackageListItem[]> {
    const repository = normalizeGitHubRepositorySource(source);
    const existing = await this.dependencies.registry
      .findGitHubPackageBySource(repository.normalizedRepository);
    if (existing) {
      throw new Error(`GitHub application package already exists: ${existing.source}`);
    }
    const managedInstallPath = this.installer.getManagedInstallDir(repository.installKey);
    if (
      fs.existsSync(managedInstallPath)
      || this.dependencies.registry.listAdditionalRootPaths().includes(managedInstallPath)
    ) {
      throw new Error(`GitHub application package already exists: ${repository.canonicalUrl}`);
    }
    const installed = await this.installer.installPackage(repository);
    const packageId = buildGitHubApplicationPackageId(repository.normalizedRepository);
    try {
      validateApplicationPackageRoot(installed.rootPath);
      await this.dependencies.provider.validatePackageRoot(installed.rootPath, packageId);
      this.dependencies.registry.addAdditionalRootPath(installed.rootPath);
      await this.dependencies.registry.upsertManagedGitHubPackage({
        normalizedSource: repository.normalizedRepository,
        source: installed.canonicalSourceUrl,
        rootPath: installed.rootPath,
        managedInstallPath: installed.managedInstallPath,
      });
      await this.dependencies.refreshCoordinator.refresh();
      return this.dependencies.registry.listApplicationPackages();
    } catch (error) {
      this.safeRemoveRoot(installed.rootPath);
      await this.dependencies.registry.removePackageRecord(packageId).catch(() => undefined);
      await fsPromises.rm(installed.managedInstallPath, {
        recursive: true,
        force: true,
      }).catch(() => undefined);
      await this.dependencies.refreshCoordinator.refresh().catch(() => undefined);
      throw error;
    }
  }

  private async requirePackage(packageId: string) {
    const normalized = packageId.trim();
    if (!normalized) {
      throw new Error("Application package id cannot be empty.");
    }
    const target = await this.dependencies.registry.findRegistryEntryById(normalized);
    if (!target) {
      throw new Error(`Application package not found: ${normalized}`);
    }
    return target;
  }

  private safeRemoveRoot(rootPath: string): void {
    try { this.dependencies.registry.removeAdditionalRootPath(rootPath); } catch { /* rollback */ }
  }

  private safeAddRoot(rootPath: string): void {
    try { this.dependencies.registry.addAdditionalRootPath(rootPath); } catch { /* rollback */ }
  }
}
