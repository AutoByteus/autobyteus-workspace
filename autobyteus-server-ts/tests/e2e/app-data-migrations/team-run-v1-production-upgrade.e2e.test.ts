import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it } from "vitest";
import { EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL } from "../../../src/startup/embedded-server-platform-fatal.js";
import { runMigrations } from "../../../src/startup/migrations.js";
import {
  buildCurrentTokenUsagePayload,
  createCurrentTokenUsageTestHarness,
} from "../../helpers/token-usage-run-record-fixtures.js";
import {
  createSanitizedTestEnvironment,
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  serverRoot,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type DatabaseLocation = ReturnType<typeof resolveTestDatabaseLocation>;

type MigrationStatus = {
  migrationId: string;
  status: string;
  recoveryAction: "MANUAL_RETRY" | "RESTART_TO_RETRY" | "NONE";
  canRetry: boolean;
  attempts: number;
  summary: string | null;
  errorMessage: string | null;
  logPath: string | null;
};

type ExecutionCounts = {
  scannedCount: number;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
};

type AttemptLogDetail = {
  itemId: string;
  status: string;
  message: string | null;
};

const FINAL_MIGRATION_ID = "20260814_team_run_execution_tree_v1";
const TOKEN_USAGE_CONSOLIDATION_MIGRATION_ID = "20260819_token_usage_run_records_v1";
const HISTORICAL_AUDIT_SENTINEL_MIGRATION_ID = "20260730_token_usage_provider_name_snapshot_backfill";
const REMOVED_CANONICAL_MIGRATION_ID = "20260801_team_canonical_identity";
const SUMMARY_SCHEMA_MIGRATION_ID = "20260820090000_redesign_app_data_migration_summary";
const PRODUCTION_PROFILE = path.resolve(process.env.HOME ?? "", ".autobyteus/server-data");
const WITHDRAWN_AUDIT_BOUND_BYTES = 64 * 1024;

const RELEASED_COHORT = Object.freeze([
  ["20260727_custom_provider_v1_secret_migration", "SUCCEEDED"],
  ["20260706_remove_global_skill_discovery_mode", "SUCCEEDED"],
  ["20260517_team_run_metadata_member_tree", "SUCCEEDED"],
  ["20260731_remove_external_runtime_working_context_snapshots", "SUCCEEDED"],
  ["20260617_raw_trace_rotation_layout", "SUCCEEDED"],
  ["20260707_raw_trace_active_file_name", "SUCCEEDED"],
  ["20260731_migrate_native_working_context_snapshots_v5", "SUCCEEDED_WITH_WARNINGS"],
  ["20260701_team_communication_projection_addresses", "SUCCEEDED_WITH_WARNINGS"],
  ["20260730_token_usage_custom_provider_model_value_backfill", "SUCCEEDED"],
  ["20260730_token_usage_provider_name_snapshot_backfill", "SUCCEEDED"],
  ["20260623_remove_self_evolution_run_metadata", "SUCCEEDED"],
  ["20260521_team_run_history_index_v2", "SUCCEEDED"],
  ["20260521_run_history_index_v2", "SUCCEEDED_WITH_WARNINGS"],
  ["20260803_custom_provider_readable_identity", "SUCCEEDED_WITH_WARNINGS"],
] as const);

const ownedServers = new Set<RunningTestServer>();
const ownedTargets: Array<{ runtimeRoot: string; database: DatabaseLocation }> = [];

const json = (filePath: string, value: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
};

const productionProfileMetadata = (): Record<string, number | boolean> => {
  try {
    const stat = fs.lstatSync(PRODUCTION_PROFILE);
    return {
      exists: true,
      device: stat.dev,
      inode: stat.ino,
      mode: stat.mode,
      size: stat.size,
      modifiedAtMs: stat.mtimeMs,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { exists: false };
    throw error;
  }
};

const makeTarget = (label: string) => {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runtimeRoot = path.join(testRuntimeRoot, `${label}-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/${label}-${suffix}.db`);
  const isolatedHome = path.join(runtimeRoot, "isolated-home");
  const resolvedRuntime = path.resolve(runtimeRoot);
  expect(resolvedRuntime).not.toBe(PRODUCTION_PROFILE);
  expect(resolvedRuntime.startsWith(`${PRODUCTION_PROFILE}${path.sep}`)).toBe(false);
  ownedTargets.push({ runtimeRoot, database });
  return { runtimeRoot, database, isolatedHome };
};

const deploySchema = (database: DatabaseLocation): void => runMigrations({
  appRoot: serverRoot,
  databaseUrl: database.databaseUrl,
});

const formatSummary = (counts: ExecutionCounts): string =>
  `Scanned ${counts.scannedCount}; migrated ${counts.migratedCount}; skipped ${counts.skippedCount}; failed ${counts.failedCount}.`;

const prepareReleasedSummarySchema = (database: DatabaseLocation): void => {
  deploySchema(database);
  const sqlite = new DatabaseSync(database.databasePath);
  try {
    sqlite.exec("BEGIN IMMEDIATE");
    sqlite.exec(
      `ALTER TABLE app_data_migration_records RENAME COLUMN summary TO summary_json`,
    );
    const removed = sqlite.prepare(
      `DELETE FROM _prisma_migrations WHERE migration_name = ?`,
    ).run(SUMMARY_SCHEMA_MIGRATION_ID);
    expect(removed.changes).toBe(1);
    sqlite.exec("COMMIT");
  } catch (error) {
    sqlite.exec("ROLLBACK");
    throw error;
  } finally {
    sqlite.close();
  }
};

const seedReleasedLedger = async (
  database: DatabaseLocation,
  runtimeRoot: string,
): Promise<{
  migrationId: string;
  summary: string;
  legacySummaryJson: string;
  logPath: string;
  logBytes: Buffer;
}> => {
  const startedAt = "2026-08-17T09:00:00.000Z";
  const completedAt = "2026-08-17T09:00:01.000Z";
  const historicalSummary = {
    scannedCount: 1,
    migratedCount: 1,
    skippedCount: 0,
    failedCount: 0,
    details: [{
      itemId: "accepted-historical-audit-sentinel",
      status: "MIGRATED",
      message: `accepted-unchanged:${"s".repeat(WITHDRAWN_AUDIT_BOUND_BYTES)}`,
    }],
  };
  const historicalLogPath = path.join(runtimeRoot, "historical-audit", "released-provider-name.log");
  const historicalLogBytes = Buffer.from(
    `accepted historical audit log must remain byte-exact\n${"l".repeat(WITHDRAWN_AUDIT_BOUND_BYTES)}\n`,
    "utf8",
  );
  fs.mkdirSync(path.dirname(historicalLogPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(historicalLogPath, historicalLogBytes, { mode: 0o600 });
  const sqlite = new DatabaseSync(database.databasePath);
  try {
    const insert = sqlite.prepare(`
      INSERT INTO app_data_migration_records (
        migration_id, display_name, status, attempts, started_at, completed_at,
        summary_json, error_message, log_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const [migrationId, status] of RELEASED_COHORT) {
      const isHistoricalAuditSentinel = migrationId === HISTORICAL_AUDIT_SENTINEL_MIGRATION_ID;
      insert.run(
        migrationId,
        `Released ${migrationId}`,
        status,
        1,
        startedAt,
        completedAt,
        JSON.stringify(isHistoricalAuditSentinel ? historicalSummary : {
          scannedCount: 1,
          migratedCount: status === "SUCCEEDED" ? 1 : 0,
          skippedCount: 0,
          failedCount: status === "SUCCEEDED_WITH_WARNINGS" ? 1 : 0,
          details: [{ itemId: `released:${migrationId}`, status: status === "SUCCEEDED" ? "MIGRATED" : "FAILED", message: "synthetic released cohort evidence" }],
        }),
        status === "SUCCEEDED_WITH_WARNINGS" ? "synthetic released warning" : null,
        isHistoricalAuditSentinel
          ? historicalLogPath
          : `/synthetic/released/${migrationId}.log`,
      );
    }
    insert.run(
      REMOVED_CANONICAL_MIGRATION_ID,
      "Removed canonical identity migration",
      "FAILED",
      6,
      startedAt,
      completedAt,
      JSON.stringify({ scannedCount: 1, migratedCount: 0, skippedCount: 0, failedCount: 1, details: [] }),
      "historical unpublished failure remains inert",
      "/synthetic/released/removed-canonical.log",
    );
  } finally {
    sqlite.close();
  }
  const legacySummaryJson = JSON.stringify(historicalSummary);
  return {
    migrationId: HISTORICAL_AUDIT_SENTINEL_MIGRATION_ID,
    summary: formatSummary(historicalSummary),
    legacySummaryJson,
    logPath: historicalLogPath,
    logBytes: historicalLogBytes,
  };
};

const readMigrationLedger = (databasePath: string): Array<Record<string, unknown>> => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const columns = database.prepare(`PRAGMA table_info('app_data_migration_records')`)
      .all() as unknown as Array<{ name: string }>;
    const summaryColumn = columns.some(({ name }) => name === "summary")
      ? "summary"
      : "summary_json";
    return database.prepare(`
      SELECT migration_id, display_name, status, attempts, started_at, completed_at,
             ${summaryColumn} AS summary, error_message, log_path, created_at, updated_at
        FROM app_data_migration_records
       ORDER BY id ASC
    `).all() as unknown as Array<Record<string, unknown>>;
  } finally {
    database.close();
  }
};

const agent = (memberPath: string[], memberRunId: string) => ({
  memberKind: "agent",
  memberRouteKey: memberPath.join("/"),
  memberPath,
  memberName: memberPath.at(-1),
  memberRunId,
  runtimeKind: "autobyteus",
  platformAgentRunId: null,
  agentDefinitionId: "autobyteus-memory-compactor",
  llmModelIdentifier: "gpt-5.6-luna",
  autoExecuteTools: false,
  skillAccessMode: "PRELOADED_ONLY",
  llmConfig: null,
  workspaceRootPath: "/tmp/autobyteus-team-v1-synthetic-workspace",
  applicationExecutionContext: null,
  role: "Synthetic migration member",
  description: "Synthetic released-shape member",
});

const writeSupportedPredecessor = (runtimeRoot: string, rootTeamRunId: string) => {
  const rootDir = path.join(runtimeRoot, "memory", "agent_teams", rootTeamRunId);
  const metadata = {
    teamRunId: rootTeamRunId,
    teamDefinitionId: "synthetic-released-root-definition",
    teamDefinitionName: "Synthetic Released Team",
    coordinatorMemberRouteKey: "lead",
    createdAt: "2026-08-16T12:00:00.000Z",
    archivedAt: null,
    handoffs: [{ from: "lead", to: "research/reviewer", rules: ["Review the migration evidence."] }],
    memberTree: [
      agent(["lead"], `${rootTeamRunId}-lead-run`),
      {
        memberKind: "agent_team",
        memberRouteKey: "research",
        memberPath: ["research"],
        memberName: "research",
        memberRunId: `${rootTeamRunId}-wrapper-team-run`,
        teamRunId: `${rootTeamRunId}-explicit-child-team-run`,
        teamDefinitionId: "synthetic-released-child-definition",
        coordinatorMemberRouteKey: "research/reviewer",
        role: "Research",
        description: "Nested released-shape team",
        memberTree: [agent(["research", "reviewer"], `${rootTeamRunId}-reviewer-run`)],
      },
    ],
  };
  const metadataPath = path.join(rootDir, "team_run_metadata.json");
  json(metadataPath, metadata);
  json(path.join(rootDir, "task_delegation_records.json"), {
    teamRunId: rootTeamRunId,
    records: [],
  });
  json(path.join(rootDir, "team_communication_messages.json"), {
    teamRunId: rootTeamRunId,
    version: 1,
    messages: [
      {
        messageId: `${rootTeamRunId}-address-message`,
        senderAddress: { segments: [{ kind: "member", memberPath: ["lead"] }] },
        receiverAddress: { segments: [{ kind: "member", memberPath: ["research", "reviewer"] }] },
        content: "address projection",
        messageType: "agent_message",
        referenceFiles: ["/synthetic/address-evidence.md"],
        createdAt: "2026-08-16T12:01:00.000Z",
      },
      {
        messageId: `${rootTeamRunId}-run-id-message`,
        senderRunId: `${rootTeamRunId}-reviewer-run`,
        receiverRunId: `${rootTeamRunId}-lead-run`,
        senderMemberRouteKey: "research/reviewer",
        receiverMemberPath: ["lead"],
        content: "run ID projection",
        messageType: "agent_message",
        referenceFiles: ["/synthetic/run-id-evidence.md"],
        createdAt: "2026-08-16T12:02:00.000Z",
      },
    ],
  });
  const memorySentinelPath = path.join(rootDir, `${rootTeamRunId}-lead-run`, "synthetic-memory.bin");
  fs.mkdirSync(path.dirname(memorySentinelPath), { recursive: true, mode: 0o700 });
  const memorySentinel = Buffer.from(`synthetic-memory-bytes:${rootTeamRunId}:\u0000\u0001`, "utf8");
  fs.writeFileSync(memorySentinelPath, memorySentinel, { mode: 0o600 });
  return {
    rootDir,
    metadataPath,
    metadataBytes: fs.readFileSync(metadataPath),
    memorySentinelPath,
    memorySentinel,
  };
};

const insertTokenRow = (databasePath: string, input: {
  usageEventId: string;
  runId: string;
  rootTeamRunId: string | null;
  executionAddressJson: string | null;
  memberAgentRunId: string | null;
  memberRouteKey: string | null;
}): void => {
  const database = new DatabaseSync(databasePath);
  try {
    database.prepare(`
      INSERT INTO token_usage_ledger_events (
        usage_event_id, idempotency_key, observed_at, run_id, root_team_run_id,
        member_agent_run_id, member_route_key, runtime_kind, model_provider,
        model_identifier, model_value, ingestion_kind, usage_scope,
        reported_input_tokens, reported_output_tokens, reported_total_tokens,
        accounting_input_tokens, accounting_output_tokens, accounting_total_tokens,
        raw_usage_json, raw_event_json, quality_flags_json, pricing_status,
        api_cost_status, execution_address_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.usageEventId,
      `${input.usageEventId}:idempotency`,
      "2026-08-16T12:03:00.000Z",
      input.runId,
      input.rootTeamRunId,
      input.memberAgentRunId,
      input.memberRouteKey,
      "autobyteus",
      "OPENAI",
      "gpt-5.6-luna",
      "gpt-5.6-luna",
      "synthetic-team-v1-e2e",
      "per_turn",
      13,
      8,
      21,
      13,
      8,
      21,
      JSON.stringify({ prompt_tokens: 13, completion_tokens: 8, total_tokens: 21 }),
      JSON.stringify({ source: "synthetic-team-v1-e2e", immutable: true }),
      JSON.stringify(["synthetic_evidence"]),
      "missing",
      "price_missing",
      input.executionAddressJson,
    );
  } finally {
    database.close();
  }
};

const readSyntheticTokenRows = (databasePath: string): Array<Record<string, unknown>> => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return database.prepare(`
      SELECT * FROM token_usage_ledger_events
       WHERE usage_event_id LIKE 'team-v1-e2e-%'
       ORDER BY id ASC
    `).all() as unknown as Array<Record<string, unknown>>;
  } finally {
    database.close();
  }
};

const readCurrentSyntheticTokenRows = (databasePath: string): Array<Record<string, unknown>> => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return database.prepare(`
      SELECT run_id, root_team_run_id, usage_report_count,
             accounting_input_tokens, accounting_output_tokens, accounting_total_tokens
        FROM token_usage_run_records
       WHERE run_id LIKE 'team-v1-%'
       ORDER BY run_id ASC
    `).all() as unknown as Array<Record<string, unknown>>;
  } finally {
    database.close();
  }
};

const seedScenario = async (target: ReturnType<typeof makeTarget>, warning: boolean) => {
  fs.mkdirSync(target.isolatedHome, { recursive: true, mode: 0o700 });
  prepareReleasedSummarySchema(target.database);
  const historicalAudit = await seedReleasedLedger(target.database, target.runtimeRoot);
  const rootTeamRunId = warning ? "team-v1-warning-root" : "team-v1-supported-root";
  const supported = writeSupportedPredecessor(target.runtimeRoot, rootTeamRunId);
  insertTokenRow(target.database.databasePath, {
    usageEventId: `team-v1-e2e-${warning ? "warning" : "supported"}-direct`,
    runId: `${rootTeamRunId}-lead-run`,
    rootTeamRunId,
    executionAddressJson: JSON.stringify({
      rootTeamRunId,
      taskTeamRunIds: [],
      memberAddress: "/lead",
      taskAgentRunId: null,
    }),
    memberAgentRunId: `${rootTeamRunId}-lead-run`,
    memberRouteKey: "lead",
  });
  let warningEvidence: null | { path: string; bytes: Buffer; historyPath: string; historyBytes: Buffer } = null;
  if (warning) {
    const invalidRoot = path.join(target.runtimeRoot, "memory", "agent_teams", "team-v1-preserved-warning-root");
    const invalidPath = path.join(invalidRoot, "team_run_metadata.json");
    const invalidBytes = Buffer.from('{"schemaVersion":3,"broken":true,"sentinel":"pre-mutation"}\n', "utf8");
    fs.mkdirSync(invalidRoot, { recursive: true, mode: 0o700 });
    fs.writeFileSync(invalidPath, invalidBytes, { mode: 0o600 });
    const historyPath = path.join(target.runtimeRoot, "memory", "team_run_history_index.json");
    const historyBytes = Buffer.from('{"not":"a valid history index","sentinel":"history-warning"}\n', "utf8");
    fs.mkdirSync(path.dirname(historyPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(historyPath, historyBytes, { mode: 0o600 });
    insertTokenRow(target.database.databasePath, {
      usageEventId: "team-v1-e2e-warning-unsupported",
      runId: "team-v1-warning-unsupported-run",
      rootTeamRunId: "team-v1-preserved-warning-root",
      executionAddressJson: "not-json",
      memberAgentRunId: "team-v1-warning-unsupported-run",
      memberRouteKey: "unknown",
    });
    warningEvidence = { path: invalidPath, bytes: invalidBytes, historyPath, historyBytes };
  }
  const historicalAuditRecord = readMigrationLedger(target.database.databasePath)
    .find(({ migration_id }) => migration_id === historicalAudit.migrationId);
  expect(historicalAuditRecord).toBeDefined();
  return {
    rootTeamRunId,
    supported,
    warningEvidence,
    historicalAudit: { ...historicalAudit, record: historicalAuditRecord! },
  };
};

const migrationStatuses = async (serverUrl: string): Promise<MigrationStatus[]> => {
  const result = await executeGraphql<{ getAppDataMigrations: MigrationStatus[] }>(serverUrl, `
    query TeamRunV1MigrationStatuses {
      getAppDataMigrations {
        migrationId status recoveryAction canRetry attempts summary errorMessage logPath
      }
    }
  `);
  return result.getAppDataMigrations;
};

const finalStatus = async (serverUrl: string): Promise<MigrationStatus> => {
  const statuses = await migrationStatuses(serverUrl);
  expect(statuses.map(({ migrationId }) => migrationId)).not.toContain(REMOVED_CANONICAL_MIGRATION_ID);
  const status = statuses.find(({ migrationId }) => migrationId === FINAL_MIGRATION_ID);
  if (!status) throw new Error("TEAM_RUN_V1_FINAL_STATUS_MISSING");
  return status;
};

const readAttemptLog = (logPath: string): {
  counts: ExecutionCounts;
  details: AttemptLogDetail[];
} => {
  const lines = fs.readFileSync(logPath, "utf8").trimEnd().split("\n");
  const statusLine = lines.find((line) => line.startsWith("statusSummary="));
  if (!statusLine) throw new Error("APP_DATA_MIGRATION_STATUS_SUMMARY_MISSING_FROM_LOG");
  const detailsIndex = lines.indexOf("details=");
  if (detailsIndex < 0) throw new Error("APP_DATA_MIGRATION_DETAILS_MARKER_MISSING_FROM_LOG");
  return {
    counts: JSON.parse(statusLine.slice("statusSummary=".length)) as ExecutionCounts,
    details: lines.slice(detailsIndex + 1).filter(Boolean).map((line) =>
      JSON.parse(line) as AttemptLogDetail),
  };
};

const expectSummaryMatchesAttemptLog = (status: MigrationStatus): ReturnType<typeof readAttemptLog> => {
  expect(status.summary).toMatch(/^Scanned \d+; migrated \d+; skipped \d+; failed \d+\.$/);
  expect(status.logPath).toEqual(expect.any(String));
  const log = readAttemptLog(status.logPath!);
  expect(status.summary).toBe(formatSummary(log.counts));
  return log;
};

const tokenConsolidationStatus = async (serverUrl: string): Promise<MigrationStatus> => {
  const statuses = await migrationStatuses(serverUrl);
  const status = statuses.find(({ migrationId }) => migrationId === TOKEN_USAGE_CONSOLIDATION_MIGRATION_ID);
  if (!status) throw new Error("TOKEN_USAGE_CONSOLIDATION_STATUS_MISSING");
  return status;
};

const expectHistoricalAuditTransitioned = async (
  serverUrl: string,
  databasePath: string,
  scenario: Awaited<ReturnType<typeof seedScenario>>,
): Promise<void> => {
  const status = (await migrationStatuses(serverUrl))
    .find(({ migrationId }) => migrationId === scenario.historicalAudit.migrationId);
  expect(status).toMatchObject({
    status: "SUCCEEDED",
    attempts: 1,
    recoveryAction: "NONE",
    canRetry: false,
    summary: scenario.historicalAudit.summary,
    logPath: scenario.historicalAudit.logPath,
  });
  expect(Buffer.byteLength(scenario.historicalAudit.legacySummaryJson, "utf8"))
    .toBeGreaterThan(WITHDRAWN_AUDIT_BOUND_BYTES);
  expect(Buffer.byteLength(status!.summary!, "utf8")).toBeLessThan(128);
  expect(status!.summary).not.toContain("accepted-historical-audit-sentinel");
  expect(readMigrationLedger(databasePath)
    .find(({ migration_id }) => migration_id === scenario.historicalAudit.migrationId))
    .toEqual({
      ...scenario.historicalAudit.record,
      summary: scenario.historicalAudit.summary,
    });
  expect(fs.readFileSync(scenario.historicalAudit.logPath))
    .toEqual(scenario.historicalAudit.logBytes);
};

const expectHealthy = async (serverUrl: string): Promise<void> => {
  const response = await fetch(`${serverUrl}/rest/health`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(expect.objectContaining({ status: "ok" }));
};

const expectTokenHistoryUnavailable = async (serverUrl: string): Promise<void> => {
  const response = await fetch(`${serverUrl}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `query DegradedTokenHistory($start: DateTime!, $end: DateTime!) {
        usageStatisticsInPeriod(startTime: $start, endTime: $end) { runtimeKind inputTokens }
      }`,
      variables: {
        start: "2026-01-01T00:00:00.000Z",
        end: "2049-01-01T00:00:00.000Z",
      },
    }),
  });
  const payload = await response.json() as { errors?: Array<{ message?: string }> };
  expect(payload.errors?.map(({ message }) => message).join("\n"))
    .toContain("TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED");
};

const createCurrentAgentRun = async (serverUrl: string, runtimeRoot: string, label: string): Promise<string> => {
  const createdAgent = await executeGraphql<{ createAgentDefinition: { id: string } }>(serverUrl, `
    mutation CreateDegradedAgent($input: CreateAgentDefinitionInput!) {
      createAgentDefinition(input: $input) { id }
    }
  `, {
    input: {
      name: `${label}-${Date.now()}`,
      role: "migration validation agent",
      description: "Proves current-run admission during token-history degradation.",
      instructions: "No external work.",
      category: "api-e2e",
    },
  });
  const models = await executeGraphql<{
    providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }>;
  }>(serverUrl, `
    query DegradedModels($runtimeKind: String) {
      providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } }
    }
  `, { runtimeKind: "autobyteus" });
  const modelIdentifier = models.providerModelCatalogSnapshots
    .flatMap(({ llmModels: values }) => values.map(({ modelIdentifier: value }) => value))
    .find((value) => value.trim());
  expect(modelIdentifier).toBeTruthy();
  const workspaceRootPath = path.join(runtimeRoot, "degraded-current-workspace");
  fs.mkdirSync(workspaceRootPath, { recursive: true, mode: 0o700 });
  const created = await executeGraphql<{
    createAgentRun: { success: boolean; runId: string | null; message: string };
  }>(serverUrl, `
    mutation CreateDegradedAgentRun($input: CreateAgentRunInput!) {
      createAgentRun(input: $input) { success runId message }
    }
  `, {
    input: {
      agentDefinitionId: createdAgent.createAgentDefinition.id,
      workspaceRootPath,
      llmModelIdentifier: modelIdentifier,
      autoExecuteTools: false,
      skillAccessMode: "NONE",
      runtimeKind: "autobyteus",
    },
  });
  expect(created.createAgentRun).toMatchObject({ success: true, runId: expect.any(String) });
  return created.createAgentRun.runId!;
};

const terminateAgentRun = async (serverUrl: string, runId: string): Promise<void> => {
  const terminated = await executeGraphql<{ terminateAgentRun: { success: boolean } }>(serverUrl, `
    mutation TerminateDegradedAgentRun($runId: String!) {
      terminateAgentRun(agentRunId: $runId) { success }
    }
  `, { runId });
  expect(terminated.terminateAgentRun.success).toBe(true);
};

const restoreTeamRun = async (serverUrl: string, teamRunId: string) => executeGraphql<{
  restoreAgentTeamRun: { success: boolean; teamRunId: string | null; message: string };
}>(serverUrl, `
  mutation RestoreMigrationLifecycleTeam($teamRunId: String!) {
    restoreAgentTeamRun(teamRunId: $teamRunId) { success teamRunId message }
  }
`, { teamRunId });

const countTokenRows = (databasePath: string): { legacy: number; current: number } => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return {
      legacy: Number((database.prepare(`SELECT COUNT(*) AS count FROM token_usage_ledger_events`).get() as { count: number }).count),
      current: Number((database.prepare(`SELECT COUNT(*) AS count FROM token_usage_run_records`).get() as { count: number }).count),
    };
  } finally {
    database.close();
  }
};

const assertConvertedPackage = (scenario: Awaited<ReturnType<typeof seedScenario>>): void => {
  expect(fs.existsSync(scenario.supported.metadataPath)).toBe(false);
  const tree = JSON.parse(fs.readFileSync(path.join(scenario.supported.rootDir, "team_run_execution_tree.json"), "utf8"));
  expect(tree).toMatchObject({
    schemaVersion: 1,
    rootTeam: {
      teamRunId: scenario.rootTeamRunId,
      coordinatorAddress: "/lead",
      members: expect.arrayContaining([
        expect.objectContaining({
          address: "/research",
          teamRunId: `${scenario.rootTeamRunId}-explicit-child-team-run`,
          members: [expect.objectContaining({
            address: "/research/reviewer",
            agentRunId: `${scenario.rootTeamRunId}-reviewer-run`,
          })],
        }),
      ]),
    },
  });
  const messages = JSON.parse(fs.readFileSync(path.join(scenario.supported.rootDir, "team_communication_messages.json"), "utf8"));
  expect(messages).toMatchObject({
    schemaVersion: 1,
    rootTeamRunId: scenario.rootTeamRunId,
    messages: [
      expect.objectContaining({
        senderAgentRunId: `${scenario.rootTeamRunId}-lead-run`,
        receiverAgentRunId: `${scenario.rootTeamRunId}-reviewer-run`,
      }),
      expect.objectContaining({
        senderAgentRunId: `${scenario.rootTeamRunId}-reviewer-run`,
        receiverAgentRunId: `${scenario.rootTeamRunId}-lead-run`,
      }),
    ],
  });
  expect(fs.readFileSync(scenario.supported.memorySentinelPath)).toEqual(scenario.supported.memorySentinel);
};

const assertLedgerTransition = (
  databasePath: string,
  beforeRows: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const columns = database.prepare(`PRAGMA table_info('app_data_migration_records')`)
      .all() as unknown as Array<{ name: string }>;
    expect(columns.map(({ name }) => name)).toContain("summary");
    expect(columns.map(({ name }) => name)).not.toContain("summary_json");
    const migration = database.prepare(
      `SELECT COUNT(*) AS count FROM _prisma_migrations WHERE migration_name = ? AND finished_at IS NOT NULL`,
    ).get(SUMMARY_SCHEMA_MIGRATION_ID) as { count: number };
    expect(Number(migration.count)).toBe(1);
  } finally {
    database.close();
  }
  const afterRows = readMigrationLedger(databasePath);
  expect(afterRows).toHaveLength(beforeRows.length + 2);
  const transitionedBeforeRows = beforeRows.map((row) => {
    if (typeof row.summary !== "string") return row;
    const legacy = JSON.parse(row.summary) as ExecutionCounts;
    return { ...row, summary: formatSummary(legacy) };
  });
  expect(afterRows.slice(0, beforeRows.length)).toEqual(transitionedBeforeRows);
  expect(afterRows.slice(beforeRows.length)).toEqual(expect.arrayContaining([
    expect.objectContaining({ migration_id: FINAL_MIGRATION_ID, attempts: 1 }),
    expect.objectContaining({
      migration_id: TOKEN_USAGE_CONSOLIDATION_MIGRATION_ID,
      status: "SUCCEEDED",
      attempts: 1,
    }),
  ]));
  expect(afterRows.filter(({ migration_id }) => migration_id === FINAL_MIGRATION_ID)).toHaveLength(1);
  expect(afterRows.filter(({ migration_id }) => migration_id === TOKEN_USAGE_CONSOLIDATION_MIGRATION_ID)).toHaveLength(1);
  expect(afterRows.find(({ migration_id }) => migration_id === REMOVED_CANONICAL_MIGRATION_ID)).toMatchObject({
    status: "FAILED",
    attempts: 6,
  });
  return afterRows;
};

const exerciseHistoryAndNewWork = async (
  serverUrl: string,
  runtimeRoot: string,
  historicalTeamRunId: string,
): Promise<void> => {
  const resume = await executeGraphql<{
    getTeamRunResumeConfig: { teamRunId: string; isActive: boolean; executionTree: Record<string, unknown> };
  }>(serverUrl, `
    query TeamRunV1Resume($teamRunId: String!) {
      getTeamRunResumeConfig(teamRunId: $teamRunId) { teamRunId isActive executionTree }
    }
  `, { teamRunId: historicalTeamRunId });
  expect(resume.getTeamRunResumeConfig).toMatchObject({
    teamRunId: historicalTeamRunId,
    isActive: false,
    executionTree: expect.any(Object),
  });

  const restored = await executeGraphql<{
    restoreAgentTeamRun: { success: boolean; teamRunId: string | null; message: string };
  }>(serverUrl, `
    mutation RestoreTeamRunV1($teamRunId: String!) {
      restoreAgentTeamRun(teamRunId: $teamRunId) { success teamRunId message }
    }
  `, { teamRunId: historicalTeamRunId });
  expect(restored.restoreAgentTeamRun).toMatchObject({ success: true, teamRunId: historicalTeamRunId });
  const terminatedRestored = await executeGraphql<{
    terminateAgentTeamRun: { success: boolean };
  }>(serverUrl, `
    mutation TerminateRestoredTeamRunV1($teamRunId: String!) {
      terminateAgentTeamRun(teamRunId: $teamRunId) { success }
    }
  `, { teamRunId: historicalTeamRunId });
  expect(terminatedRestored.terminateAgentTeamRun.success).toBe(true);

  const createdAgent = await executeGraphql<{ createAgentDefinition: { id: string; name: string } }>(serverUrl, `
    mutation CreatePostMigrationAgent($input: CreateAgentDefinitionInput!) {
      createAgentDefinition(input: $input) { id name }
    }
  `, {
    input: {
      name: `team-v1-post-migration-agent-${Date.now()}`,
      role: "validation agent",
      description: "Synthetic post-migration Agent",
      instructions: "Accept controlled validation input without external side effects.",
      category: "api-e2e",
    },
  });
  expect(createdAgent.createAgentDefinition.id).toBeTruthy();

  const models = await executeGraphql<{
    providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }>;
  }>(serverUrl, `
    query PostMigrationModels($runtimeKind: String) {
      providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } }
    }
  `, { runtimeKind: "autobyteus" });
  const modelIdentifier = models.providerModelCatalogSnapshots
    .flatMap((provider) => provider.llmModels.map((model) => model.modelIdentifier))
    .find((candidate) => candidate.trim());
  expect(modelIdentifier).toBeTruthy();
  const workspaceRootPath = path.join(runtimeRoot, "synthetic-workspace");
  fs.mkdirSync(workspaceRootPath, { recursive: true, mode: 0o700 });

  const createdRun = await executeGraphql<{
    createAgentRun: { success: boolean; runId: string | null; message: string };
  }>(serverUrl, `
    mutation CreatePostMigrationAgentRun($input: CreateAgentRunInput!) {
      createAgentRun(input: $input) { success runId message }
    }
  `, {
    input: {
      agentDefinitionId: createdAgent.createAgentDefinition.id,
      workspaceRootPath,
      llmModelIdentifier: modelIdentifier,
      autoExecuteTools: false,
      skillAccessMode: "NONE",
      runtimeKind: "autobyteus",
    },
  });
  expect(createdRun.createAgentRun).toMatchObject({ success: true, runId: expect.any(String) });
  const terminatedAgent = await executeGraphql<{ terminateAgentRun: { success: boolean } }>(serverUrl, `
    mutation TerminatePostMigrationAgent($runId: String!) {
      terminateAgentRun(agentRunId: $runId) { success }
    }
  `, { runId: createdRun.createAgentRun.runId });
  expect(terminatedAgent.terminateAgentRun.success).toBe(true);

  const createdTeam = await executeGraphql<{ createAgentTeamDefinition: { id: string } }>(serverUrl, `
    mutation CreatePostMigrationTeam($input: CreateAgentTeamDefinitionInput!) {
      createAgentTeamDefinition(input: $input) { id }
    }
  `, {
    input: {
      name: `team-v1-post-migration-team-${Date.now()}`,
      description: "Synthetic post-migration AgentTeam",
      instructions: "Coordinate deterministic validation only.",
      coordinatorMemberName: "worker",
      nodes: [{
        memberName: "worker",
        ref: createdAgent.createAgentDefinition.id,
        refType: "AGENT",
        refScope: "SHARED",
      }],
    },
  });
  expect(createdTeam.createAgentTeamDefinition.id).toBeTruthy();

  const createdTeamRun = await executeGraphql<{
    createAgentTeamRun: { success: boolean; teamRunId: string | null; message: string };
  }>(serverUrl, `
    mutation CreatePostMigrationTeamRun($input: CreateAgentTeamRunInput!) {
      createAgentTeamRun(input: $input) { success teamRunId message }
    }
  `, {
    input: {
      teamDefinitionId: createdTeam.createAgentTeamDefinition.id,
      memberConfigs: [{
        memberAddress: "/worker",
        agentDefinitionId: createdAgent.createAgentDefinition.id,
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: false,
        skillAccessMode: "NONE",
        runtimeKind: "autobyteus",
        workspaceRootPath,
      }],
    },
  });
  expect(createdTeamRun.createAgentTeamRun).toMatchObject({ success: true, teamRunId: expect.any(String) });
  const terminatedTeam = await executeGraphql<{ terminateAgentTeamRun: { success: boolean } }>(serverUrl, `
    mutation TerminatePostMigrationTeam($teamRunId: String!) {
      terminateAgentTeamRun(teamRunId: $teamRunId) { success }
    }
  `, { teamRunId: createdTeamRun.createAgentTeamRun.teamRunId });
  expect(terminatedTeam.terminateAgentTeamRun.success).toBe(true);

  const history = await executeGraphql<{
    listWorkspaceRunHistory: Array<{
      teamDefinitions: Array<{ runs: Array<{ teamRunId: string }> }>;
      agentDefinitions: Array<{ runs: Array<{ runId: string }> }>;
    }>;
  }>(serverUrl, `
    query PostMigrationHistory {
      listWorkspaceRunHistory(limitPerAgent: 50) {
        agentDefinitions { runs { runId } }
        teamDefinitions { runs { teamRunId } }
      }
    }
  `);
  const teamRunIds = history.listWorkspaceRunHistory.flatMap((workspace) =>
    workspace.teamDefinitions.flatMap((definition) => definition.runs.map((run) => run.teamRunId)));
  const agentRunIds = history.listWorkspaceRunHistory.flatMap((workspace) =>
    workspace.agentDefinitions.flatMap((definition) => definition.runs.map((run) => run.runId)));
  expect(teamRunIds).toEqual(expect.arrayContaining([
    historicalTeamRunId,
    createdTeamRun.createAgentTeamRun.teamRunId,
  ]));
  expect(agentRunIds).toContain(createdRun.createAgentRun.runId);
};

const startScenarioServer = async (target: ReturnType<typeof makeTarget>): Promise<RunningTestServer> => {
  const server = await startBuiltTestServer({
    runtimeRoot: target.runtimeRoot,
    databaseUrlOverride: target.database.databaseUrl,
    environment: createSanitizedTestEnvironment({ HOME: target.isolatedHome }),
  });
  ownedServers.add(server);
  return server;
};

afterEach(async () => {
  for (const server of [...ownedServers]) {
    if (server.child.exitCode === null) {
      await server.stop().catch(() => server.child.kill("SIGKILL"));
    }
    ownedServers.delete(server);
  }
  for (const target of ownedTargets.splice(0)) {
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

describe("TeamRun V1 released-shape production upgrade through actual startup", () => {
  it("migrates the exact supported cohort, serves history and new work, and remains immutable on relaunch", async () => {
    const productionBefore = productionProfileMetadata();
    const target = makeTarget("team-v1-supported-startup");
    const scenario = await seedScenario(target, false);
    const ledgerBefore = readMigrationLedger(target.database.databasePath);
    const tokensBefore = readSyntheticTokenRows(target.database.databasePath);
    expect(ledgerBefore).toHaveLength(RELEASED_COHORT.length + 1);

    const first = await startScenarioServer(target);
    await expectHealthy(first.serverUrl);
    const status = await finalStatus(first.serverUrl);
    expect(status).toMatchObject({ status: "SUCCEEDED", attempts: 1, errorMessage: null });
    expect(expectSummaryMatchesAttemptLog(status).counts.failedCount).toBe(0);
    expect(first.output()).toContain("Server listening on");
    expect(first.output()).not.toContain(EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL);
    assertConvertedPackage(scenario);
    const ledgerAfterFirst = assertLedgerTransition(target.database.databasePath, ledgerBefore);
    expect(readSyntheticTokenRows(target.database.databasePath)).toEqual([]);
    expect(readCurrentSyntheticTokenRows(target.database.databasePath)).toEqual([
      expect.objectContaining({
        run_id: `${scenario.rootTeamRunId}-lead-run`,
        root_team_run_id: scenario.rootTeamRunId,
        usage_report_count: 1,
        accounting_input_tokens: 13,
        accounting_output_tokens: 8,
        accounting_total_tokens: 21,
      }),
    ]);
    expect(tokensBefore).toHaveLength(1);
    await exerciseHistoryAndNewWork(first.serverUrl, target.runtimeRoot, scenario.rootTeamRunId);

    await first.stop();
    ownedServers.delete(first);
    const second = await startScenarioServer(target);
    await expectHealthy(second.serverUrl);
    expect(await finalStatus(second.serverUrl)).toMatchObject({ status: "SUCCEEDED", attempts: 1 });
    expect(readMigrationLedger(target.database.databasePath)).toEqual(ledgerAfterFirst);
    expect(readSyntheticTokenRows(target.database.databasePath)).toEqual([]);
    expect(readCurrentSyntheticTokenRows(target.database.databasePath)).toHaveLength(1);
    assertConvertedPackage(scenario);
    expect(productionProfileMetadata()).toEqual(productionBefore);
  }, 360_000);

  it("isolates mixed root, token, and history warnings while keeping health, history, new work, and relaunch available", async () => {
    const productionBefore = productionProfileMetadata();
    const target = makeTarget("team-v1-warning-startup");
    const scenario = await seedScenario(target, true);
    const ledgerBefore = readMigrationLedger(target.database.databasePath);
    const tokensBefore = readSyntheticTokenRows(target.database.databasePath);

    const first = await startScenarioServer(target);
    await expectHealthy(first.serverUrl);
    const status = await finalStatus(first.serverUrl);
    expect(status).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", attempts: 1 });
    expect(expectSummaryMatchesAttemptLog(status).details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: "team-root:team-v1-preserved-warning-root",
        status: "FAILED",
        message: expect.stringContaining("Preserved and excluded before mutation"),
      }),
      expect.objectContaining({
        itemId: "team-v1-e2e-warning-unsupported",
        status: "FAILED",
        message: expect.stringContaining("remains unchanged"),
      }),
      expect.objectContaining({
        itemId: "team-history-index",
        status: "FAILED",
        message: expect.stringContaining("history index"),
      }),
    ]));
    expect(first.output()).toContain("startup continues with strict current-package admission");
    expect(first.output()).toContain("Server listening on");
    expect(first.output()).not.toContain(EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL);
    assertConvertedPackage(scenario);
    expect(fs.readFileSync(scenario.warningEvidence!.path)).toEqual(scenario.warningEvidence!.bytes);
    expect(fs.readFileSync(scenario.warningEvidence!.historyPath)).toEqual(scenario.warningEvidence!.historyBytes);
    const ledgerAfterFirst = assertLedgerTransition(target.database.databasePath, ledgerBefore);
    expect(readSyntheticTokenRows(target.database.databasePath)).toEqual([]);
    expect(readCurrentSyntheticTokenRows(target.database.databasePath)).toHaveLength(tokensBefore.length);
    expect(readCurrentSyntheticTokenRows(target.database.databasePath)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        run_id: `${scenario.rootTeamRunId}-lead-run`,
        usage_report_count: 1,
        accounting_total_tokens: 21,
      }),
      expect.objectContaining({
        run_id: "team-v1-warning-unsupported-run",
        usage_report_count: 1,
        accounting_total_tokens: 21,
      }),
    ]));
    await exerciseHistoryAndNewWork(first.serverUrl, target.runtimeRoot, scenario.rootTeamRunId);

    await first.stop();
    ownedServers.delete(first);
    const second = await startScenarioServer(target);
    await expectHealthy(second.serverUrl);
    expect(await finalStatus(second.serverUrl)).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", attempts: 1 });
    expect(readMigrationLedger(target.database.databasePath)).toEqual(ledgerAfterFirst);
    expect(readSyntheticTokenRows(target.database.databasePath)).toEqual([]);
    expect(readCurrentSyntheticTokenRows(target.database.databasePath)).toHaveLength(tokensBefore.length);
    expect(fs.readFileSync(scenario.warningEvidence!.path)).toEqual(scenario.warningEvidence!.bytes);
    expect(productionProfileMetadata()).toEqual(productionBefore);
  }, 360_000);

  it("keeps the server healthy after failed consolidation, admits a new current run, and imports disjoint legacy rows on restart retry", async () => {
    const target = makeTarget("token-consolidation-retry-startup");
    const scenario = await seedScenario(target, false);
    insertTokenRow(target.database.databasePath, {
      usageEventId: "team-v1-e2e-blank-run",
      runId: " ",
      rootTeamRunId: null,
      executionAddressJson: null,
      memberAgentRunId: null,
      memberRouteKey: null,
    });

    const first = await startScenarioServer(target);
    await expectHealthy(first.serverUrl);
    expect(await tokenConsolidationStatus(first.serverUrl)).toMatchObject({
      status: "FAILED",
      recoveryAction: "RESTART_TO_RETRY",
      canRetry: false,
      attempts: 1,
      errorMessage: expect.stringContaining("blank canonical run ID"),
    });
    expectSummaryMatchesAttemptLog(await tokenConsolidationStatus(first.serverUrl));
    await expectHistoricalAuditTransitioned(first.serverUrl, target.database.databasePath, scenario);
    await expectTokenHistoryUnavailable(first.serverUrl);
    const blockedRestore = await restoreTeamRun(first.serverUrl, scenario.rootTeamRunId);
    expect(blockedRestore.restoreAgentTeamRun).toMatchObject({
      success: false,
      teamRunId: null,
      message: expect.stringContaining("TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED"),
    });

    const currentRunId = await createCurrentAgentRun(first.serverUrl, target.runtimeRoot, "degraded-current-agent");
    const currentPrisma = new PrismaClient({ datasources: { db: { url: target.database.databaseUrl } } });
    try {
      const { store } = createCurrentTokenUsageTestHarness(currentPrisma);
      await store.recordObservation(buildCurrentTokenUsagePayload({
        runId: currentRunId,
        eventId: "degraded-current-observation",
        inputTokens: 17,
        outputTokens: 5,
        totalCost: null,
      }));
    } finally {
      await currentPrisma.$disconnect();
    }
    expect(countTokenRows(target.database.databasePath)).toEqual({ legacy: 2, current: 1 });
    await terminateAgentRun(first.serverUrl, currentRunId);
    await first.stop();
    ownedServers.delete(first);

    const database = new DatabaseSync(target.database.databasePath);
    try {
      const updated = database.prepare(`
        UPDATE token_usage_ledger_events SET run_id = ? WHERE trim(run_id) = ''
      `).run("legacy-repaired-after-failure");
      expect(updated.changes).toBe(1);
    } finally {
      database.close();
    }

    const second = await startScenarioServer(target);
    await expectHealthy(second.serverUrl);
    expect(await tokenConsolidationStatus(second.serverUrl)).toMatchObject({
      status: "SUCCEEDED",
      recoveryAction: "NONE",
      canRetry: false,
      attempts: 2,
      errorMessage: null,
    });
    expectSummaryMatchesAttemptLog(await tokenConsolidationStatus(second.serverUrl));
    await expectHistoricalAuditTransitioned(second.serverUrl, target.database.databasePath, scenario);
    expect(countTokenRows(target.database.databasePath)).toEqual({ legacy: 0, current: 3 });
    const restored = await restoreTeamRun(second.serverUrl, scenario.rootTeamRunId);
    expect(restored.restoreAgentTeamRun).toMatchObject({
      success: true,
      teamRunId: scenario.rootTeamRunId,
    });
    const terminated = await executeGraphql<{ terminateAgentTeamRun: { success: boolean } }>(second.serverUrl, `
      mutation TerminateMigrationLifecycleTeam($teamRunId: String!) {
        terminateAgentTeamRun(teamRunId: $teamRunId) { success }
      }
    `, { teamRunId: scenario.rootTeamRunId });
    expect(terminated.terminateAgentTeamRun.success).toBe(true);
  }, 360_000);

  it("rejects a legacy/current run-ID overlap before source cleanup while preserving both stores", async () => {
    const target = makeTarget("token-consolidation-overlap-startup");
    const scenario = await seedScenario(target, false);
    const overlappingRunId = `${scenario.rootTeamRunId}-lead-run`;
    const prisma = new PrismaClient({ datasources: { db: { url: target.database.databaseUrl } } });
    try {
      const { store } = createCurrentTokenUsageTestHarness(prisma);
      await store.recordObservation(buildCurrentTokenUsagePayload({
        runId: overlappingRunId,
        eventId: "overlapping-current-observation",
        inputTokens: 3,
        outputTokens: 2,
        totalCost: null,
      }));
    } finally {
      await prisma.$disconnect();
    }

    const server = await startScenarioServer(target);
    await expectHealthy(server.serverUrl);
    expect(await tokenConsolidationStatus(server.serverUrl)).toMatchObject({
      status: "FAILED",
      attempts: 1,
      errorMessage: expect.stringContaining("TOKEN_USAGE_RUN_ID_INTERSECTION"),
    });
    expect(countTokenRows(target.database.databasePath)).toEqual({ legacy: 1, current: 1 });
    await expectTokenHistoryUnavailable(server.serverUrl);
  }, 360_000);
});
