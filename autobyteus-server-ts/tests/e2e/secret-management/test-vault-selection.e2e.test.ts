import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApplicationDatabaseLocation } from '../../../src/config/application-database-location.js';
import { secretId } from '../../../src/secret-management/domain/secret-id.js';
import { getSecretVaultRuntime } from '../../../src/secret-management/secret-vault-runtime.js';
import {
  createSanitizedTestEnvironment,
  materializeTestRuntime,
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  resolveTestDatabaseLocation,
  serverRoot,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';
import { closeLiveServerVault, initializeLiveServerVault } from '../../../../test-support/test-vault/live-server-vault.js';
import { captureTestVaultSelection, TEST_VAULT_SETTING_NAME } from '../../../../test-support/test-vault/test-vault.js';

/*
 * The test vault selected like a database (REQ-005, REQ-007, REQ-016):
 * - a built test server started with the live opt-in reads the test vault read-only (AC-016);
 * - a selected vault that is missing stops the server (AC-016);
 * - deterministic harnesses keep their own vaults even with the selector exported (AC-017).
 * The vault is created by the real `test-vault setup` CLI from a synthetic secrets file.
 */

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;

const LMSTUDIO_CANARY = 'synthetic-test-vault-lmstudio-canary';
const cli = path.join(serverRoot, 'dist', 'secret-management', 'cli', 'test-vault-cli.js');
const digest = (file: string): string => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const graphql = async (server: RunningTestServer, query: string, variables: Record<string, unknown> = {}) => {
  const response = await fetch(`${server.serverUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return await response.json() as { data?: Record<string, any>; errors?: Array<{ message: string }> };
};

const lmStudioConfigured = async (server: RunningTestServer): Promise<boolean> => {
  const result = await graphql(server, `
    query { providerCredentialSettings(runtimeKind: "autobyteus") { provider { id } apiKeyConfigured } }
  `);
  return result.data!.providerCredentialSettings
    .find((setting: { provider: { id: string } }) => setting.provider.id === 'LMSTUDIO').apiKeyConfigured;
};

const saveLmStudioKey = (server: RunningTestServer) => graphql(server, `
  mutation Save($apiKey: String!) {
    saveProviderApiKey(providerId: "LMSTUDIO", apiKey: $apiKey) { apiKeyConfigured }
  }
`, { apiKey: 'synthetic-replacement-attempt' });

describe('test vault selection E2E', () => {
  let root: string;
  let vaultDirectory: string;
  let vaultFiles: string[];
  const owned: Array<{ runtimeRoot: string; database: ReturnType<typeof resolveTestDatabaseLocation> }> = [];

  const ownedRuntime = (label: string) => {
    const suffix = `${label}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const target = {
      runtimeRoot: path.join(testRuntimeRoot, `test-vault-${suffix}`),
      database: resolveTestDatabaseLocation(`file:./db/test-vault-${suffix}.db`),
    };
    owned.push(target);
    return target;
  };

  beforeAll(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'test-vault-e2e-')));
    vaultDirectory = path.join(root, 'vault');
    const source = path.join(root, 'secrets.env');
    fs.writeFileSync(source, `LMSTUDIO_API_KEY=${LMSTUDIO_CANARY}\n`, { mode: 0o600 });
    const setup = spawnSync(process.execPath, [cli, 'setup', '--source', source], {
      cwd: serverRoot,
      env: createSanitizedTestEnvironment({ [TEST_VAULT_SETTING_NAME]: vaultDirectory }),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(setup.status, setup.stderr).toBe(0);
    expect(setup.stdout).toContain(`SETTING ${TEST_VAULT_SETTING_NAME}=${vaultDirectory}`);
    expect(`${setup.stdout}${setup.stderr}`).not.toContain(LMSTUDIO_CANARY);
    vaultFiles = [path.join(vaultDirectory, 'test-vault.db'), path.join(vaultDirectory, 'test-vault.db.secret.key')];
  }, 180_000);

  afterAll(async () => {
    for (const target of owned) await removeOwnedTestRuntime(target.runtimeRoot, target.database);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('a built test server started with the live opt-in reads the test vault read-only', async () => {
    const before = vaultFiles.map(digest);
    const target = ownedRuntime('selected');
    const server = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
      testVaultSetting: vaultDirectory,
    });
    try {
      expect(server.output()).toContain(`Secret vault: test vault ${vaultDirectory} (read-only)`);
      expect(await lmStudioConfigured(server)).toBe(true);
      const save = await saveLmStudioKey(server);
      expect(save.errors?.map((error) => error.message).join('\n')).toContain('SECRET_VAULT_READ_ONLY');
    } finally {
      await server.stop();
    }
    expect(server.output()).not.toContain(LMSTUDIO_CANARY);
    expect(vaultFiles.map(digest)).toEqual(before);
    expect(fs.readdirSync(vaultDirectory).sort()).toEqual(['test-vault.db', 'test-vault.db.secret.key']);
  }, 180_000);

  it('a selected vault that is missing stops the server with TEST_VAULT_NOT_FOUND; no fallback', async () => {
    const target = ownedRuntime('missing');
    const port = await reserveLoopbackPort();
    const runtime = materializeTestRuntime({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
      serverUrlOverride: `http://127.0.0.1:${port}`,
    });
    const child = spawn(process.execPath, [
      path.join(serverRoot, 'dist', 'app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', runtime.runtimeRoot,
    ], {
      cwd: serverRoot,
      env: createSanitizedTestEnvironment({ [TEST_VAULT_SETTING_NAME]: path.join(root, 'no-vault-here') }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { output += chunk.toString('utf8'); });
    const exitCode = await new Promise<number | null>((resolve) => child.once('close', resolve));
    expect(exitCode).not.toBe(0);
    expect(output).toContain('SECRET_VAULT_INITIALIZATION_FAILED');
    expect(output).toContain('TEST_VAULT_NOT_FOUND');
    expect(output).toContain('pnpm test-vault setup');
    expect(output).not.toContain(`Server listening on 127.0.0.1:${port}`);
  }, 180_000);

  it('a built test server without the live opt-in keeps its own vault even with the selector exported', async () => {
    const previous = process.env[TEST_VAULT_SETTING_NAME];
    process.env[TEST_VAULT_SETTING_NAME] = vaultDirectory;
    const target = ownedRuntime('deterministic');
    let server: RunningTestServer | null = null;
    try {
      server = await startBuiltTestServer({
        runtimeRoot: target.runtimeRoot,
        databaseUrlOverride: target.database.databaseUrl,
      });
      expect(server.output()).toContain('Secret vault: application database');
      expect(await lmStudioConfigured(server)).toBe(false);
      const save = await saveLmStudioKey(server);
      expect(save.errors).toBeUndefined();
      expect(save.data?.saveProviderApiKey.apiKeyConfigured).toBe(true);
    } finally {
      if (previous === undefined) delete process.env[TEST_VAULT_SETTING_NAME];
      else process.env[TEST_VAULT_SETTING_NAME] = previous;
      await server?.stop();
    }
  }, 180_000);

  it('the secret-lifecycle suites give the same results with the selector exported (AC-017)', () => {
    const run = spawnSync('pnpm', [
      'exec', 'vitest', 'run',
      'tests/e2e/secret-management/provider-secret-lifecycle-graphql.e2e.test.ts',
      'tests/e2e/secret-management/server-restart-secret-lifecycle.e2e.test.ts',
      '--no-watch',
    ], {
      cwd: serverRoot,
      env: { ...process.env, [TEST_VAULT_SETTING_NAME]: vaultDirectory },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const output = `${run.stdout}${run.stderr}`;
    expect(run.status, output.slice(-4_000)).toBe(0);
    expect(output).toMatch(/Test Files\s+.*2 passed/);
    expect(output).not.toContain('SECRET_VAULT_READ_ONLY');
  }, 600_000);

  it('an in-process live suite opts in through initializeLiveServerVault', async () => {
    captureTestVaultSelection({ [TEST_VAULT_SETTING_NAME]: vaultDirectory });
    const target = ownedRuntime('in-process');
    try {
      const source = await initializeLiveServerVault({
        databaseLocation: ApplicationDatabaseLocation.fromAbsoluteFileUrl(pathToFileURL(target.database.databasePath).href),
        appDataDir: target.runtimeRoot,
      });
      expect(source).toEqual({ kind: 'test', directory: vaultDirectory });
      expect(await getSecretVaultRuntime().requireService().getStatusForSecretId(secretId('provider.lmstudio.api-key')))
        .toBe('CONFIGURED');
    } finally {
      await closeLiveServerVault();
      captureTestVaultSelection({ [TEST_VAULT_SETTING_NAME]: '' });
    }
  });
});
