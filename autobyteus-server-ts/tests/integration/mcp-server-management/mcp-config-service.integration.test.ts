import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  McpConfigService as CoreMcpConfigService,
  McpToolRegistrar,
} from "autobyteus-ts";
import { McpServerInstanceManager } from "autobyteus-ts/tools/mcp/server-instance-manager.js";
import { McpTransportType } from "autobyteus-ts/tools/mcp/types.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { McpServerPersistenceProvider } from "../../../src/mcp-server-management/providers/persistence-provider.js";
import { McpConfigService } from "../../../src/mcp-server-management/services/mcp-config-service.js";
import type { StdioMcpServerDraft } from "../../../src/mcp-server-management/domain/mcp-server-draft.js";

/** A stdio server draft with plain values only. */
const stdioDraft = (serverId: string, args: string[], toolNamePrefix: string | null, env: Record<string, string> = {}): StdioMcpServerDraft => ({
  serverId,
  enabled: true,
  toolNamePrefix,
  transportType: McpTransportType.STDIO,
  command: "node",
  args,
  cwd: null,
  env: Object.entries(env).map(([name, value]) => ({ name, value: { kind: "plain", value } })),
});

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

  const itSqlite = sqliteEnv ? it : it.skip;
  const itGoogle = googleEnv ? it : it.skip;

  itSqlite("configures and discovers tools for a real sqlite MCP server", async () => {
    const env = sqliteEnv!;

    const service = McpConfigService.getInstance();
    const serverId = "real-sqlite-mcp-server";
    const saved = await service.configureMcpServer(stdioDraft(serverId, [env.scriptPath, env.dbPath], "db"));
    await service.discoverAndRegisterToolsForServer(serverId);

    expect(saved.config.server_id).toBe(serverId);
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
    const saved = await service.configureMcpServer(stdioDraft(serverId, [env.scriptPath], "gslide", {
      GOOGLE_CLIENT_ID: env.clientId,
      GOOGLE_CLIENT_SECRET: env.clientSecret,
      GOOGLE_REFRESH_TOKEN: env.refreshToken,
    }));
    await service.discoverAndRegisterToolsForServer(serverId);

    expect(saved.config.server_id).toBe(serverId);
    const discovered = defaultToolRegistry.getToolsByMcpServer(serverId);
    expect(discovered.length).toBeGreaterThan(0);
    expect(discovered.every((tool) => tool.name.startsWith("gslide_"))).toBe(true);

    const provider = new McpServerPersistenceProvider();
    const retrieved = await provider.getByServerId(serverId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.server_id).toBe(serverId);
  });

  itSqlite("browsers tools without persisting config", async () => {
    const env = sqliteEnv!;

    const service = McpConfigService.getInstance();
    const serverId = "browser-sqlite-mcp-server";
    const browserTools = await service.previewMcpServerTools(stdioDraft(serverId, [env.scriptPath, env.dbPath], "browser"));
    expect(browserTools.length).toBeGreaterThan(0);
    expect(browserTools.every((tool) => tool.name.startsWith("browser_"))).toBe(true);

    const provider = new McpServerPersistenceProvider();
    const retrieved = await provider.getByServerId(serverId);
    expect(retrieved).toBeNull();
  });

  itSqlite("deletes MCP server configurations and unregisters tools", async () => {
    const env = sqliteEnv!;

    const service = McpConfigService.getInstance();
    const serverId = "real-sqlite-mcp-to-delete";
    await service.configureMcpServer(stdioDraft(serverId, [env.scriptPath, env.dbPath], null));
    await service.discoverAndRegisterToolsForServer(serverId);

    expect(defaultToolRegistry.getToolsByMcpServer(serverId).length).toBeGreaterThan(0);

    const success = await service.deleteMcpServer(serverId);
    expect(success).toBe(true);
    expect(defaultToolRegistry.getToolsByMcpServer(serverId)).toHaveLength(0);

    const provider = new McpServerPersistenceProvider();
    const retrieved = await provider.getByServerId(serverId);
    expect(retrieved).toBeNull();
  });
});
