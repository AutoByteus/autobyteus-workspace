import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GitHubAgentPackageInstaller } from "../../../src/agent-packages/installers/github-agent-package-installer.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";
import type { GitHubRepositorySource } from "../../../src/agent-packages/types.js";

const parseAdditionalRoots = (): string[] => {
  const raw = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS ?? "";
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => path.resolve(entry));
};

const createRootSettingsStore = (defaultRoot: string): AgentPackageRootSettingsStore =>
  new AgentPackageRootSettingsStore(
    {
      getAppDataDir: () => defaultRoot,
      getAdditionalAgentPackageRoots: () => parseAdditionalRoots(),
      get: (key: string, defaultValue?: string) =>
        process.env[key] ?? defaultValue,
    },
    {
      updateSetting: (key: string, value: string) => {
        if (value) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
        return [true, "updated"];
      },
    },
  );

describe("AgentPackageService", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    for (const filePath of cleanupPaths) {
      await fs.rm(filePath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();

    delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
  });

  it("lists the built-in package and linked local packages with package ids", async () => {
    const defaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-default-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    const localRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-local-"));

    cleanupPaths.add(defaultRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(localRoot);

    await fs.mkdir(path.join(defaultRoot, "agents", "default-agent"), { recursive: true });
    await fs.writeFile(
      path.join(defaultRoot, "agents", "default-agent", "agent.md"),
      "agent",
      "utf-8",
    );
    await fs.mkdir(path.join(localRoot, "agents", "local-agent"), { recursive: true });
    await fs.writeFile(
      path.join(localRoot, "agents", "local-agent", "agent.md"),
      "agent",
      "utf-8",
    );

    const service = new AgentPackageService({
      rootSettingsStore: createRootSettingsStore(defaultRoot),
      registryStore: new AgentPackageRegistryStore({
        getAppDataDir: () => registryRoot,
      }),
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
    });

    await service.importAgentPackage({
      sourceKind: "LOCAL_PATH",
      source: localRoot,
    });

    const packages = await service.listAgentPackages();
    expect(packages[0]).toMatchObject({
      packageId: "built-in:default",
      sourceKind: "BUILT_IN",
      isRemovable: false,
    });
    expect(packages.some((entry) => entry.path === localRoot)).toBe(true);
  });

  it("rejects duplicate GitHub imports before reinstalling", async () => {
    const defaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-default-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    const managedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-managed-"));

    cleanupPaths.add(defaultRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(managedRoot);

    class MockInstaller extends GitHubAgentPackageInstaller {
      override getManagedInstallDir(installKey: string): string {
        return path.join(managedRoot, installKey);
      }

      override async installPackage(source: GitHubRepositorySource): Promise<{
        rootPath: string;
        managedInstallPath: string;
        canonicalSourceUrl: string;
      }> {
        const installDir = this.getManagedInstallDir(source.installKey);
        await fs.mkdir(path.join(installDir, "agents", "demo-agent"), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(installDir, "agents", "demo-agent", "agent.md"),
          "agent",
          "utf-8",
        );

        return {
          rootPath: installDir,
          managedInstallPath: installDir,
          canonicalSourceUrl: source.canonicalUrl,
        };
      }
    }

    const service = new AgentPackageService({
      rootSettingsStore: createRootSettingsStore(defaultRoot),
      registryStore: new AgentPackageRegistryStore({
        getAppDataDir: () => registryRoot,
      }),
      installer: new MockInstaller(),
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
    });

    await service.importAgentPackage({
      sourceKind: "GITHUB_REPOSITORY",
      source: "https://github.com/AutoByteus/autobyteus-agents",
    });

    await expect(
      service.importAgentPackage({
        sourceKind: "GITHUB_REPOSITORY",
        source: "https://github.com/autobyteus/autobyteus-agents",
      }),
    ).rejects.toThrow(/already exists/i);
  });

  it("rolls back a managed GitHub import when cache refresh fails after side effects begin", async () => {
    const defaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-default-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    const managedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-managed-"));

    cleanupPaths.add(defaultRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(managedRoot);

    class MockInstaller extends GitHubAgentPackageInstaller {
      override getManagedInstallDir(installKey: string): string {
        return path.join(managedRoot, installKey);
      }

      override async installPackage(source: GitHubRepositorySource): Promise<{
        rootPath: string;
        managedInstallPath: string;
        canonicalSourceUrl: string;
      }> {
        const installDir = this.getManagedInstallDir(source.installKey);
        await fs.mkdir(path.join(installDir, "agents", "demo-agent"), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(installDir, "agents", "demo-agent", "agent.md"),
          "agent",
          "utf-8",
        );

        return {
          rootPath: installDir,
          managedInstallPath: installDir,
          canonicalSourceUrl: source.canonicalUrl,
        };
      }
    }

    const service = new AgentPackageService({
      rootSettingsStore: createRootSettingsStore(defaultRoot),
      registryStore: new AgentPackageRegistryStore({
        getAppDataDir: () => registryRoot,
      }),
      installer: new MockInstaller(),
      refreshAgentDefinitions: async () => {
        throw new Error("refresh failed");
      },
      refreshAgentTeams: async () => undefined,
    });

    await expect(
      service.importAgentPackage({
        sourceKind: "GITHUB_REPOSITORY",
        source: "https://github.com/AutoByteus/autobyteus-agents",
      }),
    ).rejects.toThrow(/refresh failed/i);

    expect(parseAdditionalRoots()).toEqual([]);

    const registryStore = new AgentPackageRegistryStore({
      getAppDataDir: () => registryRoot,
    });
    expect(
      await registryStore.findGitHubPackageBySource("autobyteus/autobyteus-agents"),
    ).toBeNull();

    await expect(
      fs.access(path.join(managedRoot, "autobyteus__autobyteus-agents")),
    ).rejects.toBeDefined();
  });

  it("restores a managed GitHub package when removal refresh fails", async () => {
    const defaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-default-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    const managedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-managed-"));

    cleanupPaths.add(defaultRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(managedRoot);

    class MockInstaller extends GitHubAgentPackageInstaller {
      override getManagedInstallDir(installKey: string): string {
        return path.join(managedRoot, installKey);
      }

      override async installPackage(source: GitHubRepositorySource): Promise<{
        rootPath: string;
        managedInstallPath: string;
        canonicalSourceUrl: string;
      }> {
        const installDir = this.getManagedInstallDir(source.installKey);
        await fs.mkdir(path.join(installDir, "agents", "demo-agent"), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(installDir, "agents", "demo-agent", "agent.md"),
          "agent",
          "utf-8",
        );

        return {
          rootPath: installDir,
          managedInstallPath: installDir,
          canonicalSourceUrl: source.canonicalUrl,
        };
      }
    }

    let shouldFailRefresh = false;

    const service = new AgentPackageService({
      rootSettingsStore: createRootSettingsStore(defaultRoot),
      registryStore: new AgentPackageRegistryStore({
        getAppDataDir: () => registryRoot,
      }),
      installer: new MockInstaller(),
      refreshAgentDefinitions: async () => {
        if (shouldFailRefresh) {
          throw new Error("refresh failed");
        }
      },
      refreshAgentTeams: async () => undefined,
    });

    const importedPackages = await service.importAgentPackage({
      sourceKind: "GITHUB_REPOSITORY",
      source: "https://github.com/AutoByteus/autobyteus-agents",
    });
    const managedPackage = importedPackages.find(
      (entry) => entry.sourceKind === "GITHUB_REPOSITORY",
    );

    expect(managedPackage).toBeDefined();
    shouldFailRefresh = true;

    await expect(
      service.removeAgentPackage(managedPackage?.packageId ?? ""),
    ).rejects.toThrow(/refresh failed/i);

    expect(parseAdditionalRoots()).toContain(managedPackage?.path);

    const registryStore = new AgentPackageRegistryStore({
      getAppDataDir: () => registryRoot,
    });
    expect(
      await registryStore.findGitHubPackageBySource("autobyteus/autobyteus-agents"),
    ).not.toBeNull();

    await expect(fs.access(managedPackage?.path ?? "")).resolves.toBeUndefined();
  });
});
