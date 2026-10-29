import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GitHubAgentPackageInstaller,
  type ManagedGitHubPackageReplacement,
} from "../../../src/agent-packages/installers/github-agent-package-installer.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";
import type { GitHubRepositoryRevisionMetadata, GitHubRepositorySource } from "../../../src/integrations/github/types.js";

/**
 * Update-notification support in `AgentPackageService`: per-package serialization with a fresh
 * read inside the lock (AF-05, AR-003), the kept known update (REQ-006), the projection and the
 * change listener.
 */
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

const metadata = (latestRevision: string): GitHubRepositoryRevisionMetadata => ({
  owner: "AutoByteus", repo: "autobyteus-agents", canonicalUrl: "https://github.com/AutoByteus/autobyteus-agents",
  defaultBranch: "main", latestRevision,
});

describe("AgentPackageService GitHub update state", () => {
  const cleanupPaths = new Set<string>();
  afterEach(async () => {
    for (const filePath of cleanupPaths) await fs.rm(filePath, { recursive: true, force: true });
    cleanupPaths.clear();
    delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
  });

  const setup = async (github: { installedRevision: string; latestRevision: string; updateStatus: "UP_TO_DATE" | "UPDATE_AVAILABLE" }) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-update-state-"));
    cleanupPaths.add(root);
    const defaultRoot = path.join(root, "default");
    const installDir = path.join(root, "managed", "autobyteus__autobyteus-agents");
    await fs.mkdir(path.join(defaultRoot, "agents", "default-agent"), { recursive: true });
    await fs.mkdir(path.join(installDir, "agents", "github-agent"), { recursive: true });
    await fs.writeFile(path.join(installDir, "agents", "github-agent", "agent.md"), "agent");
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = installDir;
    const registryStore = new AgentPackageRegistryStore({ getAppDataDir: () => path.join(root, "registry") });
    const record = await registryStore.upsertManagedGitHubPackageRecord({
      normalizedSource: "autobyteus/autobyteus-agents",
      source: "https://github.com/AutoByteus/autobyteus-agents",
      rootPath: installDir,
      managedInstallPath: installDir,
      sourceMetadata: { github: { defaultBranch: "main", latestCheckedAt: "2026-10-20T00:00:00.000Z", lastError: null, ...github } },
    });
    const rootSettingsStore = new AgentPackageRootSettingsStore(
      { getAppDataDir: () => defaultRoot, getRegisteredAgentPackageRoots: () => [installDir], get: (key: string, fallback?: string) => process.env[key] ?? fallback },
      { updateSetting: () => [true, "updated"] },
    );
    return { registryStore, record, rootSettingsStore };
  };

  class StagingInstaller extends GitHubAgentPackageInstaller {
    override async stagePackageReplacement(
      source: GitHubRepositorySource, revision: GitHubRepositoryRevisionMetadata, targetInstallDir: string,
    ): Promise<ManagedGitHubPackageReplacement> {
      return {
        rootPath: targetInstallDir, managedInstallPath: targetInstallDir, canonicalSourceUrl: source.canonicalUrl,
        defaultBranch: revision.defaultBranch, installedRevision: revision.latestRevision,
        commit: async () => undefined, rollback: async () => undefined,
      };
    }
  }

  const serviceFor = (setupResult: Awaited<ReturnType<typeof setup>>, readHead: () => Promise<GitHubRepositoryRevisionMetadata>) =>
    new AgentPackageService({
      skillNames: { assertNoIncomingSkillNameConflicts: () => ({ conflicts: [], notices: [] }) },
      rootSettingsStore: setupResult.rootSettingsStore,
      registryStore: setupResult.registryStore,
      installer: new StagingInstaller(),
      githubClient: { fetchDefaultBranchHead: readHead },
      reloadAgentPackageDefinitions: async () => undefined,
    });

  it("a check started before an update never overwrites the update's installed revision (AF-05, AR-003)", async () => {
    const state = await setup({ installedRevision: "old-sha", latestRevision: "new-sha", updateStatus: "UPDATE_AVAILABLE" });
    const checkGate = deferred();
    const calls: string[] = [];
    let call = 0;
    const service = serviceFor(state, async () => {
      call += 1;
      calls.push(call === 1 ? "check" : "update");
      if (call === 1) await checkGate.promise;
      return metadata("new-sha");
    });

    const check = service.checkAgentPackageUpdates([state.record.packageId]);
    await vi.waitFor(() => expect(calls).toEqual(["check"]));
    const update = service.updateAgentPackage(state.record.packageId);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toEqual(["check"]); // The update waits for the check of the same package.
    checkGate.resolve();
    await Promise.all([check, update]);

    const stored = await state.registryStore.findPackageById(state.record.packageId);
    expect(stored?.sourceMetadata?.github).toMatchObject({ installedRevision: "new-sha", latestRevision: "new-sha", updateStatus: "UP_TO_DATE" });
  });

  it("a check queued behind an update reads the record the update wrote", async () => {
    const state = await setup({ installedRevision: "old-sha", latestRevision: "new-sha", updateStatus: "UPDATE_AVAILABLE" });
    const updateGate = deferred();
    let call = 0;
    const service = serviceFor(state, async () => {
      call += 1;
      if (call === 1) await updateGate.promise;
      return metadata("new-sha");
    });
    const update = service.updateAgentPackage(state.record.packageId);
    const check = service.checkAgentPackageUpdates();
    updateGate.resolve();
    await Promise.all([update, check]);
    const stored = await state.registryStore.findPackageById(state.record.packageId);
    expect(stored?.sourceMetadata?.github).toMatchObject({ installedRevision: "new-sha", updateStatus: "UP_TO_DATE" });
  });

  it("keeps a known update available after a failed later check (REQ-006)", async () => {
    const state = await setup({ installedRevision: "old-sha", latestRevision: "new-sha", updateStatus: "UPDATE_AVAILABLE" });
    const service = serviceFor(state, async () => { throw new Error("fetch failed"); });
    const packages = await service.checkAgentPackageUpdates();
    const github = packages.find((entry) => entry.sourceKind === "GITHUB_REPOSITORY");
    expect(github?.updateInfo).toMatchObject({
      status: "CHECK_FAILED", canUpdate: true, installedRevision: "old-sha", latestRevision: "new-sha", lastError: "fetch failed",
    });
  });

  it("an up-to-date package cannot be updated", async () => {
    const state = await setup({ installedRevision: "same-sha", latestRevision: "same-sha", updateStatus: "UP_TO_DATE" });
    const packages = await serviceFor(state, async () => metadata("same-sha")).listAgentPackages();
    expect(packages.find((entry) => entry.sourceKind === "GITHUB_REPOSITORY")?.updateInfo.canUpdate).toBe(false);
  });

  it("projects the update facts of GitHub packages only", async () => {
    const state = await setup({ installedRevision: "old-sha", latestRevision: "new-sha", updateStatus: "UPDATE_AVAILABLE" });
    expect(await serviceFor(state, async () => metadata("new-sha")).listGitHubSourceUpdateStates()).toEqual([{
      sourceId: state.record.packageId, displayName: "AutoByteus/autobyteus-agents",
      repositoryUrl: "https://github.com/AutoByteus/autobyteus-agents", defaultBranch: "main",
      installedRevision: "old-sha", latestRevision: "new-sha", lastCheckedAt: "2026-10-20T00:00:00.000Z",
    }]);
  });

  it("tells the listener after a check, a failed update and a removal; a throwing listener never fails the action", async () => {
    const state = await setup({ installedRevision: "old-sha", latestRevision: "new-sha", updateStatus: "UPDATE_AVAILABLE" });
    const service = serviceFor(state, async () => { throw new Error("offline"); });
    const listener = vi.fn(() => { throw new Error("listener broken"); });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    service.setGitHubSourceStateListener(listener);
    await service.checkAgentPackageUpdates();
    expect(listener).toHaveBeenCalledTimes(1);
    await expect(service.updateAgentPackage(state.record.packageId)).rejects.toThrow("offline");
    expect(listener).toHaveBeenCalledTimes(2);
    await service.removeAgentPackage(state.record.packageId);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(await service.listGitHubSourceUpdateStates()).toEqual([]);
    service.setGitHubSourceStateListener(null);
    warn.mockRestore();
  });
});
