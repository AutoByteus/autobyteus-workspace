import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { initializePrisma, rootPrismaClient, shutdownPrisma } from 'repository_prisma';
import { AppDataMigrationRecordRepository } from '../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js';
import { AppDataMigrationRegistry } from '../../../src/app-data-migrations/app-data-migration-registry.js';
import { AppDataMigrationRunner } from '../../../src/app-data-migrations/app-data-migration-runner.js';
import {
  PrismaTokenUsageProviderNameSnapshotBackfillDatabase,
  TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID,
  TokenUsageProviderNameSnapshotBackfillMigration,
  type TokenUsageProviderNameSnapshotBackfillDatabase,
} from '../../../src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.js';
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
} from '../../../src/app-data-migrations/domain/app-data-migration-types.js';

const createdRowIds = new Set<number>();
const createdMigrationIds = new Set<string>([TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID]);
let logsRoot: string;

type DatabaseLike = TokenUsageProviderNameSnapshotBackfillDatabase;

class CountingDatabase implements DatabaseLike {
  candidateBatchCalls = 0;
  applyBatchCalls = 0;
  attemptedUpdateRows = 0;
  failingId: number | null = null;

  constructor(private readonly delegate: DatabaseLike) {}

  listCandidateBatch(
    afterId: number,
    limit: number,
  ): ReturnType<DatabaseLike['listCandidateBatch']> {
    this.candidateBatchCalls += 1;
    return this.delegate.listCandidateBatch(afterId, limit);
  }

  countRows(): ReturnType<DatabaseLike['countRows']> {
    return this.delegate.countRows();
  }

  applyBatch(
    updates: Parameters<DatabaseLike['applyBatch']>[0],
  ): ReturnType<DatabaseLike['applyBatch']> {
    this.applyBatchCalls += 1;
    this.attemptedUpdateRows += updates.length;
    if (updates.some(({ id }) => this.failingId === id)) {
      return Promise.reject(new Error('synthetic provider-name update failure'));
    }
    return this.delegate.applyBatch(updates);
  }
}

const providerStore = (providerNames: Map<string, string>, onLoad?: () => void) => ({
  read: async () => {
    onLoad?.();
    return [...providerNames.entries()].map(([id, name]) => ({
      id,
      name,
    }));
  },
});

const emptySummary = () => ({
  scannedCount: 0,
  migratedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  details: [],
});

const siblingMigration = (migrationId: string, onExecute: () => void): AppDataMigrationDefinition => ({
  id: migrationId,
  displayName: 'Synthetic provider-name startup sibling migration',
  description: 'Confirms startup continues after provider-name snapshot migration outcomes.',
  requiredOnStartup: true,
  async execute(): Promise<AppDataMigrationExecutionResult> {
    onExecute();
    return { status: 'SUCCEEDED', summary: emptySummary() };
  },
});

const createLedgerRow = async (input: {
  runId: string;
  runtimeKind?: string;
  modelProvider?: string | null;
  providerName?: string | null;
  modelIdentifier: string | null;
  modelValue: string | null;
}): Promise<number> => {
  const created = await rootPrismaClient.tokenUsageLedgerEvent.create({
    data: {
      usageEventId: `provider-name-migration-e2e-${randomUUID()}`,
      idempotencyKey: `provider-name-migration-e2e:${randomUUID()}`,
      observedAt: new Date('2048-07-30T10:00:00.000Z'),
      runId: input.runId,
      runtimeKind: input.runtimeKind ?? 'autobyteus',
      modelProvider: input.modelProvider ?? 'OPENAI_COMPATIBLE',
      providerName: input.providerName ?? null,
      modelIdentifier: input.modelIdentifier,
      modelValue: input.modelValue,
      ingestionKind: 'provider-name-migration-e2e',
      usageScope: 'per_turn',
      pricingStatus: 'missing',
      apiCostStatus: 'price_missing',
    },
    select: { id: true },
  });
  createdRowIds.add(created.id);
  return created.id;
};

const readRows = async (rowIds: number[]) => rootPrismaClient.tokenUsageLedgerEvent.findMany({
  where: { id: { in: rowIds } },
  orderBy: { id: 'asc' },
});

