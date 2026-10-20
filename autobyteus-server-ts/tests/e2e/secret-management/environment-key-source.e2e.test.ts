import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_VAULT_SETTING_NAME } from 'autobyteus-ts/secrets/test-vault-setting.js';
import {
  createSanitizedTestEnvironment,
  materializeTestRuntime,
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  resolveTestDatabaseLocation,
  serverRoot,
  testRuntimeRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';
import { createSyntheticTestVault } from '../../../../test-support/test-vault/synthetic-test-vault.js';

/*
 * autobyteus-ts reads AUTOBYTEUS_TEST_VAULT itself (REQ-014), and the AutoByteus
 * server turns that off because it owns its vault (AC-018). Each case runs a
 * child `node` process on the built packages, as a script or the server would:
 * autobyteus-ts from its dist, the server from its dist. Values are compared
 * inside the child by hash; nothing prints a key. Outcomes are classified by
 * `kind`/`code`, never `instanceof` across the dist/src boundary.
 */

const SYNTHETIC_DEEPSEEK = 'synthetic-environment-default-deepseek';
const SYNTHETIC_LMSTUDIO = 'synthetic-environment-default-lmstudio';
const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const runChild = (script: string, args: string[], env: Record<string, string | undefined>) => {
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', script, ...args], {
    cwd: serverRoot,
    env: createSanitizedTestEnvironment(env),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 180_000,
  });
  const line = run.stdout.split('\n').find((candidate) => candidate.startsWith('RESULT '));
  if (!line) throw new Error(`child produced no result (status ${run.status}): ${run.stderr.slice(-2_000)}`);
  return { result: JSON.parse(line.slice('RESULT '.length)), output: `${run.stdout}${run.stderr}` };
};

/** A plain script that imports only autobyteus-ts and builds a client without a resolver. */
const PLAIN_SCRIPT = `
const sqliteLoaded = () => process.moduleLoadList.some((entry) => /sqlite/i.test(entry));
const { createHash } = await import('node:crypto');
const { DeepSeekLLM } = await import('autobyteus-ts/llm/api/deepseek-llm.js');
const { LLMModel } = await import('autobyteus-ts/llm/models.js');
const { LLMProvider } = await import('autobyteus-ts/llm/providers.js');
const { LLMConfig } = await import('autobyteus-ts/llm/utils/llm-config.js');
const sqliteAfterImport = sqliteLoaded();
const llm = new DeepSeekLLM(new LLMModel({ name: 'deepseek-v4-flash', value: 'deepseek-v4-flash',
  canonicalName: 'deepseek-v4-flash', provider: LLMProvider.DEEPSEEK }), new LLMConfig());
const outcome = await llm.getClient().then(
  (client) => ({ resolved: createHash('sha256').update(client.apiKey).digest('hex') === process.argv[1] }),
  (error) => ({ kind: error.kind ?? null, code: error.code ?? null }),
);
await llm.cleanup();
console.log('RESULT ' + JSON.stringify({ sqliteAfterImport, outcome, sqliteAfterLookup: sqliteLoaded() }));
process.exit(0);
`;

