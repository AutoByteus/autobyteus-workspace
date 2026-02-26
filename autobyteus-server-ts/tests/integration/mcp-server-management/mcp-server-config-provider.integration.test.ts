import { describe, expect, it } from "vitest";
import {
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
} from "autobyteus-ts/tools/mcp/types.js";
import { SqlMcpServerConfigProvider } from "../../../src/mcp-server-management/providers/sql-provider.js";

const uniqueId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe("SqlMcpServerConfigProvider", () => {
  it("creates and retrieves stdio configurations", async () => {
    const provider = new SqlMcpServerConfigProvider();
    const config = new StdioMcpServerConfig({
      server_id: uniqueId("provider_stdio"),
      command: "ls",
      args: ["-l"],
    });

    const created = await provider.create(config);
    expect(created.server_id).toBe(config.server_id);
    expect(created).toBeInstanceOf(StdioMcpServerConfig);
    expect((created as StdioMcpServerConfig).command).toBe("ls");

    const retrieved = await provider.getByServerId(config.server_id);
    expect(retrieved).not.toBeNull();
    expect(retrieved).toBeInstanceOf(StdioMcpServerConfig);
    expect((retrieved as StdioMcpServerConfig).command).toBe("ls");
  });

  it("creates and retrieves http configurations", async () => {
    const provider = new SqlMcpServerConfigProvider();
    const config = new StreamableHttpMcpServerConfig({
      server_id: uniqueId("provider_http"),
      url: "http://test.com/stream",
    });

    const created = await provider.create(config);
    expect(created.server_id).toBe(config.server_id);
    expect(created).toBeInstanceOf(StreamableHttpMcpServerConfig);
    expect((created as StreamableHttpMcpServerConfig).url).toBe("http://test.com/stream");

    const retrieved = await provider.getByServerId(config.server_id);
    expect(retrieved).toBeInstanceOf(StreamableHttpMcpServerConfig);
    expect((retrieved as StreamableHttpMcpServerConfig).url).toBe("http://test.com/stream");
  });

  it("updates stdio configurations", async () => {
    const provider = new SqlMcpServerConfigProvider();
    const config = new StdioMcpServerConfig({
      server_id: uniqueId("provider_update_stdio"),
      command: "initial",
      enabled: true,
    });

    const created = await provider.create(config);
    created.enabled = false;
    created.command = "updated";

    const updated = await provider.update(created);
    expect(updated.enabled).toBe(false);
    expect((updated as StdioMcpServerConfig).command).toBe("updated");

    const allConfigs = await provider.getAll();
    expect(allConfigs.filter((c) => c.server_id === created.server_id)).toHaveLength(1);
  });

  it("deletes configurations", async () => {
    const provider = new SqlMcpServerConfigProvider();
    const config = new StdioMcpServerConfig({
      server_id: uniqueId("provider_delete"),
      command: "doomed",
    });

    const created = await provider.create(config);
    expect(await provider.getByServerId(created.server_id)).not.toBeNull();

    const success = await provider.deleteByServerId(created.server_id);
    expect(success).toBe(true);

    const retrieved = await provider.getByServerId(created.server_id);
    expect(retrieved).toBeNull();
  });
});
