import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import { secretDefinitionId } from '../../../src/secret-management/domain/secret-binding.js';
import { LocalWritableSecretStorageBackend } from '../../../src/secret-management/backends/local/local-secret-storage-backend.js';
import { LocalSecretStoreProvisioningService } from '../../../src/secret-management/backends/local/local-secret-store-provisioning-service.js';
import type { LocalStoreConfiguration } from '../../../src/secret-management/backends/local/local-secret-store-initializer.js';
import type { LocalImportTargetResolver } from '../../../src/secret-management/provisioning/local-import-target-resolver.js';
import {
  LocalLegacyEnvironmentImportService,
  type LocalImportConfirmationPort,
} from '../../../src/secret-management/provisioning/local-legacy-environment-import-service.js';

class TemporaryTargetResolver implements LocalImportTargetResolver {
  constructor(private readonly root: string) {}

  resolve(target: 'default' | 'e2e'): LocalStoreConfiguration {
    const baseName = target === 'default' ? 'secret-store' : 'real-e2e-secret-store';
    return {
      kind: 'local-store',
      databasePath: path.join(this.root, `${baseName}.db`),
      keyPath: path.join(this.root, `${baseName}.key`),
      accessMode: 'READ_WRITE',
    };
  }
}

const confirmation = (
  response: string | null,
  beforeResponse?: () => Promise<void>,
): LocalImportConfirmationPort => ({
  isDirectTty: () => true,
  readChallenge: vi.fn(async () => {
    await beforeResponse?.();
    return response;
  }),
});

