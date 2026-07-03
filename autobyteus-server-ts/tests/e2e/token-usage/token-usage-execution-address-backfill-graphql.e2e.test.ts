import "reflect-metadata";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { PrismaClient } from "@prisma/client";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import { AppDataMigrationRecordRepository } from "../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js";
import { TokenUsageExecutionAddressBackfillMigration } from "../../../src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.js";
import type { TokenUsageExecutionAddress } from "../../../src/token-usage/domain/execution-address.js";

const MIGRATION_ID = "20260703_token_usage_execution_address_backfill";

const prisma = new PrismaClient();
const createdUsageEventIds = new Set<string>();
let tempRoot: string | null = null;

type TaskRow = {
  rowId: string;
  rowKind: string;
  runId: string | null;
  rootTeamRunId: string | null;
  memberRouteKey: string | null;
  memberAgentRunId: string | null;
  taskAgentRunId: string | null;
  taskTeamRunId: string | null;
  taskId: string | null;
  executionAddress: TokenUsageExecutionAddress | null;
  displayName: string;
  aggregate: {
    grossInputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedApiTotalCost: number | null;
    apiCostStatus: string;
  };
  children: TaskRow[];
};

type TaskStatsResult = {
  totalCostInPeriod: number | null;
  tokenUsageTaskStatisticsInPeriod: { rows: TaskRow[] };
};

type MigrationStatusResult = {
  getAppDataMigrations: Array<{
    migrationId: string;
    status: string;
    attempts: number;
    summary: {
      scannedCount: number;
      migratedCount: number;
      skippedCount: number;
      failedCount: number;
      details: Array<{ itemId: string; status: string; message: string; filePath?: string | null }>;
    } | null;
    logPath: string | null;
  }>;
};

const taskStatsQuery = `
  fragment BackfillTaskAggregateFields on TokenUsageCostSummaryAggregateGraphql {
    grossInputTokens
    outputTokens
    totalTokens
    estimatedApiTotalCost
    apiCostStatus
  }

  fragment BackfillTaskRowFields on TokenUsageTaskStatisticsRowGraphql {
    rowId
    rowKind
    runId
    rootTeamRunId
    memberRouteKey
    memberAgentRunId
    taskAgentRunId
    taskTeamRunId
    taskId
    executionAddress
    displayName
    aggregate { ...BackfillTaskAggregateFields }
  }

  query BackfilledTokenUsageStats($start: DateTime!, $end: DateTime!) {
    totalCostInPeriod(startTime: $start, endTime: $end)
    tokenUsageTaskStatisticsInPeriod(startTime: $start, endTime: $end) {
      rows {
        ...BackfillTaskRowFields
        children {
          ...BackfillTaskRowFields
          children {
            ...BackfillTaskRowFields
          }
        }
      }
    }
  }
`;

const migrationStatusQuery = `
  query AppDataMigrationStatus {
    getAppDataMigrations {
      migrationId
      status
      attempts
      summary
      logPath
    }
  }
`;

const usageEventId = (suffix: string, label: string): string => `backfill-${label}-${suffix}`;

