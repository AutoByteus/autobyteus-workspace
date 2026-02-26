import { describe, expect, it, vi } from "vitest";
import { McpServerPersistenceProvider } from "../../../src/mcp-server-management/providers/persistence-provider.js";
import { SqlMcpServerConfigProvider } from "../../../src/mcp-server-management/providers/sql-provider.js";
import { StdioMcpServerConfig } from "autobyteus-ts/tools/mcp/types.js";

describe("McpServerPersistenceProvider", () => {
  it("defaults to SqlMcpServerConfigProvider", () => {
    const proxy = new McpServerPersistenceProvider();
    const provider = (proxy as any).provider;
    expect(provider).toBeInstanceOf(SqlMcpServerConfigProvider);
  });

  it("delegates calls to the SQL provider", async () => {
    const proxy = new McpServerPersistenceProvider();
    const provider = (proxy as any).provider as SqlMcpServerConfigProvider;

    const sampleConfig = new StdioMcpServerConfig({
      server_id: "server1",
      command: "ls",
    });

    const createSpy = vi.spyOn(provider, "create").mockResolvedValue(sampleConfig);
    const updateSpy = vi.spyOn(provider, "update").mockResolvedValue(sampleConfig);
    const getSpy = vi.spyOn(provider, "getByServerId").mockResolvedValue(sampleConfig);
    const deleteSpy = vi.spyOn(provider, "deleteByServerId").mockResolvedValue(true);
    const getAllSpy = vi.spyOn(provider, "getAll").mockResolvedValue([sampleConfig]);

    await proxy.create(sampleConfig);
    expect(createSpy).toHaveBeenCalledWith(sampleConfig);

    await proxy.update(sampleConfig);
    expect(updateSpy).toHaveBeenCalledWith(sampleConfig);

    await proxy.getByServerId("server1");
    expect(getSpy).toHaveBeenCalledWith("server1");

    await proxy.deleteByServerId("server1");
    expect(deleteSpy).toHaveBeenCalledWith("server1");

    await proxy.getAll();
    expect(getAllSpy).toHaveBeenCalled();
  });
});
