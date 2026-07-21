import { describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import {
  ClaudeRuntimeAuthenticationError,
  ClaudeRuntimeAuthenticationService,
} from '../../../../src/runtime-management/claude/client/claude-runtime-authentication-service.js';
import { SecretStorageError } from '../../../../src/secret-management/domain/secret-storage-types.js';

describe('ClaudeRuntimeAuthenticationService', () => {
  it('defaults to CLI without touching secret management', async () => {
    const managementProvider = vi.fn();
    const service = new ClaudeRuntimeAuthenticationService(() => undefined, managementProvider);
    await expect(service.prepareForLaunch()).resolves.toEqual({ kind: 'cli' });
    expect(managementProvider).not.toHaveBeenCalled();
  });

  it.each(['auto', 'api-key', 'unknown'])('rejects legacy/invalid mode %s before lookup', async (mode) => {
    const managementProvider = vi.fn();
    const service = new ClaudeRuntimeAuthenticationService(() => mode, managementProvider);
    await expect(service.prepareForLaunch()).rejects.toMatchObject({
      code: 'CLAUDE_RUNTIME_AUTH_MODE_INVALID',
    });
    expect(managementProvider).not.toHaveBeenCalled();
  });

  it('resolves the exact managed-secret consumer just in time', async () => {
    const value = SecretValue.fromString('synthetic-claude-secret');
    const resolveForUse = vi.fn().mockResolvedValue(value);
    const service = new ClaudeRuntimeAuthenticationService(
      () => 'managed-secret',
      () => ({ resolveForUse } as never),
    );
    await expect(service.prepareForLaunch()).resolves.toEqual({ kind: 'managedApiKey', apiKey: value });
    expect(resolveForUse).toHaveBeenCalledWith({
      kind: 'agentRuntime',
      runtimeKind: 'claude_agent_sdk',
      credentialSlot: 'apiKey',
    });
  });

  it('maps custody failures to value-free Claude codes', async () => {
    const resolveForUse = vi.fn().mockRejectedValue(
      new SecretStorageError('BACKEND_LOCKED', true, 'SECRET_BACKEND_LOCKED'),
    );
    const service = new ClaudeRuntimeAuthenticationService(
      () => 'managed-secret',
      () => ({ resolveForUse } as never),
    );
    await expect(service.prepareForLaunch()).rejects.toEqual(
      expect.objectContaining<Partial<ClaudeRuntimeAuthenticationError>>({
        code: 'CLAUDE_RUNTIME_SECRET_STORE_LOCKED',
        message: 'CLAUDE_RUNTIME_SECRET_STORE_LOCKED',
      }),
    );
  });
});
