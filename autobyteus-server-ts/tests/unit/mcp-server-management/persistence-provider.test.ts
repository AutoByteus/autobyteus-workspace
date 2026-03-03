import { describe, expect, it, vi } from "vitest";
import { McpServerPersistenceProvider } from "../../../src/mcp-server-management/providers/persistence-provider.js";
import { FileMcpServerConfigProvider } from "../../../src/mcp-server-management/providers/file-provider.js";
import { StdioMcpServerConfig } from "autobyteus-ts/tools/mcp/types.js";

describe("McpServerPersistenceProvider", () => {
  it("uses FileMcpServerConfigProvider", async () => {
    const proxy = new McpServerPersistenceProvider();
    const getAllSpy = vi
      .spyOn(FileMcpServerConfigProvider.prototype, "getAll")
      .mockResolvedValue([]);

    await proxy.getAll();
    expect(getAllSpy).toHaveBeenCalledOnce();
  });

  it("delegates calls to the file provider", async () => {
    const proxy = new McpServerPersistenceProvider();

    const sampleConfig = new StdioMcpServerConfig({
      server_id: "server1",
      command: "ls",
    });

    const createSpy = vi
      .spyOn(FileMcpServerConfigProvider.prototype, "create")
      .mockResolvedValue(sampleConfig);
    const updateSpy = vi
      .spyOn(FileMcpServerConfigProvider.prototype, "update")
      .mockResolvedValue(sampleConfig);
    const getSpy = vi
      .spyOn(FileMcpServerConfigProvider.prototype, "getByServerId")
      .mockResolvedValue(sampleConfig);
    const deleteSpy = vi
      .spyOn(FileMcpServerConfigProvider.prototype, "deleteByServerId")
      .mockResolvedValue(true);
    const getAllSpy = vi
      .spyOn(FileMcpServerConfigProvider.prototype, "getAll")
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
