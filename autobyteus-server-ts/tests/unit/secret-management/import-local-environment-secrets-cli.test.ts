import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { secretId } from '../../../src/secret-management/domain/secret-id.js';
import {
  formatLocalImportPlan,
  formatLocalImportResult,
  parseLocalImportArguments,
} from '../../../src/secret-management/cli/import-local-environment-secrets.js';

describe('local environment import CLI adapter', () => {
  const absoluteSource = path.resolve('/synthetic/operator/source-with-any-name');

  it.each([
    { label: 'direct options', prefix: [] },
    { label: 'one PNPM separator', prefix: ['--'] },
  ])('maps $label into the exact current-database request', ({ prefix }) => {
    expect(parseLocalImportArguments([
      ...prefix,
      '--source', absoluteSource,
      '--dry-run',
      '--overwrite',
    ])).toEqual({
      sourceAbsolutePath: absoluteSource,
      dryRun: true,
      overwrite: true,
    });
  });

  it.each([
    { args: [] },
    { args: ['--source', 'relative'] },
    { args: ['--source', absoluteSource, '--source', absoluteSource] },
    { args: ['--source', absoluteSource, '--target', 'default'] },
    { args: ['--source', absoluteSource, '--store-db', '/tmp/store.db'] },
    { args: ['--source', absoluteSource, '--secret-id', 'provider.openai.api-key'] },
    { args: ['--source', absoluteSource, '--value', 'synthetic-value'] },
    { args: ['--', '--', '--source', absoluteSource] },
    { args: ['--source', absoluteSource, '--'] },
  ])('rejects missing, duplicate, relative, or widened options', ({ args }) => {
    expect(() => parseLocalImportArguments(args)).toThrowError('IMPORT_OPTIONS_INVALID');
  });

  it('formats only value-free target, SecretId, state, action, and counts', () => {
    const id = secretId('provider.openai.api-key');
    const plan = formatLocalImportPlan({
      targetIdentity: '/synthetic/application.db',
      targetState: 'INITIALIZATION_REQUIRED',
      entries: [{ secretId: id, observedStatus: 'MISSING', plannedAction: 'CREATE' }],
      counts: { create: 1, skipConfigured: 0, replace: 0, blocked: 0 },
      instructionCode: 'SECRET_VAULT_INITIALIZATION_REQUIRED',
    });
    const result = formatLocalImportResult({
      targetIdentity: '/synthetic/application.db',
      targetState: 'READY',
      secretIds: [id],
      configuredCount: 0,
      skippedCount: 0,
      replacedCount: 1,
      instructionCode: 'NONE',
    });

    expect(plan).toContain('provider.openai.api-key MISSING CREATE');
    expect(plan).toContain('TARGET_STATUS INITIALIZATION_REQUIRED');
    expect(result).toContain('SECRET provider.openai.api-key');
    expect(result).toContain('REPLACED 1');
    expect(`${plan}${result}`).not.toMatch(/api.?key=|cipher|root.?key/i);
  });
});
