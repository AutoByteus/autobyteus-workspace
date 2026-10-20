import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TASK_AGENT_OWN_RUN_V1_MIGRATION_ID, TaskAgentOwnRunV1AppDataMigration } from "../../../../src/app-data-migrations/migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.js";
import { DelegatedCopyOwnFileCompleteV1AppDataMigration } from "../../../../src/app-data-migrations/migrations/delegated-copy-own-file-complete-v1/delegated-copy-own-file-complete-v1-app-data-migration.js";
import type { AppDataMigrationRecordSnapshot } from "../../../../src/app-data-migrations/domain/app-data-migration-types.js";
import { AgentOrgRunExecutionTreeStore } from "../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import {
  AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../../../src/run-history/store/atomic-run-package-file-commit-writer.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { StandaloneRootPackageStore } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { validateStandaloneRootTreePayload } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-tree-schema.js";
import { TaskAgentMessageLogs } from "../../../../src/run-history/store/task-agent-message-logs.js";
import { MessageLog } from "../../../../src/run-history/store/message-log.js";
import { convertMessageLogsAsOnStartup } from "../../../helpers/append-only-message-log-startup.js";
import {
  HUB_MESSAGES,
  NEW_FOLDERS,
  OLD_FOLDERS,
  ORG_MESSAGES,
  TEAM_RUN_MESSAGES,
  hubRecords,
  orgRecords,
  snapshot,
  teamRunRecords,
  writeReleasedDataRoot,
} from "../../../fixtures/app-data-migrations/released-task-agent-layout-fixtures.js";

/** Design D-8, contract §8, §12.3: the startup migration over faithful released fixtures. */

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const succeededLedger = (overrides: Record<string, AppDataMigrationRecordSnapshot["status"]> = {}) => ({
  getRecord: async (migrationId: string) => ({ migrationId, status: overrides[migrationId] ?? "SUCCEEDED" }) as AppDataMigrationRecordSnapshot,
});
const dataRoot = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "task-agent-own-run-migration-"));
  roots.push(root);
  const memory = path.join(root, "memory");
  await writeReleasedDataRoot(memory);
  return memory;
};
const migrate = (memory: string, writer?: AtomicRunPackageFileCommitWriter, ledger = succeededLedger()) =>
  new TaskAgentOwnRunV1AppDataMigration(memory, { ledger, ...(writer ? { writer } : {}) }).execute();
const readJson = async (file: string): Promise<any> => JSON.parse(await fs.readFile(file, "utf8"));
const logIds = async (file: string): Promise<string[]> => (await readJson(file)).messages.map((entry: { messageId: string }) => entry.messageId);
const linkOf = (record: any) => ({ address: record.address, ...("agentRunId" in record ? { agentRunId: record.agentRunId } : { teamRunId: record.teamRunId }),
  ...(record.delegatorAgentRunId ? { delegatorAgentRunId: record.delegatorAgentRunId } : {}), startedAt: record.startedAt });
const withoutNested = (record: any) => ({ ...record, taskExecutions: [] });

