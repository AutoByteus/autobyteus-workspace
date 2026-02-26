import { beforeEach, describe, expect, it, vi } from "vitest";
import { CachedMcpServerConfigProvider } from "../../../src/mcp-server-management/providers/cached-provider.js";
import { StdioMcpServerConfig } from "autobyteus-ts/tools/mcp/types.js";

const buildSampleConfigs = () => [
  new StdioMcpServerConfig({
    server_id: "test_server_1",
    command: "echo 'hello'",
  }),
  new StdioMcpServerConfig({
    server_id: "test_server_2",
    command: "ls -la",
  }),
];

describe("CachedMcpServerConfigProvider", () => {
  const persistenceProvider = {
    getAll: vi.fn(),
    getByServerId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteByServerId: vi.fn(),
  };

  beforeEach(() => {
    persistenceProvider.getAll.mockReset();
    persistenceProvider.getByServerId.mockReset();
    persistenceProvider.create.mockReset();
    persistenceProvider.update.mockReset();
    persistenceProvider.deleteByServerId.mockReset();
  });

  it("populates cache on first getAll", async () => {
    const configs = buildSampleConfigs();
    persistenceProvider.getAll.mockResolvedValue(configs);
    const provider = new CachedMcpServerConfigProvider(persistenceProvider as any);

    const result1 = await provider.getAll();
    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
    expect(result1).toEqual(configs);

    const result2 = await provider.getByServerId("test_server_1");
    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
    expect(result2?.server_id).toBe("test_server_1");
  });

  it("populates cache on first getByServerId", async () => {
    const configs = buildSampleConfigs();
    persistenceProvider.getAll.mockResolvedValue(configs);
    const provider = new CachedMcpServerConfigProvider(persistenceProvider as any);

    const result = await provider.getByServerId("test_server_1");
    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
    expect(result?.command).toBe("echo 'hello'");

    await provider.getByServerId("test_server_2");
    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
  });

  it("returns null for unknown server IDs", async () => {
    const configs = buildSampleConfigs();
    persistenceProvider.getAll.mockResolvedValue(configs);
    const provider = new CachedMcpServerConfigProvider(persistenceProvider as any);

    await provider.getAll();
    const result = await provider.getByServerId("nonexistent");
    expect(result).toBeNull();
    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
  });

  it("updates cache on create", async () => {
    const configs = buildSampleConfigs();
    persistenceProvider.getAll.mockResolvedValue(configs);
    const provider = new CachedMcpServerConfigProvider(persistenceProvider as any);

    await provider.getAll();

    const newConfig = new StdioMcpServerConfig({
      server_id: "new_server_3",
      command: "pwd",
    });
    persistenceProvider.create.mockResolvedValue(newConfig);

    await provider.create(newConfig);
    const updatedList = await provider.getAll();

    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
    expect(updatedList).toHaveLength(3);
    expect(updatedList.find((c) => c.server_id === "new_server_3")).toBeTruthy();
  });

  it("updates cache on update", async () => {
    const configs = buildSampleConfigs();
    persistenceProvider.getAll.mockResolvedValue(configs);
    const provider = new CachedMcpServerConfigProvider(persistenceProvider as any);

    await provider.getAll();

    const updatedConfig = new StdioMcpServerConfig({
      server_id: "test_server_1",
      command: "updated command",
      enabled: false,
    });
    persistenceProvider.update.mockResolvedValue(updatedConfig);

    await provider.update(updatedConfig);
    const result = await provider.getByServerId("test_server_1");

    expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
    expect(result?.command).toBe("updated command");
    expect(result?.enabled).toBe(false);
  });

  it("removes from cache on delete", async () => {
    const configs = buildSampleConfigs();
    persistenceProvider.getAll.mockResolvedValue(configs);
    const provider = new CachedMcpServerConfigProvider(persistenceProvider as any);

    await provider.getAll();
    persistenceProvider.deleteByServerId.mockResolvedValue(true);

    const success = await provider.deleteByServerId("test_server_1");
    expect(success).toBe(true);

    const updatedList = await provider.getAll();
    expect(updatedList).toHaveLength(1);
    expect(updatedList.some((c) => c.server_id === "test_server_1")).toBe(false);

    const result = await provider.getByServerId("test_server_1");
    expect(result).toBeNull();
  });
});
