import { describe, expect, it } from "vitest";
import { SqlMcpServerConfigurationRepository } from "../../../src/mcp-server-management/repositories/sql/mcp-server-configuration-repository.js";

const uniqueId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe("SqlMcpServerConfigurationRepository", () => {
  it("creates and finds MCP server configurations", async () => {
    const repo = new SqlMcpServerConfigurationRepository();
    const serverId = uniqueId("server_create");

    const created = await repo.createConfig({
      serverId,
      transportType: "stdio",
      configDetails: JSON.stringify({ command: "echo 'hello'" }),
    });

    expect(created.id).toBeDefined();
    expect(created.serverId).toBe(serverId);

    const found = await repo.findByServerId(serverId);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
  });

  it("updates MCP server configurations", async () => {
    const repo = new SqlMcpServerConfigurationRepository();
    const serverId = uniqueId("server_update");

    await repo.createConfig({
      serverId,
      transportType: "stdio",
      enabled: true,
      configDetails: JSON.stringify({ command: "initial" }),
    });

    const updated = await repo.updateConfig(serverId, {
      enabled: false,
      transportType: "streamable_http",
      configDetails: JSON.stringify({ url: "http://new.url" }),
    });

    expect(updated.enabled).toBe(false);
    expect(updated.transportType).toBe("streamable_http");
    expect(JSON.parse(updated.configDetails)).toEqual({ url: "http://new.url" });
  });

  it("stores complex config_details payloads", async () => {
    const repo = new SqlMcpServerConfigurationRepository();
    const serverId = uniqueId("google_slides");
    const configDetails = {
      command: "node",
      args: ["/path/to/script.js"],
      env: {
        GOOGLE_CLIENT_ID: "client_id_123",
        GOOGLE_CLIENT_SECRET: "secret_abc",
        GOOGLE_REFRESH_TOKEN: "refresh_token_xyz",
      },
    };

    await repo.createConfig({
      serverId,
      transportType: "stdio",
      configDetails: JSON.stringify(configDetails),
    });

    const found = await repo.findByServerId(serverId);
    expect(found).not.toBeNull();
    const parsed = JSON.parse(found?.configDetails ?? "{}") as Record<string, any>;
    expect(parsed).toEqual(configDetails);
    expect(parsed.env.GOOGLE_CLIENT_SECRET).toBe("secret_abc");
  });

  it("returns null when server_id is missing", async () => {
    const repo = new SqlMcpServerConfigurationRepository();
    const found = await repo.findByServerId("non_existent");
    expect(found).toBeNull();
  });

  it("returns all MCP server configurations", async () => {
    const repo = new SqlMcpServerConfigurationRepository();
    const serverId1 = uniqueId("server_get_1");
    const serverId2 = uniqueId("server_get_2");

    await repo.createConfig({
      serverId: serverId1,
      transportType: "stdio",
      configDetails: JSON.stringify({ command: "ls" }),
    });
    await repo.createConfig({
      serverId: serverId2,
      transportType: "streamable_http",
      configDetails: JSON.stringify({ url: "http://example.com/stream" }),
    });

    const allConfigs = await repo.findAll();
    const ids = new Set(allConfigs.map((config) => config.serverId));
    expect(ids.has(serverId1)).toBe(true);
    expect(ids.has(serverId2)).toBe(true);
  });

  it("deletes MCP server configurations by server_id", async () => {
    const repo = new SqlMcpServerConfigurationRepository();
    const serverId = uniqueId("server_delete");

    await repo.createConfig({
      serverId,
      transportType: "stdio",
      configDetails: JSON.stringify({ command: "ls" }),
    });

    const deleted = await repo.deleteByServerId(serverId);
    expect(deleted).toBe(true);

    const found = await repo.findByServerId(serverId);
    expect(found).toBeNull();
  });
});
