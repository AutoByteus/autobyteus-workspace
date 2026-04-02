import { afterEach, describe, expect, it, vi } from "vitest";

describe("app bootstrap", () => {
  const originalArgv = [...process.argv];

  afterEach(() => {
    process.argv = [...originalArgv];
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("initializes config before importing the runtime module", async () => {
    const events: string[] = [];
    const configInitialize = vi.fn(() => {
      events.push("config.initialize");
    });
    const providerInitialize = vi.fn((options: { appDataDir?: string }) => {
      events.push(`provider.initialize:${options.appDataDir ?? "none"}`);
      return {
        initialize: configInitialize,
      };
    });
    const startConfiguredServer = vi.fn(async (options: Record<string, unknown>) => {
      events.push(`runtime.start:${String(options.dataDir ?? "none")}`);
    });

    vi.doMock("../../src/config/app-config-provider.js", () => ({
      appConfigProvider: {
        initialize: providerInitialize,
      },
    }));
    vi.doMock("../../src/server-runtime.js", () => {
      events.push("runtime.import");
      return {
        buildApp: vi.fn(),
        startConfiguredServer,
      };
    });

    const { startServer } = await import("../../src/app.js");
    process.argv = ["node", "app.js", "--port", "29695", "--data-dir", "/tmp/server-data"];

    await startServer();

    expect(providerInitialize).toHaveBeenCalledWith({
      appDataDir: "/tmp/server-data",
    });
    expect(startConfiguredServer).toHaveBeenCalledWith({
      host: "0.0.0.0",
      port: 29695,
      dataDir: "/tmp/server-data",
    });
    expect(events).toEqual([
      "provider.initialize:/tmp/server-data",
      "config.initialize",
      "runtime.import",
      "runtime.start:/tmp/server-data",
    ]);
  });
});
