import { GitHubRepositoryClient } from "../../integrations/github/github-repository-client.js";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { downloadFileFromUrl } from "../../utils/download-utils.js";
import type { GitHubRepositoryMetadata, GitHubRepositoryRevisionMetadata, GitHubRepositorySource } from "../../integrations/github/types.js";
import type { ManagedGitHubInstallResult } from "../types.js";
import {
  buildGitHubRepositoryArchiveUrl,
  buildGitHubRepositoryArchiveUrlForRef,
} from "../../integrations/github/github-repository-source.js";
import { validatePackageRoot } from "../utils/package-root-summary.js";

type AppConfigLike = {
  getAppDataDir(): string;
  getDownloadDir(): string;
};

type FetchLike = typeof fetch;
type DownloadFileFromUrlLike = typeof downloadFileFromUrl;
type SpawnLike = typeof spawn;
type TarExtractionCommandSpec = {
  executable: string;
  shell: boolean;
};

export type ManagedGitHubPackageReplacement = ManagedGitHubInstallResult & {
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
};

export class GitHubAgentPackageInstaller {
  constructor(
    private readonly options: {
      config?: AppConfigLike;
      fetchImpl?: FetchLike;
      downloadFileFromUrlImpl?: DownloadFileFromUrlLike;
      extractArchiveImpl?: (archivePath: string, outputDir: string) => Promise<void>;
    } = {},
  ) {}

  getManagedRoot(): string {
    return path.join(this.getConfig().getAppDataDir(), "agent-packages", "github");
  }

  getManagedInstallDir(installKey: string): string {
    return path.join(this.getManagedRoot(), installKey);
  }

