import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  history: {},
  getProjection: vi.fn(),
  getActiveTeamRun: vi.fn(),
}));

vi.mock(
  "../../../../../src/run-history/services/team-run-history-service.js",
  () => ({ getTeamRunHistoryService: () => mocks.history }),
);
vi.mock(
  "../../../../../src/run-history/services/team-member-run-view-projection-service.js",
  () => ({ getTeamMemberRunViewProjectionService: () => ({ getProjection: mocks.getProjection }) }),
);
vi.mock(
  "../../../../../src/agent-team-execution/services/agent-team-run-manager.js",
  () => ({ getAgentTeamRunManager: () => ({ getActiveTeamRun: mocks.getActiveTeamRun }) }),
);

import { TeamRunHistoryResolver } from "../../../../../src/api/graphql/types/team-run-history.js";

describe("TeamRunHistoryResolver execution checkpoint", () => {
  beforeEach(() => {
    mocks.getActiveTeamRun.mockReset();
    mocks.getProjection.mockReset();
  });

  it("exposes one exact RootTeamRun-owned checkpoint", () => {
    const checkpoint = Object.freeze({
      rootTeamRunId: "team-run-1",
      changeSequence: 7,
      hasOpenExecutionWork: false,
    });
    const getExecutionCheckpoint = vi.fn(() => checkpoint);
    mocks.getActiveTeamRun.mockReturnValue({ getExecutionCheckpoint });

    expect(new TeamRunHistoryResolver().getTeamRunExecutionCheckpoint("team-run-1")).toBe(checkpoint);
    expect(mocks.getActiveTeamRun).toHaveBeenCalledWith("team-run-1");
    expect(getExecutionCheckpoint).toHaveBeenCalledTimes(1);
  });

  it("rejects a checkpoint request for a non-active root", () => {
    mocks.getActiveTeamRun.mockReturnValue(null);
    expect(() => new TeamRunHistoryResolver().getTeamRunExecutionCheckpoint("team-run-1"))
      .toThrow("Active RootTeamRun 'team-run-1' was not found.");
  });

  it("preserves the existing non-null empty Team member projection payload", async () => {
    const emptyProjection = Object.freeze({
      agentRunId: "agent-run-1",
      conversation: Object.freeze([]),
      activities: Object.freeze([]),
      summary: null,
      lastActivityAt: null,
      hasEarlierActiveTraceEvents: false,
    });
    mocks.getProjection.mockResolvedValue(emptyProjection);

    await expect(new TeamRunHistoryResolver().getTeamMemberRunProjection(
      "team-run-1",
      "agent-run-1",
    )).resolves.toEqual(emptyProjection);
    expect(mocks.getProjection).toHaveBeenCalledWith("team-run-1", "agent-run-1");
  });
});
