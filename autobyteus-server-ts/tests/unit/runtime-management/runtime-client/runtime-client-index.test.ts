import { afterEach, describe, expect, it, vi } from "vitest";

const DESCRIPTOR_MODULES_ENV = "AUTOBYTEUS_RUNTIME_CLIENT_DESCRIPTOR_MODULES";

const restoreEnv = (name: string, value: string | undefined): void => {
  if (typeof value === "string") {
    process.env[name] = value;
    return;
  }
  delete process.env[name];
};

const loadDescriptorRuntimeKinds = async (): Promise<string[]> => {
  vi.resetModules();
  const module = await import(
    "../../../../src/runtime-management/runtime-client/index.js"
  );
  return module.listRuntimeClientModuleDescriptors().map((descriptor) => descriptor.runtimeKind);
};

describe("runtime-client descriptor module discovery", () => {
  const initialDescriptorModules = process.env[DESCRIPTOR_MODULES_ENV];

  afterEach(() => {
    restoreEnv(DESCRIPTOR_MODULES_ENV, initialDescriptorModules);
    vi.resetModules();
  });

  it("loads default descriptor modules when env override is unset", async () => {
    delete process.env[DESCRIPTOR_MODULES_ENV];

    const runtimeKinds = await loadDescriptorRuntimeKinds();

    expect(runtimeKinds).toContain("autobyteus");
    expect(runtimeKinds).toContain("codex_app_server");
  });

  it("supports descriptor module env override while preserving required autobyteus module", async () => {
    process.env[DESCRIPTOR_MODULES_ENV] =
      "../../../tests/unit/runtime-management/runtime-client/fixtures/runtime-client-test-descriptor-module.js";

    const runtimeKinds = await loadDescriptorRuntimeKinds();

    expect(runtimeKinds).toContain("autobyteus");
    expect(runtimeKinds).toContain("test_runtime");
    expect(runtimeKinds).not.toContain("codex_app_server");
  });

  it("tolerates invalid optional module specs", async () => {
    process.env[DESCRIPTOR_MODULES_ENV] =
      "./missing-runtime-client-descriptor-module.js,./codex-runtime-client-module.js";

    const runtimeKinds = await loadDescriptorRuntimeKinds();

    expect(runtimeKinds).toContain("autobyteus");
    expect(runtimeKinds).toContain("codex_app_server");
  });
});
