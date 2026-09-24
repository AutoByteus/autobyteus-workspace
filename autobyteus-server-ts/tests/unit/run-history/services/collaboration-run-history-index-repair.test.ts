import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { TaskDelegationRecordsV1Store } from "../../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { TeamCommunicationV1Store } from "../../../../src/services/team-communication/team-communication-v1-store.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamRunHistoryIndexStore } from "../../../../src/run-history/store/team-run-history-index-store.js";
import { resetRootRunPackageReadinessIndex } from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import { repairCollaborationRunHistoryIndexes } from "../../../../src/run-history/maintenance/collaboration-run-history-index-repair.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) {
    resetRootRunPackageReadinessIndex(root);
    await fs.rm(root, { recursive: true, force: true });
  }
});
const fixture = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "collaboration-repair-"));
  roots.push(root);
  const id = "repair-team";
  const dir = new AgentMemoryLayout(root).getTeamDirPath({ rootTeamRunId: id, ancestorTeamRunIds: [] });
  const tree = testExecutionTree({ rootTeamRunId: id, rootTeamDefinitionId: "def", teamDefinitionName: "Team",
    coordinatorAddress: "/planner", createdAt: "2026-09-24T00:00:00.000Z",
    children: [testAgentNode("/planner", { agentRunId: "planner-run" })] });
  await Promise.all([
    new TeamRunExecutionTreeStore().write(dir, tree),
    new TaskDelegationRecordsV1Store().write(dir, { schemaVersion: 1, rootTeamRunId: id, records: [] }),
    new TeamCommunicationV1Store().write(dir, { schemaVersion: 1, rootTeamRunId: id, messages: [] }),
  ]);
  return { root, id };
};

describe("offline collaboration history repair", () => {
  it("previews missing rows without writing and requires loss acknowledgement for an absent index", async () => {
    const { root, id } = await fixture();
    const indexPath = path.join(root, "team_run_history_index.json");
    const preview = await repairCollaborationRunHistoryIndexes({ memoryDir: root });
    expect(preview[0]).toMatchObject({ family: "agent_team", missingIds: [id], applied: false, existingIndex: false });
    await expect(fs.stat(indexPath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(repairCollaborationRunHistoryIndexes({ memoryDir: root, apply: true }))
      .rejects.toThrow("acknowledge-missing-index-facts");
    const applied = await repairCollaborationRunHistoryIndexes({ memoryDir: root, apply: true,
      acknowledgeMissingIndexFacts: true });
    expect(applied[0]).toMatchObject({ applied: true, missingIds: [id] });
    expect((await new TeamRunHistoryIndexStore(root).readIndexStrict()).rows).toMatchObject([{ teamRunId: id }]);
  });

  it("backs up a valid existing index before adding only missing admitted rows", async () => {
    const { root, id } = await fixture();
    const store = new TeamRunHistoryIndexStore(root);
    await store.writeIndex([]);
    const before = await fs.readFile(path.join(root, "team_run_history_index.json"));
    const report = await repairCollaborationRunHistoryIndexes({ memoryDir: root, apply: true });
    expect(report[0]).toMatchObject({ existingIndex: true, applied: true, missingIds: [id] });
    expect(report[0]?.backupPath).toBeTruthy();
    expect(await fs.readFile(report[0]!.backupPath!)).toEqual(before);
    expect((await store.readIndexStrict()).rows).toMatchObject([{ teamRunId: id }]);
  });

  it("never overwrites a corrupt current index", async () => {
    const { root } = await fixture();
    const indexPath = path.join(root, "team_run_history_index.json");
    await fs.writeFile(indexPath, "{ broken", "utf8");
    await expect(repairCollaborationRunHistoryIndexes({ memoryDir: root, apply: true,
      acknowledgeMissingIndexFacts: true })).rejects.toThrow();
    expect(await fs.readFile(indexPath, "utf8")).toBe("{ broken");
  });
});
