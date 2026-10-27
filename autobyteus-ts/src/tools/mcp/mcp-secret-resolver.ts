import type { SecretValue } from '../../secrets/secret-value.js';
import type { McpConfigValue, McpSecretField, McpSecretReference } from './types.js';

export type McpSecretUnavailableReason = 'MISSING' | 'VAULT_UNAVAILABLE';

/** A secret reference that could not be resolved. Names the server and field only, never a value. */
export class McpSecretUnavailableError extends Error {
  constructor(
    readonly serverId: string,
    readonly field: McpSecretField,
    readonly reason: McpSecretUnavailableReason,
  ) {
    super(
      `MCP server '${serverId}' needs secret: ${field} (${reason === 'MISSING' ? 'no value is stored' : 'the vault is unavailable'}).`
    );
    this.name = 'McpSecretUnavailableError';
  }
}

export type McpSecretResolutionContext = Readonly<{ serverId: string; field: McpSecretField }>;

/**
 * Storage-neutral point-of-use capability that resolves one MCP secret reference. Managed servers call it
 * while they connect, and only then. It throws `McpSecretUnavailableError` when the value cannot be had.
 */
export interface McpSecretResolver {
  resolve(reference: McpSecretReference, context: McpSecretResolutionContext): Promise<SecretValue>;
}

/** One value as the transport needs it: a plain string as is, a reference resolved through `resolver`. */
export const resolveMcpValue = async (
  value: McpConfigValue,
  context: McpSecretResolutionContext,
  resolver: McpSecretResolver | null,
): Promise<string> => {
  if (typeof value === 'string') return value;
  if (!resolver) throw new McpSecretUnavailableError(context.serverId, context.field, 'VAULT_UNAVAILABLE');
  return (await resolver.resolve(value, context)).revealToTrustedConsumer();
};

/** The env values (`env:<NAME>`) or header values (`header:<Name>`) of one server, resolved for its transport. */
export const resolveMcpValues = async (
  values: Readonly<Record<string, McpConfigValue>>,
  kind: 'env' | 'header',
  serverId: string,
  resolver: McpSecretResolver | null,
): Promise<Record<string, string>> => {
  const resolved: Record<string, string> = {};
  for (const [name, value] of Object.entries(values)) {
    resolved[name] = await resolveMcpValue(value, { serverId, field: `${kind}:${name}` }, resolver);
  }
  return resolved;
};
