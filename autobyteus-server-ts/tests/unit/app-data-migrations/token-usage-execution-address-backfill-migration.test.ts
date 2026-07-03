import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  PrismaTokenUsageExecutionAddressBackfillDatabase,
  TokenUsageExecutionAddressBackfillMigration,
  type RawTokenUsageLedgerBackfillRow,
  type TokenUsageExecutionAddressBackfillDatabase,
} from "../../../src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.js";

class InMemoryBackfillDatabase implements TokenUsageExecutionAddressBackfillDatabase {
  constructor(readonly rows: RawTokenUsageLedgerBackfillRow[]) {}

  async listTokenUsageLedgerRows(): Promise<RawTokenUsageLedgerBackfillRow[]> {
    return this.rows.map((row) => ({ ...row }));
  }

  async updateTokenUsageLedgerRow(input: {
    id: number;
    rootTeamRunId: string;
    executionAddressJson: string;
  }): Promise<void> {
    const row = this.rows.find((candidate) => candidate.id === input.id);
    if (!row) throw new Error(`Missing row ${input.id}`);
    row.root_team_run_id = input.rootTeamRunId;
    row.execution_address_json = input.executionAddressJson;
  }
}

let nextRowId = 1;

const tokenRow = (
  overrides: Partial<RawTokenUsageLedgerBackfillRow>,
): RawTokenUsageLedgerBackfillRow => {
  const id = nextRowId++;
  return {
    id,
    usage_event_id: `usage-${id}`,
    run_id: `run-${id}`,
    root_team_run_id: null,
    execution_address_json: null,
    member_route_key: null,
    task_agent_run_id: null,
    task_id: null,
    ...overrides,
  };
};

const writeTaskRecordsFile = async (input: {
  memoryDir: string;
  rootTeamRunId: string;
  taskTeamRuns: Array<{ taskId: string; logicalMemberRouteKey: string; taskTeamRunId: string }>;
}): Promise<void> => {
  const recordsPath = path.join(
    input.memoryDir,
    "agent_teams",
    input.rootTeamRunId,
    "task_delegation_records.json",
  );
  await fs.mkdir(path.dirname(recordsPath), { recursive: true });
  await fs.writeFile(
    recordsPath,
    `${JSON.stringify({
      teamRunId: input.rootTeamRunId,
      records: input.taskTeamRuns.map((taskRun, index) => ({
        taskId: taskRun.taskId,
        status: "accepted",
        senderAddress: { segments: [{ kind: "member", memberRouteKey: "Teacher" }] },
        receiverAddress: { segments: [{ kind: "member", memberRouteKey: taskRun.logicalMemberRouteKey }] },
        receiverTargetKind: "team",
        content: `Task ${taskRun.taskId}`,
        referenceFiles: [],
        taskRun: {
          address: {
            segments: [
              { kind: "member", memberRouteKey: taskRun.logicalMemberRouteKey },
              { kind: "task_team", taskTeamRunId: taskRun.taskTeamRunId },
            ],
          },
          startedAt: `2026-07-03T10:0${index}:00.000Z`,
        },
        updates: [],
        createdAt: `2026-07-03T09:0${index}:00.000Z`,
      })),
    }, null, 2)}\n`,
    "utf-8",
  );
};

const parseAddress = (row: RawTokenUsageLedgerBackfillRow): unknown => (
  row.execution_address_json ? JSON.parse(row.execution_address_json) as unknown : null
);

const detailText = (details: Array<{ message: string }>): string =>
  details.map((detail) => detail.message).join("\n");

