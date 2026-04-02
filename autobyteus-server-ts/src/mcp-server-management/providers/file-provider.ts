import path from "node:path";
import { McpConfigService as CoreMcpConfigService } from "autobyteus-ts";
import type { BaseMcpConfig } from "autobyteus-ts/tools/mcp/types.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  readJsonFile,
  updateJsonFile,
} from "../../persistence/file/store-utils.js";

type McpConfigEntry = Record<string, unknown>;
type McpConfigFile = {
  mcpServers: Record<string, McpConfigEntry>;
};

const EMPTY_FILE: McpConfigFile = { mcpServers: {} };

const resolveFilePath = (): string =>
  path.join(appConfigProvider.config.getAppDataDir(), "mcps.json");

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const asRecordStringString = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const entries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
    key,
    typeof entry === "string" ? entry : String(entry),
  ]);
  return Object.fromEntries(entries);
};

const toStandardEntry = (config: BaseMcpConfig): McpConfigEntry => {
  const source = config as unknown as Record<string, unknown>;
  const enabled = typeof source.enabled === "boolean" ? source.enabled : true;
  const toolNamePrefix = typeof source.tool_name_prefix === "string" ? source.tool_name_prefix : null;

  if (config.transport_type === "streamable_http") {
    const headers = asRecordStringString(source.headers);
    return {
      url: asString(source.url),
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      ...(enabled === false ? { enabled: false } : {}),
      ...(toolNamePrefix ? { tool_name_prefix: toolNamePrefix } : {}),
    };
  }

  const args = asStringArray(source.args);
  const env = asRecordStringString(source.env);
  const cwd = typeof source.cwd === "string" ? source.cwd : null;

  return {
    command: asString(source.command),
    ...(args.length > 0 ? { args } : {}),
    ...(Object.keys(env).length > 0 ? { env } : {}),
    ...(cwd ? { cwd } : {}),
    ...(enabled === false ? { enabled: false } : {}),
    ...(toolNamePrefix ? { tool_name_prefix: toolNamePrefix } : {}),
  };
};

const normalizeFile = async (): Promise<McpConfigFile> => {
  const raw = await readJsonFile<McpConfigFile>(resolveFilePath(), EMPTY_FILE);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { mcpServers: {} };
  }
  const servers = raw.mcpServers;
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    return { mcpServers: {} };
  }
  return { mcpServers: servers };
};

const parseEntry = (serverId: string, entry: McpConfigEntry): BaseMcpConfig => {
  const hasUrl = typeof entry.url === "string" && entry.url.trim().length > 0;
  const transportType = typeof entry.transport_type === "string"
    ? entry.transport_type
    : hasUrl
      ? "streamable_http"
      : "stdio";

  const fullConfig = {
    server_id: serverId,
    transport_type: transportType,
    enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
    ...entry,
  };

  return CoreMcpConfigService.parseMcpConfigDict({
    [serverId]: fullConfig as Record<string, unknown>,
  });
};

export class FileMcpServerConfigProvider {
  async getByServerId(serverId: string): Promise<BaseMcpConfig | null> {
    const all = await this.getAll();
    return all.find((entry) => entry.server_id === serverId) ?? null;
  }

  async getAll(): Promise<BaseMcpConfig[]> {
    const raw = await normalizeFile();
    const configs: BaseMcpConfig[] = [];
    for (const [serverId, entry] of Object.entries(raw.mcpServers)) {
      try {
        configs.push(parseEntry(serverId, entry));
      } catch {
        // ignore invalid entries to keep load resilient
      }
    }
    return configs;
  }

  async deleteByServerId(serverId: string): Promise<boolean> {
    let deleted = false;
    await updateJsonFile<McpConfigFile>(resolveFilePath(), EMPTY_FILE, (existing) => {
      const next: McpConfigFile = {
        mcpServers: { ...(existing.mcpServers ?? {}) },
      };
      if (Object.prototype.hasOwnProperty.call(next.mcpServers, serverId)) {
        deleted = true;
        delete next.mcpServers[serverId];
      }
      return next;
    });
    return deleted;
  }

  async create(domainObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    const entry = toStandardEntry(domainObj);
    await updateJsonFile<McpConfigFile>(resolveFilePath(), EMPTY_FILE, (existing) => {
      const next: McpConfigFile = {
        mcpServers: { ...(existing.mcpServers ?? {}) },
      };
      if (Object.prototype.hasOwnProperty.call(next.mcpServers, domainObj.server_id)) {
        throw new Error(`MCP server '${domainObj.server_id}' already exists.`);
      }
      next.mcpServers[domainObj.server_id] = entry;
      return next;
    });
    return parseEntry(domainObj.server_id, entry);
  }

  async update(domainObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    const entry = toStandardEntry(domainObj);
    await updateJsonFile<McpConfigFile>(resolveFilePath(), EMPTY_FILE, (existing) => {
      const next: McpConfigFile = {
        mcpServers: { ...(existing.mcpServers ?? {}) },
      };
      if (!Object.prototype.hasOwnProperty.call(next.mcpServers, domainObj.server_id)) {
        throw new Error(`MCP server '${domainObj.server_id}' does not exist.`);
      }
      next.mcpServers[domainObj.server_id] = entry;
      return next;
    });
    return parseEntry(domainObj.server_id, entry);
  }
}
