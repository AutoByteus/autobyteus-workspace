import { GitHubRepositoryClient } from "../../integrations/github/github-repository-client.js";
import type {
  GitHubSourceStateListener,
  GitHubSourceUpdateState,
} from "../../integrations/github/github-source-update-state.js";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import {
  AgentPackageFolderWatcher,
  type PackageFolderWatchStatus,
} from "../../agent-package-definitions/monitor/agent-package-folder-watcher.js";
import { GitHubAgentPackageInstaller } from "../installers/github-agent-package-installer.js";
import {
  AgentPackageRecord,
  AgentPackage,
  AgentPackageImportInput,
} from "../types.js";
import { normalizeGitHubRepositorySource } from "../../integrations/github/github-repository-source.js";
import {
  buildGitHubPackageId,
  buildLocalPackageId,
  validatePackageRoot,
} from "../utils/package-root-summary.js";
import { AgentPackageRegistryStore } from "../stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../stores/agent-package-root-settings-store.js";
import { SkillService } from "../../skills/services/skill-service.js";
import {
  buildGitHubSourceMetadata,
  githubSourceMetadata,
  mapBuiltInPackage,
  mapGitHubPackage,
  mapLocalPackage,
} from "./agent-package-mappers.js";
import { GitHubAgentPackageUpdates } from "./github-agent-package-updates.js";

type ReloadAgentPackageDefinitionsFn = () => Promise<void>;
type PackageFolderWatchStatusFn = (rootPath: string) => PackageFolderWatchStatus | null;

/** The skill-name check each import path runs before it commits (REQ-023). */
type SkillNameGuard = Pick<SkillService, "assertNoIncomingSkillNameConflicts">;

