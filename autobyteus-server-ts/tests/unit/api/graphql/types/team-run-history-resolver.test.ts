import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTeamRunHistoryService = vi.hoisted(() => ({
  listTeamRunHistory: vi.fn(),
  getTeamRunResumeConfig: vi.fn(),
  deleteTeamRunHistory: vi.fn(),
}));

vi.mock("../../../../../src/run-history/services/team-run-history-service.js", () => ({
  getTeamRunHistoryService: () => mockTeamRunHistoryService,
}));

import { TeamRunHistoryResolver } from "../../../../../src/api/graphql/types/team-run-history.js";

describe("TeamRunHistoryResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates listTeamRunHistory query to team service", async () => {
    mockTeamRunHistoryService.listTeamRunHistory.mockResolvedValue([
      {
        teamId: "team-1",
        teamDefinitionId: "def-1",
        teamDefinitionName: "Classroom Team",
        summary: "",
        lastActivityAt: "2026-02-15T00:00:00.000Z",
        lastKnownStatus: "IDLE",
        deleteLifecycle: "READY",
        isActive: false,
        members: [],
      },
    ]);

    const resolver = new TeamRunHistoryResolver();
    const result = await resolver.listTeamRunHistory();

    expect(mockTeamRunHistoryService.listTeamRunHistory).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]?.teamId).toBe("team-1");
  });

  it("delegates getTeamRunResumeConfig query", async () => {
    mockTeamRunHistoryService.getTeamRunResumeConfig.mockResolvedValue({
      teamId: "team-1",
      isActive: true,
      manifest: {
        teamId: "team-1",
      },
    });

    const resolver = new TeamRunHistoryResolver();
    const resume = await resolver.getTeamRunResumeConfig("team-1");

    expect(mockTeamRunHistoryService.getTeamRunResumeConfig).toHaveBeenCalledWith("team-1");
    expect(resume.teamId).toBe("team-1");
    expect(resume.isActive).toBe(true);
  });

  it("delegates deleteTeamRunHistory mutation to team service", async () => {
    mockTeamRunHistoryService.deleteTeamRunHistory.mockResolvedValue({
      success: true,
      message: "Team run deleted.",
    });

    const resolver = new TeamRunHistoryResolver();
    const result = await resolver.deleteTeamRunHistory("team-1");

    expect(mockTeamRunHistoryService.deleteTeamRunHistory).toHaveBeenCalledWith("team-1");
    expect(result).toEqual({
      success: true,
      message: "Team run deleted.",
    });
  });

  it("maps deleteTeamRunHistory unexpected errors to failure payload", async () => {
    mockTeamRunHistoryService.deleteTeamRunHistory.mockRejectedValue(
      new Error("team delete failed"),
    );

    const resolver = new TeamRunHistoryResolver();
    const result = await resolver.deleteTeamRunHistory("team-1");

    expect(result.success).toBe(false);
    expect(result.message).toContain("team delete failed");
  });
});