  async installPackage(
    source: GitHubRepositorySource,
  ): Promise<ManagedGitHubInstallResult> {
    const installDir = this.getManagedInstallDir(source.installKey);
    if (fs.existsSync(installDir)) {
      throw new Error(
        `GitHub agent package install path already exists: ${installDir}`,
      );
    }

    const metadata = await new GitHubRepositoryClient(this.options.fetchImpl).fetchRepositoryRevisionMetadata(source);
    const stagingDir = await this.createStagingDirectory(source.installKey);
    const extractionDir = path.join(stagingDir, "extracted");

    try {
      await fsPromises.mkdir(extractionDir, { recursive: true });
      const archivePath = await this.downloadRepositoryArchive(source, metadata, stagingDir);
      await this.extractArchive(archivePath, extractionDir);

      const extractedRoot = await this.resolveExtractedRoot(extractionDir);
      validatePackageRoot(extractedRoot);

      await fsPromises.mkdir(path.dirname(installDir), { recursive: true });
      await fsPromises.rename(extractedRoot, installDir);

      return {
        rootPath: installDir,
        managedInstallPath: installDir,
        canonicalSourceUrl: metadata.canonicalUrl,
        defaultBranch: metadata.defaultBranch,
        installedRevision: metadata.latestRevision,
      };
    } catch (error) {
      await fsPromises.rm(installDir, { recursive: true, force: true }).catch(
        () => undefined,
      );
      throw error;
    } finally {
      await fsPromises.rm(stagingDir, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  }

  private getConfig(): AppConfigLike {
    return this.options.config ?? appConfigProvider.config;
  }

  private getDownloadFileFromUrl(): DownloadFileFromUrlLike {
    return this.options.downloadFileFromUrlImpl ?? downloadFileFromUrl;
  }

  async stagePackageReplacement(
    source: GitHubRepositorySource,
    metadata: GitHubRepositoryRevisionMetadata,
    installDir: string,
  ): Promise<ManagedGitHubPackageReplacement> {
    const resolvedInstallDir = path.resolve(installDir);
    if (!fs.existsSync(resolvedInstallDir)) {
      throw new Error(
        `GitHub agent package install path not found: ${resolvedInstallDir}`,
      );
    }

    const stagingDir = await this.createStagingDirectory(source.installKey);
    const extractionDir = path.join(stagingDir, "extracted");
    const backupDir = path.join(stagingDir, "previous-install");
    let replacementActive = false;
    let finalized = false;

    try {
      await fsPromises.mkdir(extractionDir, { recursive: true });
      const archivePath = await this.downloadRepositoryArchive(source, metadata, stagingDir);
      await this.extractArchive(archivePath, extractionDir);

      const extractedRoot = await this.resolveExtractedRoot(extractionDir);
      validatePackageRoot(extractedRoot);

      await fsPromises.rename(resolvedInstallDir, backupDir);
      replacementActive = true;

      try {
        await fsPromises.rename(extractedRoot, resolvedInstallDir);
      } catch (error) {
        await fsPromises.rm(resolvedInstallDir, {
          recursive: true,
          force: true,
        }).catch(() => undefined);
        await fsPromises.rename(backupDir, resolvedInstallDir).catch(
          () => undefined,
        );
        replacementActive = false;
        throw error;
      }

      const cleanup = async (): Promise<void> => {
        await fsPromises.rm(stagingDir, { recursive: true, force: true }).catch(
          () => undefined,
        );
      };

      return {
        rootPath: resolvedInstallDir,
        managedInstallPath: resolvedInstallDir,
        canonicalSourceUrl: metadata.canonicalUrl,
        defaultBranch: metadata.defaultBranch,
        installedRevision: metadata.latestRevision,
        commit: async () => {
          if (finalized) {
            return;
          }
          finalized = true;
          replacementActive = false;
          await cleanup();
        },
        rollback: async () => {
          if (finalized) {
            return;
          }
          finalized = true;
          if (replacementActive) {
            await fsPromises.rm(resolvedInstallDir, {
              recursive: true,
              force: true,
            }).catch(() => undefined);
            await fsPromises.rename(backupDir, resolvedInstallDir);
          }
          await cleanup();
        },
      };
    } catch (error) {
      await fsPromises.rm(stagingDir, { recursive: true, force: true }).catch(
        () => undefined,
      );
      throw error;
    }
  }

  private async createStagingDirectory(installKey: string): Promise<string> {
    const parentDir = path.join(
      this.getConfig().getAppDataDir(),
      "agent-packages",
      ".staging",
    );
    await fsPromises.mkdir(parentDir, { recursive: true });
    return fsPromises.mkdtemp(path.join(parentDir, `${installKey}-${randomUUID()}-`));
  }

  private async downloadRepositoryArchive(
    source: GitHubRepositorySource,
    metadata: GitHubRepositoryMetadata & { latestRevision?: string },
    stagingDir: string,
  ): Promise<string> {
    const downloadDir = path.join(
      stagingDir,
      "download",
      source.installKey,
    );
    const archiveUrl = metadata.latestRevision
      ? buildGitHubRepositoryArchiveUrlForRef(
          metadata.owner,
          metadata.repo,
          metadata.latestRevision,
        )
      : buildGitHubRepositoryArchiveUrl(
          metadata.owner,
          metadata.repo,
          metadata.defaultBranch,
        );
    return this.getDownloadFileFromUrl()(archiveUrl, downloadDir);
  }

  private async extractArchive(
    archivePath: string,
    outputDir: string,
  ): Promise<void> {
    const extractImpl = this.options.extractArchiveImpl ?? extractTarGzArchive;
    await extractImpl(archivePath, outputDir);
  }

  private async resolveExtractedRoot(extractionDir: string): Promise<string> {
    const entries = await fsPromises.readdir(extractionDir, {
      withFileTypes: true,
    });
    const visibleEntries = entries.filter((entry) => !entry.name.startsWith("."));

    if (
      visibleEntries.length === 1 &&
      visibleEntries[0]?.isDirectory()
    ) {
      return path.join(extractionDir, visibleEntries[0].name);
    }

    return extractionDir;
  }
}

export const buildTarExtractionCommandSpecs = (
  platform: NodeJS.Platform = process.platform,
): TarExtractionCommandSpec[] => {
  if (platform === "win32") {
    return [
      { executable: "tar.exe", shell: false },
      { executable: "tar", shell: false },
    ];
  }

  return [{ executable: "tar", shell: false }];
};

const runTarExtractionCommand = async (
  executable: string,
  archivePath: string,
  outputDir: string,
  spawnImpl: SpawnLike,
  shell: boolean,
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const child = spawnImpl(executable, ["-xzf", archivePath, "-C", outputDir], {
      stdio: "inherit",
      shell,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `GitHub agent package archive extraction failed with exit code ${String(code)}.`,
        ),
      );
    });
  });
};

export const extractTarGzArchive = async (
  archivePath: string,
  outputDir: string,
  options: {
    platform?: NodeJS.Platform;
    spawnImpl?: SpawnLike;
  } = {},
): Promise<void> => {
  const spawnImpl = options.spawnImpl ?? spawn;
  const candidates = buildTarExtractionCommandSpecs(options.platform);
  let lastError: unknown = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (!candidate) {
      continue;
    }

    try {
      await runTarExtractionCommand(
        candidate.executable,
        archivePath,
        outputDir,
        spawnImpl,
        candidate.shell,
      );
      return;
    } catch (error) {
      lastError = error;
      const isCommandNotFound =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT";

      if (isCommandNotFound && index < candidates.length - 1) {
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("GitHub agent package archive extraction failed.");
};
