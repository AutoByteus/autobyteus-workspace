import type { SecretId } from '../../secrets/vault/secret-id.js';

export enum McpTransportType {
  STDIO = 'stdio',
  STREAMABLE_HTTP = 'streamable_http'
}

/** The stored pointer written in place of a secret value: the vault secret ID of its entry. */
export type McpSecretReference = Readonly<{ vaultSecretId: SecretId }>;

/** An env value, header value or token: a plain string, or a secret reference resolved at connect. */
export type McpConfigValue = string | McpSecretReference;

/** Which value of a server is meant: `env:<NAME>`, `header:<Name>` or `token` (names keep their case). */
export type McpSecretField = `env:${string}` | `header:${string}` | 'token';

/**
 * The shape of a secret reference: exactly `{ vaultSecretId: <non-empty string> }`. The vault owns the ID's format;
 * an ID it does not know resolves as missing.
 */
export const isMcpSecretReference = (value: unknown): value is McpSecretReference => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.keys(value).length !== 1) return false;
  const id = (value as { vaultSecretId?: unknown }).vaultSecretId;
  return typeof id === 'string' && id.trim().length > 0;
};

/** A string or a secret reference; anything else is `null`. */
const parseMcpConfigValue = (value: unknown): McpConfigValue | null => {
  if (typeof value === 'string') return value;
  return isMcpSecretReference(value) ? { vaultSecretId: value.vaultSecretId } : null;
};

const parseMcpConfigValueRecord = (
  value: unknown,
  describe: () => string,
): Record<string, McpConfigValue> => {
  const invalid = () => new Error(`${describe()} must map names to strings or secret references.`);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const parsed: Record<string, McpConfigValue> = {};
  for (const [name, entry] of Object.entries(value)) {
    const parsedEntry = parseMcpConfigValue(entry);
    if (parsedEntry === null) throw invalid();
    parsed[name] = parsedEntry;
  }
  return parsed;
};

export class McpServerInstanceKey {
  readonly agentId: string;
  readonly serverId: string;

  constructor(agentId: string, serverId: string) {
    this.agentId = agentId;
    this.serverId = serverId;
  }

  toKey(): string {
    return `${this.agentId}:${this.serverId}`;
  }

  toString(): string {
    return this.toKey();
  }
}

export interface BaseMcpConfigData {
  server_id: string;
  enabled?: boolean;
  tool_name_prefix?: string | null;
}

export class BaseMcpConfig {
  server_id: string;
  transport_type?: McpTransportType;
  enabled: boolean;
  tool_name_prefix: string | null;

  constructor(data: BaseMcpConfigData) {
    this.server_id = data.server_id;
    this.enabled = data.enabled ?? true;
    this.tool_name_prefix = data.tool_name_prefix ?? null;

    this.validateBase();
  }

  protected validateBase(): void {
    if (!this.server_id || typeof this.server_id !== 'string') {
      throw new Error(`${this.constructor.name} 'server_id' must be a non-empty string.`);
    }
    if (typeof this.enabled !== 'boolean') {
      throw new Error(
        `${this.constructor.name} 'enabled' for server '${this.server_id}' must be a boolean.`
      );
    }
    if (this.tool_name_prefix !== null && typeof this.tool_name_prefix !== 'string') {
      throw new Error(
        `${this.constructor.name} 'tool_name_prefix' for server '${this.server_id}' must be a string if provided.`
      );
    }
  }
}

export interface StdioMcpServerConfigData extends BaseMcpConfigData {
  command?: string | null;
  args?: string[];
  env?: Record<string, McpConfigValue>;
  cwd?: string | null;
}

export class StdioMcpServerConfig extends BaseMcpConfig {
  command: string;
  args: string[];
  env: Record<string, McpConfigValue>;
  cwd: string | null;

  constructor(data: StdioMcpServerConfigData) {
    super(data);
    this.transport_type = McpTransportType.STDIO;

    const command = data.command;
    if (command === undefined || command === null || typeof command !== 'string' || !command.trim()) {
      throw new Error(
        `StdioMcpServerConfig '${this.server_id}' 'command' must be a non-empty string.`
      );
    }
    this.command = command;

    if (data.args !== undefined) {
      if (!Array.isArray(data.args) || data.args.some((arg) => typeof arg !== 'string')) {
        throw new Error(
          `StdioMcpServerConfig '${this.server_id}' 'args' must be a list of strings.`
        );
      }
      this.args = data.args;
    } else {
      this.args = [];
    }

    this.env = data.env === undefined
      ? {}
      : parseMcpConfigValueRecord(data.env, () => `StdioMcpServerConfig '${this.server_id}' 'env'`);

    let cwd = data.cwd ?? null;
    if (cwd === '') {
      cwd = null;
    }
    if (cwd !== null && typeof cwd !== 'string') {
      throw new Error(
        `StdioMcpServerConfig '${this.server_id}' 'cwd' must be a string if provided.`
      );
    }
    this.cwd = cwd;
  }
}

export interface StreamableHttpMcpServerConfigData extends BaseMcpConfigData {
  url?: string | null;
  token?: McpConfigValue | null;
  headers?: Record<string, McpConfigValue>;
}

/** The HTTP values after secret references were resolved at connect. */
export type ResolvedHttpMcpValues = Readonly<{ headers: Record<string, string>; token: string | null }>;

export class StreamableHttpMcpServerConfig extends BaseMcpConfig {
  url: string;
  token: McpConfigValue | null;
  headers: Record<string, McpConfigValue>;

  constructor(data: StreamableHttpMcpServerConfigData) {
    super(data);
    this.transport_type = McpTransportType.STREAMABLE_HTTP;

    const url = data.url;
    if (url === undefined || url === null || typeof url !== 'string' || !url.trim()) {
      throw new Error(
        `StreamableHttpMcpServerConfig '${this.server_id}' 'url' must be a non-empty string.`
      );
    }
    this.url = url;

    if (data.token === undefined || data.token === null) {
      this.token = null;
    } else {
      const token = parseMcpConfigValue(data.token);
      if (token === null) {
        throw new Error(
          `StreamableHttpMcpServerConfig '${this.server_id}' 'token' must be a string or a secret reference if provided.`
        );
      }
      this.token = typeof token === 'string' ? token.trim() || null : token;
    }

    this.headers = data.headers === undefined
      ? {}
      : parseMcpConfigValueRecord(data.headers, () => `StreamableHttpMcpServerConfig '${this.server_id}' 'headers'`);

    if (this.token && Object.keys(this.headers).some((name) => name.toLowerCase() === 'authorization')) {
      throw new Error(
        `Streamable HTTP MCP server '${this.server_id}' sets both 'token' and an 'Authorization' header; use one of them.`
      );
    }
  }

  /**
   * The headers sent on every request, from the resolved values: the configured headers, plus the token as a
   * Bearer Authorization header.
   */
  requestHeaders(resolved: ResolvedHttpMcpValues): Record<string, string> {
    return resolved.token ? { ...resolved.headers, Authorization: `Bearer ${resolved.token}` } : { ...resolved.headers };
  }
}
