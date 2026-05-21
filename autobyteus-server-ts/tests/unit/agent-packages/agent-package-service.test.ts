import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  GitHubAgentPackageInstaller,
  type ManagedGitHubPackageReplacement,
} from "../../../src/agent-packages/installers/github-agent-package-installer.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";
import type {
  GitHubRepositoryRevisionMetadata,
  GitHubRepositorySource,
} from "../../../src/agent-packages/types.js";

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

const writeAgentPackageRoot = async (
  rootPath: string,
  agentId = "demo-agent",
  contents = "agent",
): Promise<void> => {
  await fs.mkdir(path.join(rootPath, "agents", agentId), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(rootPath, "agents", agentId, "agent.md"),
    contents,
    "utf-8",
  );
};

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

  it("reloads a local package by validating the root and refreshing caches", async () => {
    const defaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-default-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    const localRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-local-"));

    cleanupPaths.add(defaultRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(localRoot);

    await writeAgentPackageRoot(defaultRoot, "default-agent");
    await writeAgentPackageRoot(localRoot, "local-agent");

    let refreshCount = 0;
    const service = new AgentPackageService({
      rootSettingsStore: createRootSettingsStore(defaultRoot),
      registryStore: new AgentPackageRegistryStore({
        getAppDataDir: () => registryRoot,
      }),
      refreshAgentDefinitions: async () => {
        refreshCount += 1;
      },
      refreshAgentTeams: async () => undefined,
    });

    const importedPackages = await service.importAgentPackage({
      sourceKind: "LOCAL_PATH",
      source: localRoot,
    });
    const localPackage = importedPackages.find((entry) => entry.path === localRoot);
    expect(localPackage?.updateInfo.canReload).toBe(true);

    await writeAgentPackageRoot(localRoot, "second-local-agent");
    const reloadedPackages = await service.reloadAgentPackage(
      localPackage?.packageId ?? "",
    );
    const reloadedPackage = reloadedPackages.find((entry) => entry.path === localRoot);

    expect(refreshCount).toBe(2);
    expect(reloadedPackage?.sharedAgentCount).toBe(2);
  });

  it("marks managed GitHub packages with available updates after a metadata check", async () => {
    const defaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-default-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    const managedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-managed-"));
    const installDir = path.join(managedRoot, "autobyteus__autobyteus-agents");

    cleanupPaths.add(defaultRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(managedRoot);

    await writeAgentPackageRoot(defaultRoot, "default-agent");
    await writeAgentPackageRoot(installDir, "github-agent");
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = installDir;

    const registryStore = new AgentPackageRegistryStore({
      getAppDataDir: () => registryRoot,
    });
    await registryStore.upsertManagedGitHubPackageRecord({
      normalizedSource: "autobyteus/autobyteus-agents",
      source: "https://github.com/AutoByteus/autobyteus-agents",
      rootPath: installDir,
      managedInstallPath: installDir,
      sourceMetadata: {
        github: {
          defaultBranch: "main",
          installedRevision: "old-sha",
          latestRevision: "old-sha",
          latestCheckedAt: "2026-05-21T00:00:00.000Z",
          updateStatus: "UP_TO_DATE",
          lastError: null,
        },
      },
    });

    class MockInstaller extends GitHubAgentPackageInstaller {
      override async fetchRepositoryRevisionMetadata(_source: GitHubRepositorySource): Promise<GitHubRepositoryRevisionMetadata> {
        return {
          owner: "AutoByteus",
          repo: "autobyteus-agents",
          canonicalUrl: "https://github.com/AutoByteus/autobyteus-agents",
          defaultBranch: "main",
          latestRevision: "new-sha",
        };
      }
    }

    const service = new AgentPackageService({
      rootSettingsStore: createRootSettingsStore(defaultRoot),
      registryStore,
      installer: new MockInstaller(),
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
    });

    const packages = await service.checkAgentPackageUpdates();
    const githubPackage = packages.find(
      (entry) => entry.sourceKind === "GITHUB_REPOSITORY",
    );

    expect(githubPackage?.updateInfo).toMatchObject({
      status: "UPDATE_AVAILABLE",
      canUpdate: true,
      installedRevision: "old-sha",
      latestRevision: "new-sha",
    });
  });

  it("updates a managed GitHub package and records the installed revision", async () => {
    const defaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-default-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    const managedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-managed-"));
    const installDir = path.join(managedRoot, "autobyteus__autobyteus-agents");

    cleanupPaths.add(defaultRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(managedRoot);

    await writeAgentPackageRoot(defaultRoot, "default-agent");
    await writeAgentPackageRoot(installDir, "github-agent", "old");
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = installDir;

    const registryStore = new AgentPackageRegistryStore({
      getAppDataDir: () => registryRoot,
    });
    const record = await registryStore.upsertManagedGitHubPackageRecord({
      normalizedSource: "autobyteus/autobyteus-agents",
      source: "https://github.com/AutoByteus/autobyteus-agents",
      rootPath: installDir,
      managedInstallPath: installDir,
      sourceMetadata: {
        github: {
          defaultBranch: "main",
          installedRevision: "old-sha",
          latestRevision: "new-sha",
          latestCheckedAt: "2026-05-21T00:00:00.000Z",
          updateStatus: "UPDATE_AVAILABLE",
          lastError: null,
        },
      },
    });

    class MockInstaller extends GitHubAgentPackageInstaller {
      override async fetchRepositoryRevisionMetadata(_source: GitHubRepositorySource): Promise<GitHubRepositoryRevisionMetadata> {
        return {
          owner: "AutoByteus",
          repo: "autobyteus-agents",
          canonicalUrl: "https://github.com/AutoByteus/autobyteus-agents",
          defaultBranch: "main",
          latestRevision: "new-sha",
        };
      }

      override async stagePackageReplacement(
        source: GitHubRepositorySource,
        metadata: GitHubRepositoryRevisionMetadata,
        targetInstallDir: string,
      ): Promise<ManagedGitHubPackageReplacement> {
        await writeAgentPackageRoot(targetInstallDir, "github-agent", "new");
        return {
          rootPath: targetInstallDir,
          managedInstallPath: targetInstallDir,
          canonicalSourceUrl: source.canonicalUrl,
          defaultBranch: metadata.defaultBranch,
          installedRevision: metadata.latestRevision,
          commit: async () => undefined,
          rollback: async () => undefined,
        };
      }
    }

    const service = new AgentPackageService({
      rootSettingsStore: createRootSettingsStore(defaultRoot),
      registryStore,
      installer: new MockInstaller(),
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
    });

    const packages = await service.updateAgentPackage(record.packageId);
    const githubPackage = packages.find(
      (entry) => entry.sourceKind === "GITHUB_REPOSITORY",
    );
    const updatedRecord = await registryStore.findPackageById(record.packageId);

    expect(githubPackage?.updateInfo).toMatchObject({
      status: "UP_TO_DATE",
      installedRevision: "new-sha",
      latestRevision: "new-sha",
    });
    expect(updatedRecord?.sourceMetadata?.github?.installedRevision).toBe("new-sha");
    await expect(
      fs.readFile(path.join(installDir, "agents", "github-agent", "agent.md"), "utf-8"),
    ).resolves.toBe("new");
  });

  it("rolls back a managed GitHub update when cache refresh fails", async () => {
    const defaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-default-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    const managedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-managed-"));
    const installDir = path.join(managedRoot, "autobyteus__autobyteus-agents");

    cleanupPaths.add(defaultRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(managedRoot);

    await writeAgentPackageRoot(defaultRoot, "default-agent");
    await writeAgentPackageRoot(installDir, "github-agent", "old");
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = installDir;

    const registryStore = new AgentPackageRegistryStore({
      getAppDataDir: () => registryRoot,
    });
    const record = await registryStore.upsertManagedGitHubPackageRecord({
      normalizedSource: "autobyteus/autobyteus-agents",
      source: "https://github.com/AutoByteus/autobyteus-agents",
      rootPath: installDir,
      managedInstallPath: installDir,
      sourceMetadata: {
        github: {
          defaultBranch: "main",
          installedRevision: "old-sha",
          latestRevision: "new-sha",
          latestCheckedAt: "2026-05-21T00:00:00.000Z",
          updateStatus: "UPDATE_AVAILABLE",
          lastError: null,
        },
      },
    });

    class MockInstaller extends GitHubAgentPackageInstaller {
      override async fetchRepositoryRevisionMetadata(_source: GitHubRepositorySource): Promise<GitHubRepositoryRevisionMetadata> {
        return {
          owner: "AutoByteus",
          repo: "autobyteus-agents",
          canonicalUrl: "https://github.com/AutoByteus/autobyteus-agents",
          defaultBranch: "main",
          latestRevision: "new-sha",
        };
      }

      override async stagePackageReplacement(
        source: GitHubRepositorySource,
        metadata: GitHubRepositoryRevisionMetadata,
        targetInstallDir: string,
      ): Promise<ManagedGitHubPackageReplacement> {
        const agentFile = path.join(
          targetInstallDir,
          "agents",
          "github-agent",
          "agent.md",
        );
        const previousContents = await fs.readFile(agentFile, "utf-8");
        await fs.writeFile(agentFile, "new", "utf-8");
        return {
          rootPath: targetInstallDir,
          managedInstallPath: targetInstallDir,
          canonicalSourceUrl: source.canonicalUrl,
          defaultBranch: metadata.defaultBranch,
          installedRevision: metadata.latestRevision,
          commit: async () => undefined,
          rollback: async () => {
            await fs.writeFile(agentFile, previousContents, "utf-8");
          },
        };
      }
    }

    const service = new AgentPackageService({
      rootSettingsStore: createRootSettingsStore(defaultRoot),
      registryStore,
      installer: new MockInstaller(),
      refreshAgentDefinitions: async () => {
        throw new Error("refresh failed");
      },
      refreshAgentTeams: async () => undefined,
    });

    await expect(service.updateAgentPackage(record.packageId)).rejects.toThrow(
      /refresh failed/i,
    );

    const restoredRecord = await registryStore.findPackageById(record.packageId);
    expect(restoredRecord?.sourceMetadata?.github).toMatchObject({
      installedRevision: "old-sha",
      updateStatus: "UPDATE_FAILED",
    });
    await expect(
      fs.readFile(path.join(installDir, "agents", "github-agent", "agent.md"), "utf-8"),
    ).resolves.toBe("old");
  });

  it("marks update failed when GitHub revision metadata fetch fails", async () => {
    const defaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-default-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    const managedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-managed-"));
    const installDir = path.join(managedRoot, "autobyteus__autobyteus-agents");

    cleanupPaths.add(defaultRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(managedRoot);

    await writeAgentPackageRoot(defaultRoot, "default-agent");
    await writeAgentPackageRoot(installDir, "github-agent", "old");
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = installDir;

    const registryStore = new AgentPackageRegistryStore({
      getAppDataDir: () => registryRoot,
    });
    const record = await registryStore.upsertManagedGitHubPackageRecord({
      normalizedSource: "autobyteus/autobyteus-agents",
      source: "https://github.com/AutoByteus/autobyteus-agents",
      rootPath: installDir,
      managedInstallPath: installDir,
      sourceMetadata: {
        github: {
          defaultBranch: "main",
          installedRevision: "old-sha",
          latestRevision: "new-sha",
          latestCheckedAt: "2026-05-21T00:00:00.000Z",
          updateStatus: "UPDATE_AVAILABLE",
          lastError: null,
        },
      },
    });

    class MockInstaller extends GitHubAgentPackageInstaller {
      override async fetchRepositoryRevisionMetadata(_source: GitHubRepositorySource): Promise<GitHubRepositoryRevisionMetadata> {
        throw new Error("metadata unavailable");
      }
    }

    const service = new AgentPackageService({
      rootSettingsStore: createRootSettingsStore(defaultRoot),
      registryStore,
      installer: new MockInstaller(),
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
    });

    await expect(service.updateAgentPackage(record.packageId)).rejects.toThrow(
      /metadata unavailable/i,
    );

    const packages = await service.listAgentPackages();
    const githubPackage = packages.find(
      (entry) => entry.sourceKind === "GITHUB_REPOSITORY",
    );
    const failedRecord = await registryStore.findPackageById(record.packageId);

    expect(githubPackage?.updateInfo).toMatchObject({
      status: "UPDATE_FAILED",
      installedRevision: "old-sha",
      lastError: "metadata unavailable",
    });
    expect(failedRecord?.sourceMetadata?.github).toMatchObject({
      updateStatus: "UPDATE_FAILED",
      installedRevision: "old-sha",
      lastError: "metadata unavailable",
    });
    await expect(
      fs.readFile(path.join(installDir, "agents", "github-agent", "agent.md"), "utf-8"),
    ).resolves.toBe("old");
  });

  it("marks update failed when package replacement staging fails before returning", async () => {
    const defaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-default-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    const managedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-managed-"));
    const installDir = path.join(managedRoot, "autobyteus__autobyteus-agents");

    cleanupPaths.add(defaultRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(managedRoot);

    await writeAgentPackageRoot(defaultRoot, "default-agent");
    await writeAgentPackageRoot(installDir, "github-agent", "old");
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = installDir;

    const registryStore = new AgentPackageRegistryStore({
      getAppDataDir: () => registryRoot,
    });
    const record = await registryStore.upsertManagedGitHubPackageRecord({
      normalizedSource: "autobyteus/autobyteus-agents",
      source: "https://github.com/AutoByteus/autobyteus-agents",
      rootPath: installDir,
      managedInstallPath: installDir,
      sourceMetadata: {
        github: {
          defaultBranch: "main",
          installedRevision: "old-sha",
          latestRevision: "new-sha",
          latestCheckedAt: "2026-05-21T00:00:00.000Z",
          updateStatus: "UPDATE_AVAILABLE",
          lastError: null,
        },
      },
    });

    class MockInstaller extends GitHubAgentPackageInstaller {
      override async fetchRepositoryRevisionMetadata(_source: GitHubRepositorySource): Promise<GitHubRepositoryRevisionMetadata> {
        return {
          owner: "AutoByteus",
          repo: "autobyteus-agents",
          canonicalUrl: "https://github.com/AutoByteus/autobyteus-agents",
          defaultBranch: "main",
          latestRevision: "new-sha",
        };
      }

      override async stagePackageReplacement(): Promise<ManagedGitHubPackageReplacement> {
        throw new Error("download failed");
      }
    }

    const service = new AgentPackageService({
      rootSettingsStore: createRootSettingsStore(defaultRoot),
      registryStore,
      installer: new MockInstaller(),
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
    });

    await expect(service.updateAgentPackage(record.packageId)).rejects.toThrow(
      /download failed/i,
    );

    const packages = await service.listAgentPackages();
    const githubPackage = packages.find(
      (entry) => entry.sourceKind === "GITHUB_REPOSITORY",
    );
    const failedRecord = await registryStore.findPackageById(record.packageId);

    expect(githubPackage?.updateInfo).toMatchObject({
      status: "UPDATE_FAILED",
      installedRevision: "old-sha",
      lastError: "download failed",
    });
    expect(failedRecord?.sourceMetadata?.github).toMatchObject({
      updateStatus: "UPDATE_FAILED",
      installedRevision: "old-sha",
      lastError: "download failed",
    });
    await expect(
      fs.readFile(path.join(installDir, "agents", "github-agent", "agent.md"), "utf-8"),
    ).resolves.toBe("old");
  });

  it("rejects update attempts for local packages", async () => {
    const defaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-default-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    const localRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-local-"));

    cleanupPaths.add(defaultRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(localRoot);

    await writeAgentPackageRoot(defaultRoot, "default-agent");
    await writeAgentPackageRoot(localRoot, "local-agent");

    const service = new AgentPackageService({
      rootSettingsStore: createRootSettingsStore(defaultRoot),
      registryStore: new AgentPackageRegistryStore({
        getAppDataDir: () => registryRoot,
      }),
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
    });

    const packages = await service.importAgentPackage({
      sourceKind: "LOCAL_PATH",
      source: localRoot,
    });
    const localPackage = packages.find((entry) => entry.path === localRoot);

    await expect(
      service.updateAgentPackage(localPackage?.packageId ?? ""),
    ).rejects.toThrow(/managed GitHub/i);
  });
});