const withoutProviderName = <T extends { providerName: string | null }>(row: T): Omit<T, 'providerName'> => {
  const { providerName: _providerName, ...preserved } = row;
  return preserved;
};

const deleteMigrationRecords = async (): Promise<void> => {
  await rootPrismaClient.$executeRawUnsafe(
    `DELETE FROM "app_data_migration_records" WHERE "migration_id" IN (${[...createdMigrationIds].map(() => '?').join(', ')})`,
    ...createdMigrationIds,
  );
};

const makeRunner = (
  database: DatabaseLike,
  providerNames: Map<string, string>,
  siblingId: string,
  onSiblingExecute: () => void,
  onProviderLoad?: () => void,
): AppDataMigrationRunner => new AppDataMigrationRunner(
  new AppDataMigrationRegistry([
    new TokenUsageProviderNameSnapshotBackfillMigration(database, providerStore(providerNames, onProviderLoad)),
    siblingMigration(siblingId, onSiblingExecute),
  ]),
  new AppDataMigrationRecordRepository(rootPrismaClient),
  { logsDir: logsRoot },
);

describe('token usage provider-name snapshot backfill startup e2e', () => {
  beforeAll(async () => {
    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
    logsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'token-usage-provider-name-backfill-e2e-'));
  });

  afterEach(async () => {
    if (createdRowIds.size > 0) {
      await rootPrismaClient.tokenUsageLedgerEvent.deleteMany({ where: { id: { in: [...createdRowIds] } } });
    }
    createdRowIds.clear();
    await deleteMigrationRecords();
    for (const migrationId of [...createdMigrationIds]) {
      if (migrationId !== TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID) {
        createdMigrationIds.delete(migrationId);
      }
    }
  });

  afterAll(async () => {
    await shutdownPrisma();
    if (logsRoot) await fs.rm(logsRoot, { recursive: true, force: true });
  });

  it('runs the real Prisma adapter, preserves all non-provider fields, and explicitly retries warning rows', async () => {
    const providerId = `provider_${randomUUID()}`;
    const missingProviderId = `provider_missing_${randomUUID()}`;
    const customModel = `openai-compatible:${providerId}:org/model:tag`;
    const missingModel = `openai-compatible:${missingProviderId}:lost-model`;
    const runId = `provider-name-warning-${randomUUID()}`;
    const rowIds = [
      await createLedgerRow({
        runId: `${runId}-builtin`,
        modelProvider: 'DEEPSEEK',
        modelIdentifier: 'deepseek-v4-flash',
        modelValue: 'deepseek-v4-flash',
      }),
      await createLedgerRow({
        runId: `${runId}-custom`,
        modelIdentifier: customModel,
        modelValue: 'org/model:tag',
      }),
      await createLedgerRow({
        runId: `${runId}-missing`,
        modelIdentifier: missingModel,
        modelValue: 'lost-model',
      }),
      await createLedgerRow({
        runId: `${runId}-codex`,
        runtimeKind: 'codex_app_server',
        modelProvider: 'OPENAI',
        modelIdentifier: 'gpt-5.6-luna',
        modelValue: 'gpt-5.6-luna',
      }),
      await createLedgerRow({
        runId: `${runId}-already-populated`,
        providerName: 'Historical Provider',
        modelIdentifier: customModel,
        modelValue: 'org/model:tag',
      }),
    ];
    const beforeRows = await readRows(rowIds);
    const beforePreservedRows = beforeRows.map(withoutProviderName);
    const providerNames = new Map([[providerId, 'Alibaba Cloud']]);
    const siblingId = `provider-name-warning-sibling-${randomUUID()}`;
    createdMigrationIds.add(siblingId);
    let siblingExecutions = 0;
    let providerLoads = 0;
    const runner = makeRunner(new PrismaTokenUsageProviderNameSnapshotBackfillDatabase(rootPrismaClient), providerNames, siblingId, () => {
      siblingExecutions += 1;
    }, () => {
      providerLoads += 1;
    });

    const first = await runner.runPending();
    expect(first).toEqual(expect.arrayContaining([
      expect.objectContaining({
        migrationId: TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID,
        status: 'SUCCEEDED_WITH_WARNINGS',
        attempts: 1,
        canRetry: true,
      }),
      expect.objectContaining({ migrationId: siblingId, status: 'SUCCEEDED' }),
    ]));
    expect(siblingExecutions).toBe(1);
    expect(providerLoads).toBe(1);
    expect((await readRows(rowIds)).map((row) => row.providerName)).toEqual([
      'DeepSeek',
      'Alibaba Cloud',
      null,
      null,
      'Historical Provider',
    ]);
    expect((await readRows(rowIds)).map(withoutProviderName)).toEqual(beforePreservedRows);

    const second = await runner.runPending();
    expect(second.find((entry) => entry.migrationId === TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID)).toMatchObject({
      status: 'SUCCEEDED_WITH_WARNINGS',
      attempts: 1,
    });
    expect(providerLoads).toBe(1);
    expect(siblingExecutions).toBe(1);

    providerNames.set(missingProviderId, 'Recovered Provider');
    const explicitRetry = await runner.runMigration(TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID);
    expect(explicitRetry).toMatchObject({ status: 'SUCCEEDED', attempts: 2 });
    expect(providerLoads).toBe(2);
    expect((await readRows(rowIds)).map((row) => row.providerName)).toEqual([
      'DeepSeek',
      'Alibaba Cloud',
      'Recovered Provider',
      null,
      'Historical Provider',
    ]);
    expect((await readRows(rowIds)).map(withoutProviderName)).toEqual(beforePreservedRows);
  });

  it('records a failed atomic provider-name batch, continues sibling startup work, and retries the whole batch', async () => {
    const providerId = `provider_${randomUUID()}`;
    const rawModel = `openai-compatible:${providerId}:org/model:tag`;
    const runId = `provider-name-failure-${randomUUID()}`;
    const rowIds = [
      await createLedgerRow({ runId: `${runId}-one`, modelIdentifier: rawModel, modelValue: 'org/model:tag' }),
      await createLedgerRow({ runId: `${runId}-two`, modelIdentifier: `${rawModel}-two`, modelValue: 'org/model:tag-two' }),
      await createLedgerRow({ runId: `${runId}-three`, modelIdentifier: `${rawModel}-three`, modelValue: 'org/model:tag-three' }),
    ];
    const beforePreservedRows = (await readRows(rowIds)).map(withoutProviderName);
    const database = new CountingDatabase(new PrismaTokenUsageProviderNameSnapshotBackfillDatabase(rootPrismaClient));
    database.failingId = rowIds[1] ?? null;
    const siblingId = `provider-name-failure-sibling-${randomUUID()}`;
    createdMigrationIds.add(siblingId);
    let siblingExecutions = 0;
    const runner = makeRunner(database, new Map([[providerId, 'Alibaba Cloud']]), siblingId, () => {
      siblingExecutions += 1;
    });

    const failed = await runner.runPending();
    expect(failed).toEqual(expect.arrayContaining([
      expect.objectContaining({
        migrationId: TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID,
        status: 'FAILED',
        attempts: 1,
        canRetry: true,
      }),
      expect.objectContaining({ migrationId: siblingId, status: 'SUCCEEDED' }),
    ]));
    expect(siblingExecutions).toBe(1);
    expect((await readRows(rowIds)).map((row) => row.providerName)).toEqual([
      null,
      null,
      null,
    ]);
    expect((await readRows(rowIds)).map(withoutProviderName)).toEqual(beforePreservedRows);

    database.failingId = null;
    const retried = await runner.runPending();
    expect(retried.find((entry) => entry.migrationId === TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID)).toMatchObject({
      status: 'SUCCEEDED',
      attempts: 2,
    });
    expect(siblingExecutions).toBe(1);
    expect(database.candidateBatchCalls).toBe(2);
    expect(database.applyBatchCalls).toBe(2);
    expect(database.attemptedUpdateRows).toBe(6);
    expect((await readRows(rowIds)).map((row) => row.providerName)).toEqual([
      'Alibaba Cloud',
      'Alibaba Cloud',
      'Alibaba Cloud',
    ]);
    expect((await readRows(rowIds)).map(withoutProviderName)).toEqual(beforePreservedRows);
  });
});
