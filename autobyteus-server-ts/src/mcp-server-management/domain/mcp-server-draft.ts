import type { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { McpTransportType } from "autobyteus-ts/tools/mcp/types.js";

/**
 * One value of a server as the user sent it:
 * - `plain`: stored as plain text (a setting);
 * - `newSecret`: a new value to store as an MCP secret;
 * - `keep`: keep what is stored for this field (valid only when the saved server has it).
 */
export type DraftValue =
  | Readonly<{ kind: "plain"; value: string }>
  | Readonly<{ kind: "newSecret"; value: SecretValue }>
  | Readonly<{ kind: "keep" }>;

/** One env or header row: its name (case kept) and its value. */
export type DraftEntry = Readonly<{ name: string; value: DraftValue }>;

type DraftCommon = Readonly<{
  serverId: string;
  enabled: boolean;
  toolNamePrefix: string | null;
}>;

export type StdioMcpServerDraft = DraftCommon & Readonly<{
  transportType: McpTransportType.STDIO;
  command: string;
  args: string[];
  cwd: string | null;
  env: DraftEntry[];
}>;

export type StreamableHttpMcpServerDraft = DraftCommon & Readonly<{
  transportType: McpTransportType.STREAMABLE_HTTP;
  url: string;
  headers: DraftEntry[];
  /** `null` means the server has no token. */
  token: DraftValue | null;
}>;

/**
 * A server's settings as the user sent them (server draft). Configure, preview and import all build one; only
 * `McpServerSecretFields` turns it into a core config.
 */
export type McpServerDraft = StdioMcpServerDraft | StreamableHttpMcpServerDraft;
