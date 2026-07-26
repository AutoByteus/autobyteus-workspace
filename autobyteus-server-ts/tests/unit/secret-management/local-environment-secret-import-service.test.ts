import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationDatabaseLocation } from '../../../src/config/application-database-location.js';
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

  const location = (): ApplicationDatabaseLocation =>
    ApplicationDatabaseLocation.fromAbsoluteFileUrl(
      pathToFileURL(path.join(directory, 'application.db')).href,
    );

  it('previews through the inspector selected by the immutable request target', async () => {
    const sourceBefore = await writeSource(
      'OPENAI_API_KEY=synthetic-openai\nSERPER_API_KEY=synthetic-serper\n',
    );
    const targetLocation = location();
    const inspectImportTarget = vi.fn().mockResolvedValue({
      targetIdentity: targetLocation.databasePath,
      targetState: 'INITIALIZATION_REQUIRED',
      entries: [
        { secretId: 'provider.openai.api-key', observedStatus: 'MISSING', plannedAction: 'CREATE' },
        { secretId: 'search.serper.api-key', observedStatus: 'MISSING', plannedAction: 'CREATE' },
      ],
      counts: { create: 2, skipConfigured: 0, replace: 0, blocked: 0 },
      instructionCode: 'SECRET_VAULT_INITIALIZATION_REQUIRED',
    });
    const inspectorFactory = vi.fn().mockReturnValue({ inspectImportTarget });
    const runtimeFactory = vi.fn();
    const service = new LocalEnvironmentSecretImportService(
      undefined,
      inspectorFactory,
      runtimeFactory,
    );

    const plan = await service.preview({
      sourcePath,
      targetLocation,
      dryRun: true,
      overwrite: false,
    });

    expect(inspectorFactory).toHaveBeenCalledExactlyOnceWith(targetLocation);
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
    const inspectorFactory = vi.fn();
    const service = new LocalEnvironmentSecretImportService(undefined, inspectorFactory);

    await expect(service.preview({
      sourcePath,
      targetLocation: location(),
      dryRun: true,
      overwrite: false,
    })).rejects.toMatchObject({ code: 'IMPORT_NO_MAPPED_CREDENTIALS' });
    expect(inspectorFactory).not.toHaveBeenCalled();
    expect(await fs.readFile(sourcePath)).toEqual(sourceBefore);
  });

  it('never confirms or initializes a closed target', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-openai\n');
    const targetLocation = location();
    const service = new LocalEnvironmentSecretImportService(
      undefined,
      vi.fn().mockReturnValue({
        inspectImportTarget: vi.fn().mockResolvedValue({
          targetIdentity: targetLocation.databasePath,
          targetState: 'LOCKED',
          entries: [{
            secretId: 'provider.openai.api-key',
            observedStatus: 'UNAVAILABLE',
            plannedAction: 'BLOCKED',
          }],
          counts: { create: 0, skipConfigured: 0, replace: 0, blocked: 1 },
          instructionCode: 'SECRET_VAULT_LOCKED',
        }),
      }),
      vi.fn(),
    );
    const port = confirmation('IMPORT');

    await expect(service.execute({
      sourcePath,
      targetLocation,
      dryRun: false,
      overwrite: false,
    }, port)).rejects.toMatchObject({ code: 'IMPORT_TARGET_NOT_READY' });
    expect(port.readChallenge).not.toHaveBeenCalled();
  });

  it('requires the exact direct-TTY challenge before execution bootstrap', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-openai\n');
    const targetLocation = location();
    const runtimeFactory = vi.fn();
    const service = new LocalEnvironmentSecretImportService(
      undefined,
      vi.fn().mockReturnValue({
        inspectImportTarget: vi.fn().mockResolvedValue({
          targetIdentity: targetLocation.databasePath,
          targetState: 'INITIALIZATION_REQUIRED',
          entries: [{
            secretId: 'provider.openai.api-key',
            observedStatus: 'MISSING',
            plannedAction: 'CREATE',
          }],
          counts: { create: 1, skipConfigured: 0, replace: 0, blocked: 0 },
          instructionCode: 'SECRET_VAULT_INITIALIZATION_REQUIRED',
        }),
      }),
      runtimeFactory,
    );
    for (const port of [confirmation('WRONG'), confirmation(null), confirmation('IMPORT', false)]) {
      await expect(service.execute({
        sourcePath,
        targetLocation,
        dryRun: false,
        overwrite: false,
      }, port)).rejects.toMatchObject({
        code: port.isDirectTty() ? 'IMPORT_CANCELLED' : 'IMPORT_CONFIRMATION_REQUIRED',
      });
    }
    expect(runtimeFactory).not.toHaveBeenCalled();
  });

  it('carries the same target through inspection, confirmation, and execution', async () => {
    const sourceBefore = await writeSource(
      'OPENAI_API_KEY=synthetic-openai\nSERPER_API_KEY=synthetic-serper\n',
    );
    const targetLocation = location();
    const inspectImportTarget = vi.fn().mockResolvedValue({
      targetIdentity: targetLocation.databasePath,
      targetState: 'READY',
      entries: [],
      counts: { create: 1, skipConfigured: 1, replace: 0, blocked: 0 },
    });
    const inspectorFactory = vi.fn().mockReturnValue({ inspectImportTarget });
    const saveBatch = vi.fn().mockResolvedValue({
      configuredCount: 1,
      skippedCount: 1,
      replacedCount: 0,
    });
    const close = vi.fn();
    const runtimeFactory = vi.fn().mockResolvedValue({
      runtime: {
        requireService: () => ({ getHealth: vi.fn().mockResolvedValue(readyHealth), saveBatch }),
      },
      close,
    });
    const service = new LocalEnvironmentSecretImportService(
      undefined,
      inspectorFactory,
      runtimeFactory,
    );
    const port = confirmation('IMPORT');

    const result = await service.execute({
      sourcePath,
      targetLocation,
      dryRun: false,
      overwrite: false,
    }, port);

    expect(inspectorFactory).toHaveBeenCalledExactlyOnceWith(targetLocation);
    expect(port.readChallenge).toHaveBeenCalledExactlyOnceWith(
      'IMPORT',
      targetLocation,
      expect.objectContaining({
        targetIdentity: targetLocation.databasePath,
        targetState: 'READY',
      }),
    );
    expect(runtimeFactory).toHaveBeenCalledExactlyOnceWith(targetLocation);
    expect(saveBatch).toHaveBeenCalledOnce();
    expect(saveBatch.mock.calls[0]?.[0].map((entry: { secretId: string }) => entry.secretId)).toEqual([
      'provider.openai.api-key',
      'search.serper.api-key',
    ]);
    expect(saveBatch).toHaveBeenCalledWith(expect.any(Array), false);
    expect(result).toMatchObject({
      targetIdentity: targetLocation.databasePath,
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

  it('rejects a raw URL or duplicate target authority below the CLI boundary', async () => {
    await writeSource('OPENAI_API_KEY=synthetic-openai\n');
    const service = new LocalEnvironmentSecretImportService(undefined, vi.fn());

    await expect(service.preview({
      sourcePath,
      targetLocation: location(),
      dryRun: true,
      overwrite: false,
      databaseUrl: pathToFileURL(path.join(directory, 'other.db')).href,
    } as never)).rejects.toMatchObject({ code: 'IMPORT_OPTIONS_INVALID' });
  });
});
