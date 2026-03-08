import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { downloadFileFromUrl } from "../../utils/download-utils.js";
import type { ManagedMessagingReleaseDescriptor } from "./types.js";

export type MessagingGatewayInstallResult = {
  installDir: string;
  installedVersion: string;
  downloadArchivePath: string;
  reusedExistingInstall: boolean;
};

export class MessagingGatewayInstallerService {
  constructor(
    private readonly options: {
      downloadFileFromUrlImpl?: typeof downloadFileFromUrl;
    } = {},
  ) {}

  async ensureInstalled(
    descriptor: ManagedMessagingReleaseDescriptor,
  ): Promise<MessagingGatewayInstallResult> {
    await this.ensureBaseDirectories();
    const installDir = this.getVersionInstallDir(descriptor.artifactVersion);
    if (await this.isInstalledVersionReady(installDir)) {
      return {
        installDir,
        installedVersion: descriptor.artifactVersion,
        downloadArchivePath: this.getCachedArchivePath(
          descriptor.artifactVersion,
          descriptor.downloadUrl,
        ),
        reusedExistingInstall: true,
      };
    }

    const archivePath = await this.ensureArchiveDownloaded(descriptor);
    const expectedSha256 = await this.fetchExpectedChecksum(descriptor.sha256Url);
    await this.verifyArtifactChecksum(archivePath, expectedSha256);

    const tempExtractDir = this.getTemporaryExtractDir(descriptor.artifactVersion);
    await fs.rm(tempExtractDir, { recursive: true, force: true });
    await fs.mkdir(tempExtractDir, { recursive: true });
    await this.extractArtifactArchive(archivePath, tempExtractDir);
    await this.verifyExtractedInstall(tempExtractDir);

    await fs.rm(installDir, { recursive: true, force: true });
    await fs.mkdir(path.dirname(installDir), { recursive: true });
    await fs.rename(tempExtractDir, installDir);

    return {
      installDir,
      installedVersion: descriptor.artifactVersion,
      downloadArchivePath: archivePath,
      reusedExistingInstall: false,
    };
  }

  async activateInstalledVersion(version: string): Promise<void> {
    await fs.writeFile(this.getActiveVersionPath(), `${version}\n`, "utf8");
  }

  async readActiveVersion(): Promise<string | null> {
    try {
      const value = await fs.readFile(this.getActiveVersionPath(), "utf8");
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
  }

  async listInstalledVersions(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.getVersionsRoot(), {
        withFileTypes: true,
      });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    } catch {
      return [];
    }
  }

  getVersionInstallDir(version: string): string {
    return path.join(this.getVersionsRoot(), version);
  }

  getManagedRoot(): string {
    return path.join(
      appConfigProvider.config.getAppDataDir(),
      "extensions",
      "messaging-gateway",
    );
  }

  getConfigRoot(): string {
    return path.join(this.getManagedRoot(), "config");
  }

  getRuntimeDataRoot(): string {
    return path.join(this.getManagedRoot(), "runtime-data");
  }

  getLogsRoot(): string {
    return path.join(appConfigProvider.config.getLogsDir(), "messaging-gateway");
  }

  getDownloadCacheRoot(): string {
    return path.join(appConfigProvider.config.getDownloadDir(), "messaging-gateway");
  }

  private getVersionsRoot(): string {
    return path.join(this.getManagedRoot(), "versions");
  }

  private getStateRoot(): string {
    return path.join(this.getManagedRoot(), "state");
  }

  private getActiveVersionPath(): string {
    return path.join(this.getStateRoot(), "active-version.txt");
  }

  private getTemporaryExtractDir(version: string): string {
    return path.join(this.getManagedRoot(), ".extracting", version);
  }

  private async ensureBaseDirectories(): Promise<void> {
    await Promise.all([
      fs.mkdir(this.getVersionsRoot(), { recursive: true }),
      fs.mkdir(this.getStateRoot(), { recursive: true }),
      fs.mkdir(this.getConfigRoot(), { recursive: true }),
      fs.mkdir(this.getRuntimeDataRoot(), { recursive: true }),
      fs.mkdir(this.getLogsRoot(), { recursive: true }),
      fs.mkdir(this.getDownloadCacheRoot(), { recursive: true }),
    ]);
  }

  private async isInstalledVersionReady(installDir: string): Promise<boolean> {
    try {
      const entrypoint = path.join(installDir, "dist", "index.js");
      await fs.stat(entrypoint);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureArchiveDownloaded(
    descriptor: ManagedMessagingReleaseDescriptor,
  ): Promise<string> {
    const targetPath = this.getCachedArchivePath(
      descriptor.artifactVersion,
      descriptor.downloadUrl,
    );
    try {
      await fs.stat(targetPath);
      return targetPath;
    } catch {
      // continue
    }

    const downloadImpl =
      this.options.downloadFileFromUrlImpl ?? downloadFileFromUrl;
    const downloadedPath = await downloadImpl(
      descriptor.downloadUrl,
      this.getDownloadCacheRoot(),
    );
    await fs.rename(downloadedPath, targetPath);
    return targetPath;
  }

  private getCachedArchivePath(version: string, downloadUrl: string): string {
    const urlPath = new URL(downloadUrl).pathname;
    const fileName = path.basename(urlPath) || `messaging-gateway-${version}.tar.gz`;
    return path.join(this.getDownloadCacheRoot(), fileName);
  }

  private async fetchExpectedChecksum(sha256Url: string): Promise<string> {
    const response = await fetch(sha256Url, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(
        `Managed messaging checksum download failed with HTTP ${response.status} ${response.statusText}.`,
      );
    }
    const raw = (await response.text()).trim();
    const [sha] = raw.split(/\s+/);
    if (!sha || !/^[a-f0-9]{64}$/i.test(sha)) {
      throw new Error(
        `Managed messaging checksum payload from '${sha256Url}' is invalid.`,
      );
    }
    return sha.toLowerCase();
  }

  private async verifyArtifactChecksum(
    archivePath: string,
    expectedSha256: string,
  ): Promise<void> {
    const buffer = await fs.readFile(archivePath);
    const actual = createHash("sha256").update(buffer).digest("hex");
    if (actual !== expectedSha256) {
      throw new Error(
        `Managed messaging archive checksum mismatch for '${path.basename(archivePath)}'.`,
      );
    }
  }

  private async extractArtifactArchive(
    archivePath: string,
    outputDir: string,
  ): Promise<void> {
    await runCommand("tar", ["-xzf", archivePath, "-C", outputDir]);
  }

  private async verifyExtractedInstall(outputDir: string): Promise<void> {
    const entrypoint = path.join(outputDir, "dist", "index.js");
    try {
      await fs.stat(entrypoint);
    } catch {
      throw new Error(
        `Managed messaging runtime entrypoint is missing after extraction: ${entrypoint}`,
      );
    }
  }
}

const resolveExecutable = (command: string): string => {
  if (process.platform !== "win32") {
    return command;
  }
  if (command.endsWith(".cmd") || command.endsWith(".exe")) {
    return command;
  }
  return `${command}.cmd`;
};

const runCommand = async (command: string, args: string[]): Promise<void> => {
  const executable = resolveExecutable(command);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, {
      stdio: "inherit",
      shell: process.platform === "win32" && executable.endsWith(".cmd"),
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `Command failed while installing managed messaging runtime (${code}): ${executable} ${args.join(" ")}`,
        ),
      );
    });
  });
};

