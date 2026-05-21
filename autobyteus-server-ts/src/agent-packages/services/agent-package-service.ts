import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { GitHubAgentPackageInstaller } from "../installers/github-agent-package-installer.js";
import {
  AgentPackageRecord,
  AgentPackage,
  AgentPackageImportInput,
} from "../types.js";
import { normalizeGitHubRepositorySource } from "../utils/github-repository-source.js";
import {
  buildGitHubPackageId,
  buildLocalPackageId,
  validatePackageRoot,
} from "../utils/package-root-summary.js";
import { AgentPackageRegistryStore } from "../stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../stores/agent-package-root-settings-store.js";
import {
  buildGitHubSourceMetadata,
  buildInstalledGitHubMetadata,
  githubSourceMetadata,
  mapBuiltInPackage,
  mapGitHubPackage,
  mapLocalPackage,
} from "./agent-package-mappers.js";

type RefreshCachesFn = () => Promise<void>;

const LOCAL_PATH_SOURCE_KIND = "LOCAL_PATH";
const GITHUB_SOURCE_KIND = "GITHUB_REPOSITORY";

const formatErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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

  constructor(dependencies: {
    rootSettingsStore?: AgentPackageRootSettingsStore;
    registryStore?: AgentPackageRegistryStore;
    installer?: GitHubAgentPackageInstaller;
    refreshAgentDefinitions?: RefreshCachesFn;
    refreshAgentTeams?: RefreshCachesFn;
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

  async reloadAgentPackage(packageId: string): Promise<AgentPackage[]> {
    const targetPackage = await this.requirePackageById(packageId);
    if (targetPackage.isDefault) {
      throw new Error("Cannot reload the default agent package.");
    }
    if (targetPackage.sourceKind !== LOCAL_PATH_SOURCE_KIND) {
      throw new Error("Only local path agent packages can be reloaded.");
    }

    validatePackageRoot(targetPackage.path);
    await this.refreshCatalogCaches();
    return this.listAgentPackages();
  }

  async checkAgentPackageUpdates(packageIds?: string[]): Promise<AgentPackage[]> {
    const requestedIds = new Set(
      (packageIds ?? []).map((id) => id.trim()).filter(Boolean),
    );
    const records = await this.registryStore.listPackageRecords();
    const githubRecords = records.filter(
      (record) =>
        record.sourceKind === GITHUB_SOURCE_KIND &&
        (requestedIds.size === 0 || requestedIds.has(record.packageId)),
    );

    for (const record of githubRecords) {
      await this.checkGitHubPackageUpdate(record);
    }

    return this.listAgentPackages();
  }

  async updateAgentPackage(packageId: string): Promise<AgentPackage[]> {
    const normalizedPackageId = packageId.trim();
    if (!normalizedPackageId) {
      throw new Error("Agent package id cannot be empty.");
    }

    const record = await this.registryStore.findPackageById(normalizedPackageId);
    if (!record) {
      throw new Error(`Agent package not found: ${normalizedPackageId}`);
    }
    if (record.sourceKind !== GITHUB_SOURCE_KIND || !record.managedInstallPath) {
      throw new Error("Only managed GitHub agent packages can be updated.");
    }

    const previousMetadata = record.sourceMetadata?.github ?? null;
    const checkedAt = new Date().toISOString();
    let repositorySource: ReturnType<typeof normalizeGitHubRepositorySource>;
    let metadata: Awaited<
      ReturnType<GitHubAgentPackageInstaller["fetchRepositoryRevisionMetadata"]>
    >;

    try {
      repositorySource = normalizeGitHubRepositorySource(record.source);
      metadata = await this.installer.fetchRepositoryRevisionMetadata(
        repositorySource,
      );
    } catch (error) {
      await this.markGitHubUpdateFailed(record, error).catch(() => undefined);
      throw error;
    }

    if (
      previousMetadata?.installedRevision &&
      previousMetadata.installedRevision === metadata.latestRevision
    ) {
      await this.registryStore.updateGitHubSourceMetadata(
        record.packageId,
        buildGitHubSourceMetadata({
          defaultBranch: metadata.defaultBranch,
          installedRevision: previousMetadata.installedRevision,
          latestRevision: metadata.latestRevision,
          latestCheckedAt: checkedAt,
          updateStatus: "UP_TO_DATE",
        }),
      );
      return this.listAgentPackages();
    }

    let replacement: Awaited<
      ReturnType<GitHubAgentPackageInstaller["stagePackageReplacement"]>
    >;

    try {
      replacement = await this.installer.stagePackageReplacement(
        repositorySource,
        metadata,
        record.managedInstallPath,
      );
    } catch (error) {
      await this.markGitHubUpdateFailed(record, error).catch(() => undefined);
      throw error;
    }

    try {
      await this.registryStore.upsertManagedGitHubPackageRecord({
        normalizedSource: repositorySource.normalizedRepository,
        source: replacement.canonicalSourceUrl,
        rootPath: replacement.rootPath,
        managedInstallPath: replacement.managedInstallPath,
        sourceMetadata: githubSourceMetadata(
          buildInstalledGitHubMetadata(metadata, checkedAt),
        ),
      });

      await this.refreshCatalogCaches();
      await replacement.commit();
      return this.listAgentPackages();
    } catch (error) {
      await replacement.rollback().catch(() => undefined);
      await this.restorePackageRecord(record);
      await this.markGitHubUpdateFailed(record, error).catch(() => undefined);
      await this.refreshCatalogCaches().catch(() => undefined);
      throw error;
    }
  }

  private async importLocalPathPackage(source: string): Promise<AgentPackage[]> {
    const resolvedPath = validatePackageRoot(source);
    if (resolvedPath === this.rootSettingsStore.getDefaultRootPath()) {
      throw new Error("Path is already the default agent package.");
    }

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
        `GitHub agent package already exists: ${existingPackage.source}. Use the existing package row to check for updates or update to latest.`,
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
        `GitHub agent package already exists: ${repositorySource.canonicalUrl}. Use the existing package row to check for updates or update to latest.`,
      );
    }

    const installedPackage = await this.installer.installPackage(repositorySource);
    const packageId = buildGitHubPackageId(repositorySource.normalizedRepository);

    try {
      validatePackageRoot(installedPackage.rootPath);
      this.rootSettingsStore.addAdditionalRootPath(installedPackage.rootPath);

      await this.registryStore.upsertManagedGitHubPackageRecord({
        normalizedSource: repositorySource.normalizedRepository,
        source: installedPackage.canonicalSourceUrl,
        rootPath: installedPackage.rootPath,
        managedInstallPath: installedPackage.managedInstallPath,
        sourceMetadata: githubSourceMetadata(
          buildGitHubSourceMetadata({
            defaultBranch: installedPackage.defaultBranch ?? null,
            installedRevision: installedPackage.installedRevision ?? null,
            latestRevision: installedPackage.installedRevision ?? null,
            latestCheckedAt: installedPackage.installedRevision
              ? new Date().toISOString()
              : null,
            updateStatus: installedPackage.installedRevision ? "UP_TO_DATE" : "UNKNOWN",
          }),
        ),
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

  private async requirePackageById(packageId: string): Promise<AgentPackage> {
    const normalizedPackageId = packageId.trim();
    if (!normalizedPackageId) {
      throw new Error("Agent package id cannot be empty.");
    }

    const targetPackage = await this.findPackageById(normalizedPackageId);
    if (!targetPackage) {
      throw new Error(`Agent package not found: ${normalizedPackageId}`);
    }
    return targetPackage;
  }

  private async checkGitHubPackageUpdate(
    record: AgentPackageRecord,
  ): Promise<void> {
    const previousMetadata = record.sourceMetadata?.github ?? null;
    const checkedAt = new Date().toISOString();

    try {
      const repositorySource = normalizeGitHubRepositorySource(record.source);
      const revisionMetadata = await this.installer.fetchRepositoryRevisionMetadata(
        repositorySource,
      );
      const installedRevision = previousMetadata?.installedRevision ?? null;
      const updateStatus = installedRevision === null
        ? "UNKNOWN"
        : installedRevision === revisionMetadata.latestRevision
          ? "UP_TO_DATE"
          : "UPDATE_AVAILABLE";

      await this.registryStore.updateGitHubSourceMetadata(
        record.packageId,
        buildGitHubSourceMetadata({
          defaultBranch: revisionMetadata.defaultBranch,
          installedRevision,
          latestRevision: revisionMetadata.latestRevision,
          latestCheckedAt: checkedAt,
          updateStatus,
        }),
      );
    } catch (error) {
      await this.registryStore.updateGitHubSourceMetadata(
        record.packageId,
        buildGitHubSourceMetadata({
          defaultBranch: previousMetadata?.defaultBranch ?? null,
          installedRevision: previousMetadata?.installedRevision ?? null,
          latestRevision: previousMetadata?.latestRevision ?? null,
          latestCheckedAt: checkedAt,
          updateStatus: "CHECK_FAILED",
          lastError: formatErrorMessage(error),
        }),
      );
    }
  }

  private async markGitHubUpdateFailed(
    record: AgentPackageRecord,
    error: unknown,
  ): Promise<void> {
    const previousMetadata = record.sourceMetadata?.github ?? null;
    await this.registryStore.updateGitHubSourceMetadata(
      record.packageId,
      buildGitHubSourceMetadata({
        defaultBranch: previousMetadata?.defaultBranch ?? null,
        installedRevision: previousMetadata?.installedRevision ?? null,
        latestRevision: previousMetadata?.latestRevision ?? null,
        latestCheckedAt: previousMetadata?.latestCheckedAt ?? null,
        updateStatus: "UPDATE_FAILED",
        lastError: formatErrorMessage(error),
      }),
    );
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
      await this.registryStore.replacePackageRecord(record);
      return;
    }

    await this.registryStore.replacePackageRecord(record);
  }
}
