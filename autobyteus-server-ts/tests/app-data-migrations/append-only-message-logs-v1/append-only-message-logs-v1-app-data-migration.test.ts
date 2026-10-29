import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollaborationCommunicationMessage } from "../../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import { AgentOrgCommunicationMessagesStore } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js";
import type { AppDataMigrationDefinition, AppDataMigrationRecordSnapshot } from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import {
  validateAgentOrgCommunicationMessages,
  validateStandaloneRootMessages,
  validateTeamCommunicationMessagesPayload,
} from "../../../src/app-data-migrations/frozen/released-run-package-shapes/released-message-logs-before-append-only.js";
import {
  APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID,
  AppendOnlyMessageLogsV1AppDataMigration,
  LOG_WRITING_PREDECESSOR_IDS,
} from "../../../src/app-data-migrations/migrations/append-only-message-logs-v1/append-only-message-logs-v1-app-data-migration.js";
import { TaskAgentOwnRunV1AppDataMigration, TASK_AGENT_OWN_RUN_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.js";
import { DelegatedCopyOwnFileCompleteV1AppDataMigration } from "../../../src/app-data-migrations/migrations/delegated-copy-own-file-complete-v1/delegated-copy-own-file-complete-v1-app-data-migration.js";
import { TeamRunMigrationStateClassifier } from "../../../src/app-data-migrations/frozen/team-run-migration-state-classifier.js";
import { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-constants.js";
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { AGENT_ORG_RUN_TREE_SHAPE, STANDALONE_ROOT_TREE_SHAPE, TEAM_RUN_TREE_SHAPE } from "../../../src/run-history/store/coordinating-tree-shapes.js";
import { MESSAGE_LOG_ROTATION_LIMIT_BYTES, MessageLog, type MessageLogBaseName } from "../../../src/run-history/store/message-log.js";
import { MessageLog as FrozenMessageLog } from "../../../src/app-data-migrations/frozen/server/run-history/store/message-log.js";
import { composeMessageLogs, taskAgentLogOwners } from "../../../src/run-history/store/task-agent-message-logs.js";
import { agentRunIdsOfTree } from "../../../src/run-history/store/task-execution-tree-split.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamCommunicationStore } from "../../../src/services/team-communication/team-communication-store.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { T0, writeReleasedDataRoot } from "../../fixtures/app-data-migrations/released-task-agent-layout-fixtures.js";
import { InMemoryMigrationLedger, runStart } from "../../helpers/migration-start-harness.js";

/**
 * `20261018_append_only_message_logs_v1` (design DS-005; AC-004, AC-006, AC-007) on faithful synthesized
 * released data (never user data): every log kind of the shape inventory, rotation of large logs, the
 * gate, interruption at each step, reappeared JSON, a second start, and the interplay with
 * `20261017_task_agent_own_run_v1` in real runner order.
 */

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    resetRootRunPackageReadinessIndex(path.join(root, "memory"));
    await fs.rm(root, { recursive: true, force: true });
  }
});

const dataRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "append-only-logs-migration-")); roots.push(root);
  return { root, memory: path.join(root, "memory") };
};
const ledgerWith = (pending: readonly string[] = []) => ({
  getRecord: async (migrationId: string) => ({ migrationId, status: pending.includes(migrationId) ? "FAILED" : "SUCCEEDED" }) as AppDataMigrationRecordSnapshot,
});
const convert = (memory: string, pending: readonly string[] = []) =>
  new AppendOnlyMessageLogsV1AppDataMigration(memory, { ledger: ledgerWith(pending) }).execute();
const ownRun = (memory: string) => new TaskAgentOwnRunV1AppDataMigration(memory, { ledger: ledgerWith() }).execute();
/**
 * The own-file completion (`20261019_delegated_copy_own_file_complete_v1`) runs in the same start; it touches no
 * message log, so it runs here right after own-run and the current stores compose every copy, as the app sees them.
 */
