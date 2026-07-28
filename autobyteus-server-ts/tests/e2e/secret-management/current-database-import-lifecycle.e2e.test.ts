import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationDatabaseLocation } from '../../../src/config/application-database-location.js';
import { runLocalEnvironmentImportCli } from '../../../src/secret-management/cli/import-local-environment-secrets.js';
import { SecretVaultRuntime } from '../../../src/secret-management/secret-vault-runtime.js';
import {
  LocalEnvironmentSecretImportService,
  type LocalImportConfirmationPort,
} from '../../../src/secret-management/provisioning/local-environment-secret-import-service.js';
import {
  readTrackedTestEnvironment,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

const digest = (candidate: string): string =>
  createHash('sha256').update(fs.readFileSync(candidate)).digest('hex');

const confirmation = (
  response: string | null,
  direct = true,
): LocalImportConfirmationPort => ({
  isDirectTty: () => direct,
  readChallenge: vi.fn().mockResolvedValue(response),
});

const targetEnvironmentKeys = [
  'APP_ENV',
  'AUTOBYTEUS_SERVER_HOST',
  'DATABASE_URL',
  'DB_NAME',
] as const;

describe('explicit target database importer lifecycle', () => {
  let runtimeRoot: string | null = null;
  let database: ReturnType<typeof resolveTestDatabaseLocation> | null = null;
  const originalCwd = process.cwd();
  const originalEnvironment = new Map(
    targetEnvironmentKeys.map((key) => [key, process.env[key]]),
  );

  afterEach(async () => {
    process.chdir(originalCwd);
    for (const [key, value] of originalEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (runtimeRoot && database) await removeOwnedTestRuntime(runtimeRoot, database);
    runtimeRoot = null;
    database = null;
  });

  it('ignores every implicit redirect, previews read-only, imports transactionally, and reopens the explicit database', async () => {
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    runtimeRoot = path.join(testRuntimeRoot, `current-db-import-${suffix}`);
    database = resolveTestDatabaseLocation(`file:./db/current-db-import-${suffix}.db`);
    const targetLocation = ApplicationDatabaseLocation.fromAbsoluteFileUrl(database.databaseUrl);
    const hostileCwd = path.join(runtimeRoot, 'hostile-cwd');
    const ambientDatabase = path.join(runtimeRoot, 'ambient-redirect.db');
    const sourceDatabase = path.join(runtimeRoot, 'source-redirect.db');
    const cwdEnvironmentDatabase = path.join(runtimeRoot, 'cwd-env-redirect.db');
    const cwdTestEnvironmentDatabase = path.join(runtimeRoot, 'cwd-env-test-redirect.db');
    const sourcePath = path.join(runtimeRoot, 'operator-selected.current-environment');
    const source = Buffer.from([
      'GEMINI_API_KEY=',
      'VERTEX_AI_API_KEY=synthetic-vertex-express-import-canary',
      'OPENAI_API_KEY=synthetic-openai-import-canary',
      'DASHSCOPE_API_KEY=synthetic-qwen-import-canary',
      'QWEN_API_KEY=legacy-unmapped-nonblocking',
      'ZHIPU_API_KEY=legacy-unmapped-nonblocking',
      `DATABASE_URL=${pathToFileURL(sourceDatabase).href}`,
      '',
    ].join('\n'));
    const templateBefore = readTrackedTestEnvironment().bytes;

    const initializer = await startBuiltTestServer({
      runtimeRoot,
      databaseUrlOverride: database.databaseUrl,
    });
    await initializer.stop();
    fs.writeFileSync(sourcePath, source, { mode: 0o600 });
    if (process.platform !== 'win32') fs.chmodSync(sourcePath, 0o600);
    fs.mkdirSync(hostileCwd, { recursive: true, mode: 0o700 });
    fs.writeFileSync(
      path.join(hostileCwd, '.env'),
      `DATABASE_URL=${pathToFileURL(cwdEnvironmentDatabase).href}\n`,
      { mode: 0o600 },
    );
    fs.writeFileSync(
      path.join(hostileCwd, '.env.test'),
      `DATABASE_URL=${pathToFileURL(cwdTestEnvironmentDatabase).href}\n`,
      { mode: 0o600 },
    );
    process.env.APP_ENV = 'production';
    process.env.AUTOBYTEUS_SERVER_HOST = 'http://127.0.0.1:29999';
    process.env.DATABASE_URL = pathToFileURL(ambientDatabase).href;
    process.env.DB_NAME = ambientDatabase;
    process.chdir(hostileCwd);

    const service = new LocalEnvironmentSecretImportService();
    const databaseHashBeforePreview = digest(database.databasePath);
    const databaseMtimeBeforePreview = fs.statSync(database.databasePath).mtimeMs;
    const keyHashBeforePreview = digest(database.rootKeyPath);
    const keyMtimeBeforePreview = fs.statSync(database.rootKeyPath).mtimeMs;
    const sourceHashBeforePreview = digest(sourcePath);
    const cwdEnvironmentHashBeforePreview = digest(path.join(hostileCwd, '.env'));
    const cwdTestEnvironmentHashBeforePreview = digest(path.join(hostileCwd, '.env.test'));

    const cliPlan = await runLocalEnvironmentImportCli([
      '--source', sourcePath,
      '--database-url', targetLocation.databaseUrl,
      '--dry-run',
    ]);
    expect(cliPlan).toContain(`TARGET ${targetLocation.databasePath}`);
    for (const redirect of [
      ambientDatabase,
      sourceDatabase,
      cwdEnvironmentDatabase,
      cwdTestEnvironmentDatabase,
    ]) {
      expect(cliPlan).not.toContain(redirect);
      expect(fs.existsSync(redirect)).toBe(false);
      expect(fs.existsSync(`${redirect}.secret.key`)).toBe(false);
    }

    const plan = await service.preview({
      sourcePath,
      targetLocation,
      dryRun: true,
      overwrite: false,
    });
    expect(plan.targetIdentity).toBe(database.databasePath);
    expect(plan.targetState).toBe('READY');
    expect(plan.entries.map((entry) => String(entry.secretId))).toEqual([
      'provider.google.vertex-express.api-key',
      'provider.openai.api-key',
      'provider.qwen.api-key',
    ]);
    expect(plan.counts).toEqual({
      create: 3,
      skipConfigured: 0,
      replace: 0,
      blocked: 0,
    });
    expect(JSON.stringify(plan)).not.toContain('synthetic-');
    expect(fs.readFileSync(sourcePath)).toEqual(source);
    expect(digest(sourcePath)).toBe(sourceHashBeforePreview);
    expect(digest(path.join(hostileCwd, '.env'))).toBe(cwdEnvironmentHashBeforePreview);
    expect(digest(path.join(hostileCwd, '.env.test'))).toBe(cwdTestEnvironmentHashBeforePreview);
    expect(digest(database.databasePath)).toBe(databaseHashBeforePreview);
    expect(fs.statSync(database.databasePath).mtimeMs).toBe(databaseMtimeBeforePreview);
    expect(digest(database.rootKeyPath)).toBe(keyHashBeforePreview);
    expect(fs.statSync(database.rootKeyPath).mtimeMs).toBe(keyMtimeBeforePreview);

    for (const port of [confirmation('IMPORT', false), confirmation('WRONG')]) {
      await expect(service.execute({
        sourcePath,
        targetLocation,
        dryRun: false,
        overwrite: false,
      }, port)).rejects.toMatchObject({
        code: port.isDirectTty() ? 'IMPORT_CANCELLED' : 'IMPORT_CONFIRMATION_REQUIRED',
      });
    }
    expect(digest(database.databasePath)).toBe(databaseHashBeforePreview);
    expect(digest(database.rootKeyPath)).toBe(keyHashBeforePreview);

    const result = await service.execute({
      sourcePath,
      targetLocation,
      dryRun: false,
      overwrite: false,
    }, confirmation('IMPORT'));
    expect(result).toEqual({
      targetIdentity: database.databasePath,
      targetState: 'READY',
      secretIds: [
        'provider.google.vertex-express.api-key',
        'provider.openai.api-key',
        'provider.qwen.api-key',
      ],
      configuredCount: 3,
      skippedCount: 0,
      replacedCount: 0,
      instructionCode: 'NONE',
    });
    expect(JSON.stringify(result)).not.toContain('synthetic-');

    const reopened = new SecretVaultRuntime();
    await reopened.initialize(targetLocation);
    try {
      const management = reopened.requireService();
      await expect(management.getStatusForConsumer({
        kind: 'llm',
        providerId: 'OPENAI',
        credentialSlot: 'apiKey',
      })).resolves.toBe('CONFIGURED');
      await expect(management.getStatusForConsumer({
        kind: 'llm',
        providerId: 'GEMINI',
        credentialSlot: 'geminiAiStudioApiKey',
      })).resolves.toBe('MISSING');
      await expect(management.getStatusForConsumer({
        kind: 'llm',
        providerId: 'GEMINI',
        credentialSlot: 'geminiVertexExpressApiKey',
      })).resolves.toBe('CONFIGURED');
      await expect(management.getStatusForConsumer({
        kind: 'llm',
        providerId: 'QWEN',
        credentialSlot: 'apiKey',
      })).resolves.toBe('CONFIGURED');
    } finally {
      await reopened.close();
    }

    expect(fs.readFileSync(sourcePath)).toEqual(source);
    expect(readTrackedTestEnvironment().bytes).toEqual(templateBefore);
    for (const redirect of [
      ambientDatabase,
      sourceDatabase,
      cwdEnvironmentDatabase,
      cwdTestEnvironmentDatabase,
    ]) {
      expect(fs.existsSync(redirect)).toBe(false);
      expect(fs.existsSync(`${redirect}.secret.key`)).toBe(false);
    }
    expect(fs.existsSync(`${database.databasePath}.secret-store.db`)).toBe(false);
    expect(fs.existsSync(`${database.databasePath}.secret-store.key`)).toBe(false);
  }, 240_000);
});
