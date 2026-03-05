import { afterEach, describe, expect, it } from "vitest";
import {
  getDefaultRuntimeClientModules,
  resetDefaultRuntimeClientModulesCacheForTests,
} from "../../../../src/runtime-management/runtime-client/runtime-client-modules-defaults.js";

const ALLOW_LIST_ENV = "AUTOBYTEUS_RUNTIME_CLIENT_MODULES";
const CODEX_ENABLED_ENV = "CODEX_APP_SERVER_ENABLED";

const restoreEnv = (name: string, value: string | undefined): void => {
  if (typeof value === "string") {
    process.env[name] = value;
    return;
  }
  delete process.env[name];
};

describe("runtime-client module discovery defaults", () => {
  const initialAllowList = process.env[ALLOW_LIST_ENV];
  const initialCodexToggle = process.env[CODEX_ENABLED_ENV];

  afterEach(() => {
    restoreEnv(ALLOW_LIST_ENV, initialAllowList);
    restoreEnv(CODEX_ENABLED_ENV, initialCodexToggle);
    resetDefaultRuntimeClientModulesCacheForTests();
  });

  it("always includes autobyteus even when allow-list excludes it", () => {
    process.env[ALLOW_LIST_ENV] = "codex_app_server";
    process.env[CODEX_ENABLED_ENV] = "false";
    resetDefaultRuntimeClientModulesCacheForTests();

    const runtimeKinds = getDefaultRuntimeClientModules().map((module) => module.runtimeKind);

    expect(runtimeKinds).toEqual(["autobyteus"]);
  });

  it("excludes codex optional runtime when discovery marks it unavailable", () => {
    delete process.env[ALLOW_LIST_ENV];
    process.env[CODEX_ENABLED_ENV] = "false";
    resetDefaultRuntimeClientModulesCacheForTests();

    const runtimeKinds = getDefaultRuntimeClientModules().map((module) => module.runtimeKind);

    expect(runtimeKinds).toContain("autobyteus");
    expect(runtimeKinds).not.toContain("codex_app_server");
  });

  it("supports wildcard allow-list for optional runtime modules", () => {
    process.env[ALLOW_LIST_ENV] = "*";
    process.env[CODEX_ENABLED_ENV] = "true";
    resetDefaultRuntimeClientModulesCacheForTests();

    const runtimeKinds = getDefaultRuntimeClientModules().map((module) => module.runtimeKind);

    expect(runtimeKinds).toContain("autobyteus");
    expect(runtimeKinds).toContain("codex_app_server");
  });

  it("still checks optional runtime availability when allow-listed", () => {
    process.env[ALLOW_LIST_ENV] = "codex_app_server";
    process.env[CODEX_ENABLED_ENV] = "false";
    resetDefaultRuntimeClientModulesCacheForTests();

    const runtimeKinds = getDefaultRuntimeClientModules().map((module) => module.runtimeKind);

    expect(runtimeKinds).toEqual(["autobyteus"]);
  });
});
