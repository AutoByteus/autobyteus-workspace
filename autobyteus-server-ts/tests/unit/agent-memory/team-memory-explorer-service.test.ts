import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamMemoryExplorerService } from "../../../src/agent-memory/services/team-memory-explorer-service.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { resetTeamRunHistoryCatalogState } from "../../../src/run-history/services/team-run-history-catalog-service.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamRunHistoryIndexStore } from "../../../src/run-history/store/team-run-history-index-store.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

const touch = async (filePath: string, mtime: number) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "{}", "utf8");
  const at = new Date(mtime);
  await fs.utimes(filePath, at, at);
};

describe("TeamMemoryExplorerService current V1 tree", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-memory-explorer-current-"));
    layout = new AgentMemoryLayout(memoryDir);
    const store = new TeamRunExecutionTreeStore();
    for (const [runId, agentRunId, createdAt] of [
      ["classroom-run-1", "teacher-run-1", "2026-08-14T00:00:00.000Z"],
      ["classroom-run-2", "teacher-run-2", "2026-08-15T00:00:00.000Z"],
    ] as const) {
      const tree = testExecutionTree({
        rootTeamRunId: runId,
        rootTeamDefinitionId: "classroom-team",
        teamDefinitionName: "Classroom Team",
        coordinatorAddress: "/Teacher",
        createdAt,
        children: [testAgentNode("/Teacher", { agentRunId, workspaceRootPath: `/tmp/${runId}` })],
      });
      await store.write(layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] }), tree);
    }
    await new TeamRunHistoryIndexStore(memoryDir).writeIndex([
      { teamRunId: "classroom-run-1", teamDefinitionId: "classroom-team", teamDefinitionName: "Classroom Team", workspaceRootPath: "/tmp/classroom-run-1", summary: "first lesson", createdAt: "2026-08-14T00:00:00.000Z", archivedAt: null, terminatedAt: null },
      { teamRunId: "classroom-run-2", teamDefinitionId: "classroom-team", teamDefinitionName: "Classroom Team", workspaceRootPath: "/tmp/classroom-run-2", summary: "second lesson", createdAt: "2026-08-15T00:00:00.000Z", archivedAt: null, terminatedAt: null },
    ]);
    await touch(path.join(memoryDir, "agent_teams", "classroom-run-1", "teacher-run-1", "raw_traces_active.jsonl"), Date.parse("2026-08-14T01:00:00.000Z"));
    await touch(path.join(memoryDir, "agent_teams", "classroom-run-2", "teacher-run-2", "semantic.jsonl"), Date.parse("2026-08-15T01:00:00.000Z"));
    resetTeamRunHistoryCatalogState(memoryDir);
  });

  afterEach(async () => {
    resetTeamRunHistoryCatalogState(memoryDir);
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("groups stored V1 roots by Team definition and exact configured Agent address", async () => {
    const page = await new TeamMemoryExplorerService(memoryDir).listAgentTeamsWithMemory();
    expect(page.entries).toEqual([expect.objectContaining({
      teamDefinitionId: "classroom-team",
      teamDefinitionName: "Classroom Team",
      teamRunCount: 2,
      memberMemoryCount: 1,
      memory: expect.objectContaining({ hasRawTraces: true, hasSemantic: true }),
    })]);
  });

  it("lists and filters current run/member targets without route/path compatibility identity", async () => {
    const service = new TeamMemoryExplorerService(memoryDir);
    const page = await service.listAgentTeamRunsWithMemory("classroom-team", "second lesson");
    expect(page.entries).toEqual([expect.objectContaining({
      teamRunId: "classroom-run-2",
      summary: "second lesson",
      memberTargets: [expect.objectContaining({
        memberAddress: "/Teacher",
        displayName: "Teacher",
        agentRunId: "teacher-run-2",
      })],
    })]);
  });
});
