import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTarExtractionCommandSpecs,
  extractTarGzArchive,
  GitHubAgentPackageInstaller,
} from "../../../src/agent-packages/installers/github-agent-package-installer.js";
import { normalizeGitHubRepositorySource } from "../../../src/integrations/github/github-repository-source.js";

describe("GitHubAgentPackageInstaller archive extraction", () => {
  it("uses tar.exe first on Windows and falls back to plain tar when the first command is unavailable", async () => {
    const calls: string[] = [];

    const spawnImpl = ((command: string) => {
      calls.push(command);

      const child = new EventEmitter() as EventEmitter & {
        on: (event: string, listener: (...args: any[]) => void) => typeof child;
      };

      queueMicrotask(() => {
        if (command === "tar.exe") {
          const error = Object.assign(new Error("command not found"), {
            code: "ENOENT",
          });
          child.emit("error", error);
          return;
        }

        child.emit("close", 0);
      });

      return child as any;
    }) as any;

    await extractTarGzArchive("/tmp/archive.tar.gz", "/tmp/output", {
      platform: "win32",
      spawnImpl,
    });

    expect(calls).toEqual(["tar.exe", "tar"]);
  });

  it("builds a single tar command on non-Windows platforms", () => {
    expect(buildTarExtractionCommandSpecs("linux")).toEqual([
      { executable: "tar", shell: false },
    ]);
  });
});

describe("GitHubAgentPackageInstaller downloads through the GitHub client", () => {
  const SHA = "d".repeat(40);
  const source = normalizeGitHubRepositorySource("https://github.com/acme/private-pack");
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  });

  /** A client fake that writes an archive naming its revision; extraction writes a package with one agent. */
  const installerWith = () => {
    const appData = fs.mkdtempSync(path.join(os.tmpdir(), "agent-package-installer-"));
    roots.push(appData);
    const downloads: Array<{ owner: string; repo: string; revision: string; destination: string }> = [];
    const githubClient = {
      fetchRepositoryRevisionMetadata: vi.fn(async () => ({
        owner: "acme", repo: "private-pack", canonicalUrl: source.canonicalUrl, defaultBranch: "main", latestRevision: SHA,
      })),
      downloadArchive: vi.fn(async (owner: string, repo: string, revision: string, destination: string) => {
        downloads.push({ owner, repo, revision, destination });
        fs.writeFileSync(destination, revision, { flag: "wx" });
      }),
    };
    const installer = new GitHubAgentPackageInstaller({
      githubClient,
      config: { getAppDataDir: () => appData },
      extractArchiveImpl: async (archivePath, outputDir) => {
        const revision = fs.readFileSync(archivePath, "utf-8");
        fs.mkdirSync(path.join(outputDir, `private-pack-${revision}`, "agents", "helper"), { recursive: true });
        fs.writeFileSync(path.join(outputDir, `private-pack-${revision}`, "agents", "helper", "agent.md"), "agent");
      },
    });
    return { installer, githubClient, downloads, appData };
  };

  it("installs the commit the client's metadata names, downloading it into the staging folder", async () => {
    const { installer, downloads, appData } = installerWith();
    const result = await installer.installPackage(source);
    expect(result).toMatchObject({ canonicalSourceUrl: source.canonicalUrl, defaultBranch: "main", installedRevision: SHA });
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toMatchObject({ owner: "acme", repo: "private-pack", revision: SHA });
    expect(downloads[0]!.destination.startsWith(path.join(appData, "agent-packages", ".staging"))).toBe(true);
    expect(path.basename(downloads[0]!.destination)).toBe("repository.tar.gz");
    expect(fs.existsSync(path.join(result.rootPath, "agents", "helper", "agent.md"))).toBe(true);
    expect(fs.readdirSync(path.join(appData, "agent-packages", ".staging"))).toEqual([]);
  });

  it("downloadRevision fetches exactly the given commit under the caller's folder", async () => {
    const { installer, downloads, appData } = installerWith();
    const target = path.join(appData, "capture");
    const root = await installer.downloadRevision(source, "e".repeat(40), target);
    expect(downloads).toEqual([{ owner: "acme", repo: "private-pack", revision: "e".repeat(40),
      destination: path.join(target, "download", "repository.tar.gz") }]);
    expect(fs.existsSync(path.join(root, "agents", "helper", "agent.md"))).toBe(true);
  });

  it("a failed download leaves no install and no staging", async () => {
    const { installer, githubClient, appData } = installerWith();
    githubClient.downloadArchive.mockRejectedValueOnce(new Error("GitHub rejected this node's GitHub token (expired or revoked). Reconnect GitHub on this node."));
    await expect(installer.installPackage(source)).rejects.toThrow("Reconnect GitHub");
    expect(fs.existsSync(installer.getManagedInstallDir(source.installKey))).toBe(false);
    expect(fs.readdirSync(path.join(appData, "agent-packages", ".staging"))).toEqual([]);
  });
});
