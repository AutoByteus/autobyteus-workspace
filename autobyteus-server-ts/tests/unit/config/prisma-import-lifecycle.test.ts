import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { initializePrisma, shutdownPrisma } from "repository_prisma";

const factoryHarness = vi.hoisted(() => ({
  createConfiguredPrismaClient: vi.fn(),
}));

vi.mock("../../../src/config/prisma-client-factory.js", () => factoryHarness);

import { SqlTokenUsageLedgerRepository } from "../../../src/token-usage/repositories/sql/token-usage-ledger-repository.js";
import { TokenUsageLedgerStore } from "../../../src/token-usage/providers/token-usage-ledger-store.js";
import { AppDataMigrationRecordRepository } from "../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js";
import { TokenUsageExecutionIdentityMigrationRepository } from "../../../src/token-usage/repositories/sql/token-usage-execution-identity-migration-repository.js";

describe("Prisma import lifecycle", () => {
  beforeEach(async () => {
    await shutdownPrisma();
    factoryHarness.createConfiguredPrismaClient.mockReset();
    factoryHarness.createConfiguredPrismaClient.mockImplementation(() => {
      throw new Error("configured Prisma acquisition attempted");
    });
  });

  afterEach(async () => {
    await shutdownPrisma();
  });

  it("imports and constructs database owners without acquiring runtime configuration", () => {
    new SqlTokenUsageLedgerRepository();
    new TokenUsageLedgerStore();
    new AppDataMigrationRecordRepository();
    new TokenUsageExecutionIdentityMigrationRepository();

    expect(factoryHarness.createConfiguredPrismaClient).not.toHaveBeenCalled();
  });

  it("acquires the configured client only on each migration owner's first database operation", async () => {
    const operations = [
      () => new AppDataMigrationRecordRepository().getRecord("migration-1"),
      () => new TokenUsageExecutionIdentityMigrationRepository().listEvidence(),
    ];

    for (const operation of operations) {
      factoryHarness.createConfiguredPrismaClient.mockClear();
      await expect(operation()).rejects.toThrow("configured Prisma acquisition attempted");
      expect(factoryHarness.createConfiguredPrismaClient).toHaveBeenCalledOnce();
    }
  });

  it("does not acquire or disconnect caller-injected migration clients", async () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const injectedClient = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
      $disconnect: disconnect,
    } as unknown as PrismaClient;

    const migration = new TokenUsageExecutionIdentityMigrationRepository(injectedClient);
    await migration.listEvidence();
    await migration.disconnect();

    expect(factoryHarness.createConfiguredPrismaClient).not.toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("disconnects lazily acquired migration-owned clients", async () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const client = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      $disconnect: disconnect,
    } as unknown as PrismaClient;
    factoryHarness.createConfiguredPrismaClient.mockReturnValueOnce(client);

    const migration = new TokenUsageExecutionIdentityMigrationRepository();
    await migration.listEvidence();
    await migration.disconnect();

    expect(factoryHarness.createConfiguredPrismaClient).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("uses the explicitly initialized repository_prisma lifecycle for default token repositories and stores", async () => {
    const datasourceUrl = process.env.DATABASE_URL;
    expect(datasourceUrl).toBeTruthy();
    await initializePrisma({ datasourceUrl });

    await new SqlTokenUsageLedgerRepository().listEventsByRunId("run-a");
    await new TokenUsageLedgerStore().getAgentRunSummary("run-b");
    await new TokenUsageLedgerStore().getAgentRunSummary("run-c");

    expect(factoryHarness.createConfiguredPrismaClient).not.toHaveBeenCalled();
  });
});
