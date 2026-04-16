import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApplicationPackageRootSettingsStore } from "../../../src/application-packages/stores/application-package-root-settings-store.js";

describe("ApplicationPackageRootSettingsStore", () => {
  let tempRoot: string;
  let appDataRoot: string;
  let builtInRoot: string;
  let bundledSourceRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-application-root-settings-"));
    appDataRoot = path.join(tempRoot, "app-data");
    builtInRoot = path.join(appDataRoot, "application-packages", "platform");
    bundledSourceRoot = path.join(tempRoot, "bundled-source");
    await fs.mkdir(builtInRoot, { recursive: true });
    await fs.mkdir(path.join(bundledSourceRoot, "applications"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("filters the built-in applications root out of configured additional roots", () => {
    const extraRoot = path.join(tempRoot, "external-applications-root");
    const store = new ApplicationPackageRootSettingsStore(
      {
        getAppDataDir: () => appDataRoot,
        getAdditionalApplicationPackageRoots: () => [builtInRoot, bundledSourceRoot, extraRoot],
        getAppRootDir: () => path.join(bundledSourceRoot, "server"),
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
        getAppDataDir: () => appDataRoot,
        getAdditionalApplicationPackageRoots: () => [],
        getAppRootDir: () => path.join(bundledSourceRoot, "server"),
        get: (_key: string, defaultValue?: string) => defaultValue,
      },
      {
        updateSetting: (key: string, value: string) => {
          writes.push({ key, value });
          return [true, "updated"];
        },
      },
    );

    expect(() => store.addAdditionalRootPath(builtInRoot)).toThrow(
      "built-in applications root cannot be registered",
    );
    expect(writes).toHaveLength(0);
  });

  it("rejects registering the bundled platform source root as an additional application package root", () => {
    const writes: Array<{ key: string; value: string }> = [];
    const store = new ApplicationPackageRootSettingsStore(
      {
        getAppDataDir: () => appDataRoot,
        getAdditionalApplicationPackageRoots: () => [],
        getAppRootDir: () => path.join(bundledSourceRoot, "server"),
        get: (_key: string, defaultValue?: string) => defaultValue,
      },
      {
        updateSetting: (key: string, value: string) => {
          writes.push({ key, value });
          return [true, "updated"];
        },
      },
    );

    expect(() => store.addAdditionalRootPath(bundledSourceRoot)).toThrow(
      "bundled platform applications source root cannot be registered",
    );
    expect(writes).toHaveLength(0);
  });
});
