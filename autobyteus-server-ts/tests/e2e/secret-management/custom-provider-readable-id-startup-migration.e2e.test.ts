import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { PrismaClient } from '@prisma/client';
import { afterEach, describe, expect, it } from 'vitest';
import { runMigrations } from '../../../src/startup/migrations.js';
import {
  builtServerEntry,
  createSanitizedTestEnvironment,
  executeGraphql,
  materializeTestRuntime,
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  resolveTestDatabaseLocation,
  serverRoot,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type DatabaseLocation = ReturnType<typeof resolveTestDatabaseLocation>;

type MigrationStatus = {
  migrationId: string;
  status: string;
  attempts: number;
  startedAt: string | null;
  completedAt: string | null;
  summary: string | null;
  errorMessage: string | null;
  logPath: string | null;
};

type ExecutionCounts = {
  scannedCount: number;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
};

type AttemptLogDetail = {
  itemId: string;
  status: string;
  message: string | null;
  filePath?: string | null;
};

type ProviderSettingsResult = {
  providerSettings: Array<{
    provider: {
      id: string;
      name: string;
      apiKeyConfigured: boolean;
      status: string;
    };
    llmModels: Array<{
      modelIdentifier: string;
      value: string;
    }>;
  }>;
};

const V1_MIGRATION_ID = '20260727_custom_provider_v1_secret_migration';
const READABLE_MIGRATION_ID = '20260803_custom_provider_readable_identity';
const TOKEN_NAME_MIGRATION_ID = '20260730_token_usage_provider_name_snapshot_backfill';
const PREREQUISITE_IDS = [
  V1_MIGRATION_ID,
  '20260706_remove_global_skill_discovery_mode',
  '20260517_team_run_metadata_member_tree',
  TOKEN_NAME_MIGRATION_ID,
  '20260623_remove_self_evolution_run_metadata',
] as const;

const OLD_ID = 'provider_5b8b1ce1baf945c483248bdef87c554e';
const READABLE_ID = 'provider_alibaba_cloud_token_plan';
const PROVIDER_NAME = 'Alibaba Cloud Token Plan';
const MODEL_SUFFIX = 'deepseek-v4-flash-0731';
const OLD_IDENTIFIER = `openai-compatible:${OLD_ID}:${MODEL_SUFFIX}`;
const READABLE_IDENTIFIER = `openai-compatible:${READABLE_ID}:${MODEL_SUFFIX}`;
const LEGACY_SECRET_ID = `provider.openai-compatible.${OLD_ID}.api-key`;
const READABLE_SECRET_ID = `provider.openai-compatible.${READABLE_ID}.api-key`;

const ownedServers = new Set<RunningTestServer>();
const ownedTargets: Array<{ runtimeRoot: string; database: DatabaseLocation }> = [];
const ownedFixtures = new Set<http.Server>();

const makeTarget = (label: string) => {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runtimeRoot = path.join(testRuntimeRoot, `${label}-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/${label}-${suffix}.db`);
  ownedTargets.push({ runtimeRoot, database });
  return { runtimeRoot, database };
};

const customProviderPath = (runtimeRoot: string): string =>
  path.join(runtimeRoot, 'llm', 'custom-llm-providers.json');

const writeJson = (filePath: string, value: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
};

const readJson = (filePath: string): any => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const writeV1 = (
  runtimeRoot: string,
  input: { baseUrl: string; apiKey: string },
): void => writeJson(customProviderPath(runtimeRoot), {
  version: 1,
  providers: [{
    id: OLD_ID,
    name: PROVIDER_NAME,
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
  }],
});

const writeV2 = (
  runtimeRoot: string,
  providers: Array<{ id: string; name: string; baseUrl: string }> = [{
    id: OLD_ID,
    name: PROVIDER_NAME,
    baseUrl: 'https://legacy-endpoint.synthetic.invalid/v1',
  }],
): void => writeJson(customProviderPath(runtimeRoot), {
  version: 2,
  providers: providers.map((provider) => ({
    ...provider,
    providerType: 'OPENAI_COMPATIBLE',
  })),
});

const selectorPaths = (runtimeRoot: string) => ({
  agentConfig: path.join(runtimeRoot, 'selector-fixtures', 'agent', 'agent-config.json'),
  bindings: path.join(runtimeRoot, 'external-channel', 'bindings.json'),
  applicationDatabase: path.join(
    runtimeRoot,
    'applications',
    'readable-migration-fixture',
    'db',
    'platform.sqlite',
  ),
  excludedTrace: path.join(runtimeRoot, 'selector-fixtures', 'raw-trace.json'),
});

const writeSelectorFixture = (runtimeRoot: string, identifier = OLD_IDENTIFIER) => {
  const paths = selectorPaths(runtimeRoot);
  writeJson(paths.agentConfig, {
    defaultLaunchConfig: { llmModelIdentifier: identifier },
    excludedNested: { llmModelIdentifier: identifier },
  });
  writeJson(paths.bindings, [{
    id: 'readable-migration-binding',
    provider: 'WHATSAPP',
    transport: 'PERSONAL_SESSION',
    accountId: 'readable-migration-account',
    peerId: 'readable-migration-peer',
    threadId: '',
    targetType: 'AGENT',
    agentDefinitionId: 'readable-migration-agent',
    launchPreset: {
      workspaceRootPath: '/tmp/readable-migration-workspace',
      llmModelIdentifier: identifier,
      runtimeKind: 'AUTOBYTEUS',
      autoExecuteTools: false,
      skillAccessMode: 'GLOBAL_DISCOVERY',
      llmConfig: null,
    },
    agentRunId: null,
    teamRunId: null,
    targetMemberRouteKey: null,
    targetMemberPath: null,
    allowTransportFallback: false,
    createdAt: '2048-08-03T00:00:00.000Z',
    updatedAt: '2048-08-03T00:00:00.000Z',
  }]);
  writeJson(paths.excludedTrace, {
    llmModelIdentifier: identifier,
    freeText: `excluded:${identifier}`,
  });

  fs.mkdirSync(path.dirname(paths.applicationDatabase), { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(paths.applicationDatabase);
  database.exec(`
    CREATE TABLE __autobyteus_resource_configurations (
      slot_key TEXT PRIMARY KEY,
      launch_profile_json TEXT,
      launch_defaults_json TEXT
    );
  `);
  database.prepare(`
    INSERT INTO __autobyteus_resource_configurations
      (slot_key, launch_profile_json, launch_defaults_json)
    VALUES (?, ?, ?)
  `).run(
    'primaryAgent',
    JSON.stringify({
      kind: 'AGENT',
      llmModelIdentifier: identifier,
      excludedNested: { llmModelIdentifier: identifier },
    }),
    JSON.stringify({
      llmModelIdentifier: identifier,
      excludedNested: { llmModelIdentifier: identifier },
    }),
  );
  database.close();
  return paths;
};

const readApplicationSelectors = (databasePath: string) => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const row = database.prepare(`
      SELECT launch_profile_json, launch_defaults_json
      FROM __autobyteus_resource_configurations
      WHERE slot_key = ?
    `).get('primaryAgent') as Record<string, string>;
    return {
      profile: JSON.parse(row.launch_profile_json),
      defaults: JSON.parse(row.launch_defaults_json),
    };
  } finally {
    database.close();
  }
};

const deploySchema = (database: DatabaseLocation): void => runMigrations({
  appRoot: serverRoot,
  databaseUrl: database.databaseUrl,
});

const materializeOwnedRuntime = async (
  runtimeRoot: string,
  database: DatabaseLocation,
): Promise<void> => {
  const port = await reserveLoopbackPort();
  materializeTestRuntime({
    runtimeRoot,
    databaseUrlOverride: database.databaseUrl,
    serverUrlOverride: `http://127.0.0.1:${port}`,
  });
};

const seedTokenRow = async (
  database: DatabaseLocation,
  identifier = OLD_IDENTIFIER,
): Promise<string> => {
  const usageEventId = `readable-migration-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runId = 'readable-migration-run';
  const prisma = new PrismaClient({ datasources: { db: { url: database.databaseUrl } } });
  try {
    await prisma.tokenUsageLedgerEvent.create({
      data: {
        usageEventId,
        idempotencyKey: `${usageEventId}:idempotency`,
        observedAt: new Date('2048-08-03T00:00:00.000Z'),
        runId,
        runtimeKind: 'autobyteus',
        modelProvider: 'OPENAI_COMPATIBLE',
        providerName: null,
        modelIdentifier: identifier,
        modelValue: MODEL_SUFFIX,
        ingestionKind: 'readable-migration-e2e',
        usageScope: 'per_turn',
        pricingStatus: 'missing',
        apiCostStatus: 'price_missing',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
  return runId;
};

const readTokenRow = async (database: DatabaseLocation, runId: string) => {
  const prisma = new PrismaClient({ datasources: { db: { url: database.databaseUrl } } });
  try {
    const row = await prisma.tokenUsageRunRecord.findUniqueOrThrow({ where: { runId } });
    return {
      providerName: row.latestProviderName,
      modelIdentifier: row.latestModelIdentifier,
      modelValue: row.latestModelValue,
    };
  } finally {
    await prisma.$disconnect();
  }
};

const seedLegacySecret = async (input: {
  runtimeRoot: string;
  database: DatabaseLocation;
  providerId: string;
  secret: string;
}): Promise<void> => {
  const childScript = String.raw`
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const parsed = JSON.parse(input);
    const { appConfigProvider } = await import('./dist/config/app-config-provider.js');
    const { getSecretVaultRuntime } = await import('./dist/secret-management/secret-vault-runtime.js');
    const { initializePrisma, shutdownPrisma } = await import('repository_prisma');
    const { SecretValue } = await import('autobyteus-ts');
    appConfigProvider.initialize({ appDataDir: parsed.runtimeRoot }).initialize();
    await initializePrisma({ datasourceUrl: parsed.databaseUrl });
    const runtime = getSecretVaultRuntime();
    await runtime.initialize(appConfigProvider.config.getOperationalDatabaseLocation());
    await runtime.requireService().saveForConsumer({
      consumer: { kind: 'llm', providerId: parsed.providerId, credentialSlot: 'apiKey' },
      value: SecretValue.fromString(parsed.secret),
    });
    await runtime.close();
    await shutdownPrisma();
  `;
  const child = spawn(process.execPath, ['--input-type=module', '-e', childScript], {
    cwd: serverRoot,
    env: createSanitizedTestEnvironment(),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString('utf8'); });
  child.stderr.on('data', (chunk) => { output += chunk.toString('utf8'); });
  child.stdin.end(JSON.stringify({
    runtimeRoot: input.runtimeRoot,
    databaseUrl: input.database.databaseUrl,
    providerId: input.providerId,
    secret: input.secret,
  }));
  const exitCode = await new Promise<number | null>((resolve) => child.once('close', resolve));
  if (exitCode !== 0) throw new Error(`LEGACY_SECRET_SEED_FAILED:${output}`);
};

const listSecretIds = (databasePath: string): string[] => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const rows = database.prepare('SELECT secret_id FROM secret_entries ORDER BY secret_id').all() as unknown as Array<{ secret_id: string }>;
    return rows.map(({ secret_id }) => secret_id);
  } finally {
    database.close();
  }
};

const migrationStatuses = async (serverUrl: string): Promise<MigrationStatus[]> => {
  const result = await executeGraphql<{ getAppDataMigrations: MigrationStatus[] }>(serverUrl, `
    query ReadableMigrationStatuses {
      getAppDataMigrations {
        migrationId
        status
        attempts
        startedAt
        completedAt
        summary
        errorMessage
        logPath
      }
    }
  `);
  return result.getAppDataMigrations;
};

const statusFor = (statuses: MigrationStatus[], migrationId: string): MigrationStatus => {
  const status = statuses.find((candidate) => candidate.migrationId === migrationId);
  if (!status) throw new Error(`MIGRATION_STATUS_MISSING:${migrationId}`);
  return status;
};

const readAttemptLog = (status: MigrationStatus): {
  counts: ExecutionCounts;
  details: AttemptLogDetail[];
} => {
  expect(status.summary).toMatch(/^Scanned \d+; migrated \d+; skipped \d+; failed \d+\.$/);
  expect(status.logPath).toEqual(expect.any(String));
  const lines = fs.readFileSync(status.logPath!, 'utf8').trimEnd().split('\n');
  const statusLine = lines.find((line) => line.startsWith('statusSummary='));
  if (!statusLine) throw new Error('APP_DATA_MIGRATION_STATUS_SUMMARY_MISSING_FROM_LOG');
  const detailsIndex = lines.indexOf('details=');
  if (detailsIndex < 0) throw new Error('APP_DATA_MIGRATION_DETAILS_MARKER_MISSING_FROM_LOG');
  const counts = JSON.parse(statusLine.slice('statusSummary='.length)) as ExecutionCounts;
  expect(status.summary).toBe(
    `Scanned ${counts.scannedCount}; migrated ${counts.migratedCount}; skipped ${counts.skippedCount}; failed ${counts.failedCount}.`,
  );
  return {
    counts,
    details: lines.slice(detailsIndex + 1).filter(Boolean).map((line) =>
      JSON.parse(line) as AttemptLogDetail),
  };
};

const providerSettings = (serverUrl: string): Promise<ProviderSettingsResult> =>
  executeGraphql<ProviderSettingsResult>(serverUrl, `
    query ReadableProviderSettings {
      providerSettings(runtimeKind: "autobyteus") {
        provider { id name apiKeyConfigured status }
        llmModels { modelIdentifier value }
      }
    }
  `);

const waitForReadyProvider = async (
  serverUrl: string,
  providerId: string,
): Promise<ProviderSettingsResult['providerSettings'][number]> => {
  const timeoutAt = Date.now() + 20_000;
  while (Date.now() < timeoutAt) {
    const current = await providerSettings(serverUrl);
    const row = current.providerSettings.find(({ provider }) => provider.id === providerId);
    if (row?.provider.status === 'READY' && row.llmModels.length > 0) return row;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('READABLE_PROVIDER_RUNTIME_SYNC_TIMEOUT');
};

const startDiscoveryFixture = async (credential: string, modelId = MODEL_SUFFIX) => {
  const authorizedPaths: string[] = [];
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
    authorizedPaths.push(request.url);
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
  if (!address || typeof address === 'string') throw new Error('DISCOVERY_FIXTURE_UNAVAILABLE');
  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    authorizedPaths,
  };
};

const closeFixture = async (server: http.Server): Promise<void> => {
  if (!ownedFixtures.delete(server)) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
};

const startExpectingGateFailure = async (input: {
  runtimeRoot: string;
  database: DatabaseLocation;
}): Promise<{ exitCode: number | null; output: string }> => {
  const port = await reserveLoopbackPort();
  materializeTestRuntime({
    runtimeRoot: input.runtimeRoot,
    databaseUrlOverride: input.database.databaseUrl,
    serverUrlOverride: `http://127.0.0.1:${port}`,
  });
  const child = spawn(
    process.execPath,
    [builtServerEntry, '--host', '127.0.0.1', '--port', String(port), '--data-dir', input.runtimeRoot],
    {
      cwd: serverRoot,
      env: createSanitizedTestEnvironment(),
      stdio: 'pipe',
    },
  );
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString('utf8'); });
  child.stderr.on('data', (chunk) => { output += chunk.toString('utf8'); });
  const result = await new Promise<{ exitCode: number | null; output: string }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('READABLE_GATE_FAILURE_TIMEOUT'));
    }, 120_000);
    child.once('close', (exitCode) => {
      clearTimeout(timeout);
      resolve({ exitCode, output });
    });
  });
  return result;
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