describe("20261017_task_agent_own_run_v1 over every released shape", () => {
  it("moves each task agent to its own run folder with its own file, links it, and keeps every byte (F-C1..F-C7, F-NS, F-ND, F-SE, F-MSG, F-UNMATERIALIZED)", async () => {
    const memory = await dataRoot();
    const before = await snapshot(memory);
    const coordinatingLogs = ["agents/hub/collaboration/communication_messages.json", "agent_teams/team-r/team_communication_messages.json",
      "agent_orgs/org-o/agent_org_communication_messages.json"];

    const result = await migrate(memory);
    expect(result.status, JSON.stringify(result.summary.details)).toBe("SUCCEEDED");
    const dispositions = Object.fromEntries(result.summary.details.map((item) => [item.itemId.split("/").at(-1), item.message]));
    expect(dispositions).toMatchObject({ "c1-reviewer": "MIGRATED", "c7-helper": "MIGRATED", "never-ran": "SKIPPED_UNMATERIALIZED", "c6-helper": "MIGRATED" });

    // Nothing lost: every memory file of a task agent keeps its bytes under its own folder (L1); no copy remains.
    const after = await snapshot(memory);
    for (const [taskAgent, oldFolder] of Object.entries(OLD_FOLDERS)) {
      if (!oldFolder) continue;
      for (const [file, hash] of Object.entries(before).filter(([file]) => file.startsWith(`${oldFolder}/`))) {
        const nested = Object.entries(OLD_FOLDERS).find(([other, folder]) => other !== taskAgent && folder && file.startsWith(`${folder}/`) && folder.length > oldFolder.length);
        if (nested) continue;
        expect(after[`${NEW_FOLDERS[taskAgent]}/${file.slice(oldFolder.length + 1)}`], file).toBe(hash);
        expect(after[file]).toBeUndefined();
      }
    }
    // The coordinating runs keep their own memory and logs unchanged (contract §7).
    for (const file of Object.keys(before).filter((file) => !Object.values(OLD_FOLDERS).some((folder) => folder && file.startsWith(`${folder}/`)) && !file.endsWith("_tree.json"))) {
      expect(after[file], file).toBe(before[file]);
    }
    for (const file of coordinatingLogs) expect(after[file]).toBe(before[file]);

    // Own files: the facts moved with the task agent (contract §3.1, §3.2, U-3, U-4).
    expect(await readJson(path.join(memory, "agents/c1-reviewer/run_metadata.json"))).toMatchObject({
      runId: "c1-reviewer", agentDefinitionId: "code-reviewer", platformAgentRunId: "thread-c1", llmModelIdentifier: "gpt-5",
      memoryDir: path.join(memory, "agents/c1-reviewer"),
      taskAgent: { coordinatingRun: { kind: "agent", runId: "hub" }, delegatorAgentRunId: "hub", address: "/code_reviewer", origin: "catalog",
        launchSource: { origin: "agent_default", fallbacks: [] }, userLaunchSelection: hubRecords().c1.userLaunchSelection },
    });
    expect(await readJson(path.join(memory, "agents/c3-writer-copy/run_metadata.json"))).toMatchObject({
      agentDefinitionId: "writer", llmModelIdentifier: null, runtimeKind: null, workspaceRootPath: null,
      taskAgent: { coordinatingRun: { kind: "agent_team", runId: "team-r" }, origin: "configured_place" },
    });
    expect((await readJson(path.join(memory, "agents/nd-copy/run_metadata.json"))).taskAgent).not.toHaveProperty("delegatorAgentRunId");
    expect(await readJson(path.join(memory, "agents/c6-helper/run_metadata.json"))).toMatchObject({ taskAgent: { coordinatingRun: { kind: "agent_org", runId: "org-o" } } });
    expect(await readJson(path.join(memory, "agent_teams/c2-team-a/team_run_execution_tree.json"))).toMatchObject({
      rootTeam: { teamRunId: "c2-team-a", taskExecutions: [], members: [{ agentRunId: "c2a-lead", userLaunchSelection: hubRecords().c2a.members[0]!.userLaunchSelection }, { agentRunId: "c2a-designer" }] },
      taskAgent: { origin: "catalog", userLaunchSelection: hubRecords().c2a.userTeamLaunchSelection, launchSource: { origin: "team_default", fallbacks: [] } },
    });
    expect(await readJson(path.join(memory, "agents/never-ran/run_metadata.json"))).toMatchObject({ runId: "never-ran" });

    // Trees: links only; a nested copy (C7) lifted to the coordinating run's top level; C6 stays under its team.
    const hub = hubRecords();
    expect((await readJson(path.join(memory, "agents/hub/collaboration/collaboration_tree.json"))).taskExecutions)
      .toEqual([hub.c1, hub.c2a, hub.c2b, hub.neverRan, hub.c2a.taskExecutions[0]].map(linkOf));
    const org = orgRecords();
    const rawOrg = await readJson(path.join(memory, "agent_orgs/org-o/agent_org_run_execution_tree.json"));
    expect(rawOrg.rootOrg.taskExecutions).toEqual([org.c5, org.c5team, org.ns].map(linkOf));
    expect(rawOrg.rootOrg.members[1].taskExecutions).toEqual([linkOf(org.c6)]);
    // The current stores read these own files after `20261019_delegated_copy_own_file_complete_v1` converted them
    // (same start): that read-back is the combined test in its suite (design Change Sequence step 1.3).

    // Each task agent's own log holds the coordinating log's messages that belong to it (F-MSG, contract §7).
    expect(await logIds(path.join(memory, "agents/c1-reviewer/communication_messages.json"))).toEqual(["m1", "m3"]);
    expect(await logIds(path.join(memory, "agent_teams/c2-team-a/team_communication_messages.json"))).toEqual(["m2", "m3", "m4", "m5"]);
    expect(await logIds(path.join(memory, "agents/c7-helper/communication_messages.json"))).toEqual(["m4"]);
    expect(await logIds(path.join(memory, "agent_teams/c2-team-b/team_communication_messages.json"))).toEqual([]);
    expect(await logIds(path.join(memory, "agents/c3-writer-copy/communication_messages.json"))).toEqual(["m6"]);
    expect(await logIds(path.join(memory, "agent_teams/c4-qa/team_communication_messages.json"))).toEqual(["m7"]);
    expect(await logIds(path.join(memory, "agents/c5-analyst/communication_messages.json"))).toEqual(["m9"]);
    await expect(fs.access(path.join(memory, "agents/nd-copy/communication_messages.json"))).rejects.toMatchObject({ code: "ENOENT" });
    expect([HUB_MESSAGES, TEAM_RUN_MESSAGES, ORG_MESSAGES].flat()).toHaveLength(9);
  });

  it("changes nothing on a second start: same files, sizes and hashes", async () => {
    const memory = await dataRoot();
    await migrate(memory);
    const first = await snapshot(memory);
    const writes = vi.spyOn(AtomicRunPackageFileCommitWriter.prototype, "write");
    const again = await migrate(memory);
    expect(again.status).toBe("SUCCEEDED");
    expect(again.summary.migratedCount).toBe(0);
    expect(writes).not.toHaveBeenCalled();
    expect(await snapshot(memory)).toEqual(first);
  });
});

