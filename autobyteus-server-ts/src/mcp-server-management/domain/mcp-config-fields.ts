import {
  McpTransportType,
  type StdioMcpServerConfig,
  type StreamableHttpMcpServerConfig,
  type BaseMcpConfig,
  type McpConfigValue,
  type McpSecretField,
} from "autobyteus-ts/tools/mcp/types.js";

/** Where a secret field lives in a config and in its `mcps.json` entry (both use the keys `env`, `headers`, `token`). */
export type McpFieldLocation =
  | Readonly<{ container: "env" | "headers"; name: string }>
  | Readonly<{ container: "token" }>;

export type McpFieldValue = Readonly<{ field: McpSecretField; value: McpConfigValue }>;

export const fieldLocation = (field: McpSecretField): McpFieldLocation => {
  if (field === "token") return { container: "token" };
  const separator = field.indexOf(":");
  const kind = field.slice(0, separator);
  return { container: kind === "env" ? "env" : "headers", name: field.slice(separator + 1) };
};

/** Every env value (stdio) or header value and token (HTTP) of a config, with its field. */
export const fieldValuesOf = (config: BaseMcpConfig): McpFieldValue[] => {
  if (config.transport_type === McpTransportType.STDIO) {
    return Object.entries((config as StdioMcpServerConfig).env)
      .map(([name, value]) => ({ field: `env:${name}` as const, value }));
  }
  const http = config as StreamableHttpMcpServerConfig;
  const values: McpFieldValue[] = Object.entries(http.headers)
    .map(([name, value]) => ({ field: `header:${name}` as const, value }));
  if (http.token !== null) values.push({ field: "token", value: http.token });
  return values;
};

/** The stored value of one field, or `undefined` when the config has no such field. */
export const fieldValueOf = (config: BaseMcpConfig, field: McpSecretField): McpConfigValue | undefined =>
  fieldValuesOf(config).find((entry) => entry.field === field)?.value;
