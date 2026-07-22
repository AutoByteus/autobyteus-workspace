import { userInfo } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { secretDefinitionId } from '../../../src/secret-management/domain/secret-binding.js';
import {
  formatLocalImportPlan,
  formatLocalImportResult,
  parseLocalImportArguments,
} from '../../../src/secret-management/cli/import-local-environment-secrets.js';
import { CanonicalHostLocalImportTargetResolver } from '../../../src/secret-management/provisioning/local-import-target-resolver.js';

describe('local environment import CLI adapter', () => {
  const absoluteSource = path.resolve('/synthetic/operator/source-with-any-name');

  it.each([
    { label: 'direct options', prefix: [] },
    { label: 'one PNPM separator', prefix: ['--'] },
  ])('maps $label into the same exact typed request', ({ prefix }) => {
    expect(parseLocalImportArguments([
      ...prefix,
      '--source', absoluteSource,
      '--target', 'e2e',
      '--dry-run',
      '--overwrite',
    ])).toEqual({
      sourceAbsolutePath: absoluteSource,
      target: 'e2e',
      dryRun: true,
      overwrite: true,
    });
  });

  it('resolves only the two canonical OS-account targets without a HOME override', () => {
    const originalHome = process.env.HOME;
    process.env.HOME = path.resolve('/synthetic/not-the-account-home');
    try {
      const resolver = new CanonicalHostLocalImportTargetResolver();
      const root = path.join(userInfo().homedir, '.autobyteus', 'server-data', 'secret-store');
      expect(resolver.resolve('default')).toMatchObject({
        databasePath: path.join(root, 'secret-store.db'),
        keyPath: path.join(root, 'secret-store.key'),
        accessMode: 'READ_WRITE',
      });
      expect(resolver.resolve('e2e')).toMatchObject({
        databasePath: path.join(root, 'real-e2e-secret-store.db'),
        keyPath: path.join(root, 'real-e2e-secret-store.key'),
        accessMode: 'READ_WRITE',
      });
    } finally {
      if (originalHome === undefined) delete process.env.HOME;
      else process.env.HOME = originalHome;
    }
  });

  it.each([
    { args: [] },
    { args: ['--source', absoluteSource] },
    { args: ['--target', 'default'] },
    { args: ['--source', 'relative', '--target', 'default'] },
    { args: ['--source', absoluteSource, '--source', absoluteSource, '--target', 'default'] },
    { args: ['--source', absoluteSource, '--target', 'default', '--target', 'e2e'] },
    { args: ['--source', absoluteSource, '--target', 'custom'] },
    { args: ['--source', absoluteSource, '--target', 'default', '--yes'] },
    { args: ['--source', absoluteSource, '--target', 'default', '--store-db', '/tmp/store.db'] },
    { args: ['--source', absoluteSource, '--target', 'default', '--definition', 'provider.openai.api-key'] },
    { args: ['--source', absoluteSource, '--target', 'default', '--value', 'synthetic-value'] },
    { args: ['--source', absoluteSource, '--target', 'default', '--env', 'SYNTHETIC=value'] },
    { args: ['--', '--', '--source', absoluteSource, '--target', 'default'] },
    { args: ['--source', absoluteSource, '--', '--target', 'default'] },
  ])('rejects missing, duplicate, unknown, relative, or widened options before invocation', ({ args }) => {
    expect(() => parseLocalImportArguments(args)).toThrowError('IMPORT_OPTIONS_INVALID');
  });

  it('formats plans and results using only target, definitions, closed states, counts, and instructions', () => {
    const definitionId = secretDefinitionId('provider.openai.api-key');
    const plan = formatLocalImportPlan('default', {
      targetStatus: {
        state: 'INITIALIZATION_REQUIRED',
        instructionCode: 'LOCAL_IMPORT_TARGET_INITIALIZATION_REQUIRED',
      },
      entries: [{ definitionId, action: 'CREATE' }],
    });
    const result = formatLocalImportResult('e2e', {
      targetStatus: { state: 'READY' },
      definitionIds: [definitionId],
      configuredCount: 0,
      skippedCount: 0,
      replacedCount: 1,
      instructionCode: 'RUN_REAL_E2E_PREFLIGHT',
    });

    expect(plan).toContain('provider.openai.api-key CREATE');
    expect(plan).toContain('TARGET_STATUS INITIALIZATION_REQUIRED');
    expect(plan).toContain('INSTRUCTION LOCAL_IMPORT_TARGET_INITIALIZATION_REQUIRED');
    expect(result).toContain('DEFINITION provider.openai.api-key');
    expect(result).toContain('REPLACED 1');
    expect(`${plan}${result}`).not.toMatch(/source|synthetic|value/i);
  });
});
