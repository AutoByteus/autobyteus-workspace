import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApplicationPackageRootSettingsStore } from "../../../src/application-packages/stores/application-package-root-settings-store.js";

describe("ApplicationPackageRootSettingsStore", () => {
  let tempRoot: string;
  let repoRoot: string;
  let serverRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-application-root-settings-"));
    repoRoot = path.join(tempRoot, "repo-root");
    serverRoot = path.join(repoRoot, "autobyteus-server-ts");
    await fs.mkdir(path.join(repoRoot, "applications"), { recursive: true });
    await fs.mkdir(serverRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("filters the built-in applications root out of configured additional roots", () => {
    const extraRoot = path.join(tempRoot, "external-applications-root");
    const store = new ApplicationPackageRootSettingsStore(
      {
        getAdditionalApplicationPackageRoots: () => [repoRoot, extraRoot],
        getAppRootDir: () => serverRoot,
        get: (_key: string, defaultValue?: string) => defaultValue,
      },
      {
        updateSetting: () => [true, "updated"],
      },
    );

    expect(store.listAdditionalRootPaths()).toEqual([path.resolve(extraRoot)]);
  });

  it("rejects registering the built-in applications root as an additional application package root", () => {
    const writes: Array<{ key: string; value: string }> = [];
    const store = new ApplicationPackageRootSettingsStore(
      {
        getAdditionalApplicationPackageRoots: () => [],
        getAppRootDir: () => serverRoot,
        get: (_key: string, defaultValue?: string) => defaultValue,
      },
      {
        updateSetting: (key: string, value: string) => {
          writes.push({ key, value });
          return [true, "updated"];
        },
      },
    );

    expect(() => store.addAdditionalRootPath(repoRoot)).toThrow(
      "built-in applications root cannot be registered",
    );
    expect(writes).toHaveLength(0);
  });
});
