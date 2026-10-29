import type { GitHubRepositoryClient } from "../../integrations/github/github-repository-client.js";
import { normalizeGitHubRepositorySource } from "../../integrations/github/github-repository-source.js";
import type { GitHubSourceUpdateState } from "../../integrations/github/github-source-update-state.js";
import type { GitHubRepositoryRevisionMetadata } from "../../integrations/github/types.js";
import type { GitHubAgentPackageInstaller } from "../installers/github-agent-package-installer.js";
import type { AgentPackageRegistryStore } from "../stores/agent-package-registry-store.js";
import type { AgentPackageRecord } from "../types.js";
import {
  buildGitHubSourceMetadata,
  buildInstalledGitHubMetadata,
  githubSourceMetadata,
  mapGitHubSourceUpdateState,
} from "./agent-package-mappers.js";

const GITHUB_SOURCE_KIND = "GITHUB_REPOSITORY";

const formatErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

type HeadReader = Pick<GitHubRepositoryClient, "fetchDefaultBranchHead">;

/** The stored repository's identity with its default branch head, read without REST quota. */
const readRepositoryHead = async (
  githubClient: HeadReader,
  repositorySource: ReturnType<typeof normalizeGitHubRepositorySource>,
): Promise<GitHubRepositoryRevisionMetadata> => {
  const head = await githubClient.fetchDefaultBranchHead(repositorySource.owner, repositorySource.repo);
  return {
    owner: repositorySource.owner,
    repo: repositorySource.repo,
    canonicalUrl: repositorySource.canonicalUrl,
    defaultBranch: head.defaultBranch,
    latestRevision: head.latestRevision,
  };
};

/**
 * The GitHub update lifecycle of managed agent packages: check, update (stage, validate, record,
 * reload, commit or roll back) and the update-state projection. Internal to
 * `AgentPackageService`, which serializes each call per package; every call reads its record
 * fresh, so nothing read before the lock is written back.
 */
export class GitHubAgentPackageUpdates {
  constructor(private readonly deps: {
    registryStore: AgentPackageRegistryStore;
    githubClient: HeadReader;
    installer: GitHubAgentPackageInstaller;
    reloadAgentPackageDefinitions: () => Promise<void>;
    assertPackageSkillNames: (rootPath: string) => void;
  }) {}

  async listUpdateStates(): Promise<GitHubSourceUpdateState[]> {
    const records = await this.deps.registryStore.listPackageRecords();
    return records.filter((record) => record.sourceKind === GITHUB_SOURCE_KIND).map(mapGitHubSourceUpdateState);
  }

  async checkPackage(packageId: string): Promise<void> {
    const record = await this.deps.registryStore.findPackageById(packageId);
    if (!record || record.sourceKind !== GITHUB_SOURCE_KIND) {
      return;
    }
    const previousMetadata = record.sourceMetadata?.github ?? null;
    const checkedAt = new Date().toISOString();

    try {
      const repositorySource = normalizeGitHubRepositorySource(record.source);
      const revisionMetadata = await readRepositoryHead(this.deps.githubClient, repositorySource);
      const installedRevision = previousMetadata?.installedRevision ?? null;
      const updateStatus = installedRevision === null
        ? "UNKNOWN"
        : installedRevision === revisionMetadata.latestRevision
          ? "UP_TO_DATE"
          : "UPDATE_AVAILABLE";

      await this.deps.registryStore.updateGitHubSourceMetadata(
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
      await this.deps.registryStore.updateGitHubSourceMetadata(
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

  async updatePackage(packageId: string): Promise<void> {
    const record = await this.deps.registryStore.findPackageById(packageId);
    if (!record) {
      throw new Error(`Agent package not found: ${packageId}`);
    }
    if (record.sourceKind !== GITHUB_SOURCE_KIND || !record.managedInstallPath) {
      throw new Error("Only managed GitHub agent packages can be updated.");
    }

    const previousMetadata = record.sourceMetadata?.github ?? null;
    const checkedAt = new Date().toISOString();
    let repositorySource: ReturnType<typeof normalizeGitHubRepositorySource>;
    let metadata: GitHubRepositoryRevisionMetadata;

    try {
      repositorySource = normalizeGitHubRepositorySource(record.source);
      metadata = await readRepositoryHead(this.deps.githubClient, repositorySource);
    } catch (error) {
      await this.markUpdateFailed(record, error).catch(() => undefined);
      throw error;
    }

    if (
      previousMetadata?.installedRevision &&
      previousMetadata.installedRevision === metadata.latestRevision
    ) {
      await this.deps.registryStore.updateGitHubSourceMetadata(
        record.packageId,
        buildGitHubSourceMetadata({
          defaultBranch: metadata.defaultBranch,
          installedRevision: previousMetadata.installedRevision,
          latestRevision: metadata.latestRevision,
          latestCheckedAt: checkedAt,
          updateStatus: "UP_TO_DATE",
        }),
      );
      return;
    }

    let replacement: Awaited<
      ReturnType<GitHubAgentPackageInstaller["stagePackageReplacement"]>
    >;

    try {
      replacement = await this.deps.installer.stagePackageReplacement(
        repositorySource,
        metadata,
        record.managedInstallPath,
      );
    } catch (error) {
      await this.markUpdateFailed(record, error).catch(() => undefined);
      throw error;
    }

    try {
      this.deps.assertPackageSkillNames(replacement.rootPath);
    } catch (error) {
      // The staged revision is rolled back; the package, its record and its status are unchanged.
      await replacement.rollback().catch(() => undefined);
      throw error;
    }

    try {
      await this.deps.registryStore.upsertManagedGitHubPackageRecord({
        normalizedSource: repositorySource.normalizedRepository,
        source: replacement.canonicalSourceUrl,
        rootPath: replacement.rootPath,
        managedInstallPath: replacement.managedInstallPath,
        sourceMetadata: githubSourceMetadata(
          buildInstalledGitHubMetadata(metadata, checkedAt),
        ),
      });

      await this.deps.reloadAgentPackageDefinitions();
      await replacement.commit();
    } catch (error) {
      await replacement.rollback().catch(() => undefined);
      await this.deps.registryStore.replacePackageRecord(record);
      await this.markUpdateFailed(record, error).catch(() => undefined);
      await this.deps.reloadAgentPackageDefinitions().catch(() => undefined);
      throw error;
    }
  }

  private async markUpdateFailed(
    record: AgentPackageRecord,
    error: unknown,
  ): Promise<void> {
    const previousMetadata = record.sourceMetadata?.github ?? null;
    await this.deps.registryStore.updateGitHubSourceMetadata(
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
}
