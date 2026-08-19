import { afterEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { AppDataMigrationRecordRepository } from "../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js";
import {
  MAX_APP_DATA_MIGRATION_SUMMARY_BYTES,
  STORED_SUMMARY_COUNTS_UNAVAILABLE_ITEM_ID,
  STORED_SUMMARY_DETAILS_OMITTED_ITEM_ID,
} from "../../../src/app-data-migrations/repositories/app-data-migration-summary-projection.js";
import {
  createAuditFixture,
  destroyAuditFixture,
  insertAuditRecord,
  makeSummary,
  readRawAuditRecord,
  type AuditFixture,
} from "../../helpers/app-data-migration-audit-fixtures.js";

const fixtures: AuditFixture[] = [];

const instrument = (prisma: PrismaClient): { client: PrismaClient; selectedBytes: number[] } => {
  const selectedBytes: number[] = [];
  const client = new Proxy(prisma, {
    get(target, property) {
      if (property === "$queryRawUnsafe") {
        return async (...args: unknown[]) => {
          const rows = await (target.$queryRawUnsafe as (...values: unknown[]) => Promise<unknown[]>)(...args);
          for (const row of rows as Array<{ summary_json?: string | null }>) {
            if (typeof row.summary_json === "string") {
              selectedBytes.push(Buffer.byteLength(row.summary_json, "utf8"));
            }
          }
          return rows;
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as PrismaClient;
  return { client, selectedBytes };
};

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(destroyAuditFixture));
});

describe("AppDataMigrationRecordRepository bounded summary projection", () => {
  it("returns exact small summaries and SQL-projects oversized valid summaries", async () => {
    const fixture = await createAuditFixture("record-bounds");
    fixtures.push(fixture);
    const small = makeSummary(1);
    const large = makeSummary(4_000, 32);
    expect(Buffer.byteLength(large.json, "utf8")).toBeGreaterThan(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);
    insertAuditRecord({ databasePath: fixture.databasePath, migrationId: "small", summaryJson: small.json });
    insertAuditRecord({ databasePath: fixture.databasePath, migrationId: "large", summaryJson: large.json });
    const observed = instrument(fixture.prisma);
    const repository = new AppDataMigrationRecordRepository(observed.client);

    const records = await repository.listRecords();
    expect(records.find(({ migrationId }) => migrationId === "small")?.summaryJson).toBe(small.json);
    const projected = JSON.parse(records.find(({ migrationId }) => migrationId === "large")!.summaryJson!);
    expect(projected).toMatchObject({
      scannedCount: 123_456,
      migratedCount: 123_000,
      skippedCount: 456,
      failedCount: 0,
      details: [{ itemId: STORED_SUMMARY_DETAILS_OMITTED_ITEM_ID, status: "SKIPPED" }],
    });
    expect(projected.details[0].message).toContain("4000 detail items");
    expect(observed.selectedBytes.every((size) => size <= MAX_APP_DATA_MIGRATION_SUMMARY_BYTES)).toBe(true);
    await expect(repository.getRecord("large")).resolves.toMatchObject({ summaryJson: JSON.stringify(projected) });
    expect(readRawAuditRecord(fixture.databasePath, "large")?.["summary_json"]).toBe(large.json);
  });

  it.each([
    ["malformed JSON", "{not-json"],
    ["wrong count shape", JSON.stringify({ scannedCount: "5", migratedCount: 0, skippedCount: 0, failedCount: 0, details: [] })],
    ["wrong details shape", JSON.stringify({ scannedCount: 5, migratedCount: 0, skippedCount: 0, failedCount: 0, details: {} })],
    ["unsafe count", JSON.stringify({ scannedCount: 9_007_199_254_740_992, migratedCount: 0, skippedCount: 0, failedCount: 0, details: [] })],
  ])("returns a bounded unavailable marker for %s", async (_name, summaryJson) => {
    const fixture = await createAuditFixture("invalid-summary");
    fixtures.push(fixture);
    insertAuditRecord({ databasePath: fixture.databasePath, migrationId: "invalid", summaryJson });
    const record = await new AppDataMigrationRecordRepository(fixture.prisma).getRecord("invalid");
    const summary = JSON.parse(record!.summaryJson!);
    expect(summary).toMatchObject({
      scannedCount: 0,
      migratedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      details: [{ itemId: STORED_SUMMARY_COUNTS_UNAVAILABLE_ITEM_ID, status: "SKIPPED" }],
    });
    expect(summary.details[0].message).toContain("zero values are placeholders");
    expect(Buffer.byteLength(record!.summaryJson!, "utf8")).toBeLessThanOrEqual(MAX_APP_DATA_MIGRATION_SUMMARY_BYTES);
  });

  it("preserves an absent summary for a running record", async () => {
    const fixture = await createAuditFixture("null-summary");
    fixtures.push(fixture);
    insertAuditRecord({
      databasePath: fixture.databasePath,
      migrationId: "running",
      status: "RUNNING",
      summaryJson: null,
    });
    await expect(new AppDataMigrationRecordRepository(fixture.prisma).getRecord("running"))
      .resolves.toMatchObject({ status: "RUNNING", summaryJson: null });
  });
});
