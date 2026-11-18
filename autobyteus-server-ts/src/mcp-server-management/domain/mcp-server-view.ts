import type { BaseMcpConfig, McpSecretField } from "autobyteus-ts/tools/mcp/types.js";
import type { McpSecretMatch } from "../services/mcp-secret-suggestion-rule.js";

/**
 * The secret state of one value:
 * - `PLAIN`: stored as plain text;
 * - `CONFIGURED`: a secret reference whose vault entry is present;
 * - `MISSING`: a secret reference with no entry (or an ID the vault does not accept);
 * - `VAULT_UNAVAILABLE`: a secret reference while the vault is not READY.
 */
export type McpSecretState = "PLAIN" | "CONFIGURED" | "MISSING" | "VAULT_UNAVAILABLE";

/** A saved server with the state of each of its values. Holds references, never a resolved value. */
export type McpServerView = Readonly<{
  config: BaseMcpConfig;
  states: ReadonlyMap<McpSecretField, McpSecretState>;
}>;

/** One value of one server. */
export type McpServerField = Readonly<{ serverId: string; field: McpSecretField }>;

/** A plain value offered for the move to the vault, and why (no value, nor part of one). */
export type McpSecretMoveCandidate = McpServerField & Readonly<{ matchedBy: McpSecretMatch }>;

export type McpSecretMoveResult = Readonly<{
  backupPath: string | null;
  moved: McpServerField[];
  skipped: McpServerField[];
  serversFailingAfterMove: Array<Readonly<{ serverId: string; reason: string }>>;
}>;
