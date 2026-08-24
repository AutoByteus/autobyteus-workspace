import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import type { TaskDelegationRecordV1 } from "../../../../src/agent-team-execution/task-delegation/task-delegation-record-v1.js";
import { TaskDelegationRecordsV1Store } from "../../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { TeamCommunicationV1Store } from "../../../../src/services/team-communication/team-communication-v1-store.js";
import { TeamRunStatePackageLoader } from "../../../../src/run-history/services/team-run-state-package-loader.js";
import {
  resetTeamRunPackageCatalog,
  TeamRunPackageCatalog,
} from "../../../../src/run-history/services/team-run-package-catalog.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamRunFileCommitWriter } from "../../../../src/run-history/store/team-run-file-commit-writer.js";
import {
  address,
  testAgentNode,
  testExecutionTree,
} from "../../../fixtures/current-team-run-fixtures.js";

const CREATED_AT = "2026-08-15T10:00:00.000Z";
const SETTLED_AT = "2026-08-15T10:05:00.000Z";

type TaskFixture = Readonly<{
  taskId: string;
  agentRunId: string;
  status: "active" | "accepted" | "interrupted";
  settledAt: string | null;
}>;

const taskUpdates = (task: TaskFixture): TaskDelegationRecordV1["updates"] => {
  if (task.status === "active") return [];
  if (task.status === "interrupted") {
    return [{
      interruptionId: `${task.taskId}_interruption_existing`,
      reason: "Interrupted before the process stopped.",
      createdAt: SETTLED_AT,
    }];
  }
  return [{
    submissionId: `${task.taskId}_submission`,
    message: "Completed work.",
    referenceFiles: [],
    createdAt: CREATED_AT,
  }, {
    reviewId: `${task.taskId}_review`,
    reviewedSubmissionId: `${task.taskId}_submission`,
    decision: "accept",
    comment: null,
    referenceFiles: [],
    createdAt: SETTLED_AT,
  }];
};

const createPackage = (rootTeamRunId: string, tasks: readonly TaskFixture[], orphanRunId?: string) => {
  const coordinator = testAgentNode("/A", { agentRunId: `${rootTeamRunId}-coordinator` });
  const baseTree = testExecutionTree({
    rootTeamRunId,
    coordinatorAddress: "/A",
    children: [coordinator],
    createdAt: CREATED_AT,
  });
  const taskExecutions = tasks.map((task) => ({
    address: address("/A"),
    agentRunId: task.agentRunId,
    platformAgentRunId: null,
    startedAt: CREATED_AT,
    settledAt: task.settledAt,
  }));
  if (orphanRunId) {
    taskExecutions.push({
      address: address("/A"),
      agentRunId: orphanRunId,
      platformAgentRunId: null,
      startedAt: CREATED_AT,
      settledAt: null,
    });
  }
  return {
    executionTree: {
      ...baseTree,
      rootTeam: { ...baseTree.rootTeam, taskExecutions },
    },
    taskRecords: {
      schemaVersion: 1 as const,
      rootTeamRunId,
      records: tasks.map((task): TaskDelegationRecordV1 => ({
        taskId: task.taskId,
        delegatorAgentRunId: coordinator.agentRunId,
        recipientAddress: address("/A"),
        taskExecution: { agentRunId: task.agentRunId },
        description: `Work for ${task.taskId}`,
        referenceFiles: [],
        status: task.status,
        updates: taskUpdates(task),
        createdAt: CREATED_AT,
      })),
    },
    communicationMessages: {
      schemaVersion: 1 as const,
      rootTeamRunId,
      messages: [],
    },
  };
};