const LOCAL_PATH_SOURCE_KIND = "LOCAL_PATH";
const GITHUB_SOURCE_KIND = "GITHUB_REPOSITORY";

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
  private readonly githubUpdates: GitHubAgentPackageUpdates;
  /** One full reload of every registered agent package; it also re-syncs folder watching and notifies connected clients. */
  private readonly reloadAgentPackageDefinitions: ReloadAgentPackageDefinitionsFn;
  private readonly packageFolderWatchStatus: PackageFolderWatchStatusFn;
  private readonly skillNames: SkillNameGuard;
  /** Per-package chains: a check, an update and a removal of one package never interleave. */
  private readonly operations = new Map<string, Promise<unknown>>();
  private githubSourceStateListener: GitHubSourceStateListener | null = null;

  constructor(dependencies: {
    rootSettingsStore?: AgentPackageRootSettingsStore;
    registryStore?: AgentPackageRegistryStore;
    installer?: GitHubAgentPackageInstaller;
    githubClient?: Pick<GitHubRepositoryClient, "fetchDefaultBranchHead">;
    reloadAgentPackageDefinitions?: ReloadAgentPackageDefinitionsFn;
    packageFolderWatchStatus?: PackageFolderWatchStatusFn;
    skillNames?: SkillNameGuard;
  } = {}) {
    this.rootSettingsStore =
      dependencies.rootSettingsStore ?? new AgentPackageRootSettingsStore();
    this.registryStore =
      dependencies.registryStore ?? new AgentPackageRegistryStore();
    this.installer =
      dependencies.installer ?? new GitHubAgentPackageInstaller();
    this.reloadAgentPackageDefinitions =
      dependencies.reloadAgentPackageDefinitions ??
      (() => AgentDefinitionService.getInstance().reloadAgentPackageDefinitions());
    this.packageFolderWatchStatus =
      dependencies.packageFolderWatchStatus ??
      ((rootPath) => AgentPackageFolderWatcher.getProcessInstance()?.getPackageFolderWatchStatus(rootPath) ?? null);
    this.skillNames = dependencies.skillNames ?? SkillService.getInstance();
    this.githubUpdates = new GitHubAgentPackageUpdates({
      registryStore: this.registryStore,
      githubClient: dependencies.githubClient ?? new GitHubRepositoryClient(),
      installer: this.installer,
      reloadAgentPackageDefinitions: this.reloadAgentPackageDefinitions,
      assertPackageSkillNames: (rootPath) => this.assertPackageSkillNames(rootPath),
    });
  }

  async listAgentPackages(): Promise<AgentPackage[]> {
    const defaultRootPath = this.rootSettingsStore.getDefaultRootPath();
    const additionalRootPaths = this.rootSettingsStore.listAdditionalRootPaths();
    const records = await this.registryStore.listPackageRecords();

    const recordByRootPath = new Map<string, AgentPackageRecord>();
    for (const record of records) {
      recordByRootPath.set(path.resolve(record.rootPath), record);
    }

    const packages: AgentPackage[] = [mapBuiltInPackage(defaultRootPath, this.packageFolderWatchStatus(defaultRootPath))];

    for (const rootPath of additionalRootPaths) {
      const resolvedRootPath = path.resolve(rootPath);
      const record = recordByRootPath.get(resolvedRootPath);

      const autoRefresh = this.packageFolderWatchStatus(resolvedRootPath);
      if (record?.sourceKind === GITHUB_SOURCE_KIND) {
        packages.push(mapGitHubPackage(record, autoRefresh));
        continue;
      }

      packages.push(mapLocalPackage(resolvedRootPath, record, autoRefresh));
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
      try {
        return await this.importGitHubPackage(source);
      } finally {
        this.announceGitHubSourceStateChanged();
      }
    }

    throw new Error(`Unsupported agent package source kind: ${input.sourceKind}`);
  }

  async removeAgentPackage(packageId: string): Promise<AgentPackage[]> {
    const normalizedPackageId = packageId.trim();
    if (!normalizedPackageId) {
      throw new Error("Agent package id cannot be empty.");
    }

    try {
      return await this.serialize(normalizedPackageId, () => this.removePackage(normalizedPackageId));
    } finally {
      this.announceGitHubSourceStateChanged();
    }
  }

  private async removePackage(normalizedPackageId: string): Promise<AgentPackage[]> {
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
      await this.reloadAgentPackageDefinitions();

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
      await this.reloadAgentPackageDefinitions().catch(() => undefined);
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
    // R-3: a rejected reload keeps the previous registration; the files already on disk stay, and
    // the agent package definitions and the Skills page banner reflect them (REQ-024).
    this.assertPackageSkillNames(targetPackage.path);
    await this.reloadAgentPackageDefinitions();
    return this.listAgentPackages();
  }

  async checkAgentPackageUpdates(packageIds?: string[]): Promise<AgentPackage[]> {
    const requestedIds = new Set(
      (packageIds ?? []).map((id) => id.trim()).filter(Boolean),
    );
    const records = await this.registryStore.listPackageRecords();
    const githubPackageIds = records
      .filter(
        (record) =>
          record.sourceKind === GITHUB_SOURCE_KIND &&
          (requestedIds.size === 0 || requestedIds.has(record.packageId)),
      )
      .map((record) => record.packageId);

    try {
      for (const githubPackageId of githubPackageIds) {
        // Each check reads its record inside the lock (AR-003).
        await this.serialize(githubPackageId, () => this.githubUpdates.checkPackage(githubPackageId));
      }
    } finally {
      this.announceGitHubSourceStateChanged();
    }

    return this.listAgentPackages();
  }

  async updateAgentPackage(packageId: string): Promise<AgentPackage[]> {
    const normalizedPackageId = packageId.trim();
    if (!normalizedPackageId) {
      throw new Error("Agent package id cannot be empty.");
    }

    try {
      await this.serialize(normalizedPackageId, () => this.githubUpdates.updatePackage(normalizedPackageId));
    } finally {
      this.announceGitHubSourceStateChanged();
    }
    return this.listAgentPackages();
  }

  /** The update facts of every imported GitHub package, for the update notifications. */
  listGitHubSourceUpdateStates(): Promise<GitHubSourceUpdateState[]> {
    return this.githubUpdates.listUpdateStates();
  }

  /** One listener, told after an import, removal, check or update settled (success or failure). */
  setGitHubSourceStateListener(listener: GitHubSourceStateListener | null): void {
    this.githubSourceStateListener = listener;
  }

  private async importLocalPathPackage(source: string): Promise<AgentPackage[]> {
    const resolvedPath = validatePackageRoot(source);
    if (resolvedPath === this.rootSettingsStore.getDefaultRootPath()) {
      throw new Error("Path is already the default agent package.");
    }
    this.assertPackageSkillNames(resolvedPath);

    this.rootSettingsStore.addAdditionalRootPath(resolvedPath);
    const packageId = buildLocalPackageId(resolvedPath);

    try {
      await this.registryStore.upsertLinkedLocalPackageRecord(resolvedPath);
      await this.reloadAgentPackageDefinitions();
      return this.listAgentPackages();
    } catch (error) {
      this.safeRemoveAdditionalRootPath(resolvedPath);
      await this.registryStore.removePackageRecord(packageId).catch(() => undefined);
      await this.reloadAgentPackageDefinitions().catch(() => undefined);
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
      // A rejected download is deleted by the rollback below.
      this.assertPackageSkillNames(installedPackage.rootPath);
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

      await this.reloadAgentPackageDefinitions();
      return this.listAgentPackages();
    } catch (error) {
      this.safeRemoveAdditionalRootPath(installedPackage.rootPath);
      await this.registryStore.removePackageRecord(packageId).catch(() => undefined);
      await fsPromises.rm(installedPackage.managedInstallPath, {
        recursive: true,
        force: true,
      }).catch(() => undefined);
      await this.reloadAgentPackageDefinitions().catch(() => undefined);
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

  private assertPackageSkillNames(rootPath: string): void {
    this.skillNames.assertNoIncomingSkillNameConflicts({ path: rootPath, layout: "definition_root", tier: 2 });
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
    if (record) {
      await this.registryStore.replacePackageRecord(record);
    }
  }

  private serialize<T>(packageId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.operations.get(packageId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    this.operations.set(packageId, next);
    void next
      .finally(() => {
        if (this.operations.get(packageId) === next) this.operations.delete(packageId);
      })
      .catch(() => undefined);
    return next;
  }

  private announceGitHubSourceStateChanged(): void {
    try {
      this.githubSourceStateListener?.();
    } catch (error) {
      console.warn("AGENT_PACKAGE_GITHUB_STATE_LISTENER_FAILED", error);
    }
  }
}