const completeOwnFiles = (memory: string) => new DelegatedCopyOwnFileCompleteV1AppDataMigration(memory, { ledger: ledgerWith() }).execute();

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const put = async (file: string, value: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === "string" ? value : json(value));
};
const at = (second: number) => new Date(Date.UTC(2026, 9, 2, 8, 0, second)).toISOString();
const message = (messageId: string, senderAgentRunId: string, receiverAgentRunId: string, second: number, content = `content ${messageId}`) => ({
  messageId, senderAgentRunId, receiverAgentRunId, content, messageType: "agent_message", referenceFiles: ["/work/project/notes.md"], createdAt: at(second),
});
const launch = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work/project" };
const configuredAgent = (address: string, agentRunId: string) => ({
  address, agentDefinitionId: address.slice(1), role: null, description: null, agentRunId, platformAgentRunId: null, launchConfiguration: launch,
});
/** A released team run tree in own-run's input shape, without task agents. */
const teamTree = (teamRunId: string, agents: readonly string[]) => ({ createdAt: T0, archivedAt: null, applicationBinding: null, handoffs: [],
  rootTeam: { address: "/", teamDefinitionId: "writing-team", teamDefinitionName: "Writing Team", teamRunId, coordinatorAddress: `/${agents[0]}`,
    defaultLaunchConfiguration: launch, members: agents.map((agent) => configuredAgent(`/${agent}`, `${agent}-${teamRunId}`)), taskExecutions: [] } });
/** A released org run tree in own-run's input shape, without task agents. */
const orgTree = (orgRunId: string, agents: readonly string[]) => ({ subjectKind: "agent_org", createdAt: T0, archivedAt: null, applicationBinding: null, handoffs: [],
  rootOrg: { address: "/", orgDefinitionId: "company", orgDefinitionName: "Company", orgRunId, defaultLaunchConfiguration: launch,
    members: agents.map((agent) => configuredAgent(`/${agent}`, `${agent}-${orgRunId}`)), taskExecutions: [] } });
const writeTeamRun = async (memory: string, id: string, messages: readonly unknown[]) => {
  const dir = path.join(memory, "agent_teams", id);
  await put(path.join(dir, "team_run_execution_tree.json"), teamTree(id, ["lead", "writer"]));
  await put(path.join(dir, "team_communication_messages.json"), { schemaVersion: 1, rootTeamRunId: id, messages });
  return dir;
};
const writeOrgRun = async (memory: string, id: string, messages: readonly unknown[]) => {
  const dir = path.join(memory, "agent_orgs", id);
  await put(path.join(dir, "agent_org_run_execution_tree.json"), orgTree(id, ["director", "analyst"]));
  await put(path.join(dir, "agent_org_communication_messages.json"), { schemaVersion: 1, subjectKind: "agent_org", orgRunId: id, messages });
  return dir;
};

const readIds = async (dir: string, baseName: MessageLogBaseName) => (await new MessageLog(dir, baseName).read())?.map((entry) => entry.messageId) ?? null;
const files = async (dir: string) => (await fs.readdir(dir)).filter((name) => name.includes("communication_messages")).sort();
/** Every message-log file under the memory root, by relative path, with its bytes. */
const logFiles = async (memory: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.includes("communication_messages")) out[path.relative(memory, full)] = await fs.readFile(full, "utf8");
    }
  };
  await walk(memory);
  return out;
};

/**
 * The stored view of every coordinating run as the code before this change composed it from the JSON
 * logs (frozen strict readers + `composeMessageLogs`), and as the current stores compose it now.
 */
