import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationDatabaseLocation } from '../../../src/config/application-database-location.js';
import { secretId } from '../../../src/secret-management/domain/secret-id.js';
import {
  createImportRequest,
  formatLocalImportFailure,
  formatLocalImportPlan,
  formatLocalImportResult,
  parseLocalImportArguments,
  runLocalEnvironmentImportCli,
} from '../../../src/secret-management/cli/import-local-environment-secrets.js';
import {
  LocalEnvironmentSecretImportService,
} from '../../../src/secret-management/provisioning/local-environment-secret-import-service.js';

describe('local environment import CLI adapter', () => {
  const absoluteSource = path.resolve('/synthetic/operator/source-with-any-name');
  const absoluteDatabasePath = path.resolve('/synthetic/operator/application.db');
  const absoluteDatabaseUrl = pathToFileURL(absoluteDatabasePath).href;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it.each([
    { label: 'direct options', prefix: [] },
    { label: 'one PNPM separator', prefix: ['--'] },
  ])('maps $label into the exact raw CLI request', ({ prefix }) => {
    expect(parseLocalImportArguments([
      ...prefix,
      '--source', absoluteSource,
      '--database-url', absoluteDatabaseUrl,
      '--dry-run',
      '--overwrite',
    ])).toEqual({
      sourcePath: absoluteSource,
      databaseUrl: absoluteDatabaseUrl,
      dryRun: true,
      overwrite: true,
    });
  });

  it('converts the raw URL exactly once and discards it from downstream authority', () => {
    process.env.DATABASE_URL = pathToFileURL(path.resolve('/ambient/ignored.db')).href;
    const resolver = vi.spyOn(ApplicationDatabaseLocation, 'fromAbsoluteFileUrl');
    const raw = parseLocalImportArguments([
      '--source', absoluteSource,
      '--database-url', absoluteDatabaseUrl,
    ]);

    const request = createImportRequest(raw);

    expect(resolver).toHaveBeenCalledExactlyOnceWith(absoluteDatabaseUrl);
    expect(request).toEqual({
      sourcePath: absoluteSource,
      targetLocation: expect.objectContaining({
        databaseUrl: absoluteDatabaseUrl,
        databasePath: absoluteDatabasePath,
        rootKeyPath: `${absoluteDatabasePath}.secret.key`,
      }),
      dryRun: false,
      overwrite: false,
    });
    expect(Object.keys(request).sort()).toEqual([
      'dryRun',
      'overwrite',
      'sourcePath',
      'targetLocation',
    ]);
    expect('databaseUrl' in request).toBe(false);
    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.targetLocation)).toBe(true);
  });

  it.each([
    { args: [] },
    { args: ['--source', 'relative', '--database-url', absoluteDatabaseUrl] },
    { args: ['--source', absoluteSource] },
    { args: ['--database-url', absoluteDatabaseUrl] },
    {
      args: [
        '--source', absoluteSource,
        '--source', absoluteSource,
        '--database-url', absoluteDatabaseUrl,
      ],
    },
    {
      args: [
        '--source', absoluteSource,
        '--database-url', absoluteDatabaseUrl,
        '--database-url', absoluteDatabaseUrl,
      ],
    },
    { args: ['--source', absoluteSource, '--database-url', absoluteDatabaseUrl, '--target', 'default'] },
    { args: ['--source', absoluteSource, '--database-url', absoluteDatabaseUrl, '--key-path', '/tmp/key'] },
    { args: ['--source', absoluteSource, '--database-url', absoluteDatabaseUrl, '--profile', 'e2e'] },
    { args: ['--', '--', '--source', absoluteSource, '--database-url', absoluteDatabaseUrl] },
    { args: ['--source', absoluteSource, '--database-url', absoluteDatabaseUrl, '--'] },
  ])('rejects missing, duplicate, relative, or widened options', ({ args }) => {
    expect(() => parseLocalImportArguments(args)).toThrowError('IMPORT_OPTIONS_INVALID');
  });

  it.each([
    '',
    'file:relative.db',
    'file:./relative.db',
    'https://example.invalid/application.db',
    'postgresql://example.invalid/application',
    'file:/absolute/application.db?mode=ro',
    'file:/absolute/application.db#fragment',
    'file:///tmp/review%00target.db',
  ])('rejects invalid explicit database URL %s before service construction', (databaseUrl) => {
    const raw = {
      sourcePath: absoluteSource,
      databaseUrl,
      dryRun: true,
      overwrite: false,
    };
    expect(() => createImportRequest(raw)).toThrowError('IMPORT_OPTIONS_INVALID');
  });

  it('rejects a decoded NUL before service/source/target access and emits no control byte', async () => {
    const preview = vi.spyOn(LocalEnvironmentSecretImportService.prototype, 'preview');
    const execute = vi.spyOn(LocalEnvironmentSecretImportService.prototype, 'execute');
    let caught: unknown;

    try {
      await runLocalEnvironmentImportCli([
        '--source', absoluteSource,
        '--database-url', 'file:///tmp/review%00target.db',
        '--dry-run',
      ]);
    } catch (error) {
      caught = error;
    }

    expect(preview).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(caught).toMatchObject({ code: 'IMPORT_OPTIONS_INVALID' });
    expect(formatLocalImportFailure(caught)).toBe(
      'LOCAL_SECRET_IMPORT_FAILED IMPORT_OPTIONS_INVALID\n',
    );
    expect(formatLocalImportFailure(caught)).not.toContain('\0');
  });

  it('keeps secrets:import as the sole repository importer command', () => {
    const packagePath = fileURLToPath(new URL('../../../../package.json', import.meta.url));
    const scripts = JSON.parse(fs.readFileSync(packagePath, 'utf8')).scripts as Record<string, string>;

    expect(scripts['secrets:import']).toContain('import-local-environment-secrets.js');
    expect(Object.keys(scripts).filter((name) => name.includes('secrets') && name.includes('import')))
      .toEqual(['secrets:import']);
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
