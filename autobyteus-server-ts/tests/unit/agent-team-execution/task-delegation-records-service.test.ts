import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskDelegationRecordsService } from "../../../src/agent-team-execution/task-delegation/records/task-delegation-records-service.js";
import type { TaskDelegationPersistenceScope } from "../../../src/agent-team-execution/task-delegation/task-delegation-persistence-scope.js";
import type { TaskDelegationRecord } from "../../../src/agent-team-execution/task-delegation/task-delegation-record.js";

const memberAddress = (memberRouteKey: string) => ({
  segments: [{ kind: "member" as const, memberRouteKey }],
});

const record = (taskId: string): TaskDelegationRecord => ({
  taskId,
  status: "active",
  senderAddress: memberAddress("coordinator"),
  receiverAddress: memberAddress("worker"),
  receiverTargetKind: "member",
  content: `Task ${taskId}`,
  referenceFiles: [
    {
      referenceId: `${taskId}-ref`,
      path: `/tmp/${taskId}.md`,
      type: "file",
      createdAt: "2026-07-02T00:00:00.000Z",
      updatedAt: "2026-07-02T00:00:00.000Z",
    },
  ],
  taskRun: {
    address: {
      segments: [
        { kind: "member", memberRouteKey: "worker" },
        { kind: "task_agent", taskAgentRunId: `${taskId}-run` },
      ],
    },
    startedAt: "2026-07-02T00:01:00.000Z",
  },
  updates: [],
  createdAt: "2026-07-02T00:00:00.000Z",
});

describe("TaskDelegationRecordsService", () => {
  const tempDirs: string[] = [];

  const createTempDir = async (): Promise<string> => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "task-delegation-records-"));
    tempDirs.push(dir);
    return dir;
  };

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("allocates ids and persists child-scope records in the root team records file", async () => {
    const memoryDir = await createTempDir();
    const rootTeamRunId = "root-team-run";
    const rootDir = path.join(memoryDir, "agent_teams", rootTeamRunId);
    await fs.mkdir(rootDir, { recursive: true });
    await fs.writeFile(
      path.join(rootDir, "task_delegation_records.json"),
      JSON.stringify({ teamRunId: rootTeamRunId, records: [record("task_0007")] }),
      "utf-8",
    );
    const service = new TaskDelegationRecordsService({ memoryDir });
    const childScope: TaskDelegationPersistenceScope = {
      rootTeamRunId,
      currentTeamRunId: "task-team-run",
      teamRunPath: ["task-team-run"],
    };

    await expect(service.reserveTaskId(childScope)).resolves.toBe("task_0008");
    await service.persistRecord(childScope, record("task_0008"));

    const rootFile = JSON.parse(
      await fs.readFile(path.join(rootDir, "task_delegation_records.json"), "utf-8"),
    ) as { teamRunId: string; records: TaskDelegationRecord[] };
    expect(rootFile.teamRunId).toBe(rootTeamRunId);
    expect(rootFile.records.map((entry) => entry.taskId)).toEqual(["task_0007", "task_0008"]);
    await expect(
      fs.access(path.join(rootDir, "task-team-run", "task_delegation_records.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("degrades missing or corrupt records files to an empty list with a warning", async () => {
    const memoryDir = await createTempDir();
    const service = new TaskDelegationRecordsService({ memoryDir });
    await expect(service.getTaskDelegationRecords("missing-team")).resolves.toEqual([]);

    const rootDir = path.join(memoryDir, "agent_teams", "corrupt-team");
    await fs.mkdir(rootDir, { recursive: true });
    await fs.writeFile(path.join(rootDir, "task_delegation_records.json"), "{bad-json", "utf-8");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(service.getTaskDelegationRecords("corrupt-team")).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("TaskDelegationRecordsStore: failed reading records"));
  });

  it("resolves task-owned references from persisted root records", async () => {
    const memoryDir = await createTempDir();
    const service = new TaskDelegationRecordsService({ memoryDir });
    const scope: TaskDelegationPersistenceScope = {
      rootTeamRunId: "root-team-run",
      currentTeamRunId: "root-team-run",
      teamRunPath: [],
    };
    await service.persistRecord(scope, record("task_0001"));

    await expect(
      service.resolveReference({
        rootTeamRunId: "root-team-run",
        taskId: "task_0001",
        referenceId: "task_0001-ref",
      }),
    ).resolves.toMatchObject({
      record: { taskId: "task_0001" },
      reference: { path: "/tmp/task_0001.md" },
    });
  });
});
