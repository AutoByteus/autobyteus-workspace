import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { McpTransportType, type McpSecretField } from "autobyteus-ts/tools/mcp/types.js";
import type { DraftEntry, DraftValue, McpServerDraft } from "../../../mcp-server-management/domain/mcp-server-draft.js";
import type { McpServerField } from "../../../mcp-server-management/domain/mcp-server-view.js";
import { McpSecretSuggestionRule } from "../../../mcp-server-management/services/mcp-secret-suggestion-rule.js";
import {
  McpTransportTypeEnum,
  type McpConfigEntryInput,
  type McpServerFieldInput,
  type McpServerInput,
  type McpTokenInput,
} from "../types/mcp-server-config.js";

const hasValue = (value: string | null | undefined): value is string => typeof value === "string" && value.length > 0;

/**
 * One row: `secret` (forced for always-secret fields) with a value is a new secret, without one it keeps what is
 * stored; otherwise it is a plain value, which needs a value.
 */
const entryValue = (serverId: string, field: McpSecretField, entry: McpConfigEntryInput): DraftValue => {
  if (entry.secret || McpSecretSuggestionRule.isAlwaysSecret(field)) {
    return hasValue(entry.value) ? { kind: "newSecret", value: SecretValue.fromString(entry.value) } : { kind: "keep" };
  }
  if (typeof entry.value !== "string") throw new Error(`MCP server '${serverId}' ${field} needs a value.`);
  return { kind: "plain", value: entry.value };
};

const entries = (
  serverId: string,
  inputs: readonly McpConfigEntryInput[] | null | undefined,
  kind: "env" | "header",
): DraftEntry[] =>
  (inputs ?? []).map((entry) => ({ name: entry.name, value: entryValue(serverId, `${kind}:${entry.name}`, entry) }));

const tokenValue = (serverId: string, token: McpTokenInput | null | undefined): DraftValue | null => {
  if (!token) return null;
  const replace = hasValue(token.value);
  const keep = token.keep === true;
  if (replace === keep) throw new Error(`MCP server '${serverId}' token: give either a value or keep, not both or neither.`);
  return replace ? { kind: "newSecret", value: SecretValue.fromString(token.value as string) } : { kind: "keep" };
};

const parseField = (field: string): McpSecretField => {
  if (field === "token" || /^(env|header):.+$/.test(field)) return field as McpSecretField;
  throw new Error(`'${field}' is not an MCP server field (env:<NAME>, header:<Name> or token).`);
};

/** GraphQL MCP inputs → the MCP domain (shape only; no vault, no file). */
export class McpServerInputMapper {
  static toDraft(input: McpServerInput): McpServerDraft {
    const common = {
      serverId: input.serverId,
      enabled: input.enabled ?? true,
      toolNamePrefix: input.toolNamePrefix ?? null,
    };

    if (input.transportType === McpTransportTypeEnum.STDIO) {
      if (!input.stdioConfig) {
        throw new Error("stdioConfig must be provided for STDIO transport type.");
      }
      return {
        ...common,
        transportType: McpTransportType.STDIO,
        command: input.stdioConfig.command,
        args: input.stdioConfig.args ?? [],
        cwd: input.stdioConfig.cwd ?? null,
        env: entries(input.serverId, input.stdioConfig.env, "env"),
      };
    }

    if (input.transportType === McpTransportTypeEnum.STREAMABLE_HTTP) {
      if (!input.streamableHttpConfig) {
        throw new Error("streamableHttpConfig must be provided for STREAMABLE_HTTP transport type.");
      }
      return {
        ...common,
        transportType: McpTransportType.STREAMABLE_HTTP,
        url: input.streamableHttpConfig.url,
        headers: entries(input.serverId, input.streamableHttpConfig.headers, "header"),
        token: tokenValue(input.serverId, input.streamableHttpConfig.token),
      };
    }

    throw new Error(`Unsupported transport type: ${String(input.transportType)}`);
  }

  static toFields(selection: readonly McpServerFieldInput[]): McpServerField[] {
    return selection.map((item) => ({ serverId: item.serverId, field: parseField(item.field) }));
  }
}
