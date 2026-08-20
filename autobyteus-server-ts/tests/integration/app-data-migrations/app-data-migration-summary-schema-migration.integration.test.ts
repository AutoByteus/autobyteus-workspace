import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const serverRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const releasedMigrationPath = path.join(
  serverRoot,
  "prisma/migrations/20260517090000_add_app_data_migration_records/migration.sql",
);
const summaryMigrationPath = path.join(
  serverRoot,
  "prisma/migrations/20260820090000_redesign_app_data_migration_summary/migration.sql",
);
const baseMigrationName = "20260517090000_add_app_data_migration_records";
const summaryMigrationName = "20260820090000_redesign_app_data_migration_summary";

type DisposableFixture = {
  root: string;
  prismaDir: string;
  schemaPath: string;
  databaseUrl: string;
};

const fixtureRoots: string[] = [];

const createFixture = async (): Promise<DisposableFixture> => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "app-data-summary-schema-migration-"),
  );
  fixtureRoots.push(root);
  const prismaDir = path.join(root, "prisma");
  const schemaPath = path.join(prismaDir, "schema.prisma");
  const databaseUrl = `file:${path.join(root, "fixture.db")}`;
  const baseMigrationDir = path.join(prismaDir, "migrations", baseMigrationName);
  await fs.mkdir(baseMigrationDir, { recursive: true });
  await fs.writeFile(
    schemaPath,
    [
      "datasource db {",
      '  provider = "sqlite"',
      '  url      = env("DATABASE_URL")',
      "}",
      "",
    ].join("\n"),
    "utf-8",
  );
  await fs.copyFile(
    releasedMigrationPath,
    path.join(baseMigrationDir, "migration.sql"),
  );
  return { root, prismaDir, schemaPath, databaseUrl };
};

const addSummaryMigration = async (fixture: DisposableFixture): Promise<void> => {
  const migrationDir = path.join(
    fixture.prismaDir,
    "migrations",
    summaryMigrationName,
  );
  await fs.mkdir(migrationDir, { recursive: true });
  await fs.copyFile(summaryMigrationPath, path.join(migrationDir, "migration.sql"));
};

const deploy = async (fixture: DisposableFixture): Promise<void> => {
  await execFileAsync(
    "pnpm",
    ["exec", "prisma", "migrate", "deploy", "--schema", fixture.schemaPath],
    {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: fixture.databaseUrl },
      maxBuffer: 10 * 1024 * 1024,
    },
  );
};

const withClient = async <T>(
  fixture: DisposableFixture,
  action: (client: PrismaClient) => Promise<T>,
): Promise<T> => {
  const client = new PrismaClient({
    datasources: { db: { url: fixture.databaseUrl } },
  });
  try {
    return await action(client);
  } finally {
    await client.$disconnect();
  }
};

