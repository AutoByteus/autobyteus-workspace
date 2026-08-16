import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { TeamCanonicalIdentityMigration } from "../../../src/app-data-migrations/migrations/team-canonical-identity-migration.js";
import {
  PrismaTokenUsageCanonicalIdentityMigrationStore,
  type TokenUsageCanonicalIdentityMigrationStore,
  type TokenUsageCanonicalIdentityUpdate,
} from "../../../src/app-data-migrations/migrations/token-usage-canonical-identity-migration-store.js";
import { TokenUsageCanonicalExecutionAddressMigrator } from "../../../src/app-data-migrations/migrations/token-usage-canonical-execution-address-migrator.js";
import type { RawTokenUsageLedgerBackfillRow } from "../../../src/app-data-migrations/migrations/token-usage-canonical-execution-address-planner.js";

class InMemoryMigrationStore implements TokenUsageCanonicalIdentityMigrationStore {
  readonly appliedBatches: readonly TokenUsageCanonicalIdentityUpdate[][] = [];
  readonly listRows = vi.fn(async (): Promise<readonly RawTokenUsageLedgerBackfillRow[]> =>
    this.rows.map((row) => ({ ...row })));

  constructor(readonly rows: RawTokenUsageLedgerBackfillRow[]) {}

  readonly applyCanonicalTeamIdentityTransaction = vi.fn(async (
    updates: readonly TokenUsageCanonicalIdentityUpdate[],
  ): Promise<void> => {
    (this.appliedBatches as TokenUsageCanonicalIdentityUpdate[][]).push(
      updates.map((update) => ({ ...update })),
    );
    for (const update of updates) {
      const row = this.rows.find((candidate) => candidate.id === update.id);
      if (!row) throw new Error(`Missing row ${update.id}`);
      row.root_team_run_id = JSON.parse(update.executionAddressJson).rootTeamRunId as string;
      row.execution_address_json = update.executionAddressJson;
    }
  });
}

let nextRowId = 1;

const executionAddress = (
  rootTeamRunId: string,
  memberAddress: string,
  taskTeamRunIds: readonly string[] = [],
  taskAgentRunId: string | null = null,
) => ({ rootTeamRunId, taskTeamRunIds, memberAddress, taskAgentRunId });

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
  taskTeamRuns: Array<{
    taskId: string;
    teamAddress: string;
    taskTeamRunIds: string[];
  }>;
}): Promise<void> => {
  const recordsPath = path.join(
    input.memoryDir,
    "agent_teams",
    input.rootTeamRunId,
    "task_delegation_records.json",
  );
  await fs.mkdir(path.dirname(recordsPath), { recursive: true });
  await fs.writeFile(
    path.join(path.dirname(recordsPath), "team_run_metadata.json"),
    "{}\n",
    "utf-8",
  );
  await fs.writeFile(
    recordsPath,
    `${JSON.stringify({
      teamRunId: input.rootTeamRunId,
      records: input.taskTeamRuns.map((taskRun, index) => ({
        taskId: taskRun.taskId,
        status: "accepted",
        senderAddress: executionAddress(input.rootTeamRunId, "/Teacher"),
        receiverAddress: executionAddress(input.rootTeamRunId, taskRun.teamAddress),
        receiverTargetKind: "agent_team",
        content: `Task ${taskRun.taskId}`,
        referenceFiles: [],
        taskRun: {
          address: executionAddress(
            input.rootTeamRunId,
            taskRun.teamAddress,
            taskRun.taskTeamRunIds,
          ),
          startedAt: `2026-08-09T10:0${index}:00.000Z`,
        },
        updates: [],
        createdAt: `2026-08-09T09:0${index}:00.000Z`,
      })),
    }, null, 2)}\n`,
    "utf-8",
  );
};

const parseAddress = (row: RawTokenUsageLedgerBackfillRow): unknown =>
  row.execution_address_json ? JSON.parse(row.execution_address_json) as unknown : null;

const detailText = (details: readonly { message: string }[]): string =>
  details.map((detail) => detail.message).join("\n");

const TOKEN_USAGE_MIGRATION_SQL_FILES = Object.freeze([
  "20260624090000_add_token_usage_ledger_events/migration.sql",
  "20260625193000_token_usage_component_pricing_explainability/migration.sql",
  "20260629120000_add_token_usage_display_fields/migration.sql",
  "20260702093000_token_usage_execution_address/migration.sql",
  "20260730090000_add_token_usage_provider_name/migration.sql",
  "20260801090000_token_usage_member_display_name/migration.sql",
] as const);

