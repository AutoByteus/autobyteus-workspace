import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it } from "vitest";
import { TokenUsageExecutionIdentityMigrationRepository } from "../../../src/token-usage/repositories/sql/token-usage-execution-identity-migration-repository.js";

const disposablePaths: string[] = [];

const createDisposableLedger = async (executionAddressJson: string | null): Promise<{
  prisma: PrismaClient;
  repository: TokenUsageExecutionIdentityMigrationRepository;
  filePath: string;
}> => {
  const filePath = path.join(os.tmpdir(), `autobyteus-token-identity-${randomUUID()}.db`);
  disposablePaths.push(filePath);
  const prisma = new PrismaClient({ datasourceUrl: `file:${filePath}` });
  await prisma.$executeRawUnsafe(`
    CREATE TABLE "token_usage_ledger_events" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "usage_event_id" TEXT NOT NULL,
      "run_id" TEXT NOT NULL,
      "root_team_run_id" TEXT,
      "observed_at" DATETIME NOT NULL,
      "execution_address_json" TEXT
    )
  `);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "token_usage_ledger_events"
      ("usage_event_id", "run_id", "root_team_run_id", "observed_at", "execution_address_json")
     VALUES (?, ?, NULL, ?, ?)`,
    "usage-1",
    "agent-run-1",
    new Date().toISOString(),
    executionAddressJson,
  );
  return {
    prisma,
    repository: new TokenUsageExecutionIdentityMigrationRepository(prisma),
    filePath,
  };
};

afterEach(async () => {
  await Promise.all(disposablePaths.splice(0).map((filePath) =>
    fs.rm(filePath, { force: true }).catch(() => undefined),
  ));
});

describe("TokenUsageExecutionIdentityMigrationRepository", () => {
  it("transactionally retains root correlation and removes predecessor identity columns", async () => {
    const address = JSON.stringify({
      rootTeamRunId: "root-team-1",
      taskTeamRunIds: ["task-team-1"],
      memberAddress: "/reviewer",
      taskAgentRunId: null,
    });
    const { prisma, repository } = await createDisposableLedger(address);
    try {
      await expect(repository.listEvidence()).resolves.toEqual([
        expect.objectContaining({
          usageEventId: "usage-1",
          runId: "agent-run-1",
          rootTeamRunId: null,
          executionAddressJson: address,
        }),
      ]);
      await expect(repository.migrateToExactRunIdentity()).resolves.toEqual({
        migratedRows: 1,
        alreadyCurrent: false,
      });

      const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        'PRAGMA table_info("token_usage_ledger_events")',
      );
      expect(columns.map((column) => column.name)).toContain("root_team_run_id");
      expect(columns.map((column) => column.name)).not.toContain("execution_address_json");
      await expect(prisma.$queryRawUnsafe(
        'SELECT "root_team_run_id" FROM "token_usage_ledger_events"',
      )).resolves.toEqual([{ root_team_run_id: "root-team-1" }]);
      await expect(repository.migrateToExactRunIdentity()).resolves.toEqual({
        migratedRows: 0,
        alreadyCurrent: true,
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  it("rolls back every schema and row mutation when predecessor evidence is invalid", async () => {
    const { prisma, repository } = await createDisposableLedger("not-json");
    try {
      await expect(repository.migrateToExactRunIdentity()).rejects.toThrow("invalid Team execution identity evidence");
      const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        'PRAGMA table_info("token_usage_ledger_events")',
      );
      expect(columns.map((column) => column.name)).toContain("execution_address_json");
      await expect(prisma.$queryRawUnsafe(
        'SELECT "root_team_run_id", "execution_address_json" FROM "token_usage_ledger_events"',
      )).resolves.toEqual([{ root_team_run_id: null, execution_address_json: "not-json" }]);
      await expect(prisma.$queryRawUnsafe(
        'SELECT "name" FROM "sqlite_master" WHERE "type" = \'table\' AND "name" = \'token_usage_ledger_events_pre_v1_identity_evidence\'',
      )).resolves.toEqual([]);
    } finally {
      await prisma.$disconnect();
    }
  });
});
