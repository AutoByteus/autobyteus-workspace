import fs from "node:fs/promises";
import path from "node:path";
import { McpConfigService as CoreMcpConfigService } from "autobyteus-ts";
import {
  isMcpSecretReference,
  type BaseMcpConfig,
  type McpConfigValue,
  type McpSecretField,
  type McpSecretReference,
} from "autobyteus-ts/tools/mcp/types.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  readJsonFile,
  updateJsonFile,
} from "../../persistence/file/store-utils.js";
import { fieldLocation } from "../domain/mcp-config-fields.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

/** One plain value of a saved server to replace with a secret reference (the move to the vault). */
export type McpReferenceChange = Readonly<{
  serverId: string;
  field: McpSecretField;
  reference: McpSecretReference;
}>;

/** The backup written before the change, and the changed servers as saved. */
export type McpReferenceReplacement = Readonly<{
  backupPath: string;
  configs: BaseMcpConfig[];
}>;

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

/** The env or header values of a config: strings and secret references, as the core config parsed them. */
const asConfigValueRecord = (value: unknown): Record<string, McpConfigValue> =>
  value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, McpConfigValue>) } : {};

const asConfigValue = (value: unknown): McpConfigValue | null =>
  typeof value === "string" || isMcpSecretReference(value) ? value : null;

const toStandardEntry = (config: BaseMcpConfig): McpConfigEntry => {
  const source = config as unknown as Record<string, unknown>;
  const enabled = typeof source.enabled === "boolean" ? source.enabled : true;
  const toolNamePrefix = typeof source.tool_name_prefix === "string" ? source.tool_name_prefix : null;

  if (config.transport_type === "streamable_http") {
    const headers = asConfigValueRecord(source.headers);
    const token = asConfigValue(source.token);
    return {
      url: asString(source.url),
      ...(token ? { token } : {}),
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      ...(enabled === false ? { enabled: false } : {}),
      ...(toolNamePrefix ? { tool_name_prefix: toolNamePrefix } : {}),
    };
  }

  const args = asStringArray(source.args);
  const env = asConfigValueRecord(source.env);
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

/** The core parser decides the transport (stored entries have none: `url` means HTTP, `command` stdio). */
const parseEntry = (serverId: string, entry: McpConfigEntry): BaseMcpConfig => {
  const fullConfig = {
    server_id: serverId,
    enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
    ...entry,
  };

  return CoreMcpConfigService.parseMcpConfigDict({
    [serverId]: fullConfig as Record<string, unknown>,
  });
};

/** The raw value stored for `field` in an `mcps.json` entry (`undefined` when absent). */
const storedValueAt = (entry: McpConfigEntry, field: McpSecretField): unknown => {
  const location = fieldLocation(field);
  if (location.container === "token") return entry.token;
  const values = entry[location.container];
  return values && typeof values === "object" && !Array.isArray(values)
    ? (values as Record<string, unknown>)[location.name]
    : undefined;
};

/** `entry` with `value` stored for `field`. */
const withValueAt = (entry: McpConfigEntry, field: McpSecretField, value: McpConfigValue): McpConfigEntry => {
  const location = fieldLocation(field);
  if (location.container === "token") return { ...entry, token: value };
  const values = entry[location.container];
  const copy = values && typeof values === "object" && !Array.isArray(values) ? { ...(values as Record<string, unknown>) } : {};
  copy[location.name] = value;
  return { ...entry, [location.container]: copy };
};

/**
 * Copies `mcps.json`, as it is on disk, to `mcps.json.backup-before-vault-move-<timestamp>` (mode 0600, never
 * overwriting). Called only by the move, under the file lock, before the file is rewritten. The backup holds the
 * plain values.
 */
const writeBackup = async (filePath: string): Promise<string> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${filePath}.backup-before-vault-move-${timestamp}`;
  const content = await fs.readFile(filePath);
  await fs.writeFile(backupPath, content, { mode: 0o600, flag: "wx" });
  return backupPath;
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
      } catch (error) {
        // An invalid entry is skipped so the others still load. Config errors name fields, never values.
        const reason = error instanceof Error ? error.message : String(error);
        logger.warn(`Skipping MCP server '${serverId}' in mcps.json: ${reason}`);
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

  /** Writes no backup: only the move (`replaceWithReferences`) turns stored plain values into references. */
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

  /**
   * The move to the vault: in one locked write, checks that every changed value is still plain, writes the backup,
   * and rewrites the file with the references. If anything fails, the file is unchanged and no backup is left.
   */
  async replaceWithReferences(changes: readonly McpReferenceChange[]): Promise<McpReferenceReplacement> {
    const filePath = resolveFilePath();
    // Set inside the locked updater; a closure assignment TypeScript does not track on a plain `let`.
    const backup: { path: string | null } = { path: null };
    let written: McpConfigFile;
    try {
      written = await updateJsonFile<McpConfigFile>(filePath, EMPTY_FILE, async (existing) => {
        const next: McpConfigFile = {
          mcpServers: { ...(existing.mcpServers ?? {}) },
        };
        for (const { serverId, field, reference } of changes) {
          const entry = next.mcpServers[serverId];
          if (!entry || typeof storedValueAt(entry, field) !== "string") {
            throw new Error(`MCP server '${serverId}' ${field} is no longer stored as plain text in mcps.json.`);
          }
          next.mcpServers[serverId] = withValueAt(entry, field, reference);
        }
        backup.path = await writeBackup(filePath);
        return next;
      });
    } catch (error) {
      if (backup.path) await fs.rm(backup.path, { force: true });
      throw error;
    }
    const serverIds = [...new Set(changes.map((change) => change.serverId))];
    return {
      backupPath: backup.path as string,
      configs: serverIds.map((serverId) => parseEntry(serverId, written.mcpServers[serverId] as McpConfigEntry)),
    };
  }
}