/** The built server started with the selector, then probed from inside its own process. */
const SERVER_SCRIPT = `
const [runtimeRoot, port, expectedLmStudioHash] = process.argv.slice(1);
const { createHash } = await import('node:crypto');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const { appConfigProvider } = await import('./dist/config/app-config-provider.js');
appConfigProvider.initialize({ appDataDir: runtimeRoot }).initialize();
const { startConfiguredServer } = await import('./dist/server-runtime.js');
await startConfiguredServer({ host: '127.0.0.1', port: Number(port), dataDir: runtimeRoot });
const { DeepSeekLLM } = await import('autobyteus-ts/llm/api/deepseek-llm.js');
const { LLMModel } = await import('autobyteus-ts/llm/models.js');
const { LLMProvider } = await import('autobyteus-ts/llm/providers.js');
const { LLMConfig } = await import('autobyteus-ts/llm/utils/llm-config.js');
const llm = new DeepSeekLLM(new LLMModel({ name: 'deepseek-v4-flash', value: 'deepseek-v4-flash',
  canonicalName: 'deepseek-v4-flash', provider: LLMProvider.DEEPSEEK }), new LLMConfig());
const clientWithoutResolver = await llm.getClient().then(
  () => ({ resolved: true }),
  (error) => ({ kind: error.kind ?? null, code: error.code ?? null }),
);
await llm.cleanup();
const { createLlmProviderApiKeyResolver } = await import('./dist/secret-management/resolution/runtime-provider-api-key-resolvers.js');
const serverResolverReadsSelectedVault =
  hash((await createLlmProviderApiKeyResolver().resolve('LMSTUDIO')).revealToTrustedConsumer()) === expectedLmStudioHash;
console.log('RESULT ' + JSON.stringify({ clientWithoutResolver, serverResolverReadsSelectedVault }));
process.exit(0);
`;

describe('autobyteus-ts environment key source (built packages)', () => {
  let root: string;
  let vaultDirectory: string;
  const owned: Array<{ runtimeRoot: string; database: ReturnType<typeof resolveTestDatabaseLocation> }> = [];

  beforeAll(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'environment-key-source-e2e-')));
    vaultDirectory = path.join(root, 'vault');
    createSyntheticTestVault(vaultDirectory, {
      'provider.deepseek.api-key': SYNTHETIC_DEEPSEEK,
      'provider.lmstudio.api-key': SYNTHETIC_LMSTUDIO,
    });
  });

  afterAll(async () => {
    for (const target of owned) await removeOwnedTestRuntime(target.runtimeRoot, target.database);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('a plain script without the variable gets MissingApiKeyError and loads no node:sqlite', () => {
    const { result } = runChild(PLAIN_SCRIPT, [sha256(SYNTHETIC_DEEPSEEK)], {});
    expect(result).toEqual({
      sqliteAfterImport: false,
      outcome: { kind: 'missing_api_key', code: null },
      sqliteAfterLookup: false,
    });
  });

  it('a plain script with only AUTOBYTEUS_TEST_VAULT set gets the key from the test vault (AC-013)', () => {
    const { result, output } = runChild(PLAIN_SCRIPT, [sha256(SYNTHETIC_DEEPSEEK)], {
      [TEST_VAULT_SETTING_NAME]: vaultDirectory,
    });
    expect(result).toEqual({ sqliteAfterImport: false, outcome: { resolved: true }, sqliteAfterLookup: true });
    expect(output).not.toContain(SYNTHETIC_DEEPSEEK);
  });

  it('the server turns the default off: a client without a resolver fails, the server resolvers follow its source (AC-018)', async () => {
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const target = {
      runtimeRoot: path.join(testRuntimeRoot, `environment-key-source-${suffix}`),
      database: resolveTestDatabaseLocation(`file:./db/environment-key-source-${suffix}.db`),
    };
    owned.push(target);
    const port = await reserveLoopbackPort();
    materializeTestRuntime({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
      serverUrlOverride: `http://127.0.0.1:${port}`,
    });
    const { result, output } = runChild(
      SERVER_SCRIPT,
      [target.runtimeRoot, String(port), sha256(SYNTHETIC_LMSTUDIO)],
      { [TEST_VAULT_SETTING_NAME]: vaultDirectory },
    );
    expect(output).toContain(`Secret vault: test vault ${vaultDirectory} (read-only)`);
    expect(result).toEqual({
      clientWithoutResolver: { kind: 'missing_api_key', code: null },
      serverResolverReadsSelectedVault: true,
    });
    expect(output).not.toContain(SYNTHETIC_DEEPSEEK);
    expect(output).not.toContain(SYNTHETIC_LMSTUDIO);
  }, 240_000);
});
