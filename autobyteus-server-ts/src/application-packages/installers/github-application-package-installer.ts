import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { downloadFileFromUrl } from "../../utils/download-utils.js";
import type {
  GitHubRepositoryMetadata,
  GitHubRepositorySource,
  ManagedGitHubInstallResult,
} from "../types.js";
import {
  buildGitHubRepositoryApiUrl,
  buildGitHubRepositoryArchiveUrl,
} from "../utils/github-repository-source.js";
import { validateApplicationPackageRoot } from "../utils/application-package-root-summary.js";

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

export class GitHubApplicationPackageInstaller {
  constructor(
    private readonly options: {
      config?: AppConfigLike;
      fetchImpl?: FetchLike;
      downloadFileFromUrlImpl?: DownloadFileFromUrlLike;
      extractArchiveImpl?: (archivePath: string, outputDir: string) => Promise<void>;
    } = {},
  ) {}

  getManagedRoot(): string {
    return path.join(this.getConfig().getAppDataDir(), "application-packages", "github");
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
        `GitHub application package install path already exists: ${installDir}`,
      );
    }

    const metadata = await this.fetchRepositoryMetadata(source);
    const stagingDir = await this.createStagingDirectory(source.installKey);
    const extractionDir = path.join(stagingDir, "extracted");

    try {
      await fsPromises.mkdir(extractionDir, { recursive: true });
      const archivePath = await this.downloadRepositoryArchive(source, metadata, stagingDir);
      await this.extractArchive(archivePath, extractionDir);

      const extractedRoot = await this.resolveExtractedRoot(extractionDir);
      validateApplicationPackageRoot(extractedRoot);

      await fsPromises.mkdir(path.dirname(installDir), { recursive: true });
      await fsPromises.rename(extractedRoot, installDir);

      return {
        rootPath: installDir,
        managedInstallPath: installDir,
        canonicalSourceUrl: metadata.canonicalUrl,
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

  private getFetch(): FetchLike {
    return this.options.fetchImpl ?? fetch;
  }

  private getDownloadFileFromUrl(): DownloadFileFromUrlLike {
    return this.options.downloadFileFromUrlImpl ?? downloadFileFromUrl;
  }

  private async fetchRepositoryMetadata(
    source: GitHubRepositorySource,
  ): Promise<GitHubRepositoryMetadata> {
    const response = await this.getFetch()(buildGitHubRepositoryApiUrl(source), {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "AutoByteus-ApplicationPackageInstaller",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (response.status === 404) {
      throw new Error(
        `GitHub repository not found or not public: ${source.canonicalUrl}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `GitHub repository metadata request failed with HTTP ${response.status} ${response.statusText}.`,
      );
    }

    const payload = (await response.json()) as Partial<{
      default_branch: string;
      html_url: string;
      private: boolean;
      name: string;
      owner: { login?: string };
    }>;

    if (payload.private) {
      throw new Error(
        `GitHub repository is not public and cannot be imported: ${source.canonicalUrl}`,
      );
    }

    const defaultBranch = payload.default_branch?.trim();
    if (!defaultBranch) {
      throw new Error(
        `GitHub repository default branch is unavailable: ${source.canonicalUrl}`,
      );
    }

    return {
      owner: payload.owner?.login?.trim() || source.owner,
      repo: payload.name?.trim() || source.repo,
      canonicalUrl: payload.html_url?.trim() || source.canonicalUrl,
      defaultBranch,
    };
  }

  private async createStagingDirectory(installKey: string): Promise<string> {
    const parentDir = path.join(
      this.getConfig().getAppDataDir(),
      "application-packages",
      ".staging",
    );
    await fsPromises.mkdir(parentDir, { recursive: true });
    return fsPromises.mkdtemp(path.join(parentDir, `${installKey}-${randomUUID()}-`));
  }

  private async downloadRepositoryArchive(
    source: GitHubRepositorySource,
    metadata: GitHubRepositoryMetadata,
    stagingDir: string,
  ): Promise<string> {
    const downloadDir = path.join(
      stagingDir,
      "download",
      source.installKey,
    );
    const archiveUrl = buildGitHubRepositoryArchiveUrl(
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
          `GitHub application package archive extraction failed with exit code ${String(code)}.`,
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

  for (const candidate of candidates) {
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
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to extract GitHub application package archive.");
};