const createIsolatedLegacyTokenDatabase = async (): Promise<{
  tempRoot: string;
  prisma: PrismaClient;
}> => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "token-canonical-transaction-"));
  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${path.join(tempRoot, "test.db")}` } },
  });
  for (const relativePath of TOKEN_USAGE_MIGRATION_SQL_FILES) {
    const sql = await fs.readFile(
      path.join(process.cwd(), "prisma", "migrations", relativePath),
      "utf-8",
    );
    for (const statement of sql.split(";").map((entry) => entry.trim()).filter(Boolean)) {
      await prisma.$executeRawUnsafe(statement);
    }
  }
  return { tempRoot, prisma };
};

describe("canonical token execution-address migration", () => {
  it("derives task-Team mappings from a validated current V1 package", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "token-current-v1-address-"));
    const memoryDir = path.join(tempRoot, "memory");
    const source = path.join(
      process.cwd(),
      "tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-003-nested-task-team",
    );
    const rootDir = path.join(memoryDir, "agent_teams", "team-run-root");
    await fs.mkdir(rootDir, { recursive: true });
    await Promise.all([
      "team_run_execution_tree.json",
      "task_delegation_records.json",
      "team_communication_messages.json",
    ].map((name) => fs.copyFile(path.join(source, name), path.join(rootDir, name))));
    const rows = [tokenRow({
      root_team_run_id: "task-team-run-qa-001",
      member_route_key: "worker",
    })];
    const store = new InMemoryMigrationStore(rows);
    try {
      const details = await new TokenUsageCanonicalExecutionAddressMigrator(
        memoryDir,
        tempRoot,
        store,
      ).migrate();

      expect(details.filter((detail) => detail.status === "FAILED")).toEqual([]);
      expect(rows[0]!.root_team_run_id).toBe("team-run-root");
      expect(parseAddress(rows[0]!)).toEqual(executionAddress(
        "team-run-root",
        "/qa/worker",
        ["task-team-run-qa-001"],
      ));
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("reconstructs direct, task-Agent, and nested task-Team addresses and is exact-current idempotent", async () => {
    nextRowId = 1;
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "token-canonical-address-"));
    const memoryDir = path.join(tempRoot, "memory");
    try {
      await writeTaskRecordsFile({
        memoryDir,
        rootTeamRunId: "rootA",
        taskTeamRuns: [
          { taskId: "outer-task", teamAddress: "/Outer", taskTeamRunIds: ["outer-run"] },
          { taskId: "inner-task", teamAddress: "/Outer/Inner", taskTeamRunIds: ["outer-run", "inner-run"] },
        ],
      });
      const rows = [
        tokenRow({ root_team_run_id: "rootA", member_route_key: "Teacher" }),
        tokenRow({ root_team_run_id: "inner-run", member_route_key: "worker" }),
        tokenRow({
          root_team_run_id: "rootA",
          member_route_key: "assistant",
          task_agent_run_id: "task-agent-1",
          task_id: "agent-task",
        }),
        tokenRow({ root_team_run_id: null, run_id: "standalone-run" }),
        tokenRow({
          root_team_run_id: "rootA",
          execution_address_json: JSON.stringify(executionAddress("rootA", "/already-current")),
        }),
        tokenRow({
          root_team_run_id: "inner-run",
          member_route_key: "legacy-worker",
          execution_address_json: JSON.stringify({
            segments: [
              { kind: "member", memberRouteKey: "Outer" },
              { kind: "task_team", taskTeamRunId: "outer-run" },
              { kind: "member", memberRouteKey: "Inner" },
              { kind: "task_team", taskTeamRunId: "inner-run" },
              { kind: "member", memberRouteKey: "legacy-worker" },
            ],
          }),
        }),
      ];
      const store = new InMemoryMigrationStore(rows);

      const first = await new TokenUsageCanonicalExecutionAddressMigrator(
        memoryDir,
        tempRoot,
        store,
      ).migrate();

      expect(first.filter((detail) => detail.status === "FAILED")).toEqual([]);
      expect(store.applyCanonicalTeamIdentityTransaction).toHaveBeenCalledTimes(1);
      expect(parseAddress(rows[0]!)).toEqual(executionAddress("rootA", "/Teacher"));
      expect(rows[1]!.root_team_run_id).toBe("rootA");
      expect(parseAddress(rows[1]!)).toEqual(
        executionAddress("rootA", "/Outer/Inner/worker", ["outer-run", "inner-run"]),
      );
      expect(parseAddress(rows[2]!)).toEqual(
        executionAddress("rootA", "/assistant", [], "task-agent-1"),
      );
      expect(rows[3]!.execution_address_json).toBeNull();
      expect(parseAddress(rows[4]!)).toEqual(executionAddress("rootA", "/already-current"));
      expect(rows[5]!.root_team_run_id).toBe("rootA");
      expect(parseAddress(rows[5]!)).toEqual(
        executionAddress("rootA", "/Outer/Inner/legacy-worker", ["outer-run", "inner-run"]),
      );

      const secondStore = new InMemoryMigrationStore(rows);
      const second = await new TokenUsageCanonicalExecutionAddressMigrator(
        memoryDir,
        tempRoot,
        secondStore,
      ).migrate();
      expect(second.filter((detail) => detail.status === "FAILED")).toEqual([]);
      expect(secondStore.applyCanonicalTeamIdentityTransaction).toHaveBeenCalledTimes(1);
      expect(secondStore.appliedBatches).toEqual([[]]);
      expect(second.every((detail) => detail.status === "SKIPPED")).toBe(true);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("plans every row before mutation and fails closed on an unreconstructable Team row", async () => {
    const store = new InMemoryMigrationStore([
      tokenRow({ root_team_run_id: "rootA", member_route_key: "Teacher" }),
      tokenRow({ root_team_run_id: "rootA", member_route_key: null }),
    ]);

    const details = await new TokenUsageCanonicalExecutionAddressMigrator(
      "/unused-memory-root",
      "/unused-app-data-root",
      store,
    ).migrate();

    expect(details).toHaveLength(1);
    expect(detailText(details)).toContain("lacks a reconstructable canonical execution address");
    expect(store.applyCanonicalTeamIdentityTransaction).not.toHaveBeenCalled();
    expect(store.rows.every((row) => row.execution_address_json === null)).toBe(true);
  });

  it("does not scan or mutate token rows when strict current task records are invalid", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "token-canonical-index-fail-"));
    const recordsPath = path.join(tempRoot, "memory", "agent_teams", "rootA", "task_delegation_records.json");
    await fs.mkdir(path.dirname(recordsPath), { recursive: true });
    await fs.writeFile(
      path.join(path.dirname(recordsPath), "team_run_metadata.json"),
      "{}\n",
      "utf-8",
    );
    await fs.writeFile(recordsPath, "{not-json", "utf-8");
    const store = new InMemoryMigrationStore([
      tokenRow({ root_team_run_id: "rootA", member_route_key: "Teacher" }),
    ]);
    try {
      const details = await new TokenUsageCanonicalExecutionAddressMigrator(
        path.join(tempRoot, "memory"),
        tempRoot,
        store,
      ).migrate();

      expect(detailText(details)).toContain("Cannot read predecessor task records");
      expect(store.listRows).not.toHaveBeenCalled();
      expect(store.applyCanonicalTeamIdentityTransaction).not.toHaveBeenCalled();
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("rolls back an earlier Prisma row when a later update affects no row, then commits a repaired batch", async () => {
    const { tempRoot, prisma } = await createIsolatedLegacyTokenDatabase();
    const eventOne = `canonical-atomic-one-${Date.now()}`;
    const eventTwo = `canonical-atomic-two-${Date.now()}`;
    try {
      for (const [usageEventId, runId] of [[eventOne, "run-one"], [eventTwo, "run-two"]]) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "token_usage_ledger_events" (
            "usage_event_id", "idempotency_key", "observed_at", "run_id",
            "root_team_run_id", "member_route_key", "runtime_kind", "ingestion_kind",
            "usage_scope", "pricing_status", "api_cost_status"
          ) VALUES (?, ?, ?, ?, ?, ?, 'autobyteus', 'autobyteus_llm_phase',
            'per_turn', 'missing', 'missing')`,
          usageEventId,
          usageEventId,
          new Date("2026-08-09T10:00:00.000Z"),
          runId,
          "root-before",
          "Teacher",
        );
      }
      const persisted = await prisma.$queryRaw<Array<{ id: number; usage_event_id: string }>>`
        SELECT "id", "usage_event_id" FROM "token_usage_ledger_events"
        WHERE "usage_event_id" IN (${eventOne}, ${eventTwo}) ORDER BY "id" ASC`;
      expect(persisted).toHaveLength(2);
      const [first, second] = persisted;
      const firstAddress = JSON.stringify(executionAddress("root-after", "/Teacher"));
      const secondAddress = JSON.stringify(executionAddress("root-after", "/Student"));
      const store = new PrismaTokenUsageCanonicalIdentityMigrationStore(prisma);

      await expect(store.applyCanonicalTeamIdentityTransaction([
        { id: first!.id, executionAddressJson: firstAddress },
        { id: 999_999_999, executionAddressJson: secondAddress },
      ])).rejects.toThrow("expected exactly one");

      const afterRollback = await prisma.$queryRaw<Array<{
        root_team_run_id: string | null;
        execution_address_json: string | null;
      }>>`
        SELECT "root_team_run_id", "execution_address_json"
        FROM "token_usage_ledger_events" WHERE "id"=${first!.id}`;
      expect(afterRollback).toEqual([{
        root_team_run_id: "root-before",
        execution_address_json: null,
      }]);

      await store.applyCanonicalTeamIdentityTransaction([
        { id: second!.id, executionAddressJson: secondAddress },
        { id: first!.id, executionAddressJson: firstAddress },
      ]);
      const committed = await prisma.$queryRaw<Array<{
        id: number;
        execution_address_json: string | null;
      }>>`
        SELECT "id", "execution_address_json"
        FROM "token_usage_ledger_events"
        WHERE "id" IN (${first!.id}, ${second!.id}) ORDER BY "id" ASC`;
      expect(committed).toEqual([
        { id: first!.id, execution_address_json: firstAddress },
        { id: second!.id, execution_address_json: secondAddress },
      ]);
      const columns = await prisma.$queryRaw<Array<{ name: string }>>`
        PRAGMA table_info("token_usage_ledger_events")`;
      expect(columns.map((column) => column.name)).not.toEqual(expect.arrayContaining([
        "root_team_run_id",
        "team_run_path_json",
        "member_agent_run_id",
        "member_path_json",
        "member_route_key",
        "task_agent_instance_id",
        "task_agent_run_id",
      ]));
      const indexes = await prisma.$queryRaw<Array<{ name: string }>>`
        PRAGMA index_list("token_usage_ledger_events")`;
      expect(indexes.map((index) => index.name)).toContain(
        "token_usage_ledger_events_execution_root_observed_at_idx",
      );
    } finally {
      await prisma.$disconnect();
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("keeps token migration behind TeamRun/task conversion failure in the canonical aggregate", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "token-canonical-dependency-"));
    const memoryDir = path.join(tempRoot, "memory");
    const metadataPath = path.join(memoryDir, "agent_teams", "broken-root", "team_run_metadata.json");
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.writeFile(metadataPath, JSON.stringify({ invalid: true }), "utf-8");
    const validRoot = "valid-root";
    const validDirectory = path.join(memoryDir, "agent_teams", validRoot);
    const validPayload = JSON.parse(await fs.readFile(path.join(
      process.cwd(),
      "tests/fixtures/app-data-migrations/team-run-metadata-member-tree/legacy-flat-safe-team-run-metadata.json",
    ), "utf8")) as Record<string, unknown>;
    validPayload.teamRunId = validRoot;
    await fs.mkdir(validDirectory, { recursive: true });
    const validMetadataPath = path.join(validDirectory, "team_run_metadata.json");
    const validBytes = JSON.stringify(validPayload, null, 2);
    await fs.writeFile(validMetadataPath, validBytes, "utf8");
    const tokenMigrator = { migrate: vi.fn(async () => []) };
    try {
      const result = await new TeamCanonicalIdentityMigration(
        memoryDir,
        path.join(tempRoot, "app-data"),
        tokenMigrator,
      ).execute();

      expect(result.status).toBe("FAILED");
      expect(tokenMigrator.migrate).not.toHaveBeenCalled();
      await expect(fs.readFile(validMetadataPath, "utf8")).resolves.toBe(validBytes);
      await expect(fs.readdir(validDirectory)).resolves.toEqual(["team_run_metadata.json"]);
      expect(detailText(result.summary.details)).toContain(
        "Canonical mutation and token planning were not started because TeamRun preflight failed",
      );
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
