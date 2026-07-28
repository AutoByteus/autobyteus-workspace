import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type DatabaseLocation = ReturnType<typeof resolveTestDatabaseLocation>;

type ProviderSettingsResult = {
  providerSettings: Array<{
    provider: {
      id: string;
      name: string;
      apiKeyConfigured: boolean;
      status: string;
    };
    llmModels: Array<{ modelIdentifier: string }>;
  }>;
};

type MigrationStatusResult = {
  getAppDataMigrations: Array<{
    migrationId: string;
    status: string;
    attempts: number;
    summary: {
      scannedCount: number;
      migratedCount: number;
      skippedCount: number;
      failedCount: number;
      details: Array<{
        itemId: string;
        status: string;
        message: string | null;
      }>;
    };
  }>;
};

const migrationId = '20260727_custom_provider_v1_secret_migration';
const ownedServers = new Set<RunningTestServer>();
const ownedTargets: Array<{ runtimeRoot: string; database: DatabaseLocation }> = [];
const ownedFixtures = new Set<http.Server>();

const providerSettings = (serverUrl: string) =>
  executeGraphql<ProviderSettingsResult>(serverUrl, `
    query ProviderSettings {
      providerSettings(runtimeKind: "autobyteus") {
        provider {
          id
          name
          apiKeyConfigured
          status
        }
        llmModels { modelIdentifier }
      }
    }
  `);

const waitForReadyCustomProviders = async (
  serverUrl: string,
  providerIds: string[],
): Promise<ProviderSettingsResult> => {
  const timeoutAt = Date.now() + 15_000;
  let latest = await providerSettings(serverUrl);
  while (Date.now() < timeoutAt) {
    const ready = providerIds.every((providerId) => {
      const row = latest.providerSettings.find(({ provider }) => provider.id === providerId);
      return row?.provider.status === 'READY' && row.llmModels.length > 0;
    });
    if (ready) return latest;
    await new Promise((resolve) => setTimeout(resolve, 100));
    latest = await providerSettings(serverUrl);
  }
  throw new Error('CUSTOM_PROVIDER_RUNTIME_SYNC_TIMEOUT');
};

const migrationStatus = async (serverUrl: string) => {
  const result = await executeGraphql<MigrationStatusResult>(serverUrl, `
    query MigrationStatus {
      getAppDataMigrations {
        migrationId
        status
        attempts
        summary
      }
    }
  `);
  const migration = result.getAppDataMigrations.find(
    (candidate) => candidate.migrationId === migrationId,
  );
  if (!migration) throw new Error('CUSTOM_PROVIDER_V1_MIGRATION_STATUS_MISSING');
  return migration;
};

const startDiscoveryFixture = async (credential: string, modelId: string) => {
  let authorizedRequests = 0;
  const server = http.createServer((request, response) => {
    if (
      request.method !== 'GET'
      || request.url !== '/v1/models'
      || request.headers.authorization !== `Bearer ${credential}`
    ) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'UNAUTHORIZED' }));
      return;
    }
    authorizedRequests += 1;
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ data: [{ id: modelId }] }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  ownedFixtures.add(server);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('CUSTOM_PROVIDER_FIXTURE_ADDRESS_UNAVAILABLE');
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    authorizedRequests: () => authorizedRequests,
  };
};

const closeFixture = async (server: http.Server) => {
  if (!ownedFixtures.delete(server)) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
};

const makeTarget = (label: string) => {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runtimeRoot = path.join(testRuntimeRoot, `${label}-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/${label}-${suffix}.db`);
  ownedTargets.push({ runtimeRoot, database });
  return { runtimeRoot, database };
};

const customProviderPath = (runtimeRoot: string) =>
  path.join(runtimeRoot, 'llm', 'custom-llm-providers.json');

const writeV1 = (
  runtimeRoot: string,
  providers: Array<{
    id: string;
    name: string;
    providerType: 'OPENAI_COMPATIBLE';
    baseUrl: string;
    apiKey: string;
  }>,
  withAgedEmptyLock = false,
) => {
  const target = customProviderPath(runtimeRoot);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.writeFileSync(target, `${JSON.stringify({ version: 1, providers }, null, 2)}\n`, {
    mode: 0o600,
  });
  if (withAgedEmptyLock) {
    const lockPath = `${target}.lock`;
    fs.writeFileSync(lockPath, '', { mode: 0o600 });
    const staleAt = new Date(Date.now() - 120_000);
    fs.utimesSync(lockPath, staleAt, staleAt);
  }
};