describe("TeamRunPackageCatalog V2 restart repair", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-v1-catalog-"));
    layout = new AgentMemoryLayout(memoryDir);
    resetTeamRunPackageCatalog(memoryDir);
  });

  afterEach(async () => {
    resetTeamRunPackageCatalog(memoryDir);
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  const writePackage = async (rootTeamRunId: string, state: ReturnType<typeof createPackage>) => {
    const teamMemoryDir = layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
    await expect(new TeamRunExecutionTreeStore().write(teamMemoryDir, state.executionTree))
      .resolves.toMatchObject({ outcome: "committed" });
    await expect(new TaskDelegationRecordsV1Store().write(teamMemoryDir, state.taskRecords))
      .resolves.toMatchObject({ outcome: "committed" });
    await expect(new TeamCommunicationV1Store().write(teamMemoryDir, state.communicationMessages))
      .resolves.toMatchObject({ outcome: "committed" });
    return teamMemoryDir;
  };

  it("repairs stale task state before admission and remains idempotent for explicit reopen", async () => {
    const rootTeamRunId = "restart-root";
    const state = createPackage(rootTeamRunId, [{
      taskId: "task-active",
      agentRunId: "task-active-run",
      status: "active",
      settledAt: null,
    }, {
      taskId: "task-accepted",
      agentRunId: "task-accepted-run",
      status: "accepted",
      settledAt: null,
    }], "orphan-task-run");
    const teamMemoryDir = await writePackage(rootTeamRunId, state);

    const catalog = new TeamRunPackageCatalog(memoryDir);
    await catalog.rebuild();

    expect(catalog.listAdmittedRootIds()).toEqual([rootTeamRunId]);
    expect(catalog.getDiagnostics()).toEqual(new Map());

    const treeStore = new TeamRunExecutionTreeStore();
    const taskStore = new TaskDelegationRecordsV1Store();
    const repairedTree = await treeStore.read(teamMemoryDir, rootTeamRunId);
    const repairedTasks = await taskStore.read(teamMemoryDir, rootTeamRunId);
    expect(repairedTasks?.records.map((task) => task.status)).toEqual(["interrupted", "accepted"]);
    expect(repairedTasks?.records[0]?.updates).toEqual([expect.objectContaining({
      interruptionId: "task-active_interruption_restart",
    })]);
    expect(repairedTasks?.records[1]?.updates).toEqual(state.taskRecords.records[1]?.updates);
    expect(repairedTree?.rootTeam.taskExecutions.map((task) => "agentRunId" in task && task.agentRunId))
      .toEqual(["task-active-run", "task-accepted-run"]);
    const settlementTimes = repairedTree?.rootTeam.taskExecutions.map((task) => task.settledAt);
    expect(settlementTimes?.every((settledAt) => typeof settledAt === "string")).toBe(true);
    expect(new Set(settlementTimes).size).toBe(1);
    expect(repairedTasks?.records[0]?.updates[0]).toMatchObject({ createdAt: settlementTimes?.[0] });

    const explicitReopenLoader = new TeamRunStatePackageLoader({
      executionTreeStore: treeStore,
      taskRecordsStore: taskStore,
      communicationStore: new TeamCommunicationV1Store(),
    });
    await expect(explicitReopenLoader.loadAndRepair({ teamMemoryDir, rootTeamRunId }))
      .resolves.toMatchObject({ loaded: true, repaired: false });
  });

  it("excludes only a root whose required repair write fails", async () => {
    const failedRoot = "a-failed-root";
    const validRoot = "b-valid-root";
    await writePackage(failedRoot, createPackage(failedRoot, [{
      taskId: "task-active",
      agentRunId: "failed-active-run",
      status: "active",
      settledAt: null,
    }]));
    await writePackage(validRoot, createPackage(validRoot, [{
      taskId: "task-interrupted",
      agentRunId: "valid-interrupted-run",
      status: "interrupted",
      settledAt: SETTLED_AT,
    }]));

    const failingWriter = new TeamRunFileCommitWriter({
      operations: {
        mkdir: fs.mkdir,
        open: fs.open,
        rename: vi.fn(async () => { throw new Error("injected rename failure"); }),
        rm: fs.rm,
      },
    });
    const loader = new TeamRunStatePackageLoader({
      executionTreeStore: new TeamRunExecutionTreeStore(failingWriter),
      taskRecordsStore: new TaskDelegationRecordsV1Store(failingWriter),
      communicationStore: new TeamCommunicationV1Store(failingWriter),
    });
    const catalog = new TeamRunPackageCatalog(memoryDir, loader);

    await catalog.rebuild();

    expect(catalog.listAdmittedRootIds()).toEqual([validRoot]);
    expect(catalog.getDiagnostics().get(failedRoot)).toContain("TEAM_RUN_STATE_REPAIR_FAILED");
    expect(catalog.getDiagnostics().get(failedRoot)).toContain("not_renamed");
    expect(catalog.getDiagnostics().has(validRoot)).toBe(false);

    catalog.admit("new-root");
    expect(catalog.isAdmitted("new-root")).toBe(true);
  });
});
