import { describe, expect, it, vi } from "vitest";
import { TeamMemberRunProjectionService } from "../../../src/run-history/services/team-member-run-projection-service.js";

describe("TeamMemberRunProjectionService", () => {
  const createProjectionProviderRegistry = () => ({
    resolveProvider: vi.fn().mockReturnValue({
      runtimeKind: "autobyteus",
      buildProjection: vi.fn().mockResolvedValue(null),
    }),
  });

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
      projectionProviderRegistry: createProjectionProviderRegistry() as any,
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
      projectionProviderRegistry: createProjectionProviderRegistry() as any,
    });

    const result = await service.getProjection("team-1", "professor");
    expect(result.agentRunId).toBe("member-1");
  });

  it("prefers richer runtime projection when local projection is non-empty but incomplete", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      manifest: {
        workspaceRootPath: "/tmp/workspace",
        memberBindings: [
          {
            memberRouteKey: "professor",
            memberName: "Professor",
            memberRunId: "member-1",
            runtimeKind: "claude_agent_sdk",
            runtimeReference: {
              runtimeKind: "claude_agent_sdk",
              sessionId: "session-1",
            },
          },
        ],
      },
    });
    const getProjection = vi.fn().mockResolvedValue({
      runId: "member-1",
      summary: "local-summary",
      lastActivityAt: "2026-03-04T12:00:00.000Z",
      conversation: [{ role: "user", content: "turn-1" }],
    });
    const buildProjection = vi.fn().mockResolvedValue({
      runId: "member-1",
      summary: "runtime-summary",
      lastActivityAt: "2026-03-04T12:05:00.000Z",
      conversation: [
        { role: "user", content: "turn-1" },
        { role: "assistant", content: "reply-1" },
        { role: "user", content: "turn-2" },
        { role: "assistant", content: "reply-2" },
      ],
    });
    const resolveProvider = vi.fn().mockReturnValue({ buildProjection });

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection } as any,
      projectionProviderRegistry: { resolveProvider } as any,
    });

    const result = await service.getProjection("team-1", "professor");

    expect(resolveProvider).toHaveBeenCalledWith("claude_agent_sdk");
    expect(result.summary).toBe("runtime-summary");
    expect(result.conversation).toHaveLength(4);
    expect(String(result.conversation[3]?.content ?? "")).toContain("reply-2");
  });

  it("keeps local projection when runtime provider fails", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      manifest: {
        workspaceRootPath: "/tmp/workspace",
        memberBindings: [
          {
            memberRouteKey: "professor",
            memberName: "Professor",
            memberRunId: "member-1",
            runtimeKind: "claude_agent_sdk",
            runtimeReference: {
              runtimeKind: "claude_agent_sdk",
              sessionId: "session-1",
            },
          },
        ],
      },
    });
    const getProjection = vi.fn().mockResolvedValue({
      runId: "member-1",
      summary: "local-summary",
      lastActivityAt: "2026-03-04T12:00:00.000Z",
      conversation: [{ role: "user", content: "local-turn" }],
    });
    const buildProjection = vi.fn().mockRejectedValue(new Error("runtime unavailable"));
    const resolveProvider = vi.fn().mockReturnValue({ buildProjection });

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection } as any,
      projectionProviderRegistry: { resolveProvider } as any,
    });

    const result = await service.getProjection("team-1", "professor");

    expect(result.summary).toBe("local-summary");
    expect(result.conversation).toHaveLength(1);
    expect(String(result.conversation[0]?.content ?? "")).toContain("local-turn");
  });

  it("throws when member binding is missing", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      manifest: { memberBindings: [] },
    });

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection: vi.fn() } as any,
      projectionProviderRegistry: createProjectionProviderRegistry() as any,
    });

    await expect(service.getProjection("team-1", "missing")).rejects.toThrow(
      "Member route key 'missing' not found for team run 'team-1'.",
    );
  });

  it("falls back to codex thread projection when local member memory projection is empty", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      manifest: {
        workspaceRootPath: "/tmp/workspace",
        memberBindings: [
          {
            memberRouteKey: "pong",
            memberName: "pong",
            memberRunId: "pong-run",
            runtimeKind: "codex_app_server",
            runtimeReference: {
              runtimeKind: "codex_app_server",
              sessionId: "pong-run",
              threadId: "thread-1",
              metadata: null,
            },
          },
        ],
      },
    });
    const getProjection = vi.fn().mockResolvedValue({
      runId: "pong-run",
      summary: null,
      lastActivityAt: null,
      conversation: [],
    });
    const buildProjection = vi.fn().mockResolvedValue({
      runId: "pong-run",
      summary: "summary-from-codex",
      lastActivityAt: "2026-02-26T13:00:00.000Z",
      conversation: [{ role: "user", content: "PING-TO-PONG token" }],
    });
    const resolveProvider = vi.fn().mockReturnValue({
      runtimeKind: "codex_app_server",
      buildProjection,
    });

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection } as any,
      projectionProviderRegistry: { resolveProvider } as any,
    });

    const result = await service.getProjection("team-1", "pong");

    expect(resolveProvider).toHaveBeenCalledWith("codex_app_server");
    expect(buildProjection).toHaveBeenCalledTimes(1);
    expect(result.agentRunId).toBe("pong-run");
    expect(result.summary).toBe("summary-from-codex");
    expect(result.conversation).toHaveLength(1);
  });

  it("returns an empty projection when an untouched codex member has no local traces and no runtime turns yet", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      manifest: {
        workspaceRootPath: "/tmp/workspace",
        memberBindings: [
          {
            memberRouteKey: "student",
            memberName: "student",
            memberRunId: "student-run",
            runtimeKind: "codex_app_server",
            runtimeReference: {
              runtimeKind: "codex_app_server",
              sessionId: "student-run",
              threadId: "thread-student",
              metadata: null,
            },
          },
        ],
      },
    });
    const getProjection = vi.fn().mockResolvedValue({
      runId: "student-run",
      summary: null,
      lastActivityAt: null,
      conversation: [],
    });
    const buildProjection = vi.fn().mockResolvedValue(null);
    const resolveProvider = vi.fn().mockReturnValue({
      runtimeKind: "codex_app_server",
      buildProjection,
    });

    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection } as any,
      projectionProviderRegistry: { resolveProvider } as any,
    });

    const result = await service.getProjection("team-1", "student");

    expect(resolveProvider).toHaveBeenCalledWith("codex_app_server");
    expect(buildProjection).toHaveBeenCalledTimes(1);
    expect(result.agentRunId).toBe("student-run");
    expect(result.summary).toBeNull();
    expect(result.lastActivityAt).toBeNull();
    expect(result.conversation).toEqual([]);
  });
});