describe('custom-provider readable identity actual startup lifecycle', () => {
  it('takes V1 through secretless staging and exact selector transition to empty V3 across restart', async () => {
    const target = makeTarget('readable-v1');
    const inlineSecret = `readable-v1-inline-${Date.now()}`;
    const legacyBaseUrl = 'https://legacy-v1.synthetic.invalid/v1';
    writeV1(target.runtimeRoot, { baseUrl: legacyBaseUrl, apiKey: inlineSecret });
    const paths = writeSelectorFixture(target.runtimeRoot);

    const first = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(first);

    expect(readJson(customProviderPath(target.runtimeRoot))).toEqual({ version: 3, providers: [] });
    expect(fs.readFileSync(customProviderPath(target.runtimeRoot), 'utf8')).not.toContain(legacyBaseUrl);
    expect(readJson(paths.agentConfig).defaultLaunchConfig.llmModelIdentifier)
      .toBe(READABLE_IDENTIFIER);
    expect(readJson(paths.agentConfig).excludedNested.llmModelIdentifier).toBe(OLD_IDENTIFIER);
    expect(readApplicationSelectors(paths.applicationDatabase)).toMatchObject({
      profile: { llmModelIdentifier: READABLE_IDENTIFIER },
      defaults: { llmModelIdentifier: READABLE_IDENTIFIER },
    });
    expect(readJson(paths.excludedTrace).llmModelIdentifier).toBe(OLD_IDENTIFIER);
    expect((await providerSettings(first.serverUrl)).providerSettings.some(
      ({ provider }) => provider.id === OLD_ID || provider.id === READABLE_ID,
    )).toBe(false);

    const firstStatuses = await migrationStatuses(first.serverUrl);
    const v1Status = statusFor(firstStatuses, V1_MIGRATION_ID);
    expect(v1Status).toMatchObject({
      status: 'SUCCEEDED_WITH_WARNINGS',
      attempts: 1,
    });
    expect(readAttemptLog(v1Status).details).toEqual([
      expect.objectContaining({
        itemId: 'custom-provider-v1',
        message: 'CUSTOM_PROVIDER_V1_RECONFIGURATION_REQUIRED',
      }),
    ]);
    expect(statusFor(firstStatuses, READABLE_MIGRATION_ID)).toMatchObject({
      status: 'SUCCEEDED',
      attempts: 1,
    });
    expect(listSecretIds(target.database.databasePath)).not.toContain(LEGACY_SECRET_ID);
    expect(first.output()).not.toContain(inlineSecret);
    expect(first.output()).not.toContain(legacyBaseUrl);
    await first.stop();
    ownedServers.delete(first);

    const second = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(second);
    expect(statusFor(await migrationStatuses(second.serverUrl), READABLE_MIGRATION_ID))
      .toMatchObject({ status: 'SUCCEEDED', attempts: 1 });
    expect(readJson(customProviderPath(target.runtimeRoot))).toEqual({ version: 3, providers: [] });
    expect(second.output()).not.toContain(inlineSecret);
  }, 240_000);

  it('orders the real multiversion transition, preserves token identity, and restores selectors through same-name recreation', async () => {
    const target = makeTarget('readable-v2');
    deploySchema(target.database);
    await materializeOwnedRuntime(target.runtimeRoot, target.database);
    writeV2(target.runtimeRoot);
    const paths = writeSelectorFixture(target.runtimeRoot);
    const tokenRunId = await seedTokenRow(target.database);
    const legacySecret = `readable-v2-old-secret-${Date.now()}`;
    await seedLegacySecret({
      runtimeRoot: target.runtimeRoot,
      database: target.database,
      providerId: OLD_ID,
      secret: legacySecret,
    });
    expect(listSecretIds(target.database.databasePath)).toContain(LEGACY_SECRET_ID);

    const server = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(server);

    const statuses = await migrationStatuses(server.serverUrl);
    const orderedIds = statuses.map(({ migrationId }) => migrationId);
    for (const prerequisiteId of PREREQUISITE_IDS) {
      const prerequisite = statusFor(statuses, prerequisiteId);
      expect(['SUCCEEDED', 'SUCCEEDED_WITH_WARNINGS']).toContain(prerequisite.status);
      expect(orderedIds.indexOf(prerequisiteId)).toBeLessThan(orderedIds.indexOf(READABLE_MIGRATION_ID));
    }
    const readable = statusFor(statuses, READABLE_MIGRATION_ID);
    expect(readable).toMatchObject({ status: 'SUCCEEDED', attempts: 1 });
    const readableDetails = readAttemptLog(readable).details;
    const resetDetailIndex = readableDetails.findIndex(
      ({ message }) => message === 'CUSTOM_PROVIDER_READABLE_ID_EMPTY_V3_PUBLISHED',
    );
    const cleanupDetailIndex = readableDetails.findIndex(
      ({ message }) => message === 'CUSTOM_PROVIDER_READABLE_ID_OLD_SECRET_REMOVED',
    );
    expect(resetDetailIndex).toBeGreaterThanOrEqual(0);
    expect(cleanupDetailIndex).toBeGreaterThan(resetDetailIndex);

    expect(readJson(customProviderPath(target.runtimeRoot))).toEqual({ version: 3, providers: [] });
    expect(listSecretIds(target.database.databasePath)).not.toContain(LEGACY_SECRET_ID);
    const tokenRow = await readTokenRow(target.database, tokenRunId);
    expect(tokenRow).toMatchObject({
      providerName: PROVIDER_NAME,
      modelIdentifier: OLD_IDENTIFIER,
      modelValue: MODEL_SUFFIX,
    });
    const tokenNameStatus = statusFor(statuses, TOKEN_NAME_MIGRATION_ID);
    expect(tokenNameStatus.status).toBe('SUCCEEDED');
    expect(readAttemptLog(tokenNameStatus).counts.migratedCount).toBe(1);

    const agent = readJson(paths.agentConfig);
    const binding = readJson(paths.bindings)[0];
    const application = readApplicationSelectors(paths.applicationDatabase);
    expect(agent.defaultLaunchConfig.llmModelIdentifier).toBe(READABLE_IDENTIFIER);
    expect(agent.excludedNested.llmModelIdentifier).toBe(OLD_IDENTIFIER);
    expect(binding.launchPreset).toMatchObject({
      llmModelIdentifier: READABLE_IDENTIFIER,
      skillAccessMode: 'PRELOADED_ONLY',
    });
    expect(application.profile.llmModelIdentifier).toBe(READABLE_IDENTIFIER);
    expect(application.profile.excludedNested.llmModelIdentifier).toBe(OLD_IDENTIFIER);
    expect(application.defaults.llmModelIdentifier).toBe(READABLE_IDENTIFIER);
    expect(readJson(paths.excludedTrace).llmModelIdentifier).toBe(OLD_IDENTIFIER);
    expect((await providerSettings(server.serverUrl)).providerSettings.some(
      ({ provider }) => provider.id === OLD_ID || provider.id === READABLE_ID,
    )).toBe(false);

    const currentSecret = `readable-v2-current-secret-${Date.now()}`;
    const discovery = await startDiscoveryFixture(currentSecret);
    await expect(executeGraphql<{ createCustomProvider: string }>(server.serverUrl, `
      mutation BadCreate($input: CustomProviderInputObject!) {
        createCustomProvider(input: $input)
      }
    `, {
      input: {
        name: PROVIDER_NAME,
        baseUrl: discovery.baseUrl,
        apiKey: 'wrong-secret',
      },
    })).rejects.toThrow('TEST_GRAPHQL_REQUEST_FAILED');
    expect(listSecretIds(target.database.databasePath)).not.toContain(READABLE_SECRET_ID);
    expect((await providerSettings(server.serverUrl)).providerSettings.some(
      ({ provider }) => provider.id === READABLE_ID,
    )).toBe(false);

    const created = await executeGraphql<{ createCustomProvider: string }>(server.serverUrl, `
      mutation Recreate($input: CustomProviderInputObject!) {
        createCustomProvider(input: $input)
      }
    `, {
      input: {
        name: PROVIDER_NAME,
        baseUrl: discovery.baseUrl,
        apiKey: currentSecret,
      },
    });
    expect(created.createCustomProvider).toBe(READABLE_ID);
    const ready = await waitForReadyProvider(server.serverUrl, READABLE_ID);
    expect(ready.provider).toMatchObject({
      id: READABLE_ID,
      name: PROVIDER_NAME,
      apiKeyConfigured: true,
      status: 'READY',
    });
    expect(ready.llmModels).toContainEqual({
      modelIdentifier: READABLE_IDENTIFIER,
      value: MODEL_SUFFIX,
    });
    expect(discovery.authorizedPaths).toEqual(['/v1/models', '/v1/models']);
    expect(fs.readFileSync(customProviderPath(target.runtimeRoot), 'utf8')).not.toContain(currentSecret);
    expect(server.output()).not.toContain(legacySecret);
    expect(server.output()).not.toContain(currentSecret);

    await server.stop();
    ownedServers.delete(server);
    const restarted = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(restarted);
    const restartedReady = await waitForReadyProvider(restarted.serverUrl, READABLE_ID);
    expect(restartedReady.llmModels).toContainEqual({
      modelIdentifier: READABLE_IDENTIFIER,
      value: MODEL_SUFFIX,
    });
    expect(statusFor(await migrationStatuses(restarted.serverUrl), READABLE_MIGRATION_ID))
      .toMatchObject({ status: 'SUCCEEDED', attempts: 1 });
    expect(restarted.output()).not.toContain(currentSecret);

    const deleted = await executeGraphql<{ deleteCustomProvider: boolean }>(restarted.serverUrl, `
      mutation DeleteReadableProvider($providerId: String!) {
        deleteCustomProvider(providerId: $providerId)
      }
    `, { providerId: READABLE_ID });
    expect(deleted.deleteCustomProvider).toBe(true);
  }, 300_000);

  it('keeps collision selectors unchanged while removing both trusted old secrets after empty V3', async () => {
    const target = makeTarget('readable-collision');
    deploySchema(target.database);
    await materializeOwnedRuntime(target.runtimeRoot, target.database);
    const oldOne = 'provider_collision_one';
    const oldTwo = 'provider_collision_two';
    const collisionIdentifier = `openai-compatible:${oldOne}:${MODEL_SUFFIX}`;
    writeV2(target.runtimeRoot, [
      { id: oldOne, name: 'A-B', baseUrl: 'https://one.synthetic.invalid/v1' },
      { id: oldTwo, name: 'A B', baseUrl: 'https://two.synthetic.invalid/v1' },
    ]);
    const paths = writeSelectorFixture(target.runtimeRoot, collisionIdentifier);
    const firstSecret = `readable-collision-one-${Date.now()}`;
    const secondSecret = `readable-collision-two-${Date.now()}`;
    await seedLegacySecret({
      runtimeRoot: target.runtimeRoot,
      database: target.database,
      providerId: oldOne,
      secret: firstSecret,
    });
    await seedLegacySecret({
      runtimeRoot: target.runtimeRoot,
      database: target.database,
      providerId: oldTwo,
      secret: secondSecret,
    });

    const server = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(server);

    const readable = statusFor(await migrationStatuses(server.serverUrl), READABLE_MIGRATION_ID);
    expect(readable.status).toBe('SUCCEEDED_WITH_WARNINGS');
    const readableDetails = readAttemptLog(readable).details;
    expect(readableDetails).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: 'CUSTOM_PROVIDER_READABLE_ID_MAPPING_INVALID' }),
    ]));
    const messages = readableDetails.map(({ message }) => message);
    const resetIndex = messages.indexOf('CUSTOM_PROVIDER_READABLE_ID_EMPTY_V3_PUBLISHED');
    const removalIndexes = messages
      .map((message, index) => message === 'CUSTOM_PROVIDER_READABLE_ID_OLD_SECRET_REMOVED' ? index : -1)
      .filter((index) => index >= 0);
    expect(removalIndexes).toHaveLength(2);
    expect(removalIndexes.every((index) => index > resetIndex)).toBe(true);
    expect(readJson(customProviderPath(target.runtimeRoot))).toEqual({ version: 3, providers: [] });
    expect(readJson(paths.agentConfig).defaultLaunchConfig.llmModelIdentifier)
      .toBe(collisionIdentifier);
    expect(readApplicationSelectors(paths.applicationDatabase).profile.llmModelIdentifier)
      .toBe(collisionIdentifier);
    expect(listSecretIds(target.database.databasePath)).not.toContain(
      `provider.openai-compatible.${oldOne}.api-key`,
    );
    expect(listSecretIds(target.database.databasePath)).not.toContain(
      `provider.openai-compatible.${oldTwo}.api-key`,
    );
    expect(server.output()).not.toContain(firstSecret);
    expect(server.output()).not.toContain(secondSecret);
  }, 300_000);

  it('blocks a fresh recent RUNNING record, then converges through the ordinary stale retry', async () => {
    const target = makeTarget('readable-running-gate');
    deploySchema(target.database);
    writeV2(target.runtimeRoot);
    const paths = writeSelectorFixture(target.runtimeRoot);
    const prisma = new PrismaClient({ datasources: { db: { url: target.database.databaseUrl } } });
    try {
      await prisma.appDataMigrationRecord.create({
        data: {
          migrationId: READABLE_MIGRATION_ID,
          displayName: 'Custom provider readable identity reset',
          status: 'RUNNING',
          attempts: 1,
          startedAt: new Date(),
        },
      });
    } finally {
      await prisma.$disconnect();
    }

    const blocked = await startExpectingGateFailure(target);
    expect(blocked.exitCode).toBe(1);
    expect(blocked.output).toContain('CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:RUNNING:');
    expect(blocked.output).not.toContain('Server listening on');
    expect(readJson(customProviderPath(target.runtimeRoot))).toMatchObject({ version: 2 });

    const stalePrisma = new PrismaClient({ datasources: { db: { url: target.database.databaseUrl } } });
    try {
      await stalePrisma.appDataMigrationRecord.update({
        where: { migrationId: READABLE_MIGRATION_ID },
        data: { startedAt: new Date(Date.now() - 16 * 60 * 1000) },
      });
    } finally {
      await stalePrisma.$disconnect();
    }

    const recovered = await startBuiltTestServer({
      runtimeRoot: target.runtimeRoot,
      databaseUrlOverride: target.database.databaseUrl,
    });
    ownedServers.add(recovered);
    expect(statusFor(await migrationStatuses(recovered.serverUrl), READABLE_MIGRATION_ID))
      .toMatchObject({ status: 'SUCCEEDED', attempts: 2 });
    expect(readJson(customProviderPath(target.runtimeRoot))).toEqual({ version: 3, providers: [] });
    expect(readJson(paths.agentConfig).defaultLaunchConfig.llmModelIdentifier)
      .toBe(READABLE_IDENTIFIER);
  }, 300_000);
});