const composedViews = async (memory: string, source: "json" | "current") => {
  const readJson = async <T>(file: string, validate: (value: unknown) => { messages: readonly T[] }): Promise<readonly T[]> =>
    validate(JSON.parse(await fs.readFile(file, "utf8"))).messages;
  const taskLogJson = async (owner: ReturnType<typeof taskAgentLogOwners>[number]) => {
    const file = owner.kind === "task_agent"
      ? path.join(memory, "agents", owner.agentRunId, "communication_messages.json")
      : path.join(memory, "agent_teams", owner.teamRunId, "team_communication_messages.json");
    try {
      return owner.kind === "task_agent"
        ? await readJson(file, (value) => validateStandaloneRootMessages(value, owner.agentRunId))
        : await readJson(file, (value) => validateTeamCommunicationMessagesPayload(value, owner.teamRunId));
    } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  };
  const views: Record<string, readonly CollaborationCommunicationMessage[] | null> = {};
  const hubDir = path.join(memory, "agents", "hub", "collaboration");
  const hubTree = (await new StandaloneRootPackageStore().readTree(hubDir, "hub"))!;
  views.hub = source === "current" ? (await new StandaloneRootPackageStore().readMessages(hubDir, hubTree))?.messages ?? null
    : composeMessageLogs([await readJson(path.join(hubDir, "communication_messages.json"), (value) => validateStandaloneRootMessages(value, "hub")),
      ...await Promise.all(taskAgentLogOwners(STANDALONE_ROOT_TREE_SHAPE.taskLists(hubTree).values()).map(taskLogJson))], agentRunIdsOfTree(STANDALONE_ROOT_TREE_SHAPE, hubTree));
  for (const id of ["team-r", "team-empty"]) {
    const dir = path.join(memory, "agent_teams", id);
    const tree = (await new TeamRunExecutionTreeStore().read(dir, id))!;
    views[id] = source === "current" ? (await new TeamCommunicationStore().read(dir, tree))?.messages ?? null
      : composeMessageLogs([await readJson(path.join(dir, "team_communication_messages.json"), (value) => validateTeamCommunicationMessagesPayload(value, id)),
        ...await Promise.all(taskAgentLogOwners(TEAM_RUN_TREE_SHAPE.taskLists(tree).values()).map(taskLogJson))], agentRunIdsOfTree(TEAM_RUN_TREE_SHAPE, tree));
  }
  for (const id of ["org-o", "org-empty", "org-unordered"]) {
    const dir = path.join(memory, "agent_orgs", id);
    const tree = (await new AgentOrgRunExecutionTreeStore().read(dir, id))!;
    views[id] = source === "current" ? (await new AgentOrgCommunicationMessagesStore().read(dir, tree))?.messages ?? null
      : composeMessageLogs([await readJson(path.join(dir, "agent_org_communication_messages.json"), (value) => validateAgentOrgCommunicationMessages(value, id)),
        ...await Promise.all(taskAgentLogOwners(AGENT_ORG_RUN_TREE_SHAPE.taskLists(tree).values()).map(taskLogJson))], agentRunIdsOfTree(AGENT_ORG_RUN_TREE_SHAPE, tree));
  }
  return views;
};

/**
 * The released data after `20261017_task_agent_own_run_v1` (the layout of v1.5.6-beta): a hub (F-HUB),
 * a team run and an org run with task agents (F-TEAM, F-ORG), agent task agents (F-TA-AGENT) and task
 * agent teams (F-TA-TEAM, F-TA-TEAM-EMPTY), plus an empty team run and org run (F-TEAM-EMPTY,
 * F-ORG-EMPTY), an org log not in `createdAt` order (F-ORG-UNORDERED), a detached agent task agent and
 * a detached task agent team (F-DETACHED).
 */
const releasedInstall = async () => {
  const { root, memory } = await dataRoot();
  await writeReleasedDataRoot(memory);
  expect((await ownRun(memory)).status).toBe("SUCCEEDED");
  expect((await completeOwnFiles(memory)).status).toBe("SUCCEEDED");
  await writeTeamRun(memory, "team-empty", []);
  await writeOrgRun(memory, "org-empty", []);
  await writeOrgRun(memory, "org-unordered", [
    message("u2", "director-org-unordered", "analyst-org-unordered", 30), message("u1", "analyst-org-unordered", "director-org-unordered", 10),
    message("u3", "director-org-unordered", "analyst-org-unordered", 20)]);
  // Detached: the coordinating run was deleted; the task agents' own files and logs remain.
  await put(path.join(memory, "agents", "detached-helper", "run_metadata.json"), JSON.parse(await fs.readFile(path.join(memory, "agents", "c1-reviewer", "run_metadata.json"), "utf8")));
  await put(path.join(memory, "agents", "detached-helper", "communication_messages.json"), { schemaVersion: 1, subjectKind: "agent", hostRunId: "detached-helper",
    messages: [message("d1", "gone-host", "detached-helper", 40)] });
  const detachedTeam = path.join(memory, "agent_teams", "detached-team");
  await put(path.join(detachedTeam, "team_run_execution_tree.json"), JSON.parse(await fs.readFile(path.join(memory, "agent_teams", "c4-qa", "team_run_execution_tree.json"), "utf8")));
  await put(path.join(detachedTeam, "team_communication_messages.json"), { schemaVersion: 1, rootTeamRunId: "detached-team", messages: [message("d2", "gone-host", "c4-qa-lead", 41)] });
  return { root, memory };
};