describe("one run's unreadable message log", () => {
  it("moves its task agents, warns instead of failing, and still migrates every other run", async () => {
    const memory = await dataRoot();
    await fs.writeFile(path.join(memory, "agent_teams/team-r/team_communication_messages.json"), "{ unreadable");
    const result = await migrate(memory);
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "agent_team:team-r", status: "SKIPPED", message: expect.stringMatching(/^PRESERVED_UNREADABLE_LOG/) }),
      expect.objectContaining({ itemId: "agent_team:team-r/c3-writer-copy", status: "MIGRATED" }),
    ]));
    await expect(fs.access(path.join(memory, "agents/c3-writer-copy/raw_traces_active.jsonl"))).resolves.toBeUndefined();
    expect(await logIds(path.join(memory, "agents/c5-analyst/communication_messages.json"))).toEqual(["m9"]);
  });
});

describe("a stopped start is continued by the next start (F-RERUN, F-RERUN-MSG)", () => {
  const failingOnce = (failWhen: (input: Parameters<AtomicRunPackageFileCommitWriter["write"]>[0]) => boolean) => {
    let failed = false;
    return new (class extends AtomicRunPackageFileCommitWriter {
      override async write(input: Parameters<AtomicRunPackageFileCommitWriter["write"]>[0]): Promise<RunPackageFileWriteResult<any>> {
        if (!failed && failWhen(input)) { failed = true; return { outcome: "not_renamed", file: input.file, stage: "rename", cause: new Error("stopped") }; }
        return super.write(input);
      }
    })();
  };

  it.each([
    ["writing an own file", (input: { file: string }) => input.file === "task_agent_team_tree"],
    ["reducing a tree", (input: { file: string }) => input.file === "execution_tree"],
    ["merging a log", (input: { file: string }) => input.file === "communication_messages"],
  ] as const)("ends where an uninterrupted run ends after a stop while %s", async (_step, failWhen) => {
    const clean = await dataRoot();
    await migrate(clean);
    const expected = await snapshot(clean);

    const memory = await dataRoot();
    const first = await migrate(memory, failingOnce(failWhen));
    expect(first.status).toBe("FAILED");
    expect(first.errorMessage).toMatch(/next start continues/);
    const second = await migrate(memory);
    expect(second.status, JSON.stringify(second.summary.details)).toBe("SUCCEEDED");
    expect(await snapshot(memory)).toEqual(expected);
  });

  /**
   * D-9 (SR-008, DI-002): a stop while reducing a tree leaves its task agents' own files at L1; the same start's
   * 20261019_delegated_copy_own_file_complete_v1 completes them (no `origin`). The retry still recognizes them as its
   * own output: skipped as already current, their message logs merged as by an uninterrupted run.
   */
  const stoppedThenCompleted = async () => {
    const memory = await dataRoot();
    const first = await migrate(memory, failingOnce((input) => input.file === "execution_tree"));
    expect(first.status).toBe("FAILED");
    const stopped = first.summary.details.filter((item) => item.status === "FAILED").map((item) => item.itemId.split("/").at(-1)!);
    const completion = await new DelegatedCopyOwnFileCompleteV1AppDataMigration(memory, {
      ledger: succeededLedger({ [TASK_AGENT_OWN_RUN_V1_MIGRATION_ID]: "FAILED" }),
    }).execute();
    expect(completion.status, "non-terminal while 10-17 is pending (M5)").toBe("FAILED");
    // The task agents of the stopped run whose own files are at L1, now in the current shape.
    const atL1: Array<{ runId: string; file: string }> = [];
    for (const runId of stopped) {
      const file = path.join(memory, NEW_FOLDERS[runId]!, NEW_FOLDERS[runId]!.startsWith("agents/") ? "run_metadata.json" : "team_run_execution_tree.json");
      const own = await readJson(file).catch(() => null);
      if (own) { expect(own.taskAgent, runId).not.toHaveProperty("origin"); atL1.push({ runId, file }); }
    }
    expect(atL1.length, `own files of the stopped run ${JSON.stringify(stopped)}`).toBeGreaterThanOrEqual(2);
    return { memory, atL1 };
  };
  const messageLogs = (files: Record<string, string>, runIds: readonly string[]) => Object.fromEntries(Object.entries(files)
    .filter(([file]) => runIds.some((runId) => file.startsWith(`${NEW_FOLDERS[runId]}/`)) && file.includes("communication_messages")));

  it("recognizes its own earlier output after 20261019 completed it: skipped as already current, its logs merged (D-9)", async () => {
    const clean = await dataRoot();
    await migrate(clean);
    const expected = await snapshot(clean);

    const { memory, atL1 } = await stoppedThenCompleted();
    const retried = await migrate(memory);
    expect(retried.status, JSON.stringify(retried.summary.details)).toBe("SUCCEEDED");
    const byRun = new Map(retried.summary.details.map((item) => [item.itemId.split("/").at(-1)!, item.message]));
    for (const { runId } of atL1) expect(byRun.get(runId), runId).toBe("SKIPPED_ALREADY_CURRENT");
    const ids = atL1.map(({ runId }) => runId);
    const logs = messageLogs(await snapshot(memory), ids);
    expect(Object.keys(logs).length, "the copies' merged logs").toBeGreaterThan(0);
    expect(logs).toEqual(messageLogs(expected, ids));
  });

  it("never treats a damaged own file, or one naming another run, as its own: it is kept and not overwritten (D-9, R-9 a)", async () => {
    const { memory, atL1 } = await stoppedThenCompleted();
    const [damaged, foreign] = atL1;
    await fs.writeFile(damaged!.file, "{ damaged");
    const other = await readJson(foreign!.file);
    other.taskAgent.coordinatingRun = { kind: "agent_team", runId: "another-run" };
    await fs.writeFile(foreign!.file, `${JSON.stringify(other, null, 2)}\n`);
    const before = await snapshot(memory);

    const retried = await migrate(memory);
    expect(retried.status).toBe("FAILED");
    const byRun = new Map(retried.summary.details.map((item) => [item.itemId.split("/").at(-1)!, item.message]));
    for (const { runId } of [damaged!, foreign!]) expect(byRun.get(runId), runId).toMatch(/already exists; it is never overwritten/);
    const after = await snapshot(memory);
    for (const { file } of [damaged!, foreign!]) {
      const key = path.relative(memory, file);
      expect(after[key], key).toBe(before[key]);
    }
  });

  it("continues after a stop between the move and the tree, keeping a message the app wrote in between (F-RERUN-MSG)", async () => {
    const memory = await dataRoot();
    vi.spyOn(fs, "rename").mockImplementationOnce(async () => { throw new Error("stopped before the move"); });
    expect((await migrate(memory)).status).toBe("FAILED");
    vi.restoreAllMocks();
    // The app ran in between: a moved task agent got a new message in its own log. (The app's load and save of
    // the hub's tree in between needs the own-file completion of the same start; it is in that migration's suite.)
    const own = await readJson(path.join(memory, "agents/c7-helper/run_metadata.json"));
    expect(own.taskAgent.coordinatingRun).toEqual({ kind: "agent", runId: "hub" });
    const between = { messageId: "m-between", senderAgentRunId: "hub", receiverAgentRunId: "c7-helper", content: "between", messageType: "agent_message",
      referenceFiles: [], createdAt: "2026-10-01T09:00:00.000Z" };
    await new TaskAgentMessageLogs(memory).append({ kind: "task_agent", agentRunId: "c7-helper" }, between);

    expect((await migrate(memory)).status).toBe("SUCCEEDED");
    // The app writes its own log in the append-only layout; own-run merges the coordinating log's messages
    // into the released JSON log beside it, and the append-only conversion (registered last, same start)
    // merges that into the log (F-PENDING-OWN-RUN).
    expect(await logIds(path.join(memory, "agents/c7-helper/communication_messages.json"))).toEqual(["m4"]);
    expect((await convertMessageLogsAsOnStartup(memory)).status).toBe("SUCCEEDED");
    expect((await new MessageLog(path.join(memory, "agents/c7-helper"), "communication_messages").read())?.map((entry) => entry.messageId))
      .toEqual(["m4", "m-between"]);
    await expect(fs.access(path.join(memory, "agents/c7-helper/communication_messages.json"))).rejects.toMatchObject({ code: "ENOENT" });
    expect((await readJson(path.join(memory, "agents/hub/collaboration/collaboration_tree.json"))).taskExecutions.map((task: any) => task.agentRunId ?? task.teamRunId))
      .toEqual(["c1-reviewer", "c2-team-a", "c2-team-b", "never-ran", "c7-helper"]);
  });
});

