export enum McpTransportType {
  STDIO = 'stdio',
  STREAMABLE_HTTP = 'streamable_http'
}

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
  env?: Record<string, string>;
  cwd?: string | null;
}

export class StdioMcpServerConfig extends BaseMcpConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
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

    if (data.env !== undefined) {
      if (data.env === null || typeof data.env !== 'object' || Array.isArray(data.env)) {
        throw new Error(
          `StdioMcpServerConfig '${this.server_id}' 'env' must be a Dict[str, str].`
        );
      }
      for (const value of Object.values(data.env)) {
        if (typeof value !== 'string') {
          throw new Error(
            `StdioMcpServerConfig '${this.server_id}' 'env' must be a Dict[str, str].`
          );
        }
      }
      this.env = data.env;
    } else {
      this.env = {};
    }

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
  token?: string | null;
  headers?: Record<string, string>;
}

export class StreamableHttpMcpServerConfig extends BaseMcpConfig {
  url: string;
  token: string | null;
  headers: Record<string, string>;

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

    if (data.token !== undefined && data.token !== null && typeof data.token !== 'string') {
      throw new Error(
        `StreamableHttpMcpServerConfig '${this.server_id}' 'token' must be a string if provided.`
      );
    }
    this.token = data.token?.trim() || null;

    if (data.headers !== undefined) {
      if (data.headers === null || typeof data.headers !== 'object' || Array.isArray(data.headers)) {
        throw new Error(
          `StreamableHttpMcpServerConfig '${this.server_id}' 'headers' must be a Dict[str, str].`
        );
      }
      for (const value of Object.values(data.headers)) {
        if (typeof value !== 'string') {
          throw new Error(
            `StreamableHttpMcpServerConfig '${this.server_id}' 'headers' must be a Dict[str, str].`
          );
        }
      }
      this.headers = data.headers;
    } else {
      this.headers = {};
    }

    if (this.token && Object.keys(this.headers).some((name) => name.toLowerCase() === 'authorization')) {
      throw new Error(
        `Streamable HTTP MCP server '${this.server_id}' sets both 'token' and an 'Authorization' header; use one of them.`
      );
    }
  }

  /** The headers sent on every request: the configured headers, plus the token as a Bearer Authorization header. */
  requestHeaders(): Record<string, string> {
    return this.token ? { ...this.headers, Authorization: `Bearer ${this.token}` } : { ...this.headers };
  }
}