const insertLegacyRecord = async (
  fixture: DisposableFixture,
  summaryJson: string | null,
  migrationId = "legacy-record",
): Promise<void> => withClient(fixture, async (client) => {
  await client.$executeRawUnsafe(
    `INSERT INTO app_data_migration_records
       (migration_id, display_name, status, attempts, started_at, completed_at,
        summary_json, error_message, log_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    migrationId,
    "Legacy migration",
    summaryJson === null ? "RUNNING" : "SUCCEEDED_WITH_WARNINGS",
    3,
    "2026-08-19T10:00:00.000Z",
    summaryJson === null ? null : "2026-08-19T10:01:00.000Z",
    summaryJson,
    summaryJson === null ? null : "bounded warning",
    summaryJson === null ? "/logs/running.log" : "/logs/preserved.log",
    "2026-08-19T09:59:00.000Z",
    "2026-08-19T10:01:00.000Z",
  );
});

const columnNames = async (fixture: DisposableFixture): Promise<string[]> =>
  withClient(fixture, async (client) => {
    const rows = await client.$queryRawUnsafe<Array<{ name: string }>>(
      "PRAGMA table_info('app_data_migration_records')",
    );
    return rows.map(({ name }) => name);
  });

afterEach(async () => {
  await Promise.all(
    fixtureRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe("app-data migration summary Prisma schema migration", () => {
  it("rewrites a large released summary in place and preserves nullable and scalar evidence", async () => {
    const fixture = await createFixture();
    await deploy(fixture);
    const largeSummaryJson = JSON.stringify({
      scannedCount: 158_025,
      migratedCount: 1_283,
      skippedCount: 17,
      failedCount: 2,
      details: Array.from({ length: 100_000 }, (_, index) => ({
        itemId: `legacy-${index}`,
        status: index % 2 === 0 ? "MIGRATED" : "SKIPPED",
        message: `Legacy diagnostic ${index}`,
      })),
    });
    await insertLegacyRecord(fixture, largeSummaryJson);
    await insertLegacyRecord(fixture, null, "running-record");
    await addSummaryMigration(fixture);

    await deploy(fixture);

    const columns = await columnNames(fixture);
    expect(columns).toContain("summary");
    expect(columns).not.toContain("summary_json");
    for (const countColumn of [
      "scanned_count",
      "migrated_count",
      "skipped_count",
      "failed_count",
    ]) {
      expect(columns).not.toContain(countColumn);
    }
    await withClient(fixture, async (client) => {
      const records = await client.$queryRawUnsafe<Array<{
        migration_id: string;
        display_name: string;
        status: string;
        attempts: number;
        summary: string | null;
        error_message: string | null;
        log_path: string | null;
        started_at: string;
        completed_at: string | null;
      }>>(
        `SELECT migration_id, display_name, status, attempts, summary, error_message, log_path,
                CAST(started_at AS TEXT) AS started_at,
                CAST(completed_at AS TEXT) AS completed_at
           FROM app_data_migration_records
          ORDER BY migration_id`,
      );
      expect(records).toEqual([
        {
          migration_id: "legacy-record",
          display_name: "Legacy migration",
          status: "SUCCEEDED_WITH_WARNINGS",
          attempts: 3,
          summary: "Scanned 158025; migrated 1283; skipped 17; failed 2.",
          error_message: "bounded warning",
          log_path: "/logs/preserved.log",
          started_at: "2026-08-19T10:00:00.000Z",
          completed_at: "2026-08-19T10:01:00.000Z",
        },
        {
          migration_id: "running-record",
          display_name: "Legacy migration",
          status: "RUNNING",
          attempts: 3,
          summary: null,
          error_message: null,
          log_path: "/logs/running.log",
          started_at: "2026-08-19T10:00:00.000Z",
          completed_at: null,
        },
      ]);
      const indexes = await client.$queryRawUnsafe<Array<{ name: string }>>(
        "PRAGMA index_list('app_data_migration_records')",
      );
      expect(indexes.map(({ name }) => name)).toContain(
        "app_data_migration_records_migration_id_key",
      );
      const staging = await client.$queryRawUnsafe<Array<{ name: string }>>(
        "SELECT name FROM sqlite_temp_master WHERE name = 'app_data_migration_summary_validation'",
      );
      expect(staging).toEqual([]);
      const integrity = await client.$queryRawUnsafe<Array<{ integrity_check: string }>>(
        "PRAGMA integrity_check",
      );
      expect(integrity).toEqual([{ integrity_check: "ok" }]);
    });
  }, 120_000);

  it("applies cleanly to a fresh database", async () => {
    const fixture = await createFixture();
    await addSummaryMigration(fixture);

    await deploy(fixture);

    expect(await columnNames(fixture)).toContain("summary");
    await withClient(fixture, async (client) => {
      const count = await client.$queryRawUnsafe<Array<{ count: string }>>(
        "SELECT CAST(COUNT(*) AS TEXT) AS count FROM app_data_migration_records",
      );
      expect(count).toEqual([{ count: "0" }]);
    });
  });

  it.each([
    ["wrong JSON source type", JSON.stringify({
      scannedCount: "1", migratedCount: 1, skippedCount: 0, failedCount: 0, details: [],
    })],
    ["negative integer", JSON.stringify({
      scannedCount: -1, migratedCount: 1, skippedCount: 0, failedCount: 0, details: [],
    })],
    ["fractional number", JSON.stringify({
      scannedCount: 1.5, migratedCount: 1, skippedCount: 0, failedCount: 0, details: [],
    })],
    ["missing count", JSON.stringify({
      scannedCount: 1, migratedCount: 1, skippedCount: 0, details: [],
    })],
    ["malformed JSON", "{not-json"],
  ])("rolls back the legacy schema and value for %s", async (_caseName, legacyValue) => {
    const fixture = await createFixture();
    await deploy(fixture);
    await insertLegacyRecord(fixture, legacyValue);
    await addSummaryMigration(fixture);

    await expect(deploy(fixture)).rejects.toThrow();

    const columns = await columnNames(fixture);
    expect(columns).toContain("summary_json");
    expect(columns).not.toContain("summary");
    await withClient(fixture, async (client) => {
      const records = await client.$queryRawUnsafe<Array<{
        summary_json: string;
        error_message: string;
        log_path: string;
      }>>(
        "SELECT summary_json, error_message, log_path FROM app_data_migration_records",
      );
      expect(records).toEqual([{
        summary_json: legacyValue,
        error_message: "bounded warning",
        log_path: "/logs/preserved.log",
      }]);
      const integrity = await client.$queryRawUnsafe<Array<{ integrity_check: string }>>(
        "PRAGMA integrity_check",
      );
      expect(integrity).toEqual([{ integrity_check: "ok" }]);
    });
  }, 120_000);
});