describe("TokenUsageExecutionAddressBackfillMigration", () => {
  it("runs against the expanded Prisma migration schema and leaves legacy physical columns untouched", async () => {
    const prisma = new PrismaClient();
    try {
      await prisma.$executeRaw`DELETE FROM "token_usage_ledger_events"`;
      await prisma.$executeRaw`
        INSERT INTO "token_usage_ledger_events" (
          "usage_event_id",
          "idempotency_key",
          "observed_at",
          "run_id",
          "root_team_run_id",
          "member_route_key",
          "runtime_kind",
          "ingestion_kind",
          "usage_scope",
          "pricing_status",
          "api_cost_status"
        ) VALUES (
          'sql-direct-member-1',
          'sql-direct-member-1',
          '2026-07-03T10:00:00.000Z',
          'sql-run-1',
          'rootSql',
          'Teacher',
          'autobyteus',
          'autobyteus_llm_phase',
          'per_turn',
          'missing',
          'missing'
        )
      `;
      const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "token-usage-address-prisma-"));
      const database = new PrismaTokenUsageExecutionAddressBackfillDatabase(prisma);

      const result = await new TokenUsageExecutionAddressBackfillMigration(memoryDir, database).execute();
      const rows = await prisma.$queryRaw<Array<{
        root_team_run_id: string | null;
        execution_address_json: string | null;
        team_run_path_json: string | null;
        member_path_json: string | null;
      }>>`
        SELECT
          "root_team_run_id",
          "execution_address_json",
          "team_run_path_json",
          "member_path_json"
        FROM "token_usage_ledger_events"
        WHERE "usage_event_id" = 'sql-direct-member-1'
      `;

      expect(result.summary).toMatchObject({
        scannedCount: 1,
        migratedCount: 1,
        failedCount: 0,
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]!.root_team_run_id).toBe("rootSql");
      expect(rows[0]!.execution_address_json).toBe(JSON.stringify({
        segments: [{ kind: "member", memberRouteKey: "Teacher" }],
      }));
      expect(rows[0]!.team_run_path_json).toBeNull();
      expect(rows[0]!.member_path_json).toBeNull();
    } finally {
      await prisma.$disconnect();
    }
  });

  it("backfills direct/task-agent rows, corrects task-team rows, and records category counts", async () => {
    nextRowId = 1;
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "token-usage-address-backfill-"));
    await writeTaskRecordsFile({
      memoryDir,
      rootTeamRunId: "rootA",
      taskTeamRuns: [
        { taskId: "task-1", logicalMemberRouteKey: "StudentStudyGroup", taskTeamRunId: "taskTeamRun1" },
        { taskId: "task-2", logicalMemberRouteKey: "StudentStudyGroup", taskTeamRunId: "taskTeamRun2" },
      ],
    });

    const rows = [
      tokenRow({ root_team_run_id: "rootA", member_route_key: "Teacher" }),
      tokenRow({ root_team_run_id: "taskTeamRun1", member_route_key: "student_one" }),
      tokenRow({ root_team_run_id: "taskTeamRun2", member_route_key: "student_one" }),
      tokenRow({ root_team_run_id: "rootA", member_route_key: "assistant", task_agent_run_id: "taskAgentRun1" }),
      tokenRow({ root_team_run_id: null, run_id: "standalone-agent-run" }),
      tokenRow({ root_team_run_id: "rootA" }),
      tokenRow({
        root_team_run_id: "rootA",
        execution_address_json: JSON.stringify({
          segments: [
            { kind: "member", memberRouteKey: "StudentStudyGroup" },
            { kind: "task_team", taskTeamRunId: "taskTeamRun1" },
            { kind: "member", memberRouteKey: "already_done" },
          ],
        }),
      }),
      tokenRow({
        root_team_run_id: "taskTeamRun1",
        member_route_key: "student_two",
        execution_address_json: JSON.stringify({ segments: [{ kind: "member", memberRouteKey: "student_two" }] }),
      }),
    ];
    const database = new InMemoryBackfillDatabase(rows);

    const result = await new TokenUsageExecutionAddressBackfillMigration(memoryDir, database).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({
      scannedCount: 8,
      migratedCount: 5,
      skippedCount: 3,
      failedCount: 0,
    });
    expect(detailText(result.summary.details)).toContain("Direct member backfills: 1.");
    expect(detailText(result.summary.details)).toContain("Task-team corrections: 3.");
    expect(detailText(result.summary.details)).toContain("Task-agent backfills: 1.");
    expect(detailText(result.summary.details)).toContain("Already-addressed rows: 1.");
    expect(detailText(result.summary.details)).toContain("Standalone skips: 1.");
    expect(detailText(result.summary.details)).toContain("Insufficient-data skips: 1.");
    expect(detailText(result.summary.details)).toContain("Failures: 0.");

    expect(rows[0]!.root_team_run_id).toBe("rootA");
    expect(parseAddress(rows[0]!)).toEqual({ segments: [{ kind: "member", memberRouteKey: "Teacher" }] });
    expect(rows[1]!.root_team_run_id).toBe("rootA");
    expect(parseAddress(rows[1]!)).toEqual({
      segments: [
        { kind: "member", memberRouteKey: "StudentStudyGroup" },
        { kind: "task_team", taskTeamRunId: "taskTeamRun1" },
        { kind: "member", memberRouteKey: "student_one" },
      ],
    });
    expect(rows[2]!.root_team_run_id).toBe("rootA");
    expect(parseAddress(rows[2]!)).toEqual({
      segments: [
        { kind: "member", memberRouteKey: "StudentStudyGroup" },
        { kind: "task_team", taskTeamRunId: "taskTeamRun2" },
        { kind: "member", memberRouteKey: "student_one" },
      ],
    });
    expect(parseAddress(rows[3]!)).toEqual({
      segments: [
        { kind: "member", memberRouteKey: "assistant" },
        { kind: "task_agent", taskAgentRunId: "taskAgentRun1" },
      ],
    });
    expect(rows[4]!.execution_address_json).toBeNull();
    expect(rows[5]!.execution_address_json).toBeNull();
    expect(parseAddress(rows[7]!)).toEqual({
      segments: [
        { kind: "member", memberRouteKey: "StudentStudyGroup" },
        { kind: "task_team", taskTeamRunId: "taskTeamRun1" },
        { kind: "member", memberRouteKey: "student_two" },
      ],
    });

    const secondRun = await new TokenUsageExecutionAddressBackfillMigration(memoryDir, database).execute();
    expect(secondRun.summary).toMatchObject({
      scannedCount: 8,
      migratedCount: 0,
      skippedCount: 8,
      failedCount: 0,
    });
    expect(detailText(secondRun.summary.details)).toContain("Already-addressed rows: 6.");
  });

  it("keeps active token usage hierarchy paths off legacy path columns and defers physical column drop", async () => {
    const repoRoot = path.resolve(process.cwd(), "..");
    const activeHierarchyFiles = [
      "autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts",
      "autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts",
      "autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts",
      "autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts",
      "autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts",
      "autobyteus-server-ts/src/agent-team-execution/services/token-usage-execution-address-builder.ts",
      "autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-event-persistence-processor.ts",
      "autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts",
      "autobyteus-web/graphql/queries/token_usage_statistics_queries.ts",
      "autobyteus-web/stores/tokenUsageStatistics.ts",
      "autobyteus-web/types/tokenUsageStatistics.ts",
    ];
    const legacyColumnPattern = /team_run_path_json|member_path_json|teamRunPathJson|memberPathJson/g;
    const activeLegacyReferences: string[] = [];
    for (const relativeFile of activeHierarchyFiles) {
      const content = await fs.readFile(path.join(repoRoot, relativeFile), "utf-8");
      if (legacyColumnPattern.test(content)) activeLegacyReferences.push(relativeFile);
      legacyColumnPattern.lastIndex = 0;
    }
    expect(activeLegacyReferences).toEqual([]);

    const migrationsRoot = path.join(repoRoot, "autobyteus-server-ts", "prisma", "migrations");
    const migrationDirs = await fs.readdir(migrationsRoot, { withFileTypes: true });
    const dropColumnMatches: string[] = [];
    for (const entry of migrationDirs) {
      if (!entry.isDirectory()) continue;
      const migrationPath = path.join(migrationsRoot, entry.name, "migration.sql");
      const content = await fs.readFile(migrationPath, "utf-8");
      if (/DROP\s+COLUMN\s+["`']?(team_run_path_json|member_path_json)/i.test(content)) {
        dropColumnMatches.push(entry.name);
      }
    }
    expect(dropColumnMatches).toEqual([]);
  });
});
