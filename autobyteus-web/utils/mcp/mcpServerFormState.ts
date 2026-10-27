/**
 * The MCP server form's state, and its three conversions: to the JSON View's text, from that text (against the
 * current rows, which know what is stored), and to the GraphQL `McpServerInput`.
 */
import {
  rowsFromJson,
  rowsToInput,
  rowsToJson,
  tokenFromJson,
  tokenToInput,
  tokenToJson,
  type McpConfigRow,
  type McpSecretSuggestionRule,
  type McpTokenDraft,
} from './mcpConfigRows';

export type FormTransport = 'STDIO' | 'STREAMABLE_HTTP';
export type McpServerFormInput = Record<string, any> & { serverId: string; transportType: FormTransport };

/** Everything the form edits; the Form tab and the JSON tab both read and write it. */
export type McpServerFormState = {
  serverId: string;
  transportType: FormTransport;
  toolNamePrefix: string;
  enabled: boolean;
  command: string;
  args: string[];
  cwd: string;
  url: string;
  envRows: McpConfigRow[];
  headerRows: McpConfigRow[];
  token: McpTokenDraft;
};

const isRecord = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeTransport = (config: Record<string, any>): FormTransport => {
  const rawTransport = config.transportType ?? config.transport_type;
  if (typeof rawTransport === 'string' && rawTransport.trim()) {
    const normalized = rawTransport.trim().replace(/-/g, '_').toUpperCase();
    if (normalized === 'STDIO' || normalized === 'STREAMABLE_HTTP') {
      return normalized;
    }
    throw new Error(`Unsupported MCP transport type '${rawTransport}'.`);
  }
  if (typeof config.url === 'string' && config.url.trim()) return 'STREAMABLE_HTTP';
  if (typeof config.command === 'string' && config.command.trim()) return 'STDIO';
  throw new Error("MCP server JSON must include either 'command' for STDIO or 'url' for HTTP.");
};

const readStringArray = (value: unknown, fieldName: string): string[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`'${fieldName}' must be an array of strings.`);
  }
  return value;
};

/** The JSON View's text: values as strings, stored values it cannot show as keep markers. */
export const formStateToJson = (state: McpServerFormState): string => {
  const config: Record<string, unknown> = {
    transportType: state.transportType.toLowerCase(),
    enabled: state.enabled,
  };
  if (state.toolNamePrefix) config.toolNamePrefix = state.toolNamePrefix;

  if (state.transportType === 'STDIO') {
    const env = rowsToJson(state.envRows);
    Object.assign(config, {
      command: state.command,
      args: state.args.length > 0 ? state.args : undefined,
      env: Object.keys(env).length > 0 ? env : undefined,
      cwd: state.cwd || undefined,
    });
  } else {
    const headers = rowsToJson(state.headerRows);
    Object.assign(config, {
      url: state.url,
      token: tokenToJson(state.token),
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
  }
  return JSON.stringify({ mcpServers: { [state.serverId || 'new-server']: config } }, null, 2);
};

/**
 * The form state from the JSON View's text, against `current` (which knows what is stored). In edit mode the saved
 * server's ID stays the identity. `needsReview` is set when the rule locked a new value, which the user then reviews
 * on the Form View before saving.
 */
export const formStateFromJson = (
  text: string,
  current: McpServerFormState,
  rule: McpSecretSuggestionRule | null,
  editServerId: string | null,
): { state: McpServerFormState; needsReview: boolean } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON syntax.');
  }
  if (!isRecord(parsed) || !isRecord(parsed.mcpServers)) {
    throw new Error("Invalid JSON structure. Must contain a top-level 'mcpServers' object.");
  }

  const serverIds = Object.keys(parsed.mcpServers);
  if (serverIds.length === 0) throw new Error("The 'mcpServers' object is empty.");
  if (serverIds.length > 1) throw new Error('This form edits one MCP server at a time. Provide exactly one server or use Bulk Import.');

  const jsonServerId = serverIds[0]!;
  const config = parsed.mcpServers[jsonServerId];
  if (!jsonServerId.trim()) throw new Error('MCP server ID cannot be empty.');
  if (!isRecord(config)) throw new Error(`MCP server '${jsonServerId}' must be a JSON object.`);

  const transportType = normalizeTransport(config);
  const state: McpServerFormState = {
    ...current,
    serverId: editServerId ?? jsonServerId,
    transportType,
    toolNamePrefix: (config.toolNamePrefix ?? config.tool_name_prefix) || '',
    enabled: config.enabled !== false,
    envRows: [],
    headerRows: [],
    token: tokenFromJson(undefined, current.token),
  };

  if (transportType === 'STDIO') {
    if (typeof config.command !== 'string' || !config.command.trim()) {
      throw new Error("STDIO MCP server JSON must include a non-empty 'command'.");
    }
    const env = rowsFromJson(config.env, 'env', current.envRows, rule);
    return {
      state: {
        ...state,
        command: config.command,
        args: readStringArray(config.args, 'args'),
        cwd: typeof config.cwd === 'string' ? config.cwd : '',
        envRows: env.rows,
      },
      needsReview: env.needsReview,
    };
  }

  if (typeof config.url !== 'string' || !config.url.trim()) {
    throw new Error("HTTP MCP server JSON must include a non-empty 'url'.");
  }
  const headers = rowsFromJson(config.headers, 'header', current.headerRows, rule);
  return {
    state: { ...state, url: config.url, headerRows: headers.rows, token: tokenFromJson(config.token, current.token) },
    needsReview: headers.needsReview,
  };
};

/** The GraphQL `McpServerInput` for a form state. */
export const formStateToInput = (state: McpServerFormState, rule: McpSecretSuggestionRule | null): McpServerFormInput => ({
  serverId: state.serverId,
  transportType: state.transportType,
  toolNamePrefix: state.toolNamePrefix || null,
  enabled: state.enabled,
  stdioConfig: state.transportType === 'STDIO'
    ? { command: state.command, args: state.args, env: rowsToInput(state.envRows, 'env', rule), cwd: state.cwd || null }
    : null,
  streamableHttpConfig: state.transportType === 'STREAMABLE_HTTP'
    ? { url: state.url, token: tokenToInput(state.token), headers: rowsToInput(state.headerRows, 'header', rule) }
    : null,
});
