import type { SecretValue } from 'autobyteus-ts';
import {
  McpSecretUnavailableError,
  type McpSecretResolutionContext,
  type McpSecretResolver,
} from 'autobyteus-ts/tools/mcp/mcp-secret-resolver.js';
import type { McpSecretReference } from 'autobyteus-ts/tools/mcp/types.js';
import { McpServerInstanceManager } from 'autobyteus-ts/tools/mcp/server-instance-manager.js';
import { SecretVaultError } from 'autobyteus-ts/secrets/vault/secret-vault-types.js';
import { getSecretVaultRuntime } from '../secret-vault-runtime.js';
import type { SecretManagementService } from '../services/secret-management-service.js';

/**
 * The autobyteus-ts `McpSecretResolver` over a `SecretManagementService` (consumer kind `mcpServer`). A reference
 * whose entry is absent, or whose ID the catalog does not accept, is `MISSING`; a vault that is not READY (or not
 * open) is `VAULT_UNAVAILABLE`. Errors name the server and field only.
 */
export class SecretManagementMcpSecretResolver implements McpSecretResolver {
  constructor(private readonly managementProvider: () => SecretManagementService) {}

  async resolve(reference: McpSecretReference, context: McpSecretResolutionContext): Promise<SecretValue> {
    try {
      return await this.managementProvider().resolveForUse({ kind: 'mcpServer', vaultSecretId: reference.vaultSecretId });
    } catch (error) {
      if (!(error instanceof SecretVaultError)) throw error;
      const reason = error.code === 'NOT_FOUND' || error.code === 'ACCESS_DENIED' ? 'MISSING' : 'VAULT_UNAVAILABLE';
      throw new McpSecretUnavailableError(context.serverId, context.field, reason);
    }
  }
}

/**
 * Server startup, once the vault runtime is initialized: managed MCP servers resolve their secret references through
 * the server's vault runtime, whichever source it opened (looked up at each resolve, never earlier).
 */
export const installRuntimeMcpSecretResolver = (): void => {
  const resolver: McpSecretResolver = new SecretManagementMcpSecretResolver(() => getSecretVaultRuntime().requireService());
  McpServerInstanceManager.getInstance().useSecretResolver(resolver);
};
