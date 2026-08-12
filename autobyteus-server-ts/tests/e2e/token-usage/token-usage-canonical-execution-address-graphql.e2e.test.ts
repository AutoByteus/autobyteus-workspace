import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import { AppDataMigrationRecordRepository } from "../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js";
import {
  TeamCanonicalIdentityMigration,
  TEAM_CANONICAL_IDENTITY_MIGRATION_ID,
} from "../../../src/app-data-migrations/migrations/team-canonical-identity-migration.js";
import { testAgentNode, testAgentTeamNode } from "../../fixtures/current-team-run-fixtures.js";

const HISTORICAL_TOKEN_MIGRATION_ID = "20260703_token_usage_execution_address_backfill";
const prisma = new PrismaClient();
const createdUsageEventIds = new Set<string>();
let tempRoot: string | null = null;
let schema: GraphQLSchema;
let graphql: typeof graphqlFn;

const executionAddress = (
  rootTeamRunId: string,
  memberAddress: string,
  taskTeamRunIds: readonly string[] = [],
  taskAgentRunId: string | null = null,
) => ({ rootTeamRunId, taskTeamRunIds, memberAddress, taskAgentRunId });

const taskStatsQuery = `
  query CanonicalTokenStats($start: DateTime!, $end: DateTime!) {
    tokenUsageTaskStatisticsInPeriod(startTime: $start, endTime: $end) {
      rows {
        rowKind runId taskId executionAddress displayName
        aggregate { grossInputTokens outputTokens totalTokens estimatedApiTotalCost }
        children {
          rowKind runId taskId executionAddress displayName
          aggregate { grossInputTokens outputTokens totalTokens estimatedApiTotalCost }
          children {
            rowKind runId taskId executionAddress displayName
            aggregate { grossInputTokens outputTokens totalTokens estimatedApiTotalCost }
          }
        }
      }
    }
    getAppDataMigrations { migrationId status attempts summary logPath }
  }
`;

type TaskRow = {
  rowKind: string;
  runId: string | null;
  taskId: string | null;
  executionAddress: unknown | null;
  displayName: string;
  aggregate: {
    grossInputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedApiTotalCost: number | null;
  };
  children: TaskRow[];
};

type QueryResult = {
  tokenUsageTaskStatisticsInPeriod: { rows: TaskRow[] };
  getAppDataMigrations: Array<{
    migrationId: string;
    status: string;
    attempts: number;
    summary: {
      scannedCount: number;
      migratedCount: number;
      skippedCount: number;
      failedCount: number;
      details: Array<{ itemId: string; status: string; message: string }>;
    } | null;
    logPath: string | null;
  }>;
};

