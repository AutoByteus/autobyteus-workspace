import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createSanitizedTestEnvironment,
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type DatabaseLocation = ReturnType<typeof resolveTestDatabaseLocation>;

type MigrationStatus = {
  migrationId: string;
  status: "NOT_RUN" | "RUNNING" | "SUCCEEDED" | "FAILED" | "SUCCEEDED_WITH_WARNINGS";
  recoveryAction: "MANUAL_RETRY" | "RESTART_TO_RETRY" | "NONE";
  canRetry: boolean;
  attempts: number;
  summary: string | null;
  errorMessage: string | null;
};

type Projection = {
  agentRunId: string;
  conversation: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
  summary: string | null;
  lastActivityAt: string | null;
  hasEarlierActiveTraceEvents: boolean;
};

const ROOT_TEAM_RUN_ID = "team-run-root";
const LAYOUT_MIGRATION_ID = "20260823_repair_team_agent_memory_layout";
const EXTERNAL_SNAPSHOT_MIGRATION_ID = "20260731_remove_external_runtime_working_context_snapshots";
const NATIVE_SNAPSHOT_MIGRATION_ID = "20260731_migrate_native_working_context_snapshots_v5";
const FIXTURE_ROOT = path.resolve(
  import.meta.dirname,
  "../../fixtures/app-data-migrations/team-run-execution-tree-v1/case-003-nested-task-team",
);

const ownedServers = new Set<RunningTestServer>();
const ownedTargets: Array<{ runtimeRoot: string; database: DatabaseLocation }> = [];

const makeTarget = (label: string) => {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runtimeRoot = path.join(testRuntimeRoot, `${label}-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/${label}-${suffix}.db`);
  const isolatedHome = path.join(runtimeRoot, "isolated-home");
  fs.mkdirSync(isolatedHome, { recursive: true, mode: 0o700 });
  ownedTargets.push({ runtimeRoot, database });
  return { runtimeRoot, database, isolatedHome };
};

