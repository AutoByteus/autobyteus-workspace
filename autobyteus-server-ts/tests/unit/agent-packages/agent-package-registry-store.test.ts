import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";

describe("AgentPackageRegistryStore", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    for (const filePath of cleanupPaths) {
      await fs.rm(filePath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
  });

  it("persists linked local and managed GitHub package records", async () => {
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    cleanupPaths.add(registryRoot);

    const store = new AgentPackageRegistryStore({
      getAppDataDir: () => registryRoot,
    });

    const localRecord = await store.upsertLinkedLocalPackageRecord("/tmp/local-agent-package");
    expect(localRecord.packageId).toContain("local:");
    expect(localRecord.sourceMetadata).toBeNull();

    const githubRecord = await store.upsertManagedGitHubPackageRecord({
      normalizedSource: "autobyteus/autobyteus-agents",
      source: "https://github.com/AutoByteus/autobyteus-agents",
      rootPath: "/tmp/managed/agent-package",
      managedInstallPath: "/tmp/managed/agent-package",
    });
    expect(githubRecord.sourceMetadata?.github).toMatchObject({
      installedRevision: null,
      latestRevision: null,
      updateStatus: "UNKNOWN",
    });

    expect(
      await store.findGitHubPackageBySource("autobyteus/autobyteus-agents"),
    ).toMatchObject({
      packageId: githubRecord.packageId,
      sourceKind: "GITHUB_REPOSITORY",
    });

    const rows = await store.listPackageRecords();
    expect(rows).toHaveLength(2);

    await store.removePackageRecord(githubRecord.packageId);
    expect(await store.findPackageById(githubRecord.packageId)).toBeNull();
    expect(await store.findPackageById(localRecord.packageId)).not.toBeNull();
  });

  it("normalizes existing GitHub records without revision metadata into unknown state", async () => {
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-registry-"));
    cleanupPaths.add(registryRoot);

    const store = new AgentPackageRegistryStore({
      getAppDataDir: () => registryRoot,
    });
    await fs.mkdir(path.dirname(store.getRegistryPath()), { recursive: true });
    await fs.writeFile(
      store.getRegistryPath(),
      JSON.stringify([
        {
          packageId: "github:autobyteus/autobyteus-agents",
          rootPath: "/tmp/managed/agent-package",
          sourceKind: "GITHUB_REPOSITORY",
          source: "https://github.com/AutoByteus/autobyteus-agents",
          normalizedSource: "AutoByteus/AutoByteus-Agents",
          managedInstallPath: "/tmp/managed/agent-package",
          createdAt: "2026-05-21T00:00:00.000Z",
          updatedAt: "2026-05-21T00:00:00.000Z",
        },
      ]),
      "utf-8",
    );

    const records = await store.listPackageRecords();
    expect(records[0]).toMatchObject({
      normalizedSource: "autobyteus/autobyteus-agents",
      sourceMetadata: {
        github: {
          installedRevision: null,
          latestRevision: null,
          updateStatus: "UNKNOWN",
        },
      },
    });
  });
});