const expectNoCanaryInPersistentFiles = (
  runtimeRoot: string,
  database: DatabaseLocation,
  canaries: string[],
) => {
  const candidates = [
    customProviderPath(runtimeRoot),
    database.databasePath,
    database.rootKeyPath,
    `${database.databasePath}-wal`,
    `${database.databasePath}-shm`,
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const bytes = fs.readFileSync(candidate);
    for (const canary of canaries) {
      expect(bytes.includes(Buffer.from(canary))).toBe(false);
    }
  }
};

afterEach(async () => {
  for (const server of [...ownedServers]) {
    if (server.child.exitCode === null) {
      await server.stop().catch(() => server.child.kill('SIGKILL'));
    }
    ownedServers.delete(server);
  }
  for (const fixture of [...ownedFixtures]) await closeFixture(fixture);
  for (const target of ownedTargets.splice(0)) {
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

describe('custom-provider v1 actual-server startup migration', () => {
  it.each([
    { label: 'one', count: 1 },
    { label: 'multiple', count: 2 },
  ])('migrates $label valid provider set all-or-nothing and reopens after restart', async ({
    label,
    count,
  }) => {
    const target = makeTarget(`custom-v1-${label}`);
    const fixtures = await Promise.all(Array.from({ length: count }, async (_, index) => {
      const credential = `synthetic-v1-migration-${label}-${index}`;
      const modelId = `synthetic-v1-model-${label}-${index}`;
      return {
        credential,
        modelId,
        ...(await startDiscoveryFixture(credential, modelId)),
      };
    }));
    const providers = fixtures.map((fixture, index) => ({
      id: `provider_v1_${label}_${index}`,
      name: `V1 ${label} ${index}`,
      providerType: 'OPENAI_COMPATIBLE' as const,
      baseUrl: fixture.baseUrl,
      apiKey: fixture.credential,
    }));
    writeV1(target.runtimeRoot, providers, label === 'one');

    const first = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(first);

    const current = JSON.parse(fs.readFileSync(
      customProviderPath(target.runtimeRoot),
      'utf8',
    )) as Record<string, unknown>;
    expect(current).toEqual({
      version: 2,
      providers: providers.map(({ apiKey: _apiKey, ...provider }) => provider),
    });
    expect(JSON.stringify(current)).not.toContain('apiKey');

    const firstSettings = await waitForReadyCustomProviders(
      first.serverUrl,
      providers.map((provider) => provider.id),
    );
    for (const [index, provider] of providers.entries()) {
      const row = firstSettings.providerSettings.find(
        ({ provider: candidate }) => candidate.id === provider.id,
      );
      expect(row).toMatchObject({
        provider: {
          id: provider.id,
          name: provider.name,
          apiKeyConfigured: true,
          status: 'READY',
        },
      });
      expect(row?.llmModels.map((model) => model.modelIdentifier)).toContain(
        `openai-compatible:${provider.id}:${fixtures[index].modelId}`,
      );
      expect(fixtures[index].authorizedRequests()).toBeGreaterThan(0);
    }
    expect(await migrationStatus(first.serverUrl)).toMatchObject({
      status: 'SUCCEEDED',
      attempts: 1,
      summary: {
        scannedCount: 1,
        migratedCount: 1,
        skippedCount: 0,
        failedCount: 0,
        details: [{
          itemId: 'custom-provider-v1',
          status: 'MIGRATED',
          message: 'CUSTOM_PROVIDER_V1_MIGRATED',
        }],
      },
    });
    const firstOutput = first.output();
    for (const fixture of fixtures) expect(firstOutput).not.toContain(fixture.credential);
    await first.stop();
    ownedServers.delete(first);
    expectNoCanaryInPersistentFiles(
      target.runtimeRoot,
      target.database,
      fixtures.map((fixture) => fixture.credential),
    );

    const second = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(second);
    const reopened = await waitForReadyCustomProviders(
      second.serverUrl,
      providers.map((provider) => provider.id),
    );
    for (const provider of providers) {
      expect(reopened.providerSettings.find(
        ({ provider: candidate }) => candidate.id === provider.id,
      )?.provider).toMatchObject({
        id: provider.id,
        apiKeyConfigured: true,
        status: 'READY',
      });
    }
    expect(await migrationStatus(second.serverUrl)).toMatchObject({
      status: 'SUCCEEDED',
      attempts: 1,
    });
    for (const fixture of fixtures) expect(second.output()).not.toContain(fixture.credential);
  }, 240_000);

  it('resets an invalid v1 file without blocking Settings and supports current reconfiguration', async () => {
    const target = makeTarget('custom-v1-reset');
    const legacyCanaries = [
      'synthetic-v1-reset-legacy-a',
      'synthetic-v1-reset-legacy-b',
    ];
    const fixture = await startDiscoveryFixture(
      'synthetic-v1-reset-current',
      'synthetic-v1-reset-model',
    );
    writeV1(target.runtimeRoot, [
      {
        id: 'provider_v1_reset_a',
        name: 'Duplicate Reset Name',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: fixture.baseUrl,
        apiKey: legacyCanaries[0],
      },
      {
        id: 'provider_v1_reset_b',
        name: ' duplicate reset name ',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: fixture.baseUrl,
        apiKey: legacyCanaries[1],
      },
    ]);

    const first = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(first);
    expect(fs.existsSync(customProviderPath(target.runtimeRoot))).toBe(false);
    expect(await migrationStatus(first.serverUrl)).toMatchObject({
      status: 'SUCCEEDED_WITH_WARNINGS',
      attempts: 1,
      summary: {
        scannedCount: 1,
        migratedCount: 0,
        skippedCount: 1,
        failedCount: 0,
        details: [{
          itemId: 'custom-provider-v1',
          status: 'SKIPPED',
          message: 'CUSTOM_PROVIDER_V1_RECONFIGURATION_REQUIRED',
        }],
      },
    });
    const available = await providerSettings(first.serverUrl);
    expect(available.providerSettings.some(({ provider }) => provider.id === 'OPENAI')).toBe(true);
    expect(available.providerSettings.some(
      ({ provider }) => provider.id.startsWith('provider_v1_reset_'),
    )).toBe(false);

    const currentCredential = 'synthetic-v1-reset-current';
    const created = await executeGraphql<{ createCustomProvider: string }>(first.serverUrl, `
      mutation Create($input: CustomProviderInputObject!) {
        createCustomProvider(input: $input)
      }
    `, {
      input: {
        name: 'Reconfigured Current Provider',
        baseUrl: fixture.baseUrl,
        apiKey: currentCredential,
      },
    });
    expect(created.createCustomProvider).toMatch(/^provider_/);
    expect(created.createCustomProvider).not.toMatch(/^provider_v1_reset_/);
    const configured = await waitForReadyCustomProviders(
      first.serverUrl,
      [created.createCustomProvider],
    );
    expect(configured.providerSettings.find(
      ({ provider }) => provider.id === created.createCustomProvider,
    )).toMatchObject({
      provider: {
        id: created.createCustomProvider,
        apiKeyConfigured: true,
        status: 'READY',
      },
    });
    expect(fixture.authorizedRequests()).toBeGreaterThan(0);
    const currentFile = fs.readFileSync(customProviderPath(target.runtimeRoot), 'utf8');
    expect(JSON.parse(currentFile)).toMatchObject({ version: 2 });
    expect(currentFile).not.toContain('apiKey');
    for (const canary of [...legacyCanaries, currentCredential]) {
      expect(currentFile).not.toContain(canary);
      expect(first.output()).not.toContain(canary);
    }

    await first.stop();
    ownedServers.delete(first);
    expectNoCanaryInPersistentFiles(target.runtimeRoot, target.database, [
      ...legacyCanaries,
      currentCredential,
    ]);

    const second = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(second);
    expect((await waitForReadyCustomProviders(
      second.serverUrl,
      [created.createCustomProvider],
    )).providerSettings.find(
      ({ provider }) => provider.id === created.createCustomProvider,
    )?.provider).toMatchObject({
      apiKeyConfigured: true,
      status: 'READY',
    });
    const deleted = await executeGraphql<{ deleteCustomProvider: boolean }>(second.serverUrl, `
      mutation Delete($providerId: String!) {
        deleteCustomProvider(providerId: $providerId)
      }
    `, { providerId: created.createCustomProvider });
    expect(deleted.deleteCustomProvider).toBe(true);
    expect((await providerSettings(second.serverUrl)).providerSettings.some(
      ({ provider }) => provider.id === created.createCustomProvider,
    )).toBe(false);
    for (const canary of [...legacyCanaries, currentCredential]) {
      expect(second.output()).not.toContain(canary);
    }
  }, 240_000);
});
