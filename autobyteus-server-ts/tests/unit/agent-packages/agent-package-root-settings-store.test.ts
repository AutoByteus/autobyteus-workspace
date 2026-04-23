import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";

describe("AgentPackageRootSettingsStore", () => {
  let tempRoot: string;
  let appDataRoot: string;
  let builtInSourceRoot: string;
  let serverRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-root-settings-"));
    appDataRoot = path.join(tempRoot, "app-data");
    builtInSourceRoot = path.join(tempRoot, "repo-root", "autobyteus-server-ts", "application-packages", "platform");
    serverRoot = path.join(tempRoot, "repo-root", "autobyteus-server-ts");
    await fs.mkdir(appDataRoot, { recursive: true });
    await fs.mkdir(path.join(builtInSourceRoot, "applications"), { recursive: true });
    await fs.mkdir(serverRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("filters the built-in applications root out of configured additional roots", () => {
    const extraRoot = path.join(tempRoot, "extra-package-root");
    const store = new AgentPackageRootSettingsStore(
      {
        getAppDataDir: () => appDataRoot,
        getAppRootDir: () => serverRoot,
        getAdditionalAgentPackageRoots: () => [builtInSourceRoot, extraRoot],
        get: (_key: string, defaultValue?: string) => defaultValue,
      },
      {
        updateSetting: () => [true, "updated"],
      },
    );

    expect(store.listAdditionalRootPaths()).toEqual([path.resolve(extraRoot)]);
  });

  it("rejects registering the built-in applications root as an additional package root", () => {
    const writes: Array<{ key: string; value: string }> = [];
    const store = new AgentPackageRootSettingsStore(
      {
        getAppDataDir: () => appDataRoot,
        getAppRootDir: () => serverRoot,
        getAdditionalAgentPackageRoots: () => [],
        get: (_key: string, defaultValue?: string) => defaultValue,
      },
      {
        updateSetting: (key: string, value: string) => {
          writes.push({ key, value });
          return [true, "updated"];
        },
      },
    );

    expect(() => store.addAdditionalRootPath(builtInSourceRoot)).toThrow(
      "built-in applications root cannot be registered",
    );
    expect(writes).toHaveLength(0);
  });
});