const insertHistoricalTokenRow = async (input: {
  usageEventId: string;
  observedAt: string;
  runId: string;
  rootTeamRunId: string | null;
  memberRouteKey?: string | null;
  memberAgentRunId?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
  executionAddress?: TokenUsageExecutionAddress | null;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  teamName?: string | null;
  agentName?: string | null;
  memberName?: string | null;
}): Promise<void> => {
  createdUsageEventIds.add(input.usageEventId);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "token_usage_ledger_events" (
      "usage_event_id",
      "idempotency_key",
      "observed_at",
      "run_id",
      "root_team_run_id",
      "execution_address_json",
      "member_agent_run_id",
      "member_route_key",
      "task_agent_run_id",
      "task_id",
      "team_name",
      "agent_name",
      "member_name",
      "runtime_kind",
      "model_provider",
      "model_identifier",
      "ingestion_kind",
      "usage_scope",
      "input_token_semantic",
      "reported_input_tokens",
      "reported_output_tokens",
      "reported_total_tokens",
      "accounting_input_tokens",
      "accounting_output_tokens",
      "accounting_total_tokens",
      "standard_input_tokens",
      "cache_miss_input_tokens",
      "cache_read_input_tokens",
      "cache_creation_input_tokens",
      "cache_creation_5m_input_tokens",
      "cache_creation_1h_input_tokens",
      "cache_state",
      "reasoning_output_tokens",
      "billable_output_tokens",
      "pricing_status",
      "api_cost_status",
      "currency",
      "estimated_api_input_cost",
      "estimated_api_standard_input_cost",
      "estimated_api_output_cost",
      "estimated_api_total_cost",
      "missing_price_dimensions_json"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'codex_app_server', 'OPENAI', 'gpt-backfill-e2e', 'codex_thread_token_usage', 'per_turn', 'gross_includes_cache', ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'not_reported', 0, ?, 'trusted', 'estimated', 'USD', ?, ?, ?, ?, '[]')`,
    input.usageEventId,
    input.usageEventId,
    new Date(input.observedAt),
    input.runId,
    input.rootTeamRunId,
    input.executionAddress ? JSON.stringify(input.executionAddress) : null,
    input.memberAgentRunId ?? (input.rootTeamRunId ? input.runId : null),
    input.memberRouteKey ?? null,
    input.taskAgentRunId ?? null,
    input.taskId ?? null,
    input.teamName ?? null,
    input.agentName ?? null,
    input.memberName ?? null,
    input.inputTokens,
    input.outputTokens,
    input.inputTokens + input.outputTokens,
    input.inputTokens,
    input.outputTokens,
    input.inputTokens + input.outputTokens,
    input.inputTokens,
    input.inputTokens,
    input.outputTokens,
    input.totalCost - input.outputTokens / 1_000,
    input.totalCost - input.outputTokens / 1_000,
    input.outputTokens / 1_000,
    input.totalCost,
  );
};

const writeTaskRecordsFile = async (input: {
  memoryDir: string;
  rootTeamRunId: string;
  taskTeamRuns: Array<{ taskId: string; logicalMemberRouteKey: string; taskTeamRunId: string }>;
}): Promise<void> => {
  const recordsPath = path.join(input.memoryDir, "agent_teams", input.rootTeamRunId, "task_delegation_records.json");
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
          startedAt: `2044-07-03T09:0${index}:00.000Z`,
        },
        updates: [],
        createdAt: `2044-07-03T08:0${index}:00.000Z`,
      })),
    }, null, 2)}\n`,
    "utf-8",
  );
};

const findTopRow = (rows: TaskRow[], predicate: (row: TaskRow) => boolean): TaskRow => {
  const row = rows.find(predicate);
  expect(row).toBeDefined();
  return row!;
};

