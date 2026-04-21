import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { buildCanonicalApplicationId } from "../../../src/application-bundles/utils/application-bundle-identity.js";
import { buildLocalApplicationPackageId } from "../../../src/application-packages/utils/application-package-root-summary.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import { buildApplicationStorageKey } from "../../../src/application-storage/utils/application-storage-paths.js";

describe("ApplicationPlatformStateStore", () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-platform-state-"));
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir: tempRoot });
  });

  afterEach(async () => {
    appConfigProvider.resetForTests();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const createLongImportedPackageRoot = async (): Promise<string> => {
    let currentRoot = path.join(tempRoot, "imported-package-root");
    let depth = 0;

    while (true) {
      const candidate = path.join(currentRoot, "package-root");
      const applicationId = buildCanonicalApplicationId(
        buildLocalApplicationPackageId(path.resolve(candidate)),
        "brief-studio",
      );
      if (applicationId.length > 240) {
        await fs.mkdir(candidate, { recursive: true });
        return candidate;
      }
      depth += 1;
      currentRoot = path.join(currentRoot, `very-long-imported-package-segment-${String(depth).padStart(2, "0")}`);
    }
  };

  it("lists known application ids from existing platform state and reports presence without preparing new state", async () => {
    await fs.mkdir(path.join(tempRoot, "applications", "app-with-db", "db"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, "applications", "app-with-db", "db", "platform.sqlite"),
      "sqlite placeholder",
      "utf-8",
    );
    await fs.mkdir(path.join(tempRoot, "applications", "app-without-db"), { recursive: true });

    const store = new ApplicationPlatformStateStore();

    await expect(store.listKnownApplicationIds()).resolves.toEqual([
      "app-with-db",
    ]);
    await expect(store.getExistingStatePresence("app-with-db")).resolves.toBe("PRESENT");
    await expect(store.getExistingStatePresence("app-without-db")).resolves.toBe("ABSENT");
  });

  it("lists the real long canonical application id instead of the hashed storage key", async () => {
    const packageRoot = await createLongImportedPackageRoot();
    const applicationId = buildCanonicalApplicationId(
      buildLocalApplicationPackageId(path.resolve(packageRoot)),
      "brief-studio",
    );
    const storageKey = buildApplicationStorageKey(applicationId);
    const storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: { getAppDataDir: () => tempRoot },
      applicationBundleService: {
        getApplicationById: async (requestedApplicationId: string) => (
          requestedApplicationId === applicationId ? { id: applicationId } : null
        ),
      } as never,
    });
    const store = new ApplicationPlatformStateStore({
      appConfig: { getAppDataDir: () => tempRoot },
      storageLifecycleService,
    });

    await store.withDatabase(applicationId, () => undefined);

    expect(applicationId.length).toBeGreaterThan(240);
    expect(storageKey).not.toBe(encodeURIComponent(applicationId));
    await expect(store.listKnownApplicationIds()).resolves.toEqual([applicationId]);
    await expect(store.getExistingStatePresence(applicationId)).resolves.toBe("PRESENT");
  });
});
