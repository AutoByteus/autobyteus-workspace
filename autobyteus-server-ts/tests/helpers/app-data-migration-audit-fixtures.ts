import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import type { AppDataMigrationStatus, AppDataMigrationSummary } from "../../src/app-data-migrations/domain/app-data-migration-types.js";

export type AuditFixture = Readonly<{
  directory: string;
  databasePath: string;
  logsDir: string;
  prisma: PrismaClient;
}>;

export const createAuditFixture = async (name: string): Promise<AuditFixture> => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), `migration-audit-${name}-`));
  const databasePath = path.join(directory, "fixture.sqlite");
  const logsDir = path.join(directory, "logs", "app-data-migrations");
  await fs.mkdir(logsDir, { recursive: true });
  const database = new DatabaseSync(databasePath);
  try {
    database.exec(await fs.readFile(
      path.resolve("prisma", "migrations", "20260517090000_add_app_data_migration_records", "migration.sql"),
      "utf8",
    ));
    database.exec(`
      CREATE TABLE token_usage_ledger_events (id INTEGER PRIMARY KEY, marker TEXT NOT NULL);
      CREATE TABLE token_usage_run_records (run_id TEXT PRIMARY KEY, marker TEXT NOT NULL);
      INSERT INTO token_usage_ledger_events VALUES (1, 'legacy-sentinel');
      INSERT INTO token_usage_run_records VALUES ('current-sentinel', 'current-sentinel');
    `);
  } finally {
    database.close();
  }
  return {
    directory,
    databasePath,
    logsDir,
    prisma: new PrismaClient({ datasourceUrl: `file:${databasePath}` }),
  };
};

export const destroyAuditFixture = async (fixture: AuditFixture): Promise<void> => {
  await fixture.prisma.$disconnect();
  await fs.rm(fixture.directory, { recursive: true, force: true });
};

export const insertAuditRecord = (input: {
  databasePath: string;
  migrationId: string;
  displayName?: string;
  status?: AppDataMigrationStatus;
  attempts?: number;
  summaryJson: string | null;
  errorMessage?: string | null;
  logPath?: string | null;
}): void => {
  const database = new DatabaseSync(input.databasePath);
  try {
    database.prepare(`
      INSERT INTO app_data_migration_records (
        migration_id, display_name, status, attempts, started_at, completed_at,
        summary_json, error_message, log_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.migrationId,
      input.displayName ?? `Migration ${input.migrationId}`,
      input.status ?? "SUCCEEDED",
      input.attempts ?? 3,
      "2026-07-30T10:00:00.000Z",
      "2026-07-30T10:30:00.000Z",
      input.summaryJson,
      input.errorMessage ?? null,
      input.logPath ?? null,
    );
  } finally {
    database.close();
  }
};

export const readRawAuditRecord = (
  databasePath: string,
  migrationId: string,
): Record<string, unknown> | null => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return database.prepare(`
      SELECT migration_id, display_name, status, attempts, started_at, completed_at,
             summary_json, error_message, log_path
        FROM app_data_migration_records WHERE migration_id = ?
    `).get(migrationId) as Record<string, unknown> | undefined ?? null;
  } finally {
    database.close();
  }
};

export const readTokenSentinels = (databasePath: string): unknown => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return {
      legacy: database.prepare("SELECT * FROM token_usage_ledger_events ORDER BY id").all(),
      current: database.prepare("SELECT * FROM token_usage_run_records ORDER BY run_id").all(),
    };
  } finally {
    database.close();
  }
};

export const makeSummary = (
  detailCount: number,
  messageLength = 8,
): { json: string; summary: AppDataMigrationSummary } => {
  const summary: AppDataMigrationSummary = {
    scannedCount: 123_456,
    migratedCount: 123_000,
    skippedCount: 456,
    failedCount: 0,
    details: Array.from({ length: detailCount }, (_, index) => ({
      itemId: `legacy-row-${index}`,
      status: "SKIPPED" as const,
      message: `reason-${index}-${"x".repeat(messageLength)}`,
    })),
  };
  return { summary, json: JSON.stringify(summary) };
};