const insertHistoricalTokenRow = async (input: {
  usageEventId: string;
  observedAt: string;
  runId: string;
  rootTeamRunId: string | null;
  memberRouteKey?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
  executionAddress?: unknown | null;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  teamName?: string | null;
  memberName?: string | null;
}): Promise<void> => {
  createdUsageEventIds.add(input.usageEventId);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "token_usage_ledger_events" (
      "usage_event_id", "idempotency_key", "observed_at", "run_id",
      "root_team_run_id", "execution_address_json", "member_agent_run_id",
      "member_route_key", "task_agent_run_id", "task_id", "team_name", "member_display_name",
      "runtime_kind", "model_provider", "model_identifier", "ingestion_kind", "usage_scope",
      "input_token_semantic", "reported_input_tokens", "reported_output_tokens", "reported_total_tokens",
      "accounting_input_tokens", "accounting_output_tokens", "accounting_total_tokens",
      "standard_input_tokens", "cache_miss_input_tokens", "cache_read_input_tokens",
      "cache_creation_input_tokens", "cache_creation_5m_input_tokens", "cache_creation_1h_input_tokens",
      "cache_state", "reasoning_output_tokens", "billable_output_tokens", "pricing_status",
      "api_cost_status", "currency", "estimated_api_input_cost", "estimated_api_standard_input_cost",
      "estimated_api_output_cost", "estimated_api_total_cost", "missing_price_dimensions_json"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'codex_app_server', 'OPENAI',
      'gpt-5.6-luna', 'codex_thread_token_usage', 'per_turn', 'gross_includes_cache',
      ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'not_reported', 0, ?, 'trusted', 'estimated',
      'USD', ?, ?, ?, ?, '[]')`,
    input.usageEventId,
    input.usageEventId,
    new Date(input.observedAt),
    input.runId,
    input.rootTeamRunId,
    input.executionAddress ? JSON.stringify(input.executionAddress) : null,
    input.rootTeamRunId ? input.runId : null,
    input.memberRouteKey ?? null,
    input.taskAgentRunId ?? null,
    input.taskId ?? null,
    input.teamName ?? null,
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

const writeCurrentTeamFiles = async (input: {
  memoryDir: string;
  rootTeamRunId: string;
  taskTeamRunId: string;
}): Promise<void> => {
  const teamDir = path.join(input.memoryDir, "agent_teams", input.rootTeamRunId);
  await fs.mkdir(teamDir, { recursive: true });
  const group = testAgentTeamNode({
    address: "/StudentStudyGroup",
    coordinatorAddress: "/StudentStudyGroup/student_one",
    teamRunId: `persistent-group-${input.rootTeamRunId}`,
    children: [
      testAgentNode("/StudentStudyGroup/student_one"),
      testAgentNode("/StudentStudyGroup/student_two"),
    ],
  });
  await fs.writeFile(path.join(teamDir, "team_run_metadata.json"), JSON.stringify({
    schemaVersion: 3,
    teamDefinitionName: "Nested Classroom Canonical Token E2E",
    createdAt: "2044-07-03T08:00:00.000Z",
    archivedAt: null,
    rootTeam: testAgentTeamNode({
      address: "/",
      coordinatorAddress: "/Teacher",
      teamRunId: input.rootTeamRunId,
      children: [testAgentNode("/Teacher"), testAgentNode("/assistant"), group],
    }),
    handoffs: [],
  }, null, 2));
  await fs.writeFile(path.join(teamDir, "task_delegation_records.json"), JSON.stringify({
    teamRunId: input.rootTeamRunId,
    records: [{
      taskId: "task-team-one",
      status: "accepted",
      senderAddress: executionAddress(input.rootTeamRunId, "/Teacher"),
      receiverAddress: executionAddress(input.rootTeamRunId, "/StudentStudyGroup"),
      receiverTargetKind: "agent_team",
      content: "Study the assignment",
      referenceFiles: [],
      taskRun: {
        address: executionAddress(
          input.rootTeamRunId,
          "/StudentStudyGroup",
          [input.taskTeamRunId],
        ),
        startedAt: "2044-07-03T09:00:00.000Z",
      },
      updates: [],
      createdAt: "2044-07-03T08:30:00.000Z",
    }],
  }, null, 2));
};

const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
  const result = await graphql({ schema, source: query, variableValues: variables });
  if (result.errors?.length) throw result.errors[0];
  return result.data as T;
};

describe("canonical token execution-address migration GraphQL integration", () => {
  beforeAll(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "token-canonical-graphql-e2e-"));
    await fs.writeFile(path.join(tempRoot, ".env"), [
      "APP_ENV=test",
      "DB_TYPE=sqlite",
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000",
      `DATABASE_URL=${process.env.DATABASE_URL ?? ""}`,
      "",
    ].join("\n"));
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir: tempRoot }).initialize();
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    if (createdUsageEventIds.size > 0) {
      await prisma.tokenUsageLedgerEvent.deleteMany({
        where: { usageEventId: { in: [...createdUsageEventIds] } },
      });
    }
    await prisma.$executeRawUnsafe(
      `DELETE FROM "app_data_migration_records" WHERE "migration_id" IN (?, ?)`,
      HISTORICAL_TOKEN_MIGRATION_ID,
      TEAM_CANONICAL_IDENTITY_MIGRATION_ID,
    );
    appConfigProvider.resetForTests();
    if (tempRoot) await fs.rm(tempRoot, { recursive: true, force: true });
    await prisma.$disconnect();
  });

  it("preserves the terminal historical record while canonical owner writes exact addresses and GraphQL exposes hierarchy", async () => {
    const suffix = randomUUID();
    const rootTeamRunId = `canonical-root-${suffix}`;
    const taskTeamRunId = `canonical-task-team-${suffix}`;
    const memoryDir = path.join(tempRoot!, "memory");
    const logsDir = path.join(tempRoot!, "logs");
    await writeCurrentTeamFiles({ memoryDir, rootTeamRunId, taskTeamRunId });
    await prisma.$executeRawUnsafe(
      `INSERT INTO "app_data_migration_records" (
        "migration_id", "display_name", "status", "attempts", "started_at", "completed_at",
        "summary_json", "error_message", "log_path", "updated_at"
      ) VALUES (?, 'Historical token backfill', 'SUCCEEDED_WITH_WARNINGS', 7, ?, ?, ?,
        'historical warning preserved', '/historical/token.log', CURRENT_TIMESTAMP)`,
      HISTORICAL_TOKEN_MIGRATION_ID,
      new Date("2044-07-01T00:00:00.000Z"),
      new Date("2044-07-01T00:01:00.000Z"),
      JSON.stringify({ scannedCount: 3, migratedCount: 2, skippedCount: 1, failedCount: 0, details: [] }),
    );
    const ids = {
      teacher: `canonical-teacher-${suffix}`,
      student: `canonical-student-${suffix}`,
      taskAgent: `canonical-task-agent-${suffix}`,
      standalone: `canonical-standalone-${suffix}`,
    };
    await insertHistoricalTokenRow({
      usageEventId: ids.teacher,
      observedAt: "2044-07-03T10:01:00.000Z",
      runId: `teacher-${suffix}`,
      rootTeamRunId,
      memberRouteKey: "Teacher",
      inputTokens: 100,
      outputTokens: 10,
      totalCost: 1.10,
      teamName: "Nested Classroom Canonical Token E2E",
      memberName: "Teacher",
    });
    await insertHistoricalTokenRow({
      usageEventId: ids.student,
      observedAt: "2044-07-03T10:02:00.000Z",
      runId: `student-${suffix}`,
      rootTeamRunId: taskTeamRunId,
      memberRouteKey: "student_one",
      inputTokens: 30,
      outputTokens: 3,
      totalCost: 0.33,
      memberName: "student_one",
    });
    await insertHistoricalTokenRow({
      usageEventId: ids.taskAgent,
      observedAt: "2044-07-03T10:03:00.000Z",
      runId: `assistant-task-${suffix}`,
      rootTeamRunId,
      memberRouteKey: "assistant",
      taskAgentRunId: `assistant-task-${suffix}`,
      taskId: `task-agent-${suffix}`,
      inputTokens: 15,
      outputTokens: 2,
      totalCost: 0.17,
      teamName: "Nested Classroom Canonical Token E2E",
      memberName: "assistant",
    });
    await insertHistoricalTokenRow({
      usageEventId: ids.standalone,
      observedAt: "2044-07-03T10:04:00.000Z",
      runId: `standalone-${suffix}`,
      rootTeamRunId: null,
      inputTokens: 7,
      outputTokens: 1,
      totalCost: 0.08,
    });

    const runner = new AppDataMigrationRunner(
      new AppDataMigrationRegistry([
        new TeamCanonicalIdentityMigration(
          memoryDir,
          path.join(tempRoot!, "app-data"),
        ),
      ]),
      new AppDataMigrationRecordRepository(prisma),
      { logsDir },
    );
    const [migration] = await runner.runPending();

    expect(migration).toMatchObject({
      migrationId: TEAM_CANONICAL_IDENTITY_MIGRATION_ID,
      status: "SUCCEEDED",
      attempts: 1,
      summary: { failedCount: 0 },
    });
    const detailText = migration!.summary!.details.map((detail) => detail.message).join("\n");
    expect(detailText).toContain(
      "Reconstructed task TeamRun root, ordered chain, and member address from strict current task records",
    );
    expect(detailText).toContain("Canonical execution address persisted");

    const persistedRows = await prisma.$queryRaw<Array<{
      usage_event_id: string;
      execution_address_json: string | null;
    }>>`
      SELECT "usage_event_id", "execution_address_json"
      FROM "token_usage_ledger_events"
      WHERE "usage_event_id" IN (${ids.teacher}, ${ids.student}, ${ids.taskAgent}, ${ids.standalone})`;
    const byId = new Map(persistedRows.map((row) => [row.usage_event_id, row]));
    expect(JSON.parse(byId.get(ids.teacher)!.execution_address_json!)).toEqual(
      executionAddress(rootTeamRunId, "/Teacher"),
    );
    expect(JSON.parse(byId.get(ids.student)!.execution_address_json!)).toEqual(
      executionAddress(rootTeamRunId, "/StudentStudyGroup/student_one", [taskTeamRunId]),
    );
    expect(JSON.parse(byId.get(ids.taskAgent)!.execution_address_json!)).toEqual(
      executionAddress(rootTeamRunId, "/assistant", [], `assistant-task-${suffix}`),
    );
    expect(byId.get(ids.standalone)!.execution_address_json).toBeNull();

    const historical = await prisma.$queryRaw<Array<{
      status: string;
      attempts: number;
      error_message: string | null;
      log_path: string | null;
    }>>`
      SELECT "status", "attempts", "error_message", "log_path"
      FROM "app_data_migration_records"
      WHERE "migration_id"=${HISTORICAL_TOKEN_MIGRATION_ID}`;
    expect(historical).toEqual([{
      status: "SUCCEEDED_WITH_WARNINGS",
      attempts: 7,
      error_message: "historical warning preserved",
      log_path: "/historical/token.log",
    }]);

    const result = await execGraphql<QueryResult>(taskStatsQuery, {
      start: new Date("2044-07-03T10:00:00.000Z"),
      end: new Date("2044-07-03T10:30:00.000Z"),
    });
    const canonicalStatus = result.getAppDataMigrations.find(
      (entry) => entry.migrationId === TEAM_CANONICAL_IDENTITY_MIGRATION_ID,
    );
    expect(canonicalStatus).toMatchObject({ status: "SUCCEEDED", attempts: 1 });
    expect(result.getAppDataMigrations.some(
      (entry) => entry.migrationId === HISTORICAL_TOKEN_MIGRATION_ID,
    )).toBe(false);

    const root = result.tokenUsageTaskStatisticsInPeriod.rows.find(
      (row) => row.rowKind === "TEAM_RUN"
        && JSON.stringify(row.executionAddress) === JSON.stringify(executionAddress(rootTeamRunId, "/")),
    );
    expect(root).toMatchObject({
      rowKind: "TEAM_RUN",
      aggregate: expect.objectContaining({
        grossInputTokens: 145,
        outputTokens: 15,
        totalTokens: 160,
        estimatedApiTotalCost: 1.60,
      }),
    });
    const studentMember = root!.children.find(
      (row) => row.rowKind === "MEMBER_RUN"
        && JSON.stringify(row.executionAddress) === JSON.stringify(
          executionAddress(rootTeamRunId, "/StudentStudyGroup/student_one"),
        ),
    );
    const taskTeam = studentMember!.children.find(
      (row) => row.rowKind === "TASK_TEAM_RUN"
        && JSON.stringify(row.executionAddress) === JSON.stringify(
          executionAddress(rootTeamRunId, "/StudentStudyGroup/student_one", [taskTeamRunId]),
        ),
    );
    expect(taskTeam).toMatchObject({
      rowKind: "TASK_TEAM_RUN",
      executionAddress: executionAddress(
        rootTeamRunId,
        "/StudentStudyGroup/student_one",
        [taskTeamRunId],
      ),
    });
    const assistantMember = root!.children.find(
      (row) => row.rowKind === "MEMBER_RUN"
        && JSON.stringify(row.executionAddress) === JSON.stringify(
          executionAddress(rootTeamRunId, "/assistant"),
        ),
    );
    expect(assistantMember!.children.find(
      (row) => row.rowKind === "TASK_AGENT_RUN"
        && JSON.stringify(row.executionAddress) === JSON.stringify(
          executionAddress(rootTeamRunId, "/assistant", [], `assistant-task-${suffix}`),
        ),
    ))
      .toMatchObject({
        rowKind: "TASK_AGENT_RUN",
        executionAddress: executionAddress(
          rootTeamRunId,
          "/assistant",
          [],
          `assistant-task-${suffix}`,
        ),
      });
  });
});
