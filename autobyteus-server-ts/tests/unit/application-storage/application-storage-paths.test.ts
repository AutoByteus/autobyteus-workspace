import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCanonicalApplicationId } from "../../../src/application-bundles/utils/application-bundle-identity.js";
import {
  buildApplicationStorageKey,
  buildApplicationStorageLayout,
} from "../../../src/application-storage/utils/application-storage-paths.js";

describe("application storage paths", () => {
  it("keeps short application ids as the readable storage key", () => {
    expect(buildApplicationStorageKey("app-1")).toBe("app-1");
  });

  it("compacts oversized canonical application ids into a deterministic hashed storage key", () => {
    const applicationId = buildCanonicalApplicationId(
      "local:/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/dist/importable-package",
      "brief-studio",
    );

    const storageKey = buildApplicationStorageKey(applicationId);
    const secondStorageKey = buildApplicationStorageKey(applicationId);
    const layout = buildApplicationStorageLayout(
      {
        getAppDataDir: () => "/tmp/autobyteus-app-data",
      },
      applicationId,
    );

    expect(applicationId.length).toBeGreaterThan(255);
    expect(storageKey).toBe(secondStorageKey);
    expect(storageKey.length).toBeLessThanOrEqual(200);
    expect(storageKey).toMatch(/^bundle-app__brief-studio__/);
    expect(storageKey).not.toBe(encodeURIComponent(applicationId));
    expect(path.basename(layout.rootPath)).toBe(storageKey);
    expect(layout.appDatabasePath).toContain(path.join("applications", storageKey, "db", "app.sqlite"));
  });
});
