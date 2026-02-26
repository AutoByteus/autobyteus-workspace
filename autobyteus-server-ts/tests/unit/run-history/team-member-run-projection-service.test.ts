import { describe, expect, it, vi } from "vitest";
import { TeamMemberRunProjectionService } from "../../../src/run-history/services/team-member-run-projection-service.js";

describe("TeamMemberRunProjectionService", () => {
  it("returns local projection when canonical local subtree has conversation", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      manifest: {
        teamDefinitionId: "team-def-1",
        memberBindings: [
          {
            memberRouteKey: "student",
            memberName: "student",
            memberAgentId: "member-student",
            hostNodeId: "node-local",
          },
        ],
      },
    });
    const projectionReader = {
      getProjection: vi.fn().mockResolvedValue({
        runId: "member-student",
        summary: "local summary",
        lastActivityAt: "2026-01-01T00:00:00.000Z",
        conversation: [{ role: "user", content: "hello" }],
      }),
    };
    const fetchFn = vi.fn();

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: {
        getTeamRunResumeConfig,
      } as any,
      projectionReader: projectionReader as any,
      fetchFn: fetchFn as any,
      resolveNodeBaseUrl: vi.fn().mockReturnValue("http://remote:8000"),
      isLocalNodeId: vi.fn((nodeId: string) => nodeId === "node-local"),
    });

    const result = await service.getProjection("team-1", "student");

    expect(result.summary).toBe("local summary");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("falls back to remote projection when local canonical subtree is empty", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      manifest: {
        teamDefinitionId: "team-def-1",
        memberBindings: [
          {
            memberRouteKey: "student",
            memberName: "student",
            memberAgentId: "member-student",
            hostNodeId: "node-remote",
          },
        ],
      },
    });
    const projectionReader = {
      getProjection: vi.fn().mockResolvedValue({
        runId: "member-student",
        summary: null,
        lastActivityAt: null,
        conversation: [],
      }),
    };
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          getTeamMemberRunProjection: {
            runId: "member-student",
            summary: "remote summary",
            lastActivityAt: "2026-01-01T00:01:00.000Z",
            conversation: [
              { role: "user", content: "hi remote" },
              { role: "assistant", content: "hello remote" },
            ],
          },
        },
      }),
    });

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: {
        getTeamRunResumeConfig,
      } as any,
      projectionReader: projectionReader as any,
      fetchFn: fetchFn as any,
      resolveNodeBaseUrl: vi.fn().mockReturnValue("http://remote:8000"),
      isLocalNodeId: vi.fn((nodeId: string) => nodeId === "node-local"),
    });

    const result = await service.getProjection("team-1", "student");

    expect(result.summary).toBe("remote summary");
    expect(result.conversation).toHaveLength(2);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const requestBody = JSON.parse(String(fetchFn.mock.calls[0]?.[1]?.body ?? "{}"));
    expect(requestBody.variables).toEqual({
      teamRunId: "team-1",
      memberRouteKey: "student",
      memberAgentId: "member-student",
    });
  });

  it("returns local fallback when remote lookup fails", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      manifest: {
        teamDefinitionId: "team-def-1",
        memberBindings: [
          {
            memberRouteKey: "student",
            memberName: "student",
            memberAgentId: "member-student",
            hostNodeId: "node-remote",
          },
        ],
      },
    });
    const localProjection = {
      runId: "member-student",
      summary: null,
      lastActivityAt: null,
      conversation: [],
    };
    const projectionReader = {
      getProjection: vi.fn().mockResolvedValue(localProjection),
    };
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Service unavailable",
    });

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: {
        getTeamRunResumeConfig,
      } as any,
      projectionReader: projectionReader as any,
      fetchFn: fetchFn as any,
      resolveNodeBaseUrl: vi.fn().mockReturnValue("http://remote:8000"),
      isLocalNodeId: vi.fn().mockReturnValue(false),
    });

    const result = await service.getProjection("team-1", "student");

    expect(result).toEqual(localProjection);
  });

  it("throws when canonical local subtree is missing for local binding", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      manifest: {
        teamDefinitionId: "team-def-1",
        memberBindings: [
          {
            memberRouteKey: "student",
            memberName: "student",
            memberAgentId: "member-student",
            hostNodeId: "node-local",
          },
        ],
      },
    });

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: {
        getTeamRunResumeConfig,
      } as any,
      projectionReader: {
        getProjection: vi.fn().mockRejectedValue(new Error("ENOENT")),
      } as any,
      fetchFn: vi.fn() as any,
      resolveNodeBaseUrl: vi.fn().mockReturnValue("http://remote:8000"),
      isLocalNodeId: vi.fn((nodeId: string) => nodeId === "node-local"),
    });

    await expect(service.getProjection("team-1", "student")).rejects.toThrow(
      "Canonical team member subtree missing",
    );
  });

  it("uses memberAgentId fallback when manifest is unavailable", async () => {
    const projectionReader = {
      getProjection: vi.fn().mockResolvedValue({
        runId: "member-student",
        summary: "fallback summary",
        lastActivityAt: "2026-01-01T00:00:00.000Z",
        conversation: [{ role: "user", content: "fallback" }],
      }),
    };

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: {
        getTeamRunResumeConfig: vi.fn().mockRejectedValue(new Error("manifest missing")),
      } as any,
      projectionReader: projectionReader as any,
      fetchFn: vi.fn() as any,
      resolveNodeBaseUrl: vi.fn().mockReturnValue("http://remote:8000"),
      isLocalNodeId: vi.fn((nodeId: string) => nodeId === "node-local"),
    });

    const result = await service.getProjection("team-1", "student", {
      memberAgentIdFallback: "member-student",
    });

    expect(result.summary).toBe("fallback summary");
    expect(projectionReader.getProjection).toHaveBeenCalledWith("team-1", "member-student");
  });
});
