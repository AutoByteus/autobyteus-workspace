import { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppDataMigrationRecordRepository } from "../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js";

const migrationId = "test-summary-string-repository";
let prisma: PrismaClient;

beforeEach(async () => {
  prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  await prisma.$executeRawUnsafe(
    "DELETE FROM app_data_migration_records WHERE migration_id = ?",
    migrationId,
  );
});

afterEach(async () => {
  await prisma.$executeRawUnsafe(
    "DELETE FROM app_data_migration_records WHERE migration_id = ?",
    migrationId,
  );
  await prisma.$disconnect();
});

describe("AppDataMigrationRecordRepository", () => {
  it("persists and reads one nullable string summary with existing record metadata", async () => {
    const repository = new AppDataMigrationRecordRepository(prisma);
    const startedAt = new Date("2026-08-20T10:00:00.000Z");
    const completedAt = new Date("2026-08-20T10:01:00.000Z");

    await expect(repository.markRunning({
      migrationId,
      displayName: "Summary string migration",
      startedAt,
    })).resolves.toMatchObject({
      migrationId,
      status: "RUNNING",
      attempts: 1,
      summary: null,
    });

    const summary = "Scanned 158025; migrated 1283; skipped 17; failed 2.";
    const completed = await repository.complete({
      migrationId,
      displayName: "Summary string migration",
      status: "SUCCEEDED_WITH_WARNINGS",
      completedAt,
      summary,
      errorMessage: "bounded warning",
      logPath: "/logs/preserved.log",
    });

    expect(completed).toMatchObject({
      migrationId,
      status: "SUCCEEDED_WITH_WARNINGS",
      attempts: 1,
      completedAt,
      summary,
      errorMessage: "bounded warning",
      logPath: "/logs/preserved.log",
    });
    await expect(repository.getRecord(migrationId)).resolves.toEqual(completed);
    await expect(repository.listRecords()).resolves.toContainEqual(completed);
    const raw = await prisma.$queryRawUnsafe<Array<{ summary: string }>>(
      "SELECT summary FROM app_data_migration_records WHERE migration_id = ?",
      migrationId,
    );
    expect(raw).toEqual([{ summary }]);
  });
});
