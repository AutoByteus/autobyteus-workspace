import { describe, expect, it, vi } from "vitest";
import { TeamRunActivitySinkService } from "../../../src/run-history/services/team-run-activity-sink-service.js";

describe("TeamRunActivitySinkService", () => {
  it("records active status and compact summary for assistant payload", async () => {
    const teamRunHistoryService = {
      onTeamEvent: vi.fn().mockResolvedValue(undefined),
    };
    const service = new TeamRunActivitySinkService({
      teamRunHistoryService: teamRunHistoryService as any,
    });

    await service.handleTeamStreamMessage({
      teamRunId: "team-1",
      messageType: "ASSISTANT_COMPLETE",
      payload: {
        content: "  hello    world  ",
      },
    });

    expect(teamRunHistoryService.onTeamEvent).toHaveBeenCalledWith("team-1", {
      status: "ACTIVE",
      summary: "hello world",
    });
  });

  it("maps terminal team status payload to IDLE", async () => {
    const teamRunHistoryService = {
      onTeamEvent: vi.fn().mockResolvedValue(undefined),
    };
    const service = new TeamRunActivitySinkService({
      teamRunHistoryService: teamRunHistoryService as any,
    });

    await service.handleTeamStreamMessage({
      teamRunId: "team-2",
      messageType: "TEAM_STATUS",
      payload: {
        current_status: "shutdown_complete",
      },
    });

    expect(teamRunHistoryService.onTeamEvent).toHaveBeenCalledWith("team-2", {
      status: "IDLE",
      summary: undefined,
    });
  });

  it("downgrades to ERROR status for stream error payload", async () => {
    const teamRunHistoryService = {
      onTeamEvent: vi.fn().mockResolvedValue(undefined),
    };
    const service = new TeamRunActivitySinkService({
      teamRunHistoryService: teamRunHistoryService as any,
    });

    await service.handleTeamStreamMessage({
      teamRunId: "team-3",
      messageType: "ERROR",
      payload: {
        message: "routing failed",
      },
    });

    expect(teamRunHistoryService.onTeamEvent).toHaveBeenCalledWith("team-3", {
      status: "ERROR",
      summary: "routing failed",
    });
  });
});
