import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveApplicationDatabaseLocation } from '../../../src/config/application-database-location.js';
import {
  LocalEnvironmentSecretImportService,
  type LocalImportConfirmationPort,
} from '../../../src/secret-management/provisioning/local-environment-secret-import-service.js';

const readyHealth = { state: 'READY' as const };
const confirmation = (response: string | null, direct = true): LocalImportConfirmationPort => ({
  isDirectTty: () => direct,
  readChallenge: vi.fn().mockResolvedValue(response),
});

describe('LocalEnvironmentSecretImportService', () => {
  let directory: string;
  let sourcePath: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'local-environment-import-'));
    if (process.platform !== 'win32') await fs.chmod(directory, 0o700);
    sourcePath = path.join(directory, 'operator-selected.assignments');
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  const writeSource = async (content: string): Promise<Buffer> => {
    await fs.writeFile(sourcePath, content, { mode: 0o600 });
    if (process.platform !== 'win32') await fs.chmod(sourcePath, 0o600);
    return fs.readFile(sourcePath);
  };

  const location = () => resolveApplicationDatabaseLocation('file:application.db', directory);

  it('previews only through the injected narrow inspector and preserves source bytes', async () => {
    const sourceBefore = await writeSource(
      'OPENAI_API_KEY=synthetic-openai\nSERPER_API_KEY=synthetic-serper\n',
    );
    const inspectImportTarget = vi.fn().mockResolvedValue({
      targetIdentity: location().databasePath,
      targetState: 'INITIALIZATION_REQUIRED',
      entries: [
        { secretId: 'provider.openai.api-key', observedStatus: 'MISSING', plannedAction: 'CREATE' },
        { secretId: 'search.serper.api-key', observedStatus: 'MISSING', plannedAction: 'CREATE' },
      ],
      counts: { create: 2, skipConfigured: 0, replace: 0, blocked: 0 },
      instructionCode: 'SECRET_VAULT_INITIALIZATION_REQUIRED',
    });
    const runtimeFactory = vi.fn();
    const service = new LocalEnvironmentSecretImportService(
      location(),
      undefined,
      { inspectImportTarget } as never,
      runtimeFactory,
    );

    const plan = await service.preview({
      sourceAbsolutePath: sourcePath,
      dryRun: true,
      overwrite: false,
    });

    expect(inspectImportTarget).toHaveBeenCalledWith([
      'provider.openai.api-key',
      'search.serper.api-key',
    ], false);
    expect(runtimeFactory).not.toHaveBeenCalled();
    expect(plan.counts.create).toBe(2);
    expect(JSON.stringify(plan)).not.toContain('synthetic');
    expect(await fs.readFile(sourcePath)).toEqual(sourceBefore);
  });

  it('rejects all-empty recognized input before target inspection', async () => {
    const sourceBefore = await writeSource(
      'OPENAI_API_KEY=\nOPENAI_API_KEY=""\nGEMINI_API_KEY=   \n',
    );
    const inspectImportTarget = vi.fn();
    const service = new LocalEnvironmentSecretImportService(
      location(),
      undefined,
      { inspectImportTarget } as never,
    );

    await expect(service.preview({
      sourceAbsolutePath: sourcePath,
      dryRun: true,
      overwrite: false,
    })).rejects.toMatchObject({ code: 'IMPORT_NO_MAPPED_CREDENTIALS' });
    expect(inspectImportTarget).not.toHaveBeenCalled();
    expect(await fs.readFile(sourcePath)).toEqual(sourceBefore);
  });

  it('never confirms or initializes a closed target', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-openai\n');
    const service = new LocalEnvironmentSecretImportService(
      location(),
      undefined,
      {
        inspectImportTarget: vi.fn().mockResolvedValue({
          targetIdentity: location().databasePath,
          targetState: 'LOCKED',
          entries: [{
            secretId: 'provider.openai.api-key',
            observedStatus: 'UNAVAILABLE',
            plannedAction: 'BLOCKED',
          }],
          counts: { create: 0, skipConfigured: 0, replace: 0, blocked: 1 },
          instructionCode: 'SECRET_VAULT_LOCKED',
        }),
      } as never,
      vi.fn(),
    );
    const port = confirmation('IMPORT');

    await expect(service.execute({
      sourceAbsolutePath: sourcePath,
      dryRun: false,
      overwrite: false,
    }, port)).rejects.toMatchObject({ code: 'IMPORT_TARGET_NOT_READY' });
    expect(port.readChallenge).not.toHaveBeenCalled();
  });

  it('requires the exact direct-TTY challenge before execution bootstrap', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-openai\n');
    const runtimeFactory = vi.fn();
    const service = new LocalEnvironmentSecretImportService(
      location(),
      undefined,
      {
        inspectImportTarget: vi.fn().mockResolvedValue({
          targetIdentity: location().databasePath,
          targetState: 'INITIALIZATION_REQUIRED',
          entries: [{
            secretId: 'provider.openai.api-key',
            observedStatus: 'MISSING',
            plannedAction: 'CREATE',
          }],
          counts: { create: 1, skipConfigured: 0, replace: 0, blocked: 0 },
          instructionCode: 'SECRET_VAULT_INITIALIZATION_REQUIRED',
        }),
      } as never,
      runtimeFactory,
    );
    for (const port of [confirmation('WRONG'), confirmation(null), confirmation('IMPORT', false)]) {
      await expect(service.execute({
        sourceAbsolutePath: sourcePath,
        dryRun: false,
        overwrite: false,
      }, port)).rejects.toMatchObject({
        code: port.isDirectTty() ? 'IMPORT_CANCELLED' : 'IMPORT_CONFIRMATION_REQUIRED',
      });
    }
    expect(runtimeFactory).not.toHaveBeenCalled();
  });

  it('bootstraps only after confirmation and reports authoritative batch counts', async () => {
    const sourceBefore = await writeSource(
      'OPENAI_API_KEY=synthetic-openai\nSERPER_API_KEY=synthetic-serper\n',
    );
    const saveBatch = vi.fn().mockResolvedValue({
      configuredCount: 1,
      skippedCount: 1,
      replacedCount: 0,
    });
    const close = vi.fn();
    const service = new LocalEnvironmentSecretImportService(
      location(),
      undefined,
      {
        inspectImportTarget: vi.fn().mockResolvedValue({
          targetIdentity: location().databasePath,
          targetState: 'READY',
          entries: [],
          counts: { create: 1, skipConfigured: 1, replace: 0, blocked: 0 },
        }),
      } as never,
      vi.fn().mockResolvedValue({
        runtime: {
          requireService: () => ({ getHealth: vi.fn().mockResolvedValue(readyHealth), saveBatch }),
        },
        close,
      }),
    );

    const result = await service.execute({
      sourceAbsolutePath: sourcePath,
      dryRun: false,
      overwrite: false,
    }, confirmation('IMPORT'));

    expect(saveBatch).toHaveBeenCalledOnce();
    expect(saveBatch.mock.calls[0]?.[0].map((entry: { secretId: string }) => entry.secretId)).toEqual([
      'provider.openai.api-key',
      'search.serper.api-key',
    ]);
    expect(saveBatch).toHaveBeenCalledWith(expect.any(Array), false);
    expect(result).toMatchObject({
      targetIdentity: location().databasePath,
      targetState: 'READY',
      configuredCount: 1,
      skippedCount: 1,
      replacedCount: 0,
      instructionCode: 'NONE',
    });
    expect(JSON.stringify(result)).not.toContain('synthetic');
    expect(close).toHaveBeenCalledOnce();
    expect(await fs.readFile(sourcePath)).toEqual(sourceBefore);
  });
});
