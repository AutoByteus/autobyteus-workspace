import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

const factoryHarness = vi.hoisted(() => ({
  createConfiguredPrismaClient: vi.fn(),
}));

vi.mock("../../../src/config/prisma-client-factory.js", () => factoryHarness);

import { SqlTokenUsageLedgerRepository } from "../../../src/token-usage/repositories/sql/token-usage-ledger-repository.js";
import { TokenUsageLedgerStore } from "../../../src/token-usage/providers/token-usage-ledger-store.js";
import { AppDataMigrationRecordRepository } from "../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js";
import { PrismaTokenUsageExecutionAddressBackfillDatabase } from "../../../src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.js";
import { PrismaTokenUsageLegacyPathColumnsDropDatabase } from "../../../src/app-data-migrations/migrations/token-usage-legacy-path-columns-drop-migration.js";

describe("Prisma import lifecycle", () => {
  beforeEach(() => {
    factoryHarness.createConfiguredPrismaClient.mockReset();
    factoryHarness.createConfiguredPrismaClient.mockImplementation(() => {
      throw new Error("configured Prisma acquisition attempted");
    });
  });

  it("imports and constructs database owners without acquiring runtime configuration", () => {
    new SqlTokenUsageLedgerRepository();
    new TokenUsageLedgerStore();
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

  it("does not acquire or disconnect caller-injected clients", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const injectedClient = {
      tokenUsageLedgerEvent: { findMany },
      $disconnect: disconnect,
    } as unknown as PrismaClient;

    await new SqlTokenUsageLedgerRepository(injectedClient).listEventsByRunId("run-injected");
    await new PrismaTokenUsageExecutionAddressBackfillDatabase(injectedClient).disconnect();
    await new PrismaTokenUsageLegacyPathColumnsDropDatabase(injectedClient).disconnect();

    expect(findMany).toHaveBeenCalledOnce();
    expect(factoryHarness.createConfiguredPrismaClient).not.toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("disconnects lazily acquired migration-owned clients", async () => {
    const backfillDisconnect = vi.fn().mockResolvedValue(undefined);
    const dropDisconnect = vi.fn().mockResolvedValue(undefined);
    const clients = [
      {
        $queryRaw: vi.fn().mockResolvedValue([]),
        $disconnect: backfillDisconnect,
      },
      {
        $queryRawUnsafe: vi.fn().mockResolvedValue([]),
        $disconnect: dropDisconnect,
      },
    ] as unknown as PrismaClient[];
    factoryHarness.createConfiguredPrismaClient
      .mockImplementationOnce(() => clients[0])
      .mockImplementationOnce(() => clients[1]);

    const backfillDatabase = new PrismaTokenUsageExecutionAddressBackfillDatabase();
    await backfillDatabase.listTokenUsageLedgerRows();
    await backfillDatabase.disconnect();
    const dropDatabase = new PrismaTokenUsageLegacyPathColumnsDropDatabase();
    await dropDatabase.listTokenUsageLedgerColumns();
    await dropDatabase.disconnect();

    expect(factoryHarness.createConfiguredPrismaClient).toHaveBeenCalledTimes(2);
    expect(backfillDisconnect).toHaveBeenCalledOnce();
    expect(dropDisconnect).toHaveBeenCalledOnce();
  });

  it("shares one lazy configured client across multiple default token-usage repositories and stores", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const sharedClient = {
      tokenUsageLedgerEvent: { findMany },
    } as unknown as PrismaClient;
    factoryHarness.createConfiguredPrismaClient.mockReturnValue(sharedClient);

    await new SqlTokenUsageLedgerRepository().listEventsByRunId("run-a");
    await new TokenUsageLedgerStore().getAgentRunSummary("run-b");
    await new TokenUsageLedgerStore().getAgentRunSummary("run-c");

    expect(factoryHarness.createConfiguredPrismaClient).toHaveBeenCalledOnce();
    expect(findMany).toHaveBeenCalledTimes(3);
  });
});
