import 'reflect-metadata';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { initializePrisma, rootPrismaClient, shutdownPrisma } from 'repository_prisma';
import { AppDataMigrationRecordRepository } from '../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js';
import { AppDataMigrationRegistry } from '../../../src/app-data-migrations/app-data-migration-registry.js';
import { AppDataMigrationRunner } from '../../../src/app-data-migrations/app-data-migration-runner.js';
import {
  PrismaTokenUsageCustomProviderModelValueBackfillDatabase,
  TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID,
  TokenUsageCustomProviderModelValueBackfillMigration,
  type RawTokenUsageCustomProviderModelValueRow,
  type TokenUsageCustomProviderModelValueBackfillDatabase,
} from '../../../src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.js';
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
} from '../../../src/app-data-migrations/domain/app-data-migration-types.js';

const createdRunIds = new Set<string>();
const createdMigrationIds = new Set<string>([TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID]);
let logsRoot: string;

type DatabaseLike = TokenUsageCustomProviderModelValueBackfillDatabase;

class CountingDatabase implements DatabaseLike {
  listCalls = 0;
  updateCalls = 0;
  failingId: number | null = null;

  constructor(private readonly delegate: DatabaseLike) {}

  async listTokenUsageLedgerRows(): Promise<RawTokenUsageCustomProviderModelValueRow[]> {
    this.listCalls += 1;
    return this.delegate.listTokenUsageLedgerRows();
  }

  async countTokenUsageLedgerRows(): Promise<number> {
    return this.delegate.countTokenUsageLedgerRows();
  }

  async updateTokenUsageModelValue(input: {
    id: number;
    expectedModelValue: string;
    nextModelValue: string;
  }): Promise<number | void> {
    this.updateCalls += 1;
    if (this.failingId === input.id) throw new Error('synthetic update failure');
    return this.delegate.updateTokenUsageModelValue(input);
  }
}

const migrationSummary = {
  scannedCount: 0,
  migratedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  details: [],
};

const siblingMigration = (migrationId: string, onExecute: () => void): AppDataMigrationDefinition => ({
  id: migrationId,
  displayName: 'Synthetic startup sibling migration',
  description: 'Confirms startup continues after the token usage migration reports failure.',
  requiredOnStartup: true,
  async execute(): Promise<AppDataMigrationExecutionResult> {
    onExecute();
    return { status: 'SUCCEEDED', summary: migrationSummary };
  },
});

const createLedgerRow = async (input: {
  runId: string;
  modelIdentifier: string | null;
  modelValue: string | null;
  modelProvider?: string | null;
  runtimeKind?: string;
}): Promise<number> => {
  createdRunIds.add(input.runId);
  const created = await rootPrismaClient.tokenUsageLedgerEvent.create({
    data: {
      usageEventId: `migration-e2e-${randomUUID()}`,
      idempotencyKey: `migration-e2e-${randomUUID()}`,
      observedAt: new Date('2047-07-30T10:00:00.000Z'),
      runId: input.runId,
      runtimeKind: input.runtimeKind ?? 'autobyteus',
      modelProvider: input.modelProvider ?? 'OPENAI_COMPATIBLE',
      modelIdentifier: input.modelIdentifier,
      modelValue: input.modelValue,
      ingestionKind: 'migration-e2e',
      usageScope: 'per_turn',
      pricingStatus: 'missing',
      apiCostStatus: 'price_missing',
    },
    select: { id: true },
  });
  return created.id;
};

const deleteMigrationRecords = async (): Promise<void> => {
  await rootPrismaClient.$executeRawUnsafe(
    `DELETE FROM "app_data_migration_records" WHERE "migration_id" IN (${[...createdMigrationIds].map(() => '?').join(', ')})`,
    ...createdMigrationIds,
  );
};

const makeRunner = (
  database: DatabaseLike,
  siblingId: string,
  onSiblingExecute: () => void,
): AppDataMigrationRunner => new AppDataMigrationRunner(
  new AppDataMigrationRegistry([
    new TokenUsageCustomProviderModelValueBackfillMigration(database),
    siblingMigration(siblingId, onSiblingExecute),
  ]),
  new AppDataMigrationRecordRepository(rootPrismaClient),
  { logsDir: logsRoot },
);

