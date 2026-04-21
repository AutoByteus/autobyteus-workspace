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
  let serverRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-application-root-settings-"));
    appDataRoot = path.join(tempRoot, "app-data");
    builtInRoot = path.join(appDataRoot, "application-packages", "platform");
    bundledSourceRoot = path.join(tempRoot, "repo-root", "autobyteus-server-ts", "application-packages", "platform");
    serverRoot = path.join(tempRoot, "repo-root", "autobyteus-server-ts", "server");
    await fs.mkdir(builtInRoot, { recursive: true });
    await fs.mkdir(path.join(bundledSourceRoot, "applications"), { recursive: true });
    await fs.mkdir(serverRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("filters the built-in applications root out of configured additional roots", () => {
    const extraRoot = path.join(tempRoot, "external-applications-root");
    const configuredRoots = [builtInRoot, bundledSourceRoot, extraRoot].join(",");
    const store = new ApplicationPackageRootSettingsStore(
      {
        getAppDataDir: () => appDataRoot,
        getAdditionalApplicationPackageRoots: () => [extraRoot],
        getAppRootDir: () => serverRoot,
        get: (key: string, defaultValue?: string) => (
          key === "AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS"
            ? configuredRoots
            : defaultValue
        ),
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

    expect(() => store.addAdditionalRootPath(bundledSourceRoot)).toThrow(
      "bundled platform applications source root cannot be registered",
    );
    expect(writes).toHaveLength(0);
  });

  it("retains raw configured missing roots for reconciliation even when runtime config filters them out", () => {
    const missingRoot = path.join(tempRoot, "missing-root");
    const store = new ApplicationPackageRootSettingsStore(
      {
        getAppDataDir: () => appDataRoot,
        getAdditionalApplicationPackageRoots: () => [],
        getAppRootDir: () => serverRoot,
        get: (key: string, defaultValue?: string) => (
          key === "AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS"
            ? missingRoot
            : defaultValue
        ),
      },
      {
        updateSetting: () => [true, "updated"],
      },
    );

    expect(store.listAdditionalRootPaths()).toEqual([path.resolve(missingRoot)]);
  });
});
