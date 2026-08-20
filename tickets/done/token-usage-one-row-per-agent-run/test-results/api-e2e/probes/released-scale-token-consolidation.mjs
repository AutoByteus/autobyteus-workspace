import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

const root = process.cwd();
const serverRoot = path.join(root, 'autobyteus-server-ts');
const require = createRequire(path.join(serverRoot, 'package.json'));
const { PrismaClient } = require('@prisma/client');
const ticketRoot = path.join(root, 'tickets/in-progress/token-usage-one-row-per-agent-run');
const resultPath = path.join(ticketRoot, 'test-results/api-e2e/scale-probe-result.json');
const probeRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'autobyteus-token-scale-'));
const databasePath = path.join(probeRoot, 'released-scale.sqlite');
const tmpRoot = path.join(probeRoot, 'sqlite-tmp');
await fsp.mkdir(tmpRoot, { recursive: true });
process.env.TMPDIR = tmpRoot;
process.env.TMP = tmpRoot;
process.env.TEMP = tmpRoot;

const imp = async (relative) => import(pathToFileURL(path.join(serverRoot, 'dist', relative)).href);
const { PrismaTokenUsageCustomProviderModelValueBackfillDatabase, TokenUsageCustomProviderModelValueBackfillMigration } =
  await imp('app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.js');
const { PrismaTokenUsageProviderNameSnapshotBackfillDatabase, TokenUsageProviderNameSnapshotBackfillMigration } =
  await imp('app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.js');
const { LegacyTokenUsageConsolidationRepository } =
  await imp('app-data-migrations/migrations/token-usage-run-records-v1/legacy-token-usage-consolidation-repository.js');
const { TokenUsageRunRecordsV1AppDataMigration } =
  await imp('app-data-migrations/migrations/token-usage-run-records-v1/token-usage-run-records-v1-app-data-migration.js');

const rowCount = 154_100;
const runCount = 1_269;
const migrations = [
  '20260624090000_add_token_usage_ledger_events',
  '20260625193000_token_usage_component_pricing_explainability',
  '20260629120000_add_token_usage_display_fields',
  '20260702093000_token_usage_execution_address',
  '20260730090000_add_token_usage_provider_name',
  '20260801090000_token_usage_member_display_name',
  '20260819090000_add_token_usage_run_records',
];
const size = (candidate) => { try { return fs.statSync(candidate).size; } catch { return 0; } };
const directoryBytes = (directory) => {
  try {
    return fs.readdirSync(directory, { withFileTypes: true }).reduce((sum, entry) => {
      const candidate = path.join(directory, entry.name);
      return sum + (entry.isDirectory() ? directoryBytes(candidate) : size(candidate));
    }, 0);
  } catch { return 0; }
};
const diskFree = () => {
  const facts = fs.statfsSync(probeRoot);
  return Number(facts.bavail) * Number(facts.bsize);
};
const sqliteFacts = () => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const scalar = (pragma, key) => Number(database.prepare(pragma).get()[key]);
    const pageSize = scalar('PRAGMA page_size', 'page_size');
    const pageCount = scalar('PRAGMA page_count', 'page_count');
    return {
      pageSize,
      pageCount,
      freelistCount: scalar('PRAGMA freelist_count', 'freelist_count'),
      journalMode: String(database.prepare('PRAGMA journal_mode').get().journal_mode),
      databaseBytes: size(databasePath),
      walBytes: size(`${databasePath}-wal`),
      shmBytes: size(`${databasePath}-shm`),
      logicalPageBytes: pageSize * pageCount,
    };
  } finally { database.close(); }
};
const monitorPhase = async (name, work) => {
  const start = performance.now();
  const freeBefore = diskFree();
  let peakWalBytes = size(`${databasePath}-wal`);
  let peakTmpBytes = directoryBytes(tmpRoot);
  let peakRssBytes = process.memoryUsage().rss;
  const timer = setInterval(() => {
    peakWalBytes = Math.max(peakWalBytes, size(`${databasePath}-wal`));
    peakTmpBytes = Math.max(peakTmpBytes, directoryBytes(tmpRoot));
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  }, 25);
  try {
    const result = await work();
    return {
      name,
      elapsedMs: Math.round(performance.now() - start),
      peakWalBytes,
      peakTmpBytes,
      peakRssBytes,
      freeDiskDeltaBytes: freeBefore - diskFree(),
      result,
    };
  } finally { clearInterval(timer); }
};

