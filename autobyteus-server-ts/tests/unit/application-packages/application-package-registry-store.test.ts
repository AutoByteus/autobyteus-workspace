import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ApplicationPackageRegistryStore } from "../../../src/application-packages/stores/application-package-registry-store.js";

describe("ApplicationPackageRegistryStore", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    for (const filePath of cleanupPaths) {
      await fs.rm(filePath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
  });

  it("persists linked local and managed GitHub application package records", async () => {
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    cleanupPaths.add(registryRoot);

    const store = new ApplicationPackageRegistryStore({
      getAppDataDir: () => registryRoot,
    });

    const localRecord = await store.upsertLinkedLocalPackageRecord("/tmp/local-application-package");
    expect(localRecord.packageId).toContain("application-local:");

    const githubRecord = await store.upsertManagedGitHubPackageRecord({
      normalizedSource: "autobyteus/autobyteus-apps",
      source: "https://github.com/AutoByteus/autobyteus-apps",
      rootPath: "/tmp/managed/application-package",
      managedInstallPath: "/tmp/managed/application-package",
    });

    expect(
      await store.findGitHubPackageBySource("autobyteus/autobyteus-apps"),
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