const writeJsonl = (filePath: string, rows: Array<Record<string, unknown>>): Buffer => {
  const bytes = Buffer.from(`${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, bytes, { mode: 0o600 });
  return bytes;
};

const userTrace = (id: string, seq: number, content: string) => ({
  id,
  trace_type: "user",
  content,
  turn_id: "restart-turn",
  seq,
  ts: 1_800_000_000 + seq,
  source_event: "nested-team-restart-e2e",
});

const completeTraceRows = (token: string, includeEarlierWindow = false): Array<Record<string, unknown>> => [
  ...Array.from({ length: includeEarlierWindow ? 101 : 0 }, (_, index) =>
    userTrace(`${token}-earlier-${index}`, index + 1, `${token}-earlier-${index}`)),
  userTrace(`${token}-task`, 102, `${token}-TASK_INPUT`),
  {
    id: `${token}-reasoning`,
    trace_type: "reasoning",
    content: `${token}-REASONING`,
    turn_id: "restart-turn",
    seq: 103,
    ts: 1_800_000_103,
    source_event: "nested-team-restart-e2e",
  },
  {
    id: `${token}-tool-call`,
    trace_type: "tool_call",
    tool_call_id: `${token}-invocation`,
    tool_name: "submit_task_result",
    tool_args: { result: `${token}-RESULT` },
    turn_id: "restart-turn",
    seq: 104,
    ts: 1_800_000_104,
    source_event: "nested-team-restart-e2e",
  },
  {
    id: `${token}-tool-result`,
    trace_type: "tool_result",
    tool_call_id: `${token}-invocation`,
    tool_name: "submit_task_result",
    tool_result: { submitted: true },
    turn_id: "restart-turn",
    seq: 105,
    ts: 1_800_000_105,
    source_event: "nested-team-restart-e2e",
  },
  {
    id: `${token}-assistant`,
    trace_type: "assistant",
    content: `${token}-ASSISTANT`,
    turn_id: "restart-turn",
    seq: 106,
    ts: 1_800_000_106,
    source_event: "nested-team-restart-e2e",
  },
];

const seedAuthorityPackage = (runtimeRoot: string): string => {
  const rootDir = path.join(runtimeRoot, "memory", "agent_teams", ROOT_TEAM_RUN_ID);
  fs.mkdirSync(rootDir, { recursive: true, mode: 0o700 });
  for (const name of [
    "team_run_execution_tree.json",
    "task_delegation_records.json",
    "team_communication_messages.json",
  ]) {
    fs.copyFileSync(path.join(FIXTURE_ROOT, name), path.join(rootDir, name));
  }
  const messagesPath = path.join(rootDir, "team_communication_messages.json");
  const messages = JSON.parse(fs.readFileSync(messagesPath, "utf8")) as {
    messages: Array<{ referenceFiles: string[] }>;
  };
  messages.messages[0]!.referenceFiles = ["/workspace/software-engineering/results/browser.log"];
  fs.writeFileSync(messagesPath, `${JSON.stringify(messages, null, 2)}\n`, { mode: 0o600 });
  return rootDir;
};

const seedMemberDirectory = (
  rootDir: string,
  agentRunId: string,
  token: string,
  includeEarlierWindow = false,
) => {
  const memberDir = path.join(rootDir, agentRunId);
  const tracePath = path.join(memberDir, "raw_traces_active.jsonl");
  const traceBytes = writeJsonl(tracePath, completeTraceRows(token, includeEarlierWindow));
  const sentinelPath = path.join(memberDir, "restart-owned-sentinel.bin");
  const sentinelBytes = Buffer.from(`${token}:\u0000\u0001:whole-directory`, "utf8");
  fs.writeFileSync(sentinelPath, sentinelBytes, { mode: 0o600 });
  return { memberDir, traceBytes, sentinelBytes };
};

const canonicalMemberDir = (rootDir: string, ancestorTeamRunIds: string[], agentRunId: string): string =>
  path.join(rootDir, ...ancestorTeamRunIds, agentRunId);

const startServer = async (target: ReturnType<typeof makeTarget>): Promise<RunningTestServer> => {
  const server = await startBuiltTestServer({
    runtimeRoot: target.runtimeRoot,
    databaseUrlOverride: target.database.databaseUrl,
    environment: createSanitizedTestEnvironment({ HOME: target.isolatedHome }),
  });
  ownedServers.add(server);
  return server;
};

const stopServer = async (server: RunningTestServer): Promise<void> => {
  await server.stop();
  ownedServers.delete(server);
};

const expectHealthy = async (serverUrl: string): Promise<void> => {
  const response = await fetch(`${serverUrl}/rest/health`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(expect.objectContaining({ status: "ok" }));
};

const migrationStatuses = (serverUrl: string): Promise<MigrationStatus[]> =>
  executeGraphql<{ getAppDataMigrations: MigrationStatus[] }>(serverUrl, `
    query NestedHistoryMigrationStatuses {
      getAppDataMigrations {
        migrationId status recoveryAction canRetry attempts summary errorMessage
      }
    }
  `).then(({ getAppDataMigrations }) => getAppDataMigrations);

const requireStatus = async (serverUrl: string, migrationId: string): Promise<MigrationStatus> => {
  const status = (await migrationStatuses(serverUrl)).find((candidate) => candidate.migrationId === migrationId);
  if (!status) throw new Error(`Missing migration status '${migrationId}'.`);
  return status;
};

const projection = (serverUrl: string, agentRunId: string): Promise<Projection> =>
  executeGraphql<{ getTeamMemberRunProjection: Projection }>(serverUrl, `
    query NestedHistoryProjection($teamRunId: String!, $agentRunId: String!) {
      getTeamMemberRunProjection(teamRunId: $teamRunId, agentRunId: $agentRunId) {
        agentRunId conversation activities summary lastActivityAt hasEarlierActiveTraceEvents
      }
    }
  `, { teamRunId: ROOT_TEAM_RUN_ID, agentRunId })
    .then(({ getTeamMemberRunProjection }) => getTeamMemberRunProjection);

const eventMonitorPage = (serverUrl: string, agentRunId: string) =>
  executeGraphql<{
    getTeamMemberEventMonitorActiveTracePage: {
      hasEarlier: boolean;
      loadedEarlierCount: number;
      events: Array<{ eventId: string; visuals: Array<Record<string, unknown>> }>;
    };
  }>(serverUrl, `
    query NestedHistoryEventMonitor($teamRunId: String!, $agentRunId: String!) {
      getTeamMemberEventMonitorActiveTracePage(
        teamRunId: $teamRunId, agentRunId: $agentRunId, beforeCursor: null
      ) {
        hasEarlier loadedEarlierCount
        events {
          eventId
          visuals {
            __typename
            ... on EventMonitorUserVisual { kind text }
            ... on EventMonitorAssistantTextVisual { kind content }
            ... on EventMonitorThinkingVisual { kind content }
            ... on EventMonitorToolCardVisual { kind invocationId toolName statusKey }
          }
        }
      }
    }
  `, { teamRunId: ROOT_TEAM_RUN_ID, agentRunId })
    .then(({ getTeamMemberEventMonitorActiveTracePage }) => getTeamMemberEventMonitorActiveTracePage);

const expectProjectionTokenSet = (value: Projection, token: string, expectEarlier: boolean): void => {
  const serialized = JSON.stringify({ conversation: value.conversation, activities: value.activities });
  for (const suffix of ["TASK_INPUT", "REASONING", "RESULT", "ASSISTANT"]) {
    expect(serialized).toContain(`${token}-${suffix}`);
  }
  expect(value.lastActivityAt).toEqual(expect.any(String));
  expect(value.summary).toContain(token);
  expect(value.hasEarlierActiveTraceEvents).toBe(expectEarlier);
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

describe("nested TeamRun history startup/restart hydration", () => {
  it("moves released flat configured/task memory before public reads and remains canonical after process restart", async () => {
    const target = makeTarget("nested-history-restart-success");
    const rootDir = seedAuthorityPackage(target.runtimeRoot);
    const direct = seedMemberDirectory(rootDir, "agent-run-product-manager", "DIRECT_ROOT");
    const configured = seedMemberDirectory(rootDir, "agent-run-automation-tester", "CONFIGURED_DEEP");
    const taskAgent = seedMemberDirectory(rootDir, "nested-task-agent-run-001", "TASK_AGENT_DEEP", true);
    const taskTeamMember = seedMemberDirectory(rootDir, "task-team-agent-run-tester-001", "TASK_TEAM_MEMBER");

    const first = await startServer(target);
    await expectHealthy(first.serverUrl);
    expect(await requireStatus(first.serverUrl, LAYOUT_MIGRATION_ID)).toMatchObject({
      status: "SUCCEEDED",
      attempts: 1,
      recoveryAction: "NONE",
      canRetry: false,
      errorMessage: null,
    });

    const configuredCanonical = canonicalMemberDir(
      rootDir,
      ["team-run-qa", "team-run-automation"],
      "agent-run-automation-tester",
    );
    const taskAgentCanonical = canonicalMemberDir(
      rootDir,
      ["task-team-run-qa-001", "task-team-run-automation-001"],
      "nested-task-agent-run-001",
    );
    const taskTeamCanonical = canonicalMemberDir(
      rootDir,
      ["task-team-run-qa-001"],
      "task-team-agent-run-tester-001",
    );
    for (const [source, canonical, evidence] of [
      [configured.memberDir, configuredCanonical, configured],
      [taskAgent.memberDir, taskAgentCanonical, taskAgent],
      [taskTeamMember.memberDir, taskTeamCanonical, taskTeamMember],
    ] as const) {
      expect(fs.existsSync(source)).toBe(false);
      expect(fs.readFileSync(path.join(canonical, "raw_traces_active.jsonl"))).toEqual(evidence.traceBytes);
      expect(fs.readFileSync(path.join(canonical, "restart-owned-sentinel.bin"))).toEqual(evidence.sentinelBytes);
    }
    expect(fs.readFileSync(path.join(direct.memberDir, "raw_traces_active.jsonl"))).toEqual(direct.traceBytes);

    expectProjectionTokenSet(await projection(first.serverUrl, "agent-run-product-manager"), "DIRECT_ROOT", false);
    expectProjectionTokenSet(await projection(first.serverUrl, "agent-run-automation-tester"), "CONFIGURED_DEEP", false);
    expectProjectionTokenSet(await projection(first.serverUrl, "nested-task-agent-run-001"), "TASK_AGENT_DEEP", true);
    expectProjectionTokenSet(await projection(first.serverUrl, "task-team-agent-run-tester-001"), "TASK_TEAM_MEMBER", false);

    const page = await eventMonitorPage(first.serverUrl, "nested-task-agent-run-001");
    const serializedPage = JSON.stringify(page.events);
    expect(serializedPage).toContain("TASK_AGENT_DEEP-TASK_INPUT");
    expect(serializedPage).toContain("TASK_AGENT_DEEP-REASONING");
    expect(serializedPage).toContain("submit_task_result");
    expect(page.events.length).toBeGreaterThan(100);

    expect(await projection(first.serverUrl, "agent-run-reviewer")).toMatchObject({
      conversation: [],
      activities: [],
      summary: null,
      lastActivityAt: null,
      hasEarlierActiveTraceEvents: false,
    });

    const communication = await executeGraphql<{
      getTeamCommunicationMessages: Array<{
        messageId: string;
        senderAgentRunId: string;
        receiverAgentRunId: string;
        content: string;
        messageType: string;
        createdAt: string;
        referenceFiles: Array<{ path: string }>;
      }>;
    }>(first.serverUrl, `
      query NestedHistoryCommunication($teamRunId: String!) {
        getTeamCommunicationMessages(teamRunId: $teamRunId) {
          messageId senderAgentRunId receiverAgentRunId content messageType createdAt
          referenceFiles { path }
        }
      }
    `, { teamRunId: ROOT_TEAM_RUN_ID });
    expect(communication.getTeamCommunicationMessages).toEqual([expect.objectContaining({
      messageId: "message-010",
      senderAgentRunId: "nested-task-agent-run-001",
      receiverAgentRunId: "task-team-agent-run-qa-lead-001",
      content: "The browser run is complete; I submitted the formal result.",
      messageType: "agent_message",
      createdAt: "2026-08-14T10:31:00.000Z",
      referenceFiles: [expect.objectContaining({
        path: "/workspace/software-engineering/results/browser.log",
      })],
    })]);

    await stopServer(first);
    const second = await startServer(target);
    await expectHealthy(second.serverUrl);
    expect(await requireStatus(second.serverUrl, LAYOUT_MIGRATION_ID)).toMatchObject({
      status: "SUCCEEDED",
      attempts: 1,
    });
    expectProjectionTokenSet(await projection(second.serverUrl, "agent-run-automation-tester"), "CONFIGURED_DEEP", false);
    expectProjectionTokenSet(await projection(second.serverUrl, "nested-task-agent-run-001"), "TASK_AGENT_DEEP", true);
    expect(fs.existsSync(configured.memberDir)).toBe(false);
    expect(fs.existsSync(taskAgent.memberDir)).toBe(false);
    expect(fs.readFileSync(path.join(taskAgentCanonical, "restart-owned-sentinel.bin"))).toEqual(taskAgent.sentinelBytes);
  }, 240_000);

  it("keeps startup healthy on an invalid target and retries the remaining move through the public ANYTIME action", async () => {
    const target = makeTarget("nested-history-manual-retry");
    const rootDir = seedAuthorityPackage(target.runtimeRoot);
    const alreadyMovable = seedMemberDirectory(rootDir, "agent-run-reviewer", "MOVED_BEFORE_RETRY");
    const blocked = seedMemberDirectory(rootDir, "agent-run-architect", "BLOCKED_UNTIL_RETRY");
    const movedCanonical = canonicalMemberDir(rootDir, ["team-run-architecture"], "agent-run-reviewer");
    const blockedCanonical = canonicalMemberDir(rootDir, ["team-run-architecture"], "agent-run-architect");
    fs.mkdirSync(path.dirname(blockedCanonical), { recursive: true, mode: 0o700 });
    fs.writeFileSync(blockedCanonical, "invalid canonical target blocker\n", { mode: 0o600 });

    const server = await startServer(target);
    await expectHealthy(server.serverUrl);
    expect(server.output()).toContain("Server listening on");
    expect(await requireStatus(server.serverUrl, LAYOUT_MIGRATION_ID)).toMatchObject({
      status: "FAILED",
      attempts: 1,
      recoveryAction: "MANUAL_RETRY",
      canRetry: true,
      summary: expect.stringMatching(/^Scanned \d+; migrated 1; skipped \d+; failed 1\.$/),
      errorMessage: "1 Team Agent memory location could not be established.",
    });
    expect(fs.existsSync(alreadyMovable.memberDir)).toBe(false);
    expect(fs.readFileSync(path.join(movedCanonical, "restart-owned-sentinel.bin"))).toEqual(alreadyMovable.sentinelBytes);
    expect(fs.existsSync(blocked.memberDir)).toBe(true);
    expect(fs.statSync(blockedCanonical).isFile()).toBe(true);
    expect(await requireStatus(server.serverUrl, EXTERNAL_SNAPSHOT_MIGRATION_ID)).toMatchObject({
      status: "NOT_RUN",
      attempts: 0,
    });
    expect(await requireStatus(server.serverUrl, NATIVE_SNAPSHOT_MIGRATION_ID)).toMatchObject({
      status: "NOT_RUN",
      attempts: 0,
    });

    fs.rmSync(blockedCanonical);
    const retry = await executeGraphql<{
      runAppDataMigration: {
        success: boolean;
        message: string;
        migration: MigrationStatus | null;
      };
    }>(server.serverUrl, `
      mutation RetryNestedHistoryMigration($migrationId: String!) {
        runAppDataMigration(migrationId: $migrationId) {
          success message
          migration {
            migrationId status recoveryAction canRetry attempts summary errorMessage
          }
        }
      }
    `, { migrationId: LAYOUT_MIGRATION_ID });
    expect(retry.runAppDataMigration).toMatchObject({
      success: true,
      migration: {
        migrationId: LAYOUT_MIGRATION_ID,
        status: "SUCCEEDED",
        attempts: 2,
        recoveryAction: "NONE",
        canRetry: false,
        summary: expect.stringMatching(/^Scanned \d+; migrated 1; skipped \d+; failed 0\.$/),
        errorMessage: null,
      },
    });
    expect(fs.existsSync(blocked.memberDir)).toBe(false);
    expect(fs.readFileSync(path.join(blockedCanonical, "raw_traces_active.jsonl"))).toEqual(blocked.traceBytes);
    expectProjectionTokenSet(await projection(server.serverUrl, "agent-run-architect"), "BLOCKED_UNTIL_RETRY", false);

    const dependent = await executeGraphql<{
      runAppDataMigration: { success: boolean; migration: MigrationStatus | null };
    }>(server.serverUrl, `
      mutation RunUnblockedDependent($migrationId: String!) {
        runAppDataMigration(migrationId: $migrationId) {
          success
          migration { migrationId status recoveryAction canRetry attempts summary errorMessage }
        }
      }
    `, { migrationId: EXTERNAL_SNAPSHOT_MIGRATION_ID });
    expect(dependent.runAppDataMigration).toMatchObject({
      success: true,
      migration: {
        migrationId: EXTERNAL_SNAPSHOT_MIGRATION_ID,
        status: "SUCCEEDED",
        attempts: 1,
      },
    });
    await expectHealthy(server.serverUrl);
  }, 240_000);
});