const freeDiskAtStart = diskFree();
let seedElapsedMs = 0;
try {
  const database = new DatabaseSync(databasePath);
  try {
    database.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA temp_store=FILE;');
    for (const migrationId of migrations) {
      database.exec(fs.readFileSync(path.join(serverRoot, 'prisma/migrations', migrationId, 'migration.sql'), 'utf8'));
    }
    const insert = database.prepare(`
      INSERT INTO token_usage_ledger_events (
        usage_event_id, idempotency_key, observed_at, run_id, root_team_run_id,
        runtime_kind, model_provider, model_identifier, model_value, ingestion_kind,
        usage_scope, input_token_semantic, reported_input_tokens, reported_output_tokens,
        reported_total_tokens, accounting_input_tokens, accounting_output_tokens,
        accounting_total_tokens, standard_input_tokens, cache_miss_input_tokens,
        billable_input_tokens, billable_output_tokens, raw_usage_json, raw_event_json,
        pricing_snapshot_json, quality_flags_json, missing_price_dimensions_json,
        pricing_status, api_cost_status
      ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?,
        'released-scale-probe', 'per_turn', 'gross_includes_cache',
        1, 1, 2, 1, 1, 2, 1, 1, 1, 1, ?, ?, ?, '[]', '[]', 'missing', 'price_missing')
    `);
    const rawUsage = JSON.stringify({ usage: 'u'.repeat(700) });
    const rawEvent = JSON.stringify({ event: 'e'.repeat(2_200) });
    const pricing = JSON.stringify({ pricing: 'p'.repeat(1_950) });
    const seedStart = performance.now();
    database.exec('BEGIN IMMEDIATE');
    for (let index = 0; index < rowCount; index += 1) {
      let modelProvider = 'OPENAI';
      let modelIdentifier = 'gpt-released-scale';
      let modelValue = 'gpt-released-scale';
      const runtimeKind = index < 144 ? 'autobyteus' : 'codex_app_server';
      if (index < 144) {
        modelProvider = 'OPENAI_COMPATIBLE';
        modelIdentifier = `openai-compatible:provider_scale:org/model:${index}`;
        modelValue = modelIdentifier;
      }
      if (index === 141) modelValue = 'openai-compatible:provider_scale:org/conflict:141';
      if (index === 142) modelIdentifier = null;
      if (index === 143) {
        modelIdentifier = 'openai-compatible:malformed';
        modelValue = 'openai-compatible:malformed';
      }
      insert.run(
        `released-scale-event-${index}`,
        `released-scale-idempotency-${index}`,
        `2026-07-${String(1 + (index % 28)).padStart(2, '0')}T10:${String(index % 60).padStart(2, '0')}:00.000Z`,
        `released-scale-run-${String(index % runCount).padStart(4, '0')}`,
        runtimeKind,
        modelProvider,
        modelIdentifier,
        modelValue,
        rawUsage,
        rawEvent,
        pricing,
      );
    }
    database.exec('COMMIT');
    database.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    seedElapsedMs = Math.round(performance.now() - seedStart);
  } finally { database.close(); }

  const seeded = sqliteFacts();
  const prisma = new PrismaClient({ datasourceUrl: pathToFileURL(databasePath).href });
  let modelValuePhase;
  let providerNamePhase;
  let consolidationPhase;
  let sourceShapingValidation;
  try {
    modelValuePhase = await monitorPhase('model-value-source-shaping', async () =>
      new TokenUsageCustomProviderModelValueBackfillMigration(
        new PrismaTokenUsageCustomProviderModelValueBackfillDatabase(prisma),
      ).execute());
    providerNamePhase = await monitorPhase('provider-name-source-shaping', async () =>
      new TokenUsageProviderNameSnapshotBackfillMigration(
        new PrismaTokenUsageProviderNameSnapshotBackfillDatabase(prisma),
        { read: async () => [{ id: 'provider_scale', name: 'Scale Custom' }] },
      ).execute());
    const validationDb = new DatabaseSync(databasePath, { readOnly: true });
    try {
      sourceShapingValidation = validationDb.prepare(`
        SELECT
          SUM(CASE WHEN model_provider='OPENAI_COMPATIBLE' AND model_value LIKE 'org/model:%' THEN 1 ELSE 0 END) AS custom_model_values_migrated,
          SUM(CASE WHEN model_provider='OPENAI_COMPATIBLE' AND model_value LIKE 'openai-compatible:%' THEN 1 ELSE 0 END) AS custom_candidates_remaining,
          SUM(CASE WHEN provider_name IS NOT NULL AND trim(provider_name) <> '' THEN 1 ELSE 0 END) AS provider_names_present
        FROM token_usage_ledger_events
      `).get();
    } finally { validationDb.close(); }
    await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)');
    consolidationPhase = await monitorPhase('run-record-consolidation', async () =>
      new TokenUsageRunRecordsV1AppDataMigration(
        new LegacyTokenUsageConsolidationRepository(prisma),
      ).execute());
  } finally { await prisma.$disconnect(); }

  const validationDb = new DatabaseSync(databasePath, { readOnly: true });
  let validation;
  try {
    validation = {
      legacyRows: Number(validationDb.prepare('SELECT COUNT(*) AS count FROM token_usage_ledger_events').get().count),
      currentRows: Number(validationDb.prepare('SELECT COUNT(*) AS count FROM token_usage_run_records').get().count),
      totalReports: Number(validationDb.prepare('SELECT SUM(usage_report_count) AS total FROM token_usage_run_records').get().total),
      totalInputTokens: Number(validationDb.prepare('SELECT SUM(accounting_input_tokens) AS total FROM token_usage_run_records').get().total),
      totalOutputTokens: Number(validationDb.prepare('SELECT SUM(accounting_output_tokens) AS total FROM token_usage_run_records').get().total),
      integrityCheck: String(validationDb.prepare('PRAGMA integrity_check').get().integrity_check),
    };
  } finally { validationDb.close(); }
  const completed = sqliteFacts();
  const evidence = {
    rowCount,
    runCount,
    seedElapsedMs,
    seeded,
    modelValuePhase,
    providerNamePhase,
    sourceShapingValidation,
    consolidationPhase,
    completed,
    validation,
    freeDiskAtStart,
    freeDiskBeforeCleanup: diskFree(),
    probeRoot,
  };
  await fsp.writeFile(resultPath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
  if (!['SUCCEEDED', 'SUCCEEDED_WITH_WARNINGS'].includes(modelValuePhase.result.status) ||
      !['SUCCEEDED', 'SUCCEEDED_WITH_WARNINGS'].includes(providerNamePhase.result.status) ||
      Number(sourceShapingValidation?.custom_model_values_migrated) !== 141 ||
      Number(sourceShapingValidation?.custom_candidates_remaining) !== 3 ||
      Number(sourceShapingValidation?.provider_names_present) !== 142 ||
      consolidationPhase.result.status !== 'SUCCEEDED' ||
      validation.legacyRows !== 0 || validation.currentRows !== runCount ||
      validation.totalReports !== rowCount || validation.totalInputTokens !== rowCount ||
      validation.totalOutputTokens !== rowCount || validation.integrityCheck !== 'ok') {
    process.exitCode = 1;
  }
} finally {
  await fsp.rm(probeRoot, { recursive: true, force: true });
}
