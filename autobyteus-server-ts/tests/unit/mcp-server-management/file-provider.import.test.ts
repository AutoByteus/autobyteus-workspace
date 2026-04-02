import { afterEach, describe, expect, it, vi } from "vitest";

describe("file-provider import timing", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../../../src/config/app-config-provider.js");
  });

  it("does not resolve app data dir during module import", async () => {
    const getAppDataDir = vi.fn(() => {
      throw new Error("getAppDataDir should not run during module import");
    });

    vi.doMock("autobyteus-ts", () => ({
      McpConfigService: {
        parseMcpConfigDict: vi.fn(),
      },
    }));
    vi.doMock("../../../src/persistence/file/store-utils.js", () => ({
      readJsonFile: vi.fn(),
      updateJsonFile: vi.fn(),
    }));
    vi.doMock("../../../src/config/app-config-provider.js", () => ({
      appConfigProvider: {
        config: {
          getAppDataDir,
        },
      },
    }));

    const module = await import("../../../src/mcp-server-management/providers/file-provider.js");

    expect(module.FileMcpServerConfigProvider).toBeTypeOf("function");
    expect(getAppDataDir).not.toHaveBeenCalled();
  });
});
