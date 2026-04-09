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

    const githubRecord = await store.upsertManagedGitHubPackageRecord({
      normalizedSource: "autobyteus/autobyteus-agents",
      source: "https://github.com/AutoByteus/autobyteus-agents",
      rootPath: "/tmp/managed/agent-package",
      managedInstallPath: "/tmp/managed/agent-package",
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
});
