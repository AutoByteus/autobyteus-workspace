import { describe, expect, it, vi } from "vitest";
import { TeamMemberRunProjectionService } from "../../../src/run-history/services/team-member-run-projection-service.js";

describe("TeamMemberRunProjectionService", () => {
  it("resolves by memberRouteKey and reads canonical projection", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      manifest: {
        memberBindings: [
          {
            memberRouteKey: "professor",
            memberName: "Professor",
            memberRunId: "member-1",
          },
        ],
      },
    });
    const getProjection = vi.fn().mockResolvedValue({
      runId: "member-1",
      summary: "hello",
      lastActivityAt: "2026-02-25T00:00:00.000Z",
      conversation: [{ role: "user", content: "hi" }],
    });

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection } as any,
    });

    const result = await service.getProjection("team-1", "professor");

    expect(getProjection).toHaveBeenCalledWith("team-1", "member-1");
    expect(result.agentRunId).toBe("member-1");
    expect(result.summary).toBe("hello");
    expect(result.conversation).toHaveLength(1);
  });

  it("falls back to member name match when route key differs", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      manifest: {
        memberBindings: [
          {
            memberRouteKey: "root/professor",
            memberName: "professor",
            memberRunId: "member-1",
          },
        ],
      },
    });
    const getProjection = vi.fn().mockResolvedValue({
      runId: "member-1",
      summary: null,
      lastActivityAt: null,
      conversation: [],
    });

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection } as any,
    });

    const result = await service.getProjection("team-1", "professor");
    expect(result.agentRunId).toBe("member-1");
  });

  it("throws when member binding is missing", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      manifest: { memberBindings: [] },
    });

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection: vi.fn() } as any,
    });

    await expect(service.getProjection("team-1", "missing")).rejects.toThrow(
      "Member route key 'missing' not found for team run 'team-1'.",
    );
  });
});