describe("the per-run input gate (F-PENDING-FAILED, contract §5.4)", () => {
  it("migrates ready runs, waits for a predecessor that can still convert a run, and preserves a tree no predecessor can read", async () => {
    const memory = await dataRoot();
    // B: a tree with collaborators that collaborators-v1 failed to convert; C: a tree no predecessor can read.
    const bTree = path.join(memory, "agents/b-host/collaboration/collaboration_tree.json");
    await fs.mkdir(path.dirname(bTree), { recursive: true });
    const bRaw = { subjectKind: "agent", createdAt: "2026-10-01T08:00:00.000Z", host: { address: "/b", agentRunId: "b-host", agentDefinitionId: "b" },
      taskExecutions: [], collaborators: [{ kind: "agent" }] };
    await fs.writeFile(bTree, JSON.stringify(bRaw));
    const cTree = path.join(memory, "agent_teams/c-root/team_run_execution_tree.json");
    await fs.mkdir(path.dirname(cTree), { recursive: true });
    await fs.writeFile(cTree, "{ unreadable");
    const ledger = succeededLedger({ "20261015_collaborators_to_delegated_runs_v1": "FAILED" });

    const result = await migrate(memory, undefined, ledger);
    expect(result.status).toBe("FAILED");
    const byItem = Object.fromEntries(result.summary.details.map((item) => [item.itemId, item]));
    expect(byItem["agent:b-host"]).toMatchObject({ status: "FAILED", message: expect.stringMatching(/^WAITING_FOR_PREDECESSOR: .*20261015_collaborators_to_delegated_runs_v1/) });
    expect(byItem["agent_team:c-root"]).toMatchObject({ status: "SKIPPED", message: expect.stringMatching(/^PRESERVED_UNSUPPORTED_TREE/) });
    expect(byItem["agent:hub/c1-reviewer"]).toMatchObject({ status: "MIGRATED" });
    expect(await readJson(bTree)).toEqual(bRaw);
    expect(await fs.readFile(cTree, "utf8")).toBe("{ unreadable");

    // A second start changes nothing for A and C; once B's predecessor succeeds, the gate no longer waits.
    const snapshotBefore = await snapshot(memory);
    expect((await migrate(memory, undefined, ledger)).status).toBe("FAILED");
    expect(await snapshot(memory)).toEqual(snapshotBefore);
    await fs.writeFile(bTree, JSON.stringify({ ...bRaw, collaborators: undefined }));
    const after = await migrate(memory);
    expect(after.status).toBe("SUCCEEDED_WITH_WARNINGS");
  });
});
