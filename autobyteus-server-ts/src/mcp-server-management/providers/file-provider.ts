import type { BaseMcpConfig } from "autobyteus-ts/tools/mcp/types.js";
import {
  readJsonArrayFile,
  resolvePersistencePath,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";

type McpServerConfigRecord = BaseMcpConfig & {
  updatedAt: string;
};

const configFilePath = resolvePersistencePath("mcp-server-management", "mcp-server-configs.json");

const cloneConfig = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export class FileMcpServerConfigProvider {
  async getByServerId(serverId: string): Promise<BaseMcpConfig | null> {
    const rows = await readJsonArrayFile<McpServerConfigRecord>(configFilePath);
    const found = rows.find((row) => row.server_id === serverId);
    return found ? cloneConfig(found) : null;
  }

  async getAll(): Promise<BaseMcpConfig[]> {
    const rows = await readJsonArrayFile<McpServerConfigRecord>(configFilePath);
    return rows.map((row) => cloneConfig(row));
  }

  async deleteByServerId(serverId: string): Promise<boolean> {
    let deleted = false;
    await updateJsonArrayFile<McpServerConfigRecord>(configFilePath, (rows) => {
      const next = rows.filter((row) => row.server_id !== serverId);
      deleted = next.length !== rows.length;
      return next;
    });
    return deleted;
  }

  async create(domainObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    const now = new Date().toISOString();
    const normalized = { ...cloneConfig(domainObj), updatedAt: now } as McpServerConfigRecord;

    await updateJsonArrayFile<McpServerConfigRecord>(configFilePath, (rows) => {
      if (rows.some((row) => row.server_id === normalized.server_id)) {
        throw new Error(`MCP Server with server_id ${normalized.server_id} already exists.`);
      }
      return [...rows, normalized];
    });

    return cloneConfig(normalized);
  }

  async update(domainObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    const now = new Date().toISOString();
    let updated: McpServerConfigRecord | null = null;

    await updateJsonArrayFile<McpServerConfigRecord>(configFilePath, (rows) => {
      const index = rows.findIndex((row) => row.server_id === domainObj.server_id);
      if (index < 0) {
        throw new Error(`MCP Server with server_id ${domainObj.server_id} not found for update.`);
      }
      const updatedRecord: McpServerConfigRecord = {
        ...cloneConfig(domainObj),
        updatedAt: now,
      } as McpServerConfigRecord;
      const next = [...rows];
      updated = updatedRecord;
      next[index] = updatedRecord;
      return next;
    });

    if (!updated) {
      throw new Error(`Failed to update MCP Server with server_id ${domainObj.server_id}.`);
    }
    return cloneConfig(updated);
  }
}
