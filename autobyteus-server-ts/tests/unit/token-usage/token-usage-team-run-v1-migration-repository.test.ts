import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it } from "vitest";
import { TokenUsageTeamRunV1MigrationRepository } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/token-usage-team-run-v1-migration-repository.js";

const disposablePaths: string[] = [];

const createDisposableLedger = async (): Promise<{
  prisma: PrismaClient;
  repository: TokenUsageTeamRunV1MigrationRepository;
}> => {
  const filePath = path.join(os.tmpdir(), `autobyteus-token-team-v1-${randomUUID()}.db`);
  disposablePaths.push(filePath);
  const prisma = new PrismaClient({ datasourceUrl: `file:${filePath}` });
  await prisma.$executeRawUnsafe(`
    CREATE TABLE "token_usage_ledger_events" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "usage_event_id" TEXT NOT NULL,
      "idempotency_key" TEXT NOT NULL,
      "run_id" TEXT NOT NULL,
      "root_team_run_id" TEXT,
      "observed_at" DATETIME NOT NULL,
      "accounting_total_tokens" INTEGER,
      "estimated_api_total_cost" REAL,
      "execution_address_json" TEXT,
      "member_agent_run_id" TEXT,
      "member_route_key" TEXT,
      "task_agent_run_id" TEXT,
      "task_id" TEXT
    )
  `);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "token_usage_ledger_events"
      ("usage_event_id", "idempotency_key", "run_id", "root_team_run_id", "observed_at",
       "accounting_total_tokens", "estimated_api_total_cost", "execution_address_json",
       "member_agent_run_id", "member_route_key", "task_agent_run_id", "task_id")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    "usage-1",
    "idempotency-1",
    "agent-run-1",
    "task-team-1",
    new Date().toISOString(),
    42,
    0.125,
    JSON.stringify({
      segments: [
        { kind: "member", memberPath: ["research"] },
        { kind: "task_team", taskTeamRunId: "task-team-1" },
        { kind: "member", memberPath: ["reviewer"] },
      ],
    }),
    "agent-run-1",
    "reviewer",
    null,
    "task-1",
  );
  return {
    prisma,
    repository: new TokenUsageTeamRunV1MigrationRepository(prisma),
  };
};

afterEach(async () => {
  await Promise.all(disposablePaths.splice(0).map((filePath) =>
    fs.rm(filePath, { force: true }).catch(() => undefined),
  ));
});

describe("TokenUsageTeamRunV1MigrationRepository", () => {
  it("updates only final roots while retaining evidence, facts, and the current index", async () => {
    const { prisma, repository } = await createDisposableLedger();
    try {
      const snapshot = await repository.inspectRuntimeSchemaAndEvidence();
      expect(snapshot.rows).toEqual([
        expect.objectContaining({
          usageEventId: "usage-1",
          runId: "agent-run-1",
          rootTeamRunId: "task-team-1",
          memberAgentRunId: "agent-run-1",
          memberRouteKey: "reviewer",
        }),
      ]);

      await expect(repository.applyResolvedRootUpdates([
        { id: snapshot.rows[0]!.id, finalRootTeamRunId: "root-team-1" },
      ], snapshot)).resolves.toEqual({
        kind: "APPLIED",
        updatedRows: 1,
        alreadyCurrent: false,
      });

      const [persisted] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        'SELECT * FROM "token_usage_ledger_events"',
      );
      expect(persisted).toMatchObject({
        root_team_run_id: "root-team-1",
        usage_event_id: "usage-1",
        idempotency_key: "idempotency-1",
        run_id: "agent-run-1",
        accounting_total_tokens: 42,
        estimated_api_total_cost: 0.125,
        member_agent_run_id: "agent-run-1",
        member_route_key: "reviewer",
      });
      const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        'PRAGMA table_info("token_usage_ledger_events")',
      );
      expect(columns.map(({ name }) => name)).toContain("execution_address_json");
      const indexes = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        'PRAGMA index_list("token_usage_ledger_events")',
      );
      expect(indexes.map(({ name }) => name))
        .toContain("token_usage_ledger_events_root_team_run_id_observed_at_idx");
    } finally {
      await prisma.$disconnect();
    }
  });

  it("returns a verified rollback warning when the root transaction fails", async () => {
    const { prisma, repository } = await createDisposableLedger();
    try {
      const snapshot = await repository.inspectRuntimeSchemaAndEvidence();
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER "reject_root_update"
        BEFORE UPDATE OF "root_team_run_id" ON "token_usage_ledger_events"
        BEGIN
          SELECT RAISE(ABORT, 'forced root update failure');
        END
      `);

      const result = await repository.applyResolvedRootUpdates([
        { id: snapshot.rows[0]!.id, finalRootTeamRunId: "root-team-1" },
      ], snapshot);

      expect(result).toMatchObject({
        kind: "ROLLED_BACK_WARNING",
        rollbackVerified: true,
        message: expect.stringContaining("rolled back"),
      });
      await expect(prisma.$queryRawUnsafe(
        'SELECT "root_team_run_id", "accounting_total_tokens" FROM "token_usage_ledger_events"',
      )).resolves.toEqual([{
        root_team_run_id: "task-team-1",
        accounting_total_tokens: 42,
      }]);
    } finally {
      await prisma.$disconnect();
    }
  });
});
