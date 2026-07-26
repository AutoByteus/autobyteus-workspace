import type { SecretValue } from 'autobyteus-ts';
import { appConfigProvider } from '../../../config/app-config-provider.js';
import { getSecretVaultRuntime } from '../../../secret-management/secret-vault-runtime.js';
import { SecretVaultError } from '../../../secret-management/domain/secret-vault-types.js';

export type ClaudeRuntimeAuthentication =
  | { kind: 'cli' }
  | { kind: 'managedApiKey'; apiKey: SecretValue };

export class ClaudeRuntimeAuthenticationError extends Error {
  constructor(readonly code: string, options?: { cause?: unknown }) {
    super(code, options);
    this.name = 'ClaudeRuntimeAuthenticationError';
  }
}

const mapSecretFailure = (error: unknown): string => {
  if (!(error instanceof SecretVaultError)) return 'CLAUDE_RUNTIME_SECRET_BINDING_INVALID';
  switch (error.code) {
    case 'NOT_FOUND': return 'CLAUDE_RUNTIME_CREDENTIAL_MISSING';
    case 'VAULT_LOCKED': return 'CLAUDE_RUNTIME_SECRET_STORE_LOCKED';
    case 'VAULT_UNAVAILABLE': return 'CLAUDE_RUNTIME_SECRET_STORE_UNAVAILABLE';
    case 'CORRUPT_VAULT':
    case 'CORRUPT_STORED_VALUE': return 'CLAUDE_RUNTIME_SECRET_STORE_CORRUPT';
    case 'INCOMPATIBLE_FORMAT': return 'CLAUDE_RUNTIME_SECRET_STORE_INCOMPATIBLE';
    default: return 'CLAUDE_RUNTIME_SECRET_BINDING_INVALID';
  }
};

export class ClaudeRuntimeAuthenticationService {
  constructor(
    private readonly readMode: () => string | undefined = () =>
      appConfigProvider.config.get('CLAUDE_AGENT_SDK_AUTH_MODE'),
    private readonly managementProvider = () =>
      getSecretVaultRuntime().requireService(),
  ) {}

  async prepareForLaunch(): Promise<ClaudeRuntimeAuthentication> {
    const rawMode = this.readMode();
    const mode = rawMode?.trim().toLowerCase() || 'cli';
    if (mode === 'cli') return { kind: 'cli' };
    if (mode !== 'managed-secret') {
      throw new ClaudeRuntimeAuthenticationError('CLAUDE_RUNTIME_AUTH_MODE_INVALID');
    }
    try {
      const apiKey = await this.managementProvider()
        .resolveForUse({
          kind: 'agentRuntime',
          runtimeKind: 'claude_agent_sdk',
          credentialSlot: 'apiKey',
        });
      return { kind: 'managedApiKey', apiKey };
    } catch (cause) {
      throw new ClaudeRuntimeAuthenticationError(mapSecretFailure(cause), { cause });
    }
  }
}

let singleton: ClaudeRuntimeAuthenticationService | null = null;
export const getClaudeRuntimeAuthenticationService = (): ClaudeRuntimeAuthenticationService => {
  singleton ??= new ClaudeRuntimeAuthenticationService();
  return singleton;
};