describe("token usage execution-address backfill GraphQL integration", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    if (createdUsageEventIds.size > 0) {
      await prisma.tokenUsageLedgerEvent.deleteMany({ where: { usageEventId: { in: [...createdUsageEventIds] } } });
    }
    await prisma.$executeRawUnsafe(`DELETE FROM "app_data_migration_records" WHERE "migration_id" = ?`, MIGRATION_ID);
    if (tempRoot) await fs.rm(tempRoot, { recursive: true, force: true });
    await prisma.$disconnect();
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };

  it("reparents historical task-team rows, preserves totals, and exposes migration summary details", async () => {
    const suffix = randomUUID();
    const rootTeamRunId = `backfill-root-${suffix}`;
    const taskTeamRunIdOne = `studentstudygroup-backfill-1-${suffix}`;
    const taskTeamRunIdTwo = `studentstudygroup-backfill-2-${suffix}`;
    const conflictTaskTeamRunId = `studentstudygroup-conflict-${suffix}`;
    const start = new Date("2044-07-03T10:00:00.000Z");
    const end = new Date("2044-07-03T10:30:00.000Z");
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "token-usage-backfill-e2e-"));
    const memoryDir = path.join(tempRoot, "memory");
    const logsDir = path.join(tempRoot, "logs");

    await prisma.$executeRawUnsafe(`DELETE FROM "app_data_migration_records" WHERE "migration_id" = ?`, MIGRATION_ID);
    await writeTaskRecordsFile({
      memoryDir,
      rootTeamRunId,
      taskTeamRuns: [
        { taskId: "task-one", logicalMemberRouteKey: "StudentStudyGroup", taskTeamRunId: taskTeamRunIdOne },
        { taskId: "task-two", logicalMemberRouteKey: "StudentStudyGroup", taskTeamRunId: taskTeamRunIdTwo },
      ],
    });
    await writeTaskRecordsFile({
      memoryDir,
      rootTeamRunId: `conflict-root-a-${suffix}`,
      taskTeamRuns: [{ taskId: "conflict-a", logicalMemberRouteKey: "StudentStudyGroup", taskTeamRunId: conflictTaskTeamRunId }],
    });
    await writeTaskRecordsFile({
      memoryDir,
      rootTeamRunId: `conflict-root-b-${suffix}`,
      taskTeamRuns: [{ taskId: "conflict-b", logicalMemberRouteKey: "OtherStudyGroup", taskTeamRunId: conflictTaskTeamRunId }],
    });

    await insertHistoricalTokenRow({
      usageEventId: usageEventId(suffix, "teacher-direct"),
      observedAt: "2044-07-03T10:01:00.000Z",
      runId: `teacher-${suffix}`,
      rootTeamRunId,
      memberRouteKey: "Teacher",
      inputTokens: 100,
      outputTokens: 10,
      totalCost: 1.1,
      teamName: "Nested Classroom Test Team",
      memberName: "Teacher",
    });
    await insertHistoricalTokenRow({
      usageEventId: usageEventId(suffix, "task-team-one"),
      observedAt: "2044-07-03T10:02:00.000Z",
      runId: `student-one-${suffix}`,
      rootTeamRunId: taskTeamRunIdOne,
      memberRouteKey: "student_one",
      inputTokens: 30,
      outputTokens: 3,
      totalCost: 0.33,
      memberName: "student_one",
    });
    await insertHistoricalTokenRow({
      usageEventId: usageEventId(suffix, "task-team-two"),
      observedAt: "2044-07-03T10:03:00.000Z",
      runId: `student-one-repeat-${suffix}`,
      rootTeamRunId: taskTeamRunIdTwo,
      memberRouteKey: "student_one",
      inputTokens: 20,
      outputTokens: 2,
      totalCost: 0.22,
      memberName: "student_one",
    });
    await insertHistoricalTokenRow({
      usageEventId: usageEventId(suffix, "task-agent"),
      observedAt: "2044-07-03T10:04:00.000Z",
      runId: `codex-task-agent-${suffix}`,
      rootTeamRunId,
      memberRouteKey: "Codex",
      taskAgentRunId: `codex-task-agent-${suffix}`,
      taskId: `task-agent-${suffix}`,
      inputTokens: 15,
      outputTokens: 2,
      totalCost: 0.17,
      teamName: "Nested Classroom Test Team",
      memberName: "Codex",
    });
    await insertHistoricalTokenRow({
      usageEventId: usageEventId(suffix, "standalone"),
      observedAt: "2044-07-03T10:05:00.000Z",
      runId: `standalone-${suffix}`,
      rootTeamRunId: null,
      inputTokens: 7,
      outputTokens: 1,
      totalCost: 0.08,
      agentName: "Standalone Backfill Agent",
    });
    await insertHistoricalTokenRow({
      usageEventId: usageEventId(suffix, "insufficient"),
      observedAt: "2044-07-03T10:06:00.000Z",
      runId: `insufficient-${suffix}`,
      rootTeamRunId,
      inputTokens: 5,
      outputTokens: 1,
      totalCost: 0.06,
      teamName: "Nested Classroom Test Team",
    });
    await insertHistoricalTokenRow({
      usageEventId: usageEventId(suffix, "already-addressed"),
      observedAt: "2044-07-03T10:07:00.000Z",
      runId: `teacher-already-${suffix}`,
      rootTeamRunId,
      memberRouteKey: "Teacher",
      executionAddress: { segments: [{ kind: "member", memberRouteKey: "Teacher" }] },
      inputTokens: 11,
      outputTokens: 1,
      totalCost: 0.12,
      teamName: "Nested Classroom Test Team",
      memberName: "Teacher",
    });
    await insertHistoricalTokenRow({
      usageEventId: usageEventId(suffix, "conflict"),
      observedAt: "2044-07-03T10:08:00.000Z",
      runId: `conflict-student-${suffix}`,
      rootTeamRunId: conflictTaskTeamRunId,
      memberRouteKey: "student_conflict",
      inputTokens: 4,
      outputTokens: 1,
      totalCost: 0.05,
      memberName: "student_conflict",
    });

    const before = await execGraphql<TaskStatsResult>(taskStatsQuery, { start, end });
    const beforeTopIds = before.tokenUsageTaskStatisticsInPeriod.rows.map((row) => row.rootTeamRunId ?? row.runId);
    expect(beforeTopIds).toEqual(expect.arrayContaining([rootTeamRunId, taskTeamRunIdOne, taskTeamRunIdTwo, conflictTaskTeamRunId]));
    expect(before.totalCostInPeriod).toBeCloseTo(2.13, 10);

    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([
        new TokenUsageExecutionAddressBackfillMigration(memoryDir),
      ]),
      new AppDataMigrationRecordRepository(),
      { logsDir },
    );
    const [migrationResult] = await runner.runPending();

    expect(migrationResult).toMatchObject({
      migrationId: MIGRATION_ID,
      status: "SUCCEEDED",
      attempts: 1,
      summary: {
        scannedCount: 8,
        migratedCount: 4,
        skippedCount: 4,
        failedCount: 0,
      },
    });
    const detailText = migrationResult!.summary!.details.map((detail) => detail.message).join("\n");
    expect(detailText).toContain("Scanned 4 task delegation records; indexed 2 task-team run addresses; conflicts 1.");
    expect(detailText).toContain("Direct member backfills: 1.");
    expect(detailText).toContain("Task-team corrections: 2.");
    expect(detailText).toContain("Task-agent backfills: 1.");
    expect(detailText).toContain("Already-addressed rows: 1.");
    expect(detailText).toContain("Standalone skips: 1.");
    expect(detailText).toContain("Insufficient-data skips: 2. Reasons: CONFLICTING_TASK_TEAM_RECORDS=1, INSUFFICIENT_ADDRESS_INPUT=1.");
    expect(detailText).toContain("Failures: 0.");
    expect(migrationResult!.logPath).toBeTruthy();
    const logContent = await fs.readFile(migrationResult!.logPath!, "utf-8");
    expect(logContent).toContain("Task-team corrections: 2.");
    expect(logContent).toContain("CONFLICTING_TASK_TEAM_RECORDS=1");

    const migratedRows = await prisma.$queryRaw<Array<{
      usage_event_id: string;
      root_team_run_id: string | null;
      execution_address_json: string | null;
    }>>`
      SELECT "usage_event_id", "root_team_run_id", "execution_address_json"
      FROM "token_usage_ledger_events"
      WHERE "usage_event_id" IN (${usageEventId(suffix, "teacher-direct")}, ${usageEventId(suffix, "task-team-one")}, ${usageEventId(suffix, "task-team-two")}, ${usageEventId(suffix, "task-agent")}, ${usageEventId(suffix, "conflict")})
    `;
    const rowByEventId = new Map(migratedRows.map((row) => [row.usage_event_id, row]));
    expect(JSON.parse(rowByEventId.get(usageEventId(suffix, "teacher-direct"))!.execution_address_json!)).toEqual({
      segments: [{ kind: "member", memberRouteKey: "Teacher" }],
    });
    expect(rowByEventId.get(usageEventId(suffix, "task-team-one"))!.root_team_run_id).toBe(rootTeamRunId);
    expect(JSON.parse(rowByEventId.get(usageEventId(suffix, "task-team-one"))!.execution_address_json!)).toEqual({
      segments: [
        { kind: "member", memberRouteKey: "StudentStudyGroup" },
        { kind: "task_team", taskTeamRunId: taskTeamRunIdOne },
        { kind: "member", memberRouteKey: "student_one" },
      ],
    });
    expect(rowByEventId.get(usageEventId(suffix, "conflict"))!.root_team_run_id).toBe(conflictTaskTeamRunId);
    expect(rowByEventId.get(usageEventId(suffix, "conflict"))!.execution_address_json).toBeNull();

    const after = await execGraphql<TaskStatsResult>(taskStatsQuery, { start, end });
    expect(after.totalCostInPeriod).toBeCloseTo(before.totalCostInPeriod!, 10);
    const afterTopIds = after.tokenUsageTaskStatisticsInPeriod.rows.map((row) => row.rootTeamRunId ?? row.runId);
    expect(afterTopIds).toContain(rootTeamRunId);
    expect(afterTopIds).toContain(conflictTaskTeamRunId);
    expect(afterTopIds).not.toContain(taskTeamRunIdOne);
    expect(afterTopIds).not.toContain(taskTeamRunIdTwo);

    const rootTeam = findTopRow(after.tokenUsageTaskStatisticsInPeriod.rows, (row) => row.rootTeamRunId === rootTeamRunId);
    expect(rootTeam).toMatchObject({
      rowKind: "TEAM_RUN",
      displayName: "Nested Classroom Test Team",
      aggregate: expect.objectContaining({
        grossInputTokens: 181,
        outputTokens: 19,
        totalTokens: 200,
        estimatedApiTotalCost: 2.0,
      }),
    });
    const taskTeamRows = rootTeam.children.filter((row) => row.rowKind === "TASK_TEAM_RUN");
    expect(taskTeamRows.map((row) => row.taskTeamRunId).sort()).toEqual([taskTeamRunIdOne, taskTeamRunIdTwo].sort());
    const firstTaskTeam = taskTeamRows.find((row) => row.taskTeamRunId === taskTeamRunIdOne)!;
    expect(firstTaskTeam).toMatchObject({
      displayName: "StudentStudyGroup",
      executionAddress: {
        segments: [
          { kind: "member", memberRouteKey: "StudentStudyGroup" },
          { kind: "task_team", taskTeamRunId: taskTeamRunIdOne },
        ],
      },
      aggregate: expect.objectContaining({ grossInputTokens: 30, estimatedApiTotalCost: 0.33 }),
    });
    expect(firstTaskTeam.children).toEqual([
      expect.objectContaining({
        rowKind: "MEMBER_RUN",
        memberRouteKey: "student_one",
        displayName: "student_one",
        executionAddress: {
          segments: [
            { kind: "member", memberRouteKey: "StudentStudyGroup" },
            { kind: "task_team", taskTeamRunId: taskTeamRunIdOne },
            { kind: "member", memberRouteKey: "student_one" },
          ],
        },
      }),
    ]);
    expect(taskTeamRows.find((row) => row.taskTeamRunId === taskTeamRunIdTwo)).toMatchObject({
      aggregate: expect.objectContaining({ grossInputTokens: 20, estimatedApiTotalCost: 0.22 }),
      children: [expect.objectContaining({ memberRouteKey: "student_one" })],
    });
    expect(rootTeam.children.find((row) => row.rowKind === "TASK_AGENT_RUN" && row.taskAgentRunId === `codex-task-agent-${suffix}`)).toMatchObject({
      memberRouteKey: "Codex",
      taskId: `task-agent-${suffix}`,
      executionAddress: {
        segments: [
          { kind: "member", memberRouteKey: "Codex" },
          { kind: "task_agent", taskAgentRunId: `codex-task-agent-${suffix}` },
        ],
      },
      aggregate: expect.objectContaining({ grossInputTokens: 15, estimatedApiTotalCost: 0.17 }),
    });
    expect(rootTeam.children.find((row) => row.runId === `insufficient-${suffix}`)).toMatchObject({
      rowKind: "MEMBER_RUN",
      executionAddress: null,
      aggregate: expect.objectContaining({ grossInputTokens: 5, estimatedApiTotalCost: 0.06 }),
    });

    const conflictTeam = findTopRow(after.tokenUsageTaskStatisticsInPeriod.rows, (row) => row.rootTeamRunId === conflictTaskTeamRunId);
    expect(conflictTeam).toMatchObject({
      rowKind: "TEAM_RUN",
      displayName: "Unknown team run",
      aggregate: expect.objectContaining({ grossInputTokens: 4, estimatedApiTotalCost: 0.05 }),
      children: [expect.objectContaining({ memberRouteKey: "student_conflict", executionAddress: null })],
    });

    const statusResult = await execGraphql<MigrationStatusResult>(migrationStatusQuery);
    const migrationStatus = statusResult.getAppDataMigrations.find((migration) => migration.migrationId === MIGRATION_ID);
    expect(migrationStatus).toMatchObject({
      migrationId: MIGRATION_ID,
      status: "SUCCEEDED",
      attempts: 1,
      summary: {
        scannedCount: 8,
        migratedCount: 4,
        skippedCount: 4,
        failedCount: 0,
      },
    });
    expect(migrationStatus!.summary!.details.map((detail) => detail.message).join("\n")).toContain("Task-agent backfills: 1.");
    expect(migrationStatus!.logPath).toBe(migrationResult!.logPath);
  });
});
