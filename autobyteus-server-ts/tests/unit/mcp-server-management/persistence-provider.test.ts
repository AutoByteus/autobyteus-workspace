import { describe, expect, it, vi } from "vitest";
import { McpServerPersistenceProvider } from "../../../src/mcp-server-management/providers/persistence-provider.js";
import { SqlMcpServerConfigProvider } from "../../../src/mcp-server-management/providers/sql-provider.js";
import { StdioMcpServerConfig } from "autobyteus-ts/tools/mcp/types.js";

describe("McpServerPersistenceProvider", () => {
  it("uses SqlMcpServerConfigProvider for the sqlite profile", async () => {
    process.env.PERSISTENCE_PROVIDER = "sqlite";
    const proxy = new McpServerPersistenceProvider();
    const getAllSpy = vi
      .spyOn(SqlMcpServerConfigProvider.prototype, "getAll")
      .mockResolvedValue([]);

    await proxy.getAll();
    expect(getAllSpy).toHaveBeenCalledOnce();
  });

  it("delegates calls to the SQL provider", async () => {
    process.env.PERSISTENCE_PROVIDER = "sqlite";
    const proxy = new McpServerPersistenceProvider();

    const sampleConfig = new StdioMcpServerConfig({
      server_id: "server1",
      command: "ls",
    });

    const createSpy = vi
      .spyOn(SqlMcpServerConfigProvider.prototype, "create")
      .mockResolvedValue(sampleConfig);
    const updateSpy = vi
      .spyOn(SqlMcpServerConfigProvider.prototype, "update")
      .mockResolvedValue(sampleConfig);
    const getSpy = vi
      .spyOn(SqlMcpServerConfigProvider.prototype, "getByServerId")
      .mockResolvedValue(sampleConfig);
    const deleteSpy = vi
      .spyOn(SqlMcpServerConfigProvider.prototype, "deleteByServerId")
      .mockResolvedValue(true);
    const getAllSpy = vi
      .spyOn(SqlMcpServerConfigProvider.prototype, "getAll")
      .mockResolvedValue([sampleConfig]);

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
