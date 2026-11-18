import { describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { McpSecretUnavailableError } from 'autobyteus-ts/tools/mcp/mcp-secret-resolver.js';
import { SecretVaultError } from 'autobyteus-ts/secrets/vault/secret-vault-types.js';
import { SecretManagementMcpSecretResolver } from '../../../src/secret-management/resolution/mcp-secret-resolver.js';

const reference = { vaultSecretId: 'mcp.0c6f2f0a-5b7e-4c1d-9a2b-3e4f5a6b7c8d' } as never;
const context = { serverId: 'remote', field: 'header:Authorization' } as const;
const serviceResolving = (resolveForUse: (consumer: unknown) => Promise<SecretValue>) =>
  new SecretManagementMcpSecretResolver(() => ({ resolveForUse }) as never);

describe('SecretManagementMcpSecretResolver', () => {
  it('resolves a reference through the vault as an mcpServer consumer', async () => {
    const resolveForUse = vi.fn(async () => SecretValue.fromString('synthetic-value'));
    const value = await serviceResolving(resolveForUse).resolve(reference, context);
    expect(value.revealToTrustedConsumer()).toBe('synthetic-value');
    expect(resolveForUse).toHaveBeenCalledWith({ kind: 'mcpServer', vaultSecretId: reference.vaultSecretId });
  });

  it.each([
    ['an absent entry', new SecretVaultError('NOT_FOUND', false, 'SECRET_NOT_FOUND'), 'MISSING'],
    ['an ID the catalog refuses', new SecretVaultError('ACCESS_DENIED', false, 'SECRET_CONSUMER_NOT_AUTHORIZED'), 'MISSING'],
    ['a locked vault', new SecretVaultError('VAULT_LOCKED', false, 'SECRET_VAULT_LOCKED'), 'VAULT_UNAVAILABLE'],
    ['an unavailable vault', new SecretVaultError('VAULT_UNAVAILABLE', true, 'SECRET_VAULT_UNAVAILABLE'), 'VAULT_UNAVAILABLE'],
  ] as const)('reports %s as %s, naming only the server and field', async (_label, failure, reason) => {
    const error = await serviceResolving(async () => { throw failure; }).resolve(reference, context).catch((caught) => caught);
    expect(error).toBeInstanceOf(McpSecretUnavailableError);
    expect(error).toMatchObject({ serverId: 'remote', field: 'header:Authorization', reason });
  });

  it('reports a vault runtime that has not opened as VAULT_UNAVAILABLE', async () => {
    const resolver = new SecretManagementMcpSecretResolver(() => {
      throw new SecretVaultError('VAULT_UNAVAILABLE', true, 'SECRET_VAULT_UNAVAILABLE');
    });
    await expect(resolver.resolve(reference, context)).rejects.toMatchObject({ reason: 'VAULT_UNAVAILABLE' });
  });
});
