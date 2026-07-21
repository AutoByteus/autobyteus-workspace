import { beforeEach, describe, expect, it, vi } from "vitest";

const factoryHarness = vi.hoisted(() => ({
  createConfiguredPrismaClient: vi.fn(() => {
    throw new Error("configured Prisma acquisition attempted");
  }),
}));

vi.mock("../../../src/config/prisma-client-factory.js", () => factoryHarness);

import { SqlTokenUsageLedgerRepository } from "../../../src/token-usage/repositories/sql/token-usage-ledger-repository.js";
import { AppDataMigrationRecordRepository } from "../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js";
import { PrismaTokenUsageExecutionAddressBackfillDatabase } from "../../../src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.js";
import { PrismaTokenUsageLegacyPathColumnsDropDatabase } from "../../../src/app-data-migrations/migrations/token-usage-legacy-path-columns-drop-migration.js";

describe("Prisma import lifecycle", () => {
  beforeEach(() => {
    factoryHarness.createConfiguredPrismaClient.mockClear();
  });

  it("imports and constructs database owners without acquiring runtime configuration", () => {
    new SqlTokenUsageLedgerRepository();
    new AppDataMigrationRecordRepository();
    new PrismaTokenUsageExecutionAddressBackfillDatabase();
    new PrismaTokenUsageLegacyPathColumnsDropDatabase();

    expect(factoryHarness.createConfiguredPrismaClient).not.toHaveBeenCalled();
  });

  it("acquires the configured client only on each owner's first database operation", async () => {
    const operations = [
      () => new SqlTokenUsageLedgerRepository().listEventsByRunId("run-1"),
      () => new AppDataMigrationRecordRepository().getRecord("migration-1"),
      () => new PrismaTokenUsageExecutionAddressBackfillDatabase().listTokenUsageLedgerRows(),
      () => new PrismaTokenUsageLegacyPathColumnsDropDatabase().listTokenUsageLedgerColumns(),
    ];

    for (const operation of operations) {
      factoryHarness.createConfiguredPrismaClient.mockClear();
      await expect(operation()).rejects.toThrow("configured Prisma acquisition attempted");
      expect(factoryHarness.createConfiguredPrismaClient).toHaveBeenCalledOnce();
    }
  });
});
