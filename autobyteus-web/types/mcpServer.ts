import type { McpConfigEntry, McpSecretMatch, McpSecretState } from '~/utils/mcp/mcpConfigRows';

/** A saved MCP server as `mcpServers` returns it: states for its values, never a secret value. */
export interface McpServer {
  __typename: 'StdioMcpServerConfig' | 'StreamableHttpMcpServerConfig';
  serverId: string;
  transportType: 'STDIO' | 'STREAMABLE_HTTP';
  enabled: boolean;
  toolNamePrefix: string;
  // Stdio
  command?: string;
  args?: string[];
  /** Env values with their secret state; a secret's value is never returned. */
  env?: McpConfigEntry[];
  cwd?: string;
  // HTTP
  url?: string;
  /** The token's state (`null` = no token); its value is never returned. */
  tokenState?: McpSecretState | null;
  headers?: McpConfigEntry[];
}

/** One value of one server (`field` is `env:<NAME>`, `header:<Name>` or `token`). */
export interface McpServerField {
  serverId: string;
  field: string;
}

export interface McpSecretMoveCandidate extends McpServerField {
  matchedBy: McpSecretMatch;
}

export interface McpSecretMoveResult {
  backupPath: string | null;
  moved: McpServerField[];
  skipped: McpServerField[];
  serversFailingAfterMove: Array<{ serverId: string; reason: string }>;
}
