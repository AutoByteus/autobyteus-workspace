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
import type { ApplicationCatalogTransitionService } from "../../application-orchestration/services/application-catalog-transition-service.js";
import type { ApplicationPackageRegistryService } from "./application-package-registry-service.js";

export class ApplicationPackageCommandService {
  constructor(private readonly dependencies: {
    registry: ApplicationPackageRegistryService;
    provider: Pick<FileApplicationBundleProvider, "validatePackageRoot">;
    catalogTransition: Pick<ApplicationCatalogTransitionService, "runPackageTransition">;
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
    await this.dependencies.catalogTransition.runPackageTransition({
      kind: "reload",
      packageId: target.packageId,
      applyBeforeStage: async () => {
        if (target.isPlatformOwned) {
          await this.dependencies.registry.ensureBuiltInMaterialized();
        }
        return undefined;
      },
      rollbackSource: async (_value, cause) => {
        throw new Error(
          `Package '${target.packageId}' source cannot be restored automatically after reload failure: ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      },
    });
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

    await this.dependencies.catalogTransition.runPackageTransition({
      kind: "remove",
      packageId: normalizedPackageId,
      applyBeforeStage: async () => {
        if (rootPresent) this.dependencies.registry.removeAdditionalRootPath(target.packageRootPath);
        if (existingRecord) await this.dependencies.registry.removePackageRecord(normalizedPackageId);
        return { rootPresent, existingRecord };
      },
      finalizeAfterCommit: async () => {
        if (target.sourceKind === GITHUB_SOURCE_KIND && target.managedInstallPath) {
          await fsPromises.rm(target.managedInstallPath, { recursive: true, force: true });
        }
      },
      rollbackSource: async () => {
        if (rootPresent) this.safeAddRoot(target.packageRootPath);
        if (existingRecord) await this.dependencies.registry.restorePackageRecord(existingRecord);
      },
    });
    return this.dependencies.registry.listApplicationPackages();
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
    await this.dependencies.catalogTransition.runPackageTransition({
      kind: "import",
      packageId,
      applyBeforeStage: async () => {
        this.dependencies.registry.addAdditionalRootPath(resolvedPath);
        await this.dependencies.registry.upsertLinkedLocalPackage(resolvedPath);
        return undefined;
      },
      rollbackSource: async () => {
        this.safeRemoveRoot(resolvedPath);
        await this.dependencies.registry.removePackageRecord(packageId).catch(() => undefined);
      },
    });
    return this.dependencies.registry.listApplicationPackages();
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
      await this.dependencies.catalogTransition.runPackageTransition({
        kind: "import",
        packageId,
        applyBeforeStage: async () => {
          this.dependencies.registry.addAdditionalRootPath(installed.rootPath);
          await this.dependencies.registry.upsertManagedGitHubPackage({
            normalizedSource: repository.normalizedRepository,
            source: installed.canonicalSourceUrl,
            rootPath: installed.rootPath,
            managedInstallPath: installed.managedInstallPath,
          });
          return undefined;
        },
        rollbackSource: async () => {
          this.safeRemoveRoot(installed.rootPath);
          await this.dependencies.registry.removePackageRecord(packageId).catch(() => undefined);
          await fsPromises.rm(installed.managedInstallPath, {
            recursive: true,
            force: true,
          }).catch(() => undefined);
        },
      });
      return this.dependencies.registry.listApplicationPackages();
    } catch (error) {
      await fsPromises.rm(installed.managedInstallPath, {
        recursive: true,
        force: true,
      }).catch(() => undefined);
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