describe("20261018_append_only_message_logs_v1", () => {
  it("converts every log kind, keeps every message once with the same values, and the composed views stay equal (AC-004, AC-006)", async () => {
    const { memory } = await releasedInstall();
    const jsonLogs = Object.keys(await logFiles(memory)).filter((file) => file.endsWith(".json")).sort();
    expect(jsonLogs).toEqual([
      "agent_orgs/org-empty/agent_org_communication_messages.json", "agent_orgs/org-o/agent_org_communication_messages.json",
      "agent_orgs/org-unordered/agent_org_communication_messages.json",
      "agent_teams/c2-team-a/team_communication_messages.json", "agent_teams/c2-team-b/team_communication_messages.json",
      "agent_teams/c4-qa/team_communication_messages.json", "agent_teams/c5-review/team_communication_messages.json",
      "agent_teams/detached-team/team_communication_messages.json", "agent_teams/team-empty/team_communication_messages.json",
      "agent_teams/team-r/team_communication_messages.json",
      "agents/c1-reviewer/communication_messages.json", "agents/c3-writer-copy/communication_messages.json", "agents/c5-analyst/communication_messages.json",
      "agents/c7-helper/communication_messages.json", "agents/detached-helper/communication_messages.json",
      "agents/hub/collaboration/communication_messages.json",
    ]);
    const before = await composedViews(memory, "json");
    const jsonMessages = new Map<string, unknown[]>();
    for (const file of jsonLogs) jsonMessages.set(file, (JSON.parse(await fs.readFile(path.join(memory, file), "utf8")) as { messages: unknown[] }).messages);

    const result = await convert(memory);
    expect(result.status, JSON.stringify(result.summary.details)).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({ scannedCount: jsonLogs.length, migratedCount: jsonLogs.length, failedCount: 0, skippedCount: 0 });
    expect(Object.fromEntries(result.summary.details.map((item) => [item.itemId, item.status]))).toMatchObject({
      "agent:hub": "MIGRATED", "agent_team:team-r": "MIGRATED", "agent_org:org-o": "MIGRATED", "task_agent:c1-reviewer": "MIGRATED",
      "task_agent_team:c2-team-a": "MIGRATED", "task_agent_team:detached-team": "MIGRATED", "task_agent:detached-helper": "MIGRATED",
    });
    // No JSON log remains; each log is one active file holding exactly the JSON messages (values equal, none duplicated).
    const after = await logFiles(memory);
    expect(Object.keys(after).filter((file) => file.endsWith(".json"))).toEqual([]);
    for (const [file, messages] of jsonMessages) {
      const dir = path.dirname(path.join(memory, file));
      const baseName = path.basename(file, ".json") as MessageLogBaseName;
      expect(await files(dir)).toEqual([`${baseName}_active.jsonl`]);
      const stored = await new MessageLog(dir, baseName).read();
      expect(stored).toHaveLength(messages.length);
      expect([...stored!].sort((a, b) => a.messageId.localeCompare(b.messageId)))
        .toEqual([...messages as CollaborationCommunicationMessage[]].sort((a, b) => a.messageId.localeCompare(b.messageId)));
    }
    // The composed list of every run equals what the code before this change produced from the same JSON logs.
    expect(await composedViews(memory, "current")).toEqual(before);
    expect(before.hub!.map((entry) => entry.messageId)).toEqual(["m1", "m2", "m3", "m4", "m5"]);
    expect(before["org-unordered"]!.map((entry) => entry.messageId)).toEqual(["u1", "u3", "u2"]);
    // Readiness admits the converted runs.
    const readiness = new RootRunPackageReadinessIndex(memory); await readiness.rebuild();
    expect(readiness.listAdmitted("agent_team")).toEqual(["team-empty", "team-r"]);
    expect(readiness.listAdmitted("agent_org")).toEqual(["org-empty", "org-o", "org-unordered"]);
    expect(readiness.listAdmitted("agent")).toContain("hub");

    // A second start changes nothing.
    const converted = await logFiles(memory);
    expect(await convert(memory)).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 0 } });
    expect(await logFiles(memory)).toEqual(converted);
  });

  it("rotates a large log by the 4 MiB limit, keeping every message in order (F-HUB-LARGE, F-TEAM-LARGE, F-ORG-LARGE)", async () => {
    const { memory } = await dataRoot();
    const big = (id: string, from: string, to: string, second: number) => message(id, from, to, second, "x".repeat(1024 * 1024 + 7 * second));
    const teamMessages = Array.from({ length: 6 }, (_, index) => big(`t${index}`, "lead-team-big", "writer-team-big", index));
    const orgMessages = Array.from({ length: 9 }, (_, index) => big(`o${index}`, "director-org-big", "analyst-org-big", 20 - index));
    const teamDir = await writeTeamRun(memory, "team-big", teamMessages);
    const orgDir = await writeOrgRun(memory, "org-big", orgMessages);
    const hubDir = path.join(memory, "agents", "hub-big", "collaboration");
    await put(path.join(hubDir, "collaboration_tree.json"), { subjectKind: "agent", createdAt: T0,
      host: { address: "/assistant", agentRunId: "hub-big", agentDefinitionId: "assistant" }, taskExecutions: [] });
    const hubMessages = Array.from({ length: 5 }, (_, index) => big(`h${index}`, "hub-big", "someone", index));
    await put(path.join(hubDir, "communication_messages.json"), { schemaVersion: 1, subjectKind: "agent", hostRunId: "hub-big", messages: hubMessages });

    expect((await convert(memory)).status).toBe("SUCCEEDED");
    const lineBytes = Math.max(...[...teamMessages, ...orgMessages, ...hubMessages].map((entry) => Buffer.byteLength(`${JSON.stringify(entry)}\n`)));
    for (const [dir, baseName, messages, sealed] of [
      [teamDir, "team_communication_messages", teamMessages, 1], [orgDir, "agent_org_communication_messages", orgMessages, 2],
      [hubDir, "communication_messages", hubMessages, 1],
    ] as const) {
      const names = await files(dir);
      expect(names).toEqual([...Array.from({ length: sealed }, (_, index) => `${baseName}_00000${index + 1}.jsonl`), `${baseName}_active.jsonl`]);
      for (const name of names) expect((await fs.stat(path.join(dir, name))).size).toBeLessThanOrEqual(MESSAGE_LOG_ROTATION_LIMIT_BYTES + lineBytes);
      expect(await new MessageLog(dir, baseName).read()).toEqual([...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    }
  });

  it("keeps a log it cannot use on JSON: waiting while a log-writing predecessor is pending, preserved with a warning after (F-OLD-ADDRESS, F-UNREADABLE)", async () => {
    const { memory } = await dataRoot();
    // Tree-less team folder in the old address shape, with its predecessor backup.
    const oldAddress = path.join(memory, "agent_teams", "old-address");
    const oldBytes = json({ teamRunId: "old-address", messages: [{ messageId: "a1", senderAddress: "/lead", receiverAddress: "/writer", content: "hi" }] });
    await put(path.join(oldAddress, "team_communication_messages.json"), oldBytes);
    await put(path.join(oldAddress, "team_communication_messages.json.backup-20260701"), oldBytes);
    // A current-shape team run whose JSON log cannot be read.
    const unreadable = await writeTeamRun(memory, "unreadable", []);
    await put(path.join(unreadable, "team_communication_messages.json"), "{ not json");
    const healthy = await writeTeamRun(memory, "healthy", [message("h1", "lead-healthy", "writer-healthy", 1)]);

    const waiting = await convert(memory, [TASK_AGENT_OWN_RUN_V1_MIGRATION_ID]);
    expect(waiting.status).toBe("FAILED");
    expect(waiting.errorMessage).toMatch(/next start continues/);
    expect(Object.fromEntries(waiting.summary.details.map((item) => [item.itemId, item.message.split(":")[0]]))).toEqual({
      "agent_team:healthy": "MIGRATED", "agent_team:old-address": "WAITING_FOR_PREDECESSOR", "agent_team:unreadable": "WAITING_FOR_PREDECESSOR",
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const preserved = await convert(memory);
    expect(preserved).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", summary: { migratedCount: 0, skippedCount: 2, failedCount: 0 } });
    expect(Object.fromEntries(preserved.summary.details.map((item) => [item.itemId, item.message.split(":")[0]]))).toEqual({
      "agent_team:old-address": "PRESERVED_UNSUPPORTED", "agent_team:unreadable": "PRESERVED_UNREADABLE",
    });
    expect(warn.mock.calls.map(([line]) => String(line))).toEqual([
      expect.stringContaining("agent_team run 'old-address'"), expect.stringContaining("agent_team run 'unreadable'"),
    ]);
    // Their data is untouched; the healthy run is admitted and the others are not (the app starts).
    expect(await fs.readFile(path.join(oldAddress, "team_communication_messages.json"), "utf8")).toBe(oldBytes);
    expect(await fs.readdir(oldAddress)).toEqual(["team_communication_messages.json", "team_communication_messages.json.backup-20260701"]);
    expect(await fs.readFile(path.join(unreadable, "team_communication_messages.json"), "utf8")).toBe("{ not json");
    expect(await files(unreadable)).toEqual(["team_communication_messages.json"]);
    expect(await readIds(healthy, "team_communication_messages")).toEqual(["h1"]);
    const readiness = new RootRunPackageReadinessIndex(memory); await readiness.rebuild();
    expect(readiness.listAdmitted("agent_team")).toEqual(["healthy"]);
  });

  it("waits while every log-writing predecessor is not terminal, even with nothing left to convert", async () => {
    const { memory } = await dataRoot();
    for (const pending of LOG_WRITING_PREDECESSOR_IDS) {
      expect(await convert(memory, [pending])).toMatchObject({ status: "FAILED", summary: { scannedCount: 0 }, errorMessage: `Waiting for ${pending}; the next start continues.` });
    }
    expect(await convert(memory)).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 0 } });
  });

  describe("an interrupted conversion is continued by the next start and ends where an uninterrupted one ends (F-PARTIAL)", () => {
    const fixture = async () => {
      const { memory } = await dataRoot();
      const dir = await writeOrgRun(memory, "org-p", [message("p1", "director-org-p", "analyst-org-p", 1), message("p2", "analyst-org-p", "director-org-p", 2),
        message("p3", "director-org-p", "analyst-org-p", 3)]);
      return { memory, dir };
    };
    const clean = async () => {
      const f = await fixture();
      expect((await convert(f.memory)).status).toBe("SUCCEEDED");
      return logFiles(f.memory);
    };

    it("after a torn batch append (an unfinished last line)", async () => {
      const expected = await clean();
      const f = await fixture();
      const json = JSON.parse(await fs.readFile(path.join(f.dir, "agent_org_communication_messages.json"), "utf8"));
      await fs.writeFile(path.join(f.dir, "agent_org_communication_messages_active.jsonl"),
        `${JSON.stringify(json.messages[0])}\n${JSON.stringify(json.messages[1]).slice(0, 30)}`);
      expect((await convert(f.memory)).status).toBe("SUCCEEDED");
      expect(await logFiles(f.memory)).toEqual(expected);
    });

    it("after the append (step 3), before the read-back", async () => {
      const expected = await clean();
      const f = await fixture();
      const read = FrozenMessageLog.prototype.read;
      let calls = 0;
      vi.spyOn(FrozenMessageLog.prototype, "read").mockImplementation(async function (this: FrozenMessageLog) {
        if (++calls === 2) throw new Error("stopped before the read-back");
        return read.call(this);
      });
      expect(await convert(f.memory)).toMatchObject({ status: "FAILED", summary: { failedCount: 1 } });
      expect(await files(f.dir)).toEqual(["agent_org_communication_messages.json", "agent_org_communication_messages_active.jsonl"]);
      vi.restoreAllMocks();
      expect((await convert(f.memory)).status).toBe("SUCCEEDED");
      expect(await logFiles(f.memory)).toEqual(expected);
    });

    it("after the read-back (step 4), before the JSON is removed", async () => {
      const expected = await clean();
      const f = await fixture();
      vi.spyOn(fs, "rm").mockRejectedValueOnce(new Error("stopped before the removal"));
      expect(await convert(f.memory)).toMatchObject({ status: "FAILED", summary: { failedCount: 1 } });
      vi.restoreAllMocks();
      expect((await convert(f.memory)).status).toBe("SUCCEEDED");
      expect(await logFiles(f.memory)).toEqual(expected);
    });

    it("keeps the JSON when the read-back does not hold every JSON message with equal values", async () => {
      const f = await fixture();
      await fs.writeFile(path.join(f.dir, "agent_org_communication_messages_active.jsonl"),
        `${JSON.stringify({ ...message("p1", "director-org-p", "analyst-org-p", 1), content: "a different value" })}\n`);
      const result = await convert(f.memory);
      expect(result).toMatchObject({ status: "FAILED" });
      expect(result.summary.details[0]!.message).toContain("does not read back equal");
      expect(await files(f.dir)).toEqual(["agent_org_communication_messages.json", "agent_org_communication_messages_active.jsonl"]);
    });
  });

  it("merges a JSON log that reappears beside a converted log; older lines are read in createdAt order (F-REAPPEARED)", async () => {
    const { memory } = await dataRoot();
    const dir = await writeTeamRun(memory, "team-x", [message("x2", "lead-team-x", "writer-team-x", 20)]);
    expect((await convert(memory)).status).toBe("SUCCEEDED");
    await new TeamCommunicationStore().appendMessage(dir, "team-x", message("x3", "lead-team-x", "writer-team-x", 30), [{ kind: "coordinating" }]);
    await put(path.join(dir, "team_communication_messages.json"), { schemaVersion: 1, rootTeamRunId: "team-x",
      messages: [message("x1", "writer-team-x", "lead-team-x", 10), message("x2", "lead-team-x", "writer-team-x", 20)] });
    expect(await convert(memory)).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1 } });
    expect(await readIds(dir, "team_communication_messages")).toEqual(["x1", "x2", "x3"]);
    expect(await files(dir)).toEqual(["team_communication_messages_active.jsonl"]);
  });

  it("gives a gate-passing team run the same released classifier result before and after conversion (F-CLASSIFIER-SAME)", async () => {
    const { memory } = await releasedInstall();
    const classifier = new TeamRunMigrationStateClassifier(memory);
    const before = await classifier.classifyRoot("team-r");
    expect((await convert(memory)).status).toBe("SUCCEEDED");
    const after = await classifier.classifyRoot("team-r");
    expect(before.kind).toBe("INVALID");
    expect(after.kind).toBe(before.kind);
  });

  describe("with task-agent-own-run in real runner order", () => {
    const definitions = (memory: string, ledger: InMemoryMigrationLedger): AppDataMigrationDefinition[] => [
      new TaskAgentOwnRunV1AppDataMigration(memory, { ledger }),
      new AppendOnlyMessageLogsV1AppDataMigration(memory, { ledger }),
    ];
    const allLogs = async (memory: string) => {
      const out: Record<string, string[] | null> = {};
      for (const file of Object.keys(await logFiles(memory))) {
        const dir = path.dirname(path.join(memory, file));
        const baseName = path.basename(file).replace(/_(active|\d{6})\.jsonl$|\.json$/, "") as MessageLogBaseName;
        out[`${path.relative(memory, dir)}/${baseName}`] = await readIds(dir, baseName);
      }
      return out;
    };

    it("own-run fails in start 1 after ours converted its waiting run's log, and its retry in start 2 reads the converted log; every task agent's log is complete (F-PENDING-OWN-RUN)", async () => {
      const reference = await dataRoot();
      await writeReleasedDataRoot(reference.memory);
      const referenceLedger = new InMemoryMigrationLedger();
      await runStart({ ledger: referenceLedger, logsDir: path.join(reference.root, "logs"), real: definitions(reference.memory, referenceLedger) });
      const expected = await allLogs(reference.memory);

      const { root, memory } = await dataRoot();
      await writeReleasedDataRoot(memory);
      const ledger = new InMemoryMigrationLedger();
      const rename = fs.rename;
      vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
        if (String(from).endsWith(path.join("collaboration", "c1-reviewer"))) throw new Error("stopped before the move");
        return rename(from, to);
      });
      const first = await runStart({ ledger, logsDir: path.join(root, "logs"), real: definitions(memory, ledger) });
      expect(first[TASK_AGENT_OWN_RUN_V1_MIGRATION_ID]).toBe("FAILED");
      expect(first[APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID]).toBe("FAILED");
      // The hub's tree is in the input shape, so its log is converted while own-run is pending.
      expect(await files(path.join(memory, "agents", "hub", "collaboration"))).toEqual(["communication_messages_active.jsonl"]);
      vi.restoreAllMocks();
      const second = await runStart({ ledger, logsDir: path.join(root, "logs"), real: definitions(memory, ledger) });
      expect(second[TASK_AGENT_OWN_RUN_V1_MIGRATION_ID]).toBe("SUCCEEDED");
      expect(second[APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID]).toBe("SUCCEEDED");
      expect(Object.keys(await logFiles(memory)).filter((file) => file.endsWith(".json"))).toEqual([]);
      expect(await allLogs(memory)).toEqual(expected);
      expect((await allLogs(memory))["agents/c1-reviewer/communication_messages"]).toEqual(["m1", "m3"]);
    });

    it("own-run materializes a task agent team (an empty append-only log) and its JSON merge beside it is converted on the same start (F-OWN-RUN-UNMATERIALIZED-TEAM)", async () => {
      const { root, memory } = await dataRoot();
      await writeReleasedDataRoot(memory);
      const hubTreePath = path.join(memory, "agents", "hub", "collaboration", "collaboration_tree.json");
      const hubTree = JSON.parse(await fs.readFile(hubTreePath, "utf8"));
      const unmaterialized = { ...hubTree.taskExecutions[2], teamRunId: "c2-team-c",
        members: [{ address: "/product_team/lead", agentRunId: "c2c-lead", platformAgentRunId: null }, { address: "/product_team/designer", agentRunId: "c2c-designer", platformAgentRunId: null }] };
      await put(hubTreePath, { ...hubTree, taskExecutions: [...hubTree.taskExecutions, unmaterialized] });
      const hubLog = path.join(memory, "agents", "hub", "collaboration", "communication_messages.json");
      const log = JSON.parse(await fs.readFile(hubLog, "utf8"));
      await put(hubLog, { ...log, messages: [...log.messages, message("mc", "hub", "c2c-lead", 50)] });
      const ledger = new InMemoryMigrationLedger();
      const first = await runStart({ ledger, logsDir: path.join(root, "logs"), real: definitions(memory, ledger) });
      expect(first).toMatchObject({ [TASK_AGENT_OWN_RUN_V1_MIGRATION_ID]: "SUCCEEDED", [APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID]: "SUCCEEDED" });
      const teamDir = path.join(memory, "agent_teams", "c2-team-c");
      expect(await files(teamDir)).toEqual(["team_communication_messages_active.jsonl"]);
      expect(await readIds(teamDir, "team_communication_messages")).toEqual(["mc"]);
      const settled = await logFiles(memory);
      await runStart({ ledger, logsDir: path.join(root, "logs"), real: definitions(memory, ledger) });
      expect(await logFiles(memory)).toEqual(settled);
    });
  });

  it("keeps a not-ready run on JSON while its tree writer is pending and converts it on the start where the writer finishes (F-GATE-TREE-V1)", async () => {
    const { root, memory } = await dataRoot();
    const dir = path.join(memory, "agent_teams", "team-v1");
    // A released V1 team tree (schemaVersion 1, no root address or default launch): not own-run's input.
    await put(path.join(dir, "team_run_execution_tree.json"), { schemaVersion: 1, createdAt: T0, archivedAt: null, applicationBinding: null, handoffs: [],
      rootTeam: { teamDefinitionId: "writing-team", teamDefinitionName: "Writing Team", teamRunId: "team-v1", coordinatorAddress: "/lead",
        members: [{ address: "/lead", agentDefinitionId: "lead", agentRunId: "lead-team-v1", runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5" }], taskExecutions: [] } });
    const jsonBytes = json({ schemaVersion: 1, rootTeamRunId: "team-v1", messages: [message("v1", "lead-team-v1", "writer-team-v1", 1)] });
    await put(path.join(dir, "team_communication_messages.json"), jsonBytes);
    const ledger = new InMemoryMigrationLedger();
    let finishes = false;
    const treeWriter: AppDataMigrationDefinition = { id: TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID, displayName: "tree writer", description: "test", requiredOnStartup: true,
      execute: async () => {
        if (!finishes) return { status: "FAILED", errorMessage: "retry", summary: { scannedCount: 1, migratedCount: 0, skippedCount: 0, failedCount: 1, details: [] } };
        // What the released converter leaves: the current team tree shape.
        await put(path.join(dir, "team_run_execution_tree.json"), teamTree("team-v1", ["lead", "writer"]));
        return { status: "SUCCEEDED", summary: { scannedCount: 1, migratedCount: 1, skippedCount: 0, failedCount: 0, details: [] } };
      } };
    const start = () => runStart({ ledger, logsDir: path.join(root, "logs"),
      real: [treeWriter, new TaskAgentOwnRunV1AppDataMigration(memory, { ledger }), new AppendOnlyMessageLogsV1AppDataMigration(memory, { ledger })] });
    expect((await start())[APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID]).toBe("FAILED");
    expect(await fs.readFile(path.join(dir, "team_communication_messages.json"), "utf8")).toBe(jsonBytes);
    expect(await files(dir)).toEqual(["team_communication_messages.json"]);
    finishes = true;
    expect((await start())[APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID]).toBe("SUCCEEDED");
    expect(await files(dir)).toEqual(["team_communication_messages_active.jsonl"]);
    expect(await readIds(dir, "team_communication_messages")).toEqual(["v1"]);
  });
});
