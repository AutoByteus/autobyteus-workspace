import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  McpConfigService as CoreMcpConfigService,
  McpToolRegistrar,
} from "autobyteus-ts";
import { McpServerInstanceManager } from "autobyteus-ts/tools/mcp/server-instance-manager.js";
import { StdioMcpServerConfig } from "autobyteus-ts/tools/mcp/types.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { McpServerPersistenceProvider } from "../../../src/mcp-server-management/providers/persistence-provider.js";
import { McpConfigService } from "../../../src/mcp-server-management/services/mcp-config-service.js";

const getSqliteEnv = () => {
  const scriptPath = process.env.TEST_SQLITE_MCP_SCRIPT_PATH;
  const dbPath = process.env.TEST_SQLITE_DB_PATH;
  if (!scriptPath || !dbPath) {
    return null;
  }
  if (!fs.existsSync(scriptPath) || !fs.existsSync(dbPath)) {
    return null;
  }
  return { scriptPath, dbPath };
};

const getGoogleSlidesEnv = () => {
  const scriptPath = process.env.TEST_GOOGLE_SLIDES_MCP_SCRIPT_PATH;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!scriptPath || !clientId || !clientSecret || !refreshToken) {
    return null;
  }
  if (!fs.existsSync(scriptPath)) {
    return null;
  }
  return { scriptPath, clientId, clientSecret, refreshToken };
};

const getConfigJsonEnv = (): string | null => {
  const raw = process.env.TEST_MCP_CONFIG_JSON;
  if (!raw) {
    return null;
  }
  return raw;
};

const resetSingletons = () => {
  McpConfigService.resetInstance();
  (CoreMcpConfigService as any).instance = undefined;
  (McpToolRegistrar as any).instance = undefined;
  (McpServerInstanceManager as any).instance = undefined;
};

describe("McpConfigService integration", () => {
  beforeEach(() => {
    resetSingletons();
    defaultToolRegistry.clear();
  });

  afterEach(async () => {
    const registrar = McpToolRegistrar.getInstance();
    const instanceManager = McpServerInstanceManager.getInstance();
    await instanceManager.cleanupAllMcpServerInstances();

    for (const tool of defaultToolRegistry.listTools()) {
      if (tool.metadata?.mcp_server_id) {
        registrar.unregisterToolsFromServer(String(tool.metadata.mcp_server_id));
      }
    }
    defaultToolRegistry.clear();

    const coreService = CoreMcpConfigService.getInstance();
    coreService.clearConfigs();
  });

  const sqliteEnv = getSqliteEnv();
  const googleEnv = getGoogleSlidesEnv();
  const configJsonEnv = getConfigJsonEnv();

  const itSqlite = sqliteEnv ? it : it.skip;
  const itGoogle = googleEnv ? it : it.skip;
  const itConfigJson = configJsonEnv ? it : it.skip;

  itSqlite("configures and discovers tools for a real sqlite MCP server", async () => {
    const env = sqliteEnv!;

    const service = McpConfigService.getInstance();
    const serverId = "real-sqlite-mcp-server";
    const config = new StdioMcpServerConfig({
      server_id: serverId,
      command: "node",
      args: [env.scriptPath, env.dbPath],
      enabled: true,
      tool_name_prefix: "db",
    });

    const savedConfig = await service.configureMcpServer(config);
    await service.discoverAndRegisterToolsForServer(serverId);

    expect(savedConfig.server_id).toBe(serverId);
    const discovered = defaultToolRegistry.getToolsByMcpServer(serverId);
    expect(discovered.length).toBeGreaterThan(0);
    expect(discovered.every((tool) => tool.name.startsWith("db_"))).toBe(true);

    const provider = new McpServerPersistenceProvider();
    const retrieved = await provider.getByServerId(serverId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.server_id).toBe(serverId);
  });

  itGoogle("configures and discovers tools for a real Google Slides MCP server", async () => {
    const env = googleEnv!;

    const service = McpConfigService.getInstance();
    const serverId = "google-slides-mcp";
    const config = new StdioMcpServerConfig({
      server_id: serverId,
      command: "node",
      args: [env.scriptPath],
      env: {
        GOOGLE_CLIENT_ID: env.clientId,
        GOOGLE_CLIENT_SECRET: env.clientSecret,
        GOOGLE_REFRESH_TOKEN: env.refreshToken,
      },
      enabled: true,
      tool_name_prefix: "gslide",
    });

    const savedConfig = await service.configureMcpServer(config);
    await service.discoverAndRegisterToolsForServer(serverId);

    expect(savedConfig.server_id).toBe(serverId);
    const discovered = defaultToolRegistry.getToolsByMcpServer(serverId);
    expect(discovered.length).toBeGreaterThan(0);
    expect(discovered.every((tool) => tool.name.startsWith("gslide_"))).toBe(true);

    const provider = new McpServerPersistenceProvider();
    const retrieved = await provider.getByServerId(serverId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.server_id).toBe(serverId);
  });

  itSqlite("previews tools without persisting config", async () => {
    const env = sqliteEnv!;

    const service = McpConfigService.getInstance();
    const serverId = "preview-sqlite-mcp-server";
    const config = new StdioMcpServerConfig({
      server_id: serverId,
      command: "node",
      args: [env.scriptPath, env.dbPath],
      enabled: true,
      tool_name_prefix: "preview",
    });

    const previewTools = await service.previewMcpServerTools(config);
    expect(previewTools.length).toBeGreaterThan(0);
    expect(previewTools.every((tool) => tool.name.startsWith("preview_"))).toBe(true);

    const provider = new McpServerPersistenceProvider();
    const retrieved = await provider.getByServerId(serverId);
    expect(retrieved).toBeNull();
  });

  itSqlite("deletes MCP server configurations and unregisters tools", async () => {
    const env = sqliteEnv!;

    const service = McpConfigService.getInstance();
    const serverId = "real-sqlite-mcp-to-delete";
    const config = new StdioMcpServerConfig({
      server_id: serverId,
      command: "node",
      args: [env.scriptPath, env.dbPath],
      enabled: true,
    });

    await service.configureMcpServer(config);
    await service.discoverAndRegisterToolsForServer(serverId);

    expect(defaultToolRegistry.getToolsByMcpServer(serverId).length).toBeGreaterThan(0);

    const success = await service.deleteMcpServer(serverId);
    expect(success).toBe(true);
    expect(defaultToolRegistry.getToolsByMcpServer(serverId)).toHaveLength(0);

    const provider = new McpServerPersistenceProvider();
    const retrieved = await provider.getByServerId(serverId);
    expect(retrieved).toBeNull();
  });

  itConfigJson(
    "applies MCP config JSON from env and persists configs",
    async () => {
    const configJson = configJsonEnv!;
    const service = McpConfigService.getInstance();
    const result = await service.applyAndRegisterConfigsFromJson(configJson);

    const parsed = JSON.parse(configJson) as { mcpServers?: Record<string, unknown> };
    const serverIds = Object.keys(parsed.mcpServers ?? {});

    expect(result.summary.total_processed).toBe(serverIds.length);

    const provider = new McpServerPersistenceProvider();
    for (const serverId of serverIds) {
      const persisted = await provider.getByServerId(serverId);
      expect(persisted).not.toBeNull();
    }
    },
    30000,
  );
});
