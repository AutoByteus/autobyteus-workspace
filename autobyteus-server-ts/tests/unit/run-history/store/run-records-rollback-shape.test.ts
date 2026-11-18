/**
 * Rollback shape (projects-left-navigation, SR-009, E-041; ARCH-REV-003 check 3): the history index rows this build
 * writes carry exactly the keys the released readers (base `8faae96899`) accept, so an older build keeps reading them.
 * The released allow-lists are copied here from `agent-run-history-index-store.ts` and `team-run-history-index-store.ts`
 * at `8faae96899`; a literal base-build read of this build's files is the implementation check IMP-10.
 * Run: pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/store/run-records-rollback-shape.test.ts --no-watch
 */
import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { projectAgentRunHistoryIndexRow, normalizeAgentRunHistoryIndexRow } from "../../../../src/run-history/services/agent-run-history-row-projector.js";
import { projectTeamRunHistoryIndexRow } from "../../../../src/run-history/services/team-run-history-index-row-projector.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const RELEASED_AGENT_ROW_KEYS = ["runId", "agentDefinitionId", "agentName", "workspaceRootPath", "summary", "createdAt", "archivedAt", "terminatedAt", "hasCollaboration"];
const RELEASED_TEAM_ROW_KEYS = ["teamRunId", "teamDefinitionId", "teamDefinitionName", "workspaceRootPath", "summary", "createdAt", "archivedAt", "terminatedAt"];

describe("history index rows keep the released key sets", () => {
  it("Agent rows", () => {
    const row = projectAgentRunHistoryIndexRow({
      runId: "pm-1", agentName: "PM", summary: "s", createdAt: "2026-10-31T00:00:00.000Z",
      metadata: { runId: "pm-1", agentDefinitionId: "pm", workspaceRootPath: "/ws", memoryDir: "/m", llmModelIdentifier: "m", llmConfig: null,
        autoExecuteTools: false, runtimeKind: RuntimeKind.AUTOBYTEUS, platformAgentRunId: null },
    });
    const withCollaboration = normalizeAgentRunHistoryIndexRow({ ...row, hasCollaboration: true });
    for (const value of [row, withCollaboration]) expect(Object.keys(value).every((key) => RELEASED_AGENT_ROW_KEYS.includes(key))).toBe(true);
  });

  it("Team rows", () => {
    const row = projectTeamRunHistoryIndexRow({ tree: testExecutionTree({ children: [testAgentNode("/lead")], coordinatorAddress: "/lead" }) });
    expect(Object.keys(row).sort()).toEqual([...RELEASED_TEAM_ROW_KEYS].sort());
  });
});