describe('LocalLegacyEnvironmentImportService', () => {
  let directory: string;
  let sourcePath: string;
  let resolver: TemporaryTargetResolver;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'local-environment-import-'));
    if (process.platform !== 'win32') await fs.chmod(directory, 0o700);
    sourcePath = path.join(directory, 'copied-and-renamed-keys');
    resolver = new TemporaryTargetResolver(path.join(directory, 'stores'));
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  const writeSource = async (content: string): Promise<Buffer> => {
    await fs.writeFile(sourcePath, content, { mode: 0o600 });
    if (process.platform !== 'win32') await fs.chmod(sourcePath, 0o600);
    return fs.readFile(sourcePath);
  };

  const targetConfig = (target: 'default' | 'e2e'): LocalStoreConfiguration => resolver.resolve(target);

  const storeSnapshot = async (target: 'default' | 'e2e') => {
    const configuration = targetConfig(target);
    const database = new DatabaseSync(configuration.databasePath, { readOnly: true });
    let journalMode: unknown;
    let metadata: unknown;
    let recordIds: unknown;
    try {
      journalMode = database.prepare('PRAGMA journal_mode').get();
      metadata = database.prepare(`
        SELECT schema_version, encryption_format_version, pair_verifier_format_version
          FROM store_metadata WHERE singleton_id = 1
      `).get();
      recordIds = database.prepare(
        'SELECT definition_id FROM secret_records ORDER BY definition_id',
      ).all();
    } finally {
      database.close();
    }
    const sidecars = await Promise.all(
      ['-wal', '-shm', '-journal'].map(async (suffix) => {
        const sidecarPath = `${configuration.databasePath}${suffix}`;
        const bytes = await fs.readFile(sidecarPath).catch((error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') return null;
          throw error;
        });
        return [suffix, bytes] as const;
      }),
    );
    return {
      journalMode,
      metadata,
      recordIds,
      databaseBytes: await fs.readFile(configuration.databasePath),
      keyBytes: await fs.readFile(configuration.keyPath),
      sidecars,
    };
  };

  const status = async (
    target: 'default' | 'e2e',
    definition: string,
  ): Promise<'MISSING' | 'CONFIGURED'> => {
    const backend = await LocalWritableSecretStorageBackend.open(targetConfig(target), {
      initializeIfAbsent: false,
    });
    try {
      expect(await backend.health()).toEqual({ state: 'READY' });
      return (await backend.getStatus(secretDefinitionId(definition))).storageState;
    } finally {
      await backend.close();
    }
  };

  const resolveSynthetic = async (target: 'default' | 'e2e', definition: string): Promise<string> => {
    const backend = await LocalWritableSecretStorageBackend.open(targetConfig(target), {
      initializeIfAbsent: false,
    });
    try {
      return (await backend.resolve(secretDefinitionId(definition))).revealToTrustedConsumer();
    } finally {
      await backend.close();
    }
  };

  it('previews an absent target value-free without initializing either Store', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-openai\nSERPER_API_KEY=synthetic-serper\n');
    const service = new LocalLegacyEnvironmentImportService(resolver);
    const plan = await service.preview({
      sourceAbsolutePath: sourcePath,
      target: 'e2e',
      dryRun: true,
      overwrite: false,
    });

    expect(plan).toEqual({
      targetStatus: {
        state: 'INITIALIZATION_REQUIRED',
        instructionCode: 'LOCAL_IMPORT_TARGET_INITIALIZATION_REQUIRED',
      },
      entries: [
        { definitionId: 'provider.openai.api-key', action: 'CREATE' },
        { definitionId: 'search.serper.api-key', action: 'CREATE' },
      ],
    });
    expect(JSON.stringify(plan)).not.toContain('synthetic');
    await expect(fs.stat(targetConfig('e2e').databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(targetConfig('default').databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('initializes only the confirmed target and atomically creates mapped records without changing the source', async () => {
    const sourceBefore = await writeSource(
      'OPENAI_API_KEY=synthetic-openai\nSERPER_API_KEY=synthetic-serper\nAPP_MODE=test\n',
    );
    const result = await new LocalLegacyEnvironmentImportService(resolver).execute({
      sourceAbsolutePath: sourcePath,
      target: 'default',
      dryRun: false,
      overwrite: false,
    }, confirmation('IMPORT DEFAULT STORE'));

    expect(result).toEqual({
      targetStatus: { state: 'READY' },
      definitionIds: ['provider.openai.api-key', 'search.serper.api-key'],
      configuredCount: 2,
      skippedCount: 0,
      replacedCount: 0,
      instructionCode: 'RESTART_REQUIRED',
    });
    expect(JSON.stringify(result)).not.toContain('synthetic');
    expect(await resolveSynthetic('default', 'provider.openai.api-key')).toBe('synthetic-openai');
    expect(await resolveSynthetic('default', 'search.serper.api-key')).toBe('synthetic-serper');
    expect(await fs.readFile(sourcePath)).toEqual(sourceBefore);
    await expect(fs.stat(targetConfig('e2e').databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('skips by default without prompting and replaces only with explicit overwrite and E2E challenge', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-first\n');
    const service = new LocalLegacyEnvironmentImportService(resolver);
    await service.execute({
      sourceAbsolutePath: sourcePath,
      target: 'e2e',
      dryRun: false,
      overwrite: false,
    }, confirmation('IMPORT REAL-E2E STORE'));
    await writeSource('OPENAI_API_KEY=synthetic-second\n');

    const skippedConfirmation = {
      isDirectTty: vi.fn(() => {
        throw new Error('confirmation must not be consulted');
      }),
      readChallenge: vi.fn(),
    };
    const skipped = await service.execute({
      sourceAbsolutePath: sourcePath,
      target: 'e2e',
      dryRun: false,
      overwrite: false,
    }, skippedConfirmation);
    expect(skipped).toMatchObject({
      configuredCount: 0,
      skippedCount: 1,
      replacedCount: 0,
      instructionCode: 'NONE',
    });
    expect(await resolveSynthetic('e2e', 'provider.openai.api-key')).toBe('synthetic-first');

    const replaced = await service.execute({
      sourceAbsolutePath: sourcePath,
      target: 'e2e',
      dryRun: false,
      overwrite: true,
    }, confirmation('IMPORT REAL-E2E STORE'));
    expect(replaced).toMatchObject({
      configuredCount: 0,
      skippedCount: 0,
      replacedCount: 1,
      instructionCode: 'RUN_REAL_E2E_PREFLIGHT',
    });
    expect(await resolveSynthetic('e2e', 'provider.openai.api-key')).toBe('synthetic-second');
  });

  it('cancels without initialization on a non-matching target challenge', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-openai\n');
    const error = await new LocalLegacyEnvironmentImportService(resolver).execute({
      sourceAbsolutePath: sourcePath,
      target: 'default',
      dryRun: false,
      overwrite: false,
    }, confirmation('IMPORT REAL-E2E STORE')).catch((caught) => caught);

    expect(error.toJSON()).toEqual({ code: 'IMPORT_CANCELLED', target: 'default' });
    await expect(fs.stat(targetConfig('default').databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('requires a direct TTY before initializing the selected target', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-openai\n');
    const error = await new LocalLegacyEnvironmentImportService(resolver).execute({
      sourceAbsolutePath: sourcePath,
      target: 'default',
      dryRun: false,
      overwrite: false,
    }, {
      isDirectTty: () => false,
      readChallenge: vi.fn(),
    }).catch((caught) => caught);

    expect(error.toJSON()).toEqual({ code: 'IMPORT_CONFIRMATION_REQUIRED', target: 'default' });
    await expect(fs.stat(targetConfig('default').databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('keeps an existing selected Store byte-identical through preview and cancelled overwrite attempts', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-replacement\n');
    const configuration = targetConfig('default');
    await new LocalSecretStoreProvisioningService(configuration).provisionExact(
      secretDefinitionId('provider.openai.api-key'),
      SecretValue.fromString('synthetic-original'),
    );
    const database = new DatabaseSync(configuration.databasePath);
    try {
      database.exec('PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;');
    } finally {
      database.close();
    }
    const before = await storeSnapshot('default');
    expect(before.journalMode).toEqual({ journal_mode: 'delete' });

    const service = new LocalLegacyEnvironmentImportService(resolver);
    const plan = await service.preview({
      sourceAbsolutePath: sourcePath,
      target: 'default',
      dryRun: true,
      overwrite: true,
    });
    expect(plan).toEqual({
      targetStatus: { state: 'READY' },
      entries: [{ definitionId: 'provider.openai.api-key', action: 'REPLACE' }],
    });
    expect(await storeSnapshot('default')).toEqual(before);

    for (const response of ['IMPORT REAL-E2E STORE', null] as const) {
      const error = await service.execute({
        sourceAbsolutePath: sourcePath,
        target: 'default',
        dryRun: false,
        overwrite: true,
      }, confirmation(response)).catch((caught) => caught);
      expect(error.toJSON()).toEqual({ code: 'IMPORT_CANCELLED', target: 'default' });
      expect(await storeSnapshot('default')).toEqual(before);
    }

    const nonTtyError = await service.execute({
      sourceAbsolutePath: sourcePath,
      target: 'default',
      dryRun: false,
      overwrite: true,
    }, {
      isDirectTty: () => false,
      readChallenge: vi.fn(),
    }).catch((caught) => caught);
    expect(nonTtyError.toJSON()).toEqual({
      code: 'IMPORT_CONFIRMATION_REQUIRED',
      target: 'default',
    });
    expect(await storeSnapshot('default')).toEqual(before);
  });

  it('reports a partial selected Store pair as exactly corrupt without definition projection or mutation', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-openai\n');
    const configuration = targetConfig('default');
    await fs.mkdir(path.dirname(configuration.keyPath), { recursive: true, mode: 0o700 });
    await fs.writeFile(configuration.keyPath, Buffer.alloc(32), { mode: 0o600 });

    const service = new LocalLegacyEnvironmentImportService(resolver);
    const plan = await service.preview({
      sourceAbsolutePath: sourcePath,
      target: 'default',
      dryRun: true,
      overwrite: false,
    });

    expect(plan).toEqual({
      targetStatus: { state: 'CORRUPT', instructionCode: 'SECRET_BACKEND_CORRUPT' },
      entries: [],
    });
    const result = await service.execute({
      sourceAbsolutePath: sourcePath,
      target: 'default',
      dryRun: false,
      overwrite: false,
    }, {
      isDirectTty: vi.fn(() => {
        throw new Error('confirmation must not be consulted');
      }),
      readChallenge: vi.fn(),
    });
    expect(result).toEqual({
      targetStatus: { state: 'CORRUPT', instructionCode: 'SECRET_BACKEND_CORRUPT' },
      definitionIds: [],
      configuredCount: 0,
      skippedCount: 0,
      replacedCount: 0,
      instructionCode: 'NONE',
    });
    await expect(fs.stat(configuration.databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await fs.stat(configuration.keyPath)).isFile()).toBe(true);
  });

  it.each([
    { state: 'LOCKED', instructionCode: 'SECRET_BACKEND_LOCKED' },
    { state: 'UNAVAILABLE', instructionCode: 'SECRET_BACKEND_UNAVAILABLE' },
    { state: 'INCOMPATIBLE', instructionCode: 'SECRET_BACKEND_INCOMPATIBLE' },
  ] as const)('preserves $state target health without definition projection', async (targetStatus) => {
    await writeSource('OPENAI_API_KEY=synthetic-openai\n');
    const inspectExact = vi.fn().mockResolvedValue({ targetStatus, definitionStatus: null });
    const service = new LocalLegacyEnvironmentImportService(
      resolver,
      undefined,
      () => ({ inspectExact }) as unknown as LocalSecretStoreProvisioningService,
    );

    const plan = await service.preview({
      sourceAbsolutePath: sourcePath,
      target: 'e2e',
      dryRun: true,
      overwrite: false,
    });

    expect(plan).toEqual({ targetStatus, entries: [] });
    expect(inspectExact).toHaveBeenCalledWith([secretDefinitionId('provider.openai.api-key')]);
  });

  it('rolls back the entire batch when a create precondition changes after confirmation planning', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-planned\nSERPER_API_KEY=synthetic-serper\n');
    await new LocalSecretStoreProvisioningService(targetConfig('default')).provisionExact(
      secretDefinitionId('provider.mistral.api-key'),
      SecretValue.fromString('synthetic-seed'),
    );
    const concurrentWrite = async () => {
      await new LocalSecretStoreProvisioningService(targetConfig('default')).provisionExact(
        secretDefinitionId('provider.openai.api-key'),
        SecretValue.fromString('synthetic-concurrent'),
      );
    };

    const error = await new LocalLegacyEnvironmentImportService(resolver).execute({
      sourceAbsolutePath: sourcePath,
      target: 'default',
      dryRun: false,
      overwrite: false,
    }, confirmation('IMPORT DEFAULT STORE', concurrentWrite)).catch((caught) => caught);

    expect(error.toJSON()).toEqual({ code: 'IMPORT_TARGET_CHANGED', target: 'default' });
    expect(await resolveSynthetic('default', 'provider.openai.api-key')).toBe('synthetic-concurrent');
    expect(await status('default', 'search.serper.api-key')).toBe('MISSING');
  });

  it('rolls back earlier writes when a later atomic-batch write fails', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-openai\nSERPER_API_KEY=synthetic-serper\n');
    await new LocalSecretStoreProvisioningService(targetConfig('default')).provisionExact(
      secretDefinitionId('provider.mistral.api-key'),
      SecretValue.fromString('synthetic-seed'),
    );
    const database = new DatabaseSync(targetConfig('default').databasePath);
    try {
      database.exec(`
        CREATE TRIGGER fail_second_import_write
        BEFORE INSERT ON secret_records
        WHEN NEW.definition_id = 'search.serper.api-key'
        BEGIN
          SELECT RAISE(ABORT, 'synthetic injected batch failure');
        END;
      `);
    } finally {
      database.close();
    }

    const error = await new LocalLegacyEnvironmentImportService(resolver).execute({
      sourceAbsolutePath: sourcePath,
      target: 'default',
      dryRun: false,
      overwrite: false,
    }, confirmation('IMPORT DEFAULT STORE')).catch((caught) => caught);

    expect(error.toJSON()).toEqual({ code: 'IMPORT_BATCH_FAILED', target: 'default' });
    expect(JSON.stringify(error)).not.toContain('synthetic');
    expect(await status('default', 'provider.openai.api-key')).toBe('MISSING');
    expect(await status('default', 'search.serper.api-key')).toBe('MISSING');
  });
});
