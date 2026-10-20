/**
 * Upgrade start with leftover data from the removed remote AutoByteus provider.
 *
 * Purpose: an install that had the remote AutoByteus LLM provider configured keeps
 * `AUTOBYTEUS_LLM_SERVER_HOSTS` in its server `.env` and an encrypted
 * `provider.autobyteus.api-key` row in its vault. After the provider's removal,
 * the server must start normally, every other provider must keep working, the
 * host value must appear as an ordinary deletable custom setting, and the vault
 * row must stay inert (never rewritten, never needed). Remote provider requests
 * are rejected as unknown.
 *
 * Boundary: the built server (`dist/app.js`) on a test-owned runtime root and
 * SQLite database, driven over HTTP GraphQL across real restarts. The leftover
 * vault row is written while the server is stopped with the unchanged vault
 * entry encryption, so it is byte-format-identical to a row the released
 * importer wrote. A loopback OpenAI-compatible endpoint records the credential
 * a custom provider's discovery sends, proving vault resolution still works.
 *
 * Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree.
 * Run: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/secret-management/removed-remote-provider-leftover-startup.e2e.test.ts --no-watch`
 * (a clean environment such as `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR"` is recommended).
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { encryptSecretEntry } from 'autobyteus-ts/secrets/vault/secret-vault-crypto.js';
import type { SecretId } from 'autobyteus-ts/secrets/vault/secret-id.js';
import {
  createSanitizedTestEnvironment,
  executeGraphql,
  materializeTestRuntime,
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type DatabaseLocation = ReturnType<typeof resolveTestDatabaseLocation>;

const LEFTOVER_HOST_KEY = 'AUTOBYTEUS_LLM_SERVER_HOSTS';
const LEFTOVER_HOST_VALUE = 'https://remote-llm.example.invalid:8000';
const LEFTOVER_SECRET_ID = 'provider.autobyteus.api-key';
const LEFTOVER_SECRET_CANARY = 'synthetic-removed-remote-provider-key';
const CUSTOM_PROVIDER_KEY = 'synthetic-custom-provider-key-after-upgrade';

const runningServers = new Set<RunningTestServer>();
const ownedTargets: Array<{ runtimeRoot: string; database: DatabaseLocation }> = [];
const ownedEndpoints = new Set<http.Server>();

afterEach(async () => {
  for (const server of runningServers) {
    if (server.child.exitCode === null) server.child.kill('SIGKILL');
  }
  runningServers.clear();
  for (const endpoint of ownedEndpoints) {
    await new Promise<void>((resolve) => endpoint.close(() => resolve()));
  }
  ownedEndpoints.clear();
  for (const target of ownedTargets.splice(0)) {
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

const startOpenAiCompatibleEndpoint = async () => {
  const authorizations: string[] = [];
  const server = http.createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/v1/models') {
      authorizations.push(String(request.headers.authorization ?? ''));
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ data: [{ id: 'upgrade-check-model' }] }));
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  ownedEndpoints.add(server);
  const { port } = server.address() as AddressInfo;
  return { baseUrl: `http://127.0.0.1:${port}/v1`, authorizations };
};

const rawGraphql = async (serverUrl: string, query: string, variables: Record<string, unknown> = {}) => {
  const response = await fetch(`${serverUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return await response.json() as {
    data?: Record<string, any> | null;
    errors?: Array<{ message: string }>;
  };
};

const providerState = async (serverUrl: string) => await executeGraphql<{
  getSecretVaultStatus: { health: string; instructionCode: string | null };
  providerCredentialSettings: Array<{ provider: { id: string }; apiKeyConfigured: boolean }>;
  providerModelCatalogSnapshots: Array<{
    ownerProvider: { id: string };
    llmModels: Array<{ modelIdentifier: string }>;
    audioModels: Array<{ modelIdentifier: string; runtime: string; hostUrl: string | null }>;
    imageModels: Array<{ modelIdentifier: string; runtime: string; hostUrl: string | null }>;
  }>;
  getServerSettings: Array<{
    key: string;
    value: string;
    description: string;
    isEditable: boolean;
    isDeletable: boolean;
  }>;
}>(serverUrl, `
  query UpgradeState {
    getSecretVaultStatus { health instructionCode }
    providerCredentialSettings(runtimeKind: "autobyteus") {
      provider { id }
      apiKeyConfigured
    }
    providerModelCatalogSnapshots(runtimeKind: "autobyteus") {
      ownerProvider { id }
      llmModels { modelIdentifier }
      audioModels { modelIdentifier runtime hostUrl }
      imageModels { modelIdentifier runtime hostUrl }
    }
    getServerSettings { key value description isEditable isDeletable }
  }
`);

const readVaultRow = (databasePath: string, secretId: string) => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const row = database.prepare(
      'SELECT nonce, ciphertext, authentication_tag FROM secret_entries WHERE secret_id = ?',
    ).get(secretId) as { nonce: Uint8Array; ciphertext: Uint8Array; authentication_tag: Uint8Array } | undefined;
    return row
      ? Buffer.concat([Buffer.from(row.nonce), Buffer.from(row.ciphertext), Buffer.from(row.authentication_tag)]).toString('hex')
      : null;
  } finally {
    database.close();
  }
};

const writeLeftoverVaultRow = (database: DatabaseLocation): string => {
  const rootKey = fs.readFileSync(database.rootKeyPath);
  const sqlite = new DatabaseSync(database.databasePath);
  try {
    const metadata = sqlite.prepare(
      'SELECT encryption_domain_id, encryption_format_version FROM secret_encryption_metadata WHERE singleton_id = 1',
    ).get() as { encryption_domain_id: Uint8Array; encryption_format_version: number } | undefined;
    if (!metadata) throw new Error('LEFTOVER_VAULT_METADATA_MISSING');
    const payload = encryptSecretEntry(
      rootKey,
      Buffer.from(metadata.encryption_domain_id),
      LEFTOVER_SECRET_ID as SecretId,
      Buffer.from(LEFTOVER_SECRET_CANARY, 'utf8'),
      metadata.encryption_format_version,
    );
    sqlite.prepare(
      'INSERT INTO secret_entries (secret_id, nonce, ciphertext, authentication_tag) VALUES (?, ?, ?, ?)',
    ).run(LEFTOVER_SECRET_ID, payload.nonce, payload.ciphertext, payload.authenticationTag);
  } finally {
    sqlite.close();
    rootKey.fill(0);
  }
  const written = readVaultRow(database.databasePath, LEFTOVER_SECRET_ID);
  if (!written) throw new Error('LEFTOVER_VAULT_ROW_NOT_WRITTEN');
  return written;
};

const assertNoRemoteProvider = (state: Awaited<ReturnType<typeof providerState>>) => {
  expect(state.providerCredentialSettings.map(({ provider }) => provider.id)).not.toContain('AUTOBYTEUS');
  expect(state.providerModelCatalogSnapshots.map(({ ownerProvider }) => ownerProvider.id)).not.toContain('AUTOBYTEUS');
  const identifiers = state.providerModelCatalogSnapshots.flatMap((snapshot) => [
    ...snapshot.llmModels,
    ...snapshot.audioModels,
    ...snapshot.imageModels,
  ].map(({ modelIdentifier }) => modelIdentifier));
  expect(identifiers.filter((identifier) => identifier.includes(':autobyteus@'))).toEqual([]);
  expect(identifiers.filter((identifier) => identifier.includes('remote-llm.example.invalid'))).toEqual([]);
  for (const media of state.providerModelCatalogSnapshots.flatMap((snapshot) => [
    ...snapshot.audioModels,
    ...snapshot.imageModels,
  ])) {
    expect(media.runtime).toBe('api');
    expect(media.hostUrl).toBeNull();
  }
};

describe('upgrade start with removed remote AutoByteus provider leftovers', () => {
  it('starts normally, keeps other providers working, lists the host key as deletable custom data, and leaves the vault row inert', async () => {
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const runtimeRoot = path.join(testRuntimeRoot, `removed-remote-leftover-${suffix}`);
    const database = resolveTestDatabaseLocation(`file:./db/removed-remote-leftover-${suffix}.db`);
    ownedTargets.push({ runtimeRoot, database });
    const isolatedHome = path.join(runtimeRoot, 'isolated-home');
    fs.mkdirSync(isolatedHome, { recursive: true, mode: 0o700 });
    const environment = createSanitizedTestEnvironment({
      HOME: isolatedHome,
      // Keep dynamic local discovery deterministic: nothing listens on these hosts.
      OLLAMA_HOSTS: 'http://127.0.0.1:9',
      LMSTUDIO_HOSTS: 'http://127.0.0.1:9',
    });
    const endpoint = await startOpenAiCompatibleEndpoint();
    const port = await reserveLoopbackPort();
    materializeTestRuntime({
      runtimeRoot,
      databaseUrlOverride: database.databaseUrl,
      serverUrlOverride: `http://127.0.0.1:${port}`,
    });

    // 1. A pre-upgrade lifetime: initialize the vault and configure a working custom provider.
    const first = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl, port, environment });
    runningServers.add(first);
    const created = await executeGraphql<{
      createCustomProvider: { provider: { id: string }; apiKeyConfigured: boolean };
    }>(first.serverUrl, `
      mutation CreateUpgradeProvider($input: CustomProviderInputObject!) {
        createCustomProvider(input: $input) { provider { id } apiKeyConfigured }
      }
    `, {
      input: { name: 'Upgrade Check Gateway', baseUrl: endpoint.baseUrl, apiKey: CUSTOM_PROVIDER_KEY },
    });
    const customProviderId = created.createCustomProvider.provider.id;
    expect(created.createCustomProvider.apiKeyConfigured).toBe(true);
    await first.stop();
    runningServers.delete(first);

    // 2. The provider-era leftovers: the host key in `.env` and an encrypted vault row.
    // A provider-era `.env` carries the key on its own line (the server may have written its
    // own last line without a trailing newline).
    const envBeforeUpgrade = fs.readFileSync(first.runtimeEnvironmentPath, 'utf8');
    fs.writeFileSync(
      first.runtimeEnvironmentPath,
      `${envBeforeUpgrade}${envBeforeUpgrade.endsWith('\n') ? '' : '\n'}${LEFTOVER_HOST_KEY}=${LEFTOVER_HOST_VALUE}\n`,
      'utf8',
    );
    const leftoverRow = writeLeftoverVaultRow(database);
    endpoint.authorizations.length = 0;

    // 3. Upgrade start on the same data.
    const upgraded = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl, port, environment });
    runningServers.add(upgraded);
    const state = await providerState(upgraded.serverUrl);
    expect(state.getSecretVaultStatus).toEqual({ health: 'READY', instructionCode: null });
    assertNoRemoteProvider(state);
    expect(state.providerCredentialSettings.find(({ provider }) => provider.id === customProviderId))
      .toMatchObject({ apiKeyConfigured: true });
    expect(state.providerCredentialSettings.map(({ provider }) => provider.id)).toEqual(
      expect.arrayContaining(['ANTHROPIC', 'OPENAI', 'GEMINI', 'OLLAMA', 'LMSTUDIO', customProviderId]),
    );
    expect(state.getServerSettings.find(({ key }) => key === LEFTOVER_HOST_KEY)).toEqual({
      key: LEFTOVER_HOST_KEY,
      value: LEFTOVER_HOST_VALUE,
      description: 'Custom user-defined setting',
      isEditable: true,
      isDeletable: true,
    });

    // Another provider's vault credential still resolves with the orphan row present.
    const reloaded = await executeGraphql<{
      reloadProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string }> };
    }>(upgraded.serverUrl, `
      mutation ReloadUpgradeProvider($providerId: String!) {
        reloadProviderModelCatalog(providerId: $providerId, runtimeKind: "autobyteus") {
          llmModels { modelIdentifier }
        }
      }
    `, { providerId: customProviderId });
    expect(reloaded.reloadProviderModelCatalog.llmModels.map(({ modelIdentifier }) => modelIdentifier))
      .toEqual([`openai-compatible:${customProviderId}:upgrade-check-model`]);
    expect(endpoint.authorizations).toContain(`Bearer ${CUSTOM_PROVIDER_KEY}`);
    expect(endpoint.authorizations.join('\n')).not.toContain(LEFTOVER_SECRET_CANARY);

    // The removed provider is rejected as unknown everywhere it was reachable.
    const ensure = await rawGraphql(upgraded.serverUrl, `
      mutation { ensureProviderModelCatalog(providerId: "AUTOBYTEUS", runtimeKind: "autobyteus") { ownerProvider { id } } }
    `);
    expect(ensure.errors?.[0]?.message).toContain('UNKNOWN_MODEL_PROVIDER');
    const reload = await rawGraphql(upgraded.serverUrl, `
      mutation { reloadProviderModelCatalog(providerId: "AUTOBYTEUS", runtimeKind: "autobyteus") { ownerProvider { id } } }
    `);
    expect(reload.errors?.[0]?.message).toContain('UNKNOWN_MODEL_PROVIDER');
    const saveKey = await rawGraphql(upgraded.serverUrl, `
      mutation { saveProviderApiKey(providerId: "AUTOBYTEUS", apiKey: "another-synthetic-key") { provider { id } } }
    `);
    expect(saveKey.errors?.[0]?.message).toContain("Unsupported built-in provider 'AUTOBYTEUS'");

    // The user deletes the leftover host value like any custom setting.
    const deleted = await executeGraphql<{ deleteServerSetting: string }>(upgraded.serverUrl, `
      mutation DeleteLeftover($key: String!) { deleteServerSetting(key: $key) }
    `, { key: LEFTOVER_HOST_KEY });
    expect(deleted.deleteServerSetting).toBeTruthy();
    const afterDelete = await providerState(upgraded.serverUrl);
    expect(afterDelete.getServerSettings.map(({ key }) => key)).not.toContain(LEFTOVER_HOST_KEY);
    expect(fs.readFileSync(upgraded.runtimeEnvironmentPath, 'utf8')).not.toContain(`${LEFTOVER_HOST_KEY}=`);
    await upgraded.stop();
    runningServers.delete(upgraded);

    // 4. A later restart still starts normally; the vault row was never rewritten or removed.
    const restarted = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl, port, environment });
    runningServers.add(restarted);
    const restartedState = await providerState(restarted.serverUrl);
    expect(restartedState.getSecretVaultStatus.health).toBe('READY');
    assertNoRemoteProvider(restartedState);
    expect(restartedState.providerCredentialSettings.find(({ provider }) => provider.id === customProviderId))
      .toMatchObject({ apiKeyConfigured: true });
    await restarted.stop();
    runningServers.delete(restarted);

    expect(readVaultRow(database.databasePath, LEFTOVER_SECRET_ID)).toBe(leftoverRow);
    const output = first.output() + upgraded.output() + restarted.output();
    expect(output).toContain('Database migrations completed successfully.');
    expect(output).not.toContain(LEFTOVER_SECRET_CANARY);
    expect(output).not.toContain(CUSTOM_PROVIDER_KEY);
    expect(output).not.toContain('remote-llm.example.invalid');
  }, 300_000);
});