describe('token usage custom-provider model-value backfill startup e2e', () => {
  beforeAll(async () => {
    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
    logsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'token-usage-model-backfill-e2e-'));
  });

  afterEach(async () => {
    await rootPrismaClient.tokenUsageLedgerEvent.deleteMany({
      where: { runId: { in: [...createdRunIds] } },
    });
    createdRunIds.clear();
    await deleteMigrationRecords();
    for (const migrationId of [...createdMigrationIds]) {
      if (migrationId !== TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID) {
        createdMigrationIds.delete(migrationId);
      }
    }
  });

  afterAll(async () => {
    await shutdownPrisma();
    if (logsRoot) await fs.rm(logsRoot, { recursive: true, force: true });
  });

  it('runs the real Prisma adapter, preserves raw identity, and keeps warning completion terminal for runPending', async () => {
    const providerId = `provider_${randomUUID()}`;
    const rawModel = `openai-compatible:${providerId}:org/model:tag`;
    const runId = `migration-warning-${randomUUID()}`;
    const rowId = await createLedgerRow({
      runId,
      modelIdentifier: rawModel,
      modelValue: rawModel,
    });
    await createLedgerRow({
      runId: `${runId}-ambiguous`,
      modelIdentifier: `openai-compatible:${providerId}:other-model`,
      modelValue: `openai-compatible:${providerId}:org/model:tag`,
    });

    const database = new CountingDatabase(new PrismaTokenUsageCustomProviderModelValueBackfillDatabase(rootPrismaClient));
    const siblingId = `migration-warning-sibling-${randomUUID()}`;
    createdMigrationIds.add(siblingId);
    let siblingExecutions = 0;
    const runner = makeRunner(database, siblingId, () => { siblingExecutions += 1; });

    const first = await runner.runPending();
    expect(first).toEqual(expect.arrayContaining([
      expect.objectContaining({
        migrationId: TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID,
        status: 'SUCCEEDED_WITH_WARNINGS',
        attempts: 1,
        canRetry: true,
      }),
      expect.objectContaining({ migrationId: siblingId, status: 'SUCCEEDED' }),
    ]));
    expect(siblingExecutions).toBe(1);
    expect(database.listCalls).toBe(2);
    expect(await rootPrismaClient.tokenUsageLedgerEvent.findUnique({ where: { id: rowId } })).toMatchObject({
      modelIdentifier: rawModel,
      modelValue: 'org/model:tag',
    });

    const second = await runner.runPending();
    expect(second.find((entry) => entry.migrationId === TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID)).toMatchObject({
      status: 'SUCCEEDED_WITH_WARNINGS',
      attempts: 1,
    });
    expect(database.listCalls).toBe(2);
    expect(siblingExecutions).toBe(1);

    const explicitRetry = await runner.runMigration(TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID);
    expect(explicitRetry).toMatchObject({ status: 'SUCCEEDED_WITH_WARNINGS', attempts: 2 });
    expect(database.listCalls).toBe(4);
  });

  it('blocks startup after a failed row, durably retries only the unresolved row, and records attempts', async () => {
    const providerId = `provider_${randomUUID()}`;
    const rawModel = `openai-compatible:${providerId}:org/model:tag`;
    const runId = `migration-failure-${randomUUID()}`;
    const rowIds = [
      await createLedgerRow({ runId: `${runId}-one`, modelIdentifier: rawModel, modelValue: rawModel }),
      await createLedgerRow({ runId: `${runId}-two`, modelIdentifier: `${rawModel}-two`, modelValue: `${rawModel}-two` }),
      await createLedgerRow({ runId: `${runId}-three`, modelIdentifier: `${rawModel}-three`, modelValue: `${rawModel}-three` }),
    ];

    const database = new CountingDatabase(new PrismaTokenUsageCustomProviderModelValueBackfillDatabase(rootPrismaClient));
    database.failingId = rowIds[1] ?? null;
    const siblingId = `migration-failure-sibling-${randomUUID()}`;
    createdMigrationIds.add(siblingId);
    let siblingExecutions = 0;
    const runner = makeRunner(database, siblingId, () => { siblingExecutions += 1; });

    const failed = await runner.runPending();
    expect(failed).toEqual(expect.arrayContaining([
      expect.objectContaining({
        migrationId: TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID,
        status: 'FAILED',
        attempts: 1,
        canRetry: true,
      }),
      expect.objectContaining({ migrationId: siblingId, status: 'SUCCEEDED' }),
    ]));
    expect(siblingExecutions).toBe(1);
    expect(await rootPrismaClient.tokenUsageLedgerEvent.findMany({
      where: { id: { in: rowIds } },
      orderBy: { id: 'asc' },
      select: { id: true, modelIdentifier: true, modelValue: true },
    })).toEqual([
      { id: rowIds[0], modelIdentifier: rawModel, modelValue: 'org/model:tag' },
      { id: rowIds[1], modelIdentifier: `${rawModel}-two`, modelValue: `${rawModel}-two` },
      { id: rowIds[2], modelIdentifier: `${rawModel}-three`, modelValue: 'org/model:tag-three' },
    ]);

    database.failingId = null;
    const retried = await runner.runPending();
    expect(retried.find((entry) => entry.migrationId === TOKEN_USAGE_CUSTOM_PROVIDER_MODEL_VALUE_BACKFILL_MIGRATION_ID)).toMatchObject({
      status: 'SUCCEEDED',
      attempts: 2,
    });
    expect(siblingExecutions).toBe(1);
    expect(await rootPrismaClient.tokenUsageLedgerEvent.findMany({
      where: { id: { in: rowIds } },
      orderBy: { id: 'asc' },
      select: { id: true, modelIdentifier: true, modelValue: true },
    })).toEqual([
      { id: rowIds[0], modelIdentifier: rawModel, modelValue: 'org/model:tag' },
      { id: rowIds[1], modelIdentifier: `${rawModel}-two`, modelValue: 'org/model:tag-two' },
      { id: rowIds[2], modelIdentifier: `${rawModel}-three`, modelValue: 'org/model:tag-three' },
    ]);
  });
});
