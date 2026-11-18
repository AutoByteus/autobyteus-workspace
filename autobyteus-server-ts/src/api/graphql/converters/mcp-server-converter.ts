import {
  McpTransportType,
  type McpConfigValue,
  type McpSecretField,
  type StdioMcpServerConfig,
  type StreamableHttpMcpServerConfig,
} from "autobyteus-ts/tools/mcp/types.js";
import type { McpSecretState, McpServerView } from "../../../mcp-server-management/domain/mcp-server-view.js";
import { McpSecretSuggestionRule } from "../../../mcp-server-management/services/mcp-secret-suggestion-rule.js";
import {
  McpSecretStateEnum,
  McpTransportTypeEnum,
  type McpConfigEntry,
  type StdioMcpServerConfig as StdioMcpServerConfigGraphql,
  type StreamableHttpMcpServerConfig as StreamableHttpMcpServerConfigGraphql,
} from "../types/mcp-server-config.js";

/** A reference without a computed state is reported as missing, never as present. */
const stateOf = (view: McpServerView, field: McpSecretField, value: McpConfigValue): McpSecretStateEnum => {
  const state: McpSecretState = view.states.get(field) ?? (typeof value === "string" ? "PLAIN" : "MISSING");
  return McpSecretStateEnum[state];
};

const entriesOf = (view: McpServerView, values: Record<string, McpConfigValue>, kind: "env" | "header"): McpConfigEntry[] =>
  Object.entries(values).map(([name, value]) => {
    const field: McpSecretField = `${kind}:${name}`;
    const state = stateOf(view, field, value);
    const returned = typeof value === "string"
      && state === McpSecretStateEnum.PLAIN
      && !McpSecretSuggestionRule.isAlwaysSecret(field);
    return { name, value: returned ? value : null, state };
  });

/** A saved server and its states → GraphQL. Pure and sync; it never returns a secret value. */
export class McpServerConverter {
  static toGraphql(view: McpServerView): StdioMcpServerConfigGraphql | StreamableHttpMcpServerConfigGraphql {
    const config = view.config;

    if (config.transport_type === McpTransportType.STDIO) {
      const stdio = config as StdioMcpServerConfig;
      return {
        serverId: stdio.server_id,
        transportType: McpTransportTypeEnum.STDIO,
        enabled: stdio.enabled,
        toolNamePrefix: stdio.tool_name_prefix ?? null,
        command: stdio.command,
        args: stdio.args?.length ? stdio.args : null,
        env: entriesOf(view, stdio.env, "env"),
        cwd: stdio.cwd ?? null,
      };
    }

    const http = config as StreamableHttpMcpServerConfig;
    return {
      serverId: http.server_id,
      transportType: McpTransportTypeEnum.STREAMABLE_HTTP,
      enabled: http.enabled,
      toolNamePrefix: http.tool_name_prefix ?? null,
      url: http.url,
      tokenState: http.token === null ? null : stateOf(view, "token", http.token),
      headers: entriesOf(view, http.headers, "header"),
    };
  }
}
