import { describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { TeamMemberMemoryLayout } from "../../../src/agent-memory/store/team-member-memory-layout.js";
import { TeamMemberRunViewProjectionService } from "../../../src/run-history/services/team-member-run-view-projection-service.js";

vi.mock("../../../src/run-history/services/team-run-history-service.js", () => ({
  TeamRunHistoryService: class {},
  getTeamRunHistoryService: vi.fn(() => {
    throw new Error("getTeamRunHistoryService should not be used in this unit test");
  }),
}));

vi.mock("../../../src/run-history/projection/run-projection-provider-registry.js", () => ({
  getRunProjectionProviderRegistry: vi.fn(() => {
    throw new Error("getRunProjectionProviderRegistry should not be used in this unit test");
  }),
}));

describe("TeamMemberRunViewProjectionService", () => {
  const createAgentRunViewProjectionService = (result: unknown) => ({
    getProjectionFromMetadata: vi.fn().mockResolvedValue(result),
  });
  const getExpectedMemberMemoryDir = (teamRunId: string, memberRunId: string): string =>
    new TeamMemberMemoryLayout(appConfigProvider.config.getMemoryDir()).getMemberDirPath(
      teamRunId,
      memberRunId,
    );

  it("resolves by memberRouteKey and reads canonical projection", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: {
        memberMetadata: [
          {
            memberRouteKey: "professor",
            memberName: "Professor",
            memberRunId: "member-1",
            runtimeKind: "autobyteus",
            platformAgentRunId: null,
            agentDefinitionId: "agent-1",
            llmModelIdentifier: "model-1",
            autoExecuteTools: false,
            skillAccessMode: "PRELOADED_ONLY",
            llmConfig: null,
            workspaceRootPath: "/tmp/workspace",
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

    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection } as any,
      agentRunViewProjectionService: createAgentRunViewProjectionService({
        runId: "member-1",
        summary: "hello",
        lastActivityAt: "2026-02-25T00:00:00.000Z",
        conversation: [{ role: "user", content: "hi" }],
      }) as any,
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
      metadata: {
        memberMetadata: [
          {
            memberRouteKey: "root/professor",
            memberName: "professor",
            memberRunId: "member-1",
            runtimeKind: "autobyteus",
            platformAgentRunId: null,
            agentDefinitionId: "agent-1",
            llmModelIdentifier: "model-1",
            autoExecuteTools: false,
            skillAccessMode: "PRELOADED_ONLY",
            llmConfig: null,
            workspaceRootPath: "/tmp/workspace",
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

    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection } as any,
      agentRunViewProjectionService: createAgentRunViewProjectionService({
        runId: "member-1",
        summary: null,
        lastActivityAt: null,
        conversation: [],
      }) as any,
    });

    const result = await service.getProjection("team-1", "professor");
    expect(result.agentRunId).toBe("member-1");
  });

  it("delegates to agent run view projection service with local team-member projection as fallback", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: {
        memberMetadata: [
          {
            memberRouteKey: "professor",
            memberName: "Professor",
            memberRunId: "member-1",
            runtimeKind: "claude_agent_sdk",
            platformAgentRunId: "session-1",
            agentDefinitionId: "agent-1",
            llmModelIdentifier: "model-1",
            autoExecuteTools: true,
            skillAccessMode: "PRELOADED_ONLY",
            llmConfig: { temperature: 0.2 },
            workspaceRootPath: "/tmp/workspace",
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
    const getProjectionFromMetadata = vi.fn().mockResolvedValue({
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
    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection } as any,
      agentRunViewProjectionService: { getProjectionFromMetadata } as any,
    });

    const result = await service.getProjection("team-1", "professor");

    expect(getProjectionFromMetadata).toHaveBeenCalledWith({
      runId: "member-1",
      metadata: {
        runId: "member-1",
        agentDefinitionId: "agent-1",
        workspaceRootPath: "/tmp/workspace",
        memoryDir: getExpectedMemberMemoryDir("team-1", "member-1"),
        llmModelIdentifier: "model-1",
        llmConfig: { temperature: 0.2 },
        autoExecuteTools: true,
        skillAccessMode: "PRELOADED_ONLY",
        runtimeKind: "claude_agent_sdk",
        platformAgentRunId: "session-1",
        lastKnownStatus: "IDLE",
      },
      localProjection: {
        runId: "member-1",
        summary: "local-summary",
        lastActivityAt: "2026-03-04T12:00:00.000Z",
        conversation: [{ role: "user", content: "turn-1" }],
      },
      allowFallbackProvider: false,
    });
    expect(result.summary).toBe("runtime-summary");
    expect(result.conversation).toHaveLength(4);
    expect(String(result.conversation[3]?.content ?? "")).toContain("reply-2");
  });

  it("throws local projection read error when the delegated projection stays empty", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: {
        memberMetadata: [
          {
            memberRouteKey: "professor",
            memberName: "Professor",
            memberRunId: "member-1",
            runtimeKind: "claude_agent_sdk",
            platformAgentRunId: "session-1",
            agentDefinitionId: "agent-1",
            llmModelIdentifier: "model-1",
            autoExecuteTools: false,
            skillAccessMode: "PRELOADED_ONLY",
            llmConfig: null,
            workspaceRootPath: "/tmp/workspace",
          },
        ],
      },
    });
    const getProjection = vi.fn().mockRejectedValue(new Error("local unavailable"));

    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection } as any,
      agentRunViewProjectionService: createAgentRunViewProjectionService({
        runId: "member-1",
        summary: null,
        lastActivityAt: null,
        conversation: [],
      }) as any,
    });

    await expect(service.getProjection("team-1", "professor")).rejects.toThrow(
      "local unavailable",
    );
  });

  it("throws when member binding is missing", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: { memberMetadata: [] },
    });

    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection: vi.fn() } as any,
      agentRunViewProjectionService: createAgentRunViewProjectionService(null) as any,
    });

    await expect(service.getProjection("team-1", "missing")).rejects.toThrow(
      "Member route key 'missing' not found for team run 'team-1'.",
    );
  });

  it("returns delegated codex projection when local member memory projection is empty", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: {
        memberMetadata: [
          {
            memberRouteKey: "pong",
            memberName: "pong",
            memberRunId: "pong-run",
            runtimeKind: "codex_app_server",
            platformAgentRunId: "thread-1",
            agentDefinitionId: "agent-2",
            llmModelIdentifier: "model-2",
            autoExecuteTools: false,
            skillAccessMode: "PRELOADED_ONLY",
            llmConfig: null,
            workspaceRootPath: "/tmp/workspace",
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
    const getProjectionFromMetadata = vi.fn().mockResolvedValue({
      runId: "pong-run",
      summary: "summary-from-codex",
      lastActivityAt: "2026-02-26T13:00:00.000Z",
      conversation: [{ role: "user", content: "PING-TO-PONG token" }],
    });

    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection } as any,
      agentRunViewProjectionService: { getProjectionFromMetadata } as any,
    });

    const result = await service.getProjection("team-1", "pong");

    expect(getProjectionFromMetadata).toHaveBeenCalledTimes(1);
    expect(result.agentRunId).toBe("pong-run");
    expect(result.summary).toBe("summary-from-codex");
    expect(result.conversation).toHaveLength(1);
  });

  it("returns an empty projection when both local and delegated projections are empty", async () => {
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: "team-1",
      metadata: {
        memberMetadata: [
          {
            memberRouteKey: "student",
            memberName: "student",
            memberRunId: "student-run",
            runtimeKind: "codex_app_server",
            platformAgentRunId: "thread-student",
            agentDefinitionId: "agent-3",
            llmModelIdentifier: "model-3",
            autoExecuteTools: false,
            skillAccessMode: "PRELOADED_ONLY",
            llmConfig: null,
            workspaceRootPath: "/tmp/workspace",
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
    const service = new TeamMemberRunViewProjectionService({
      teamRunHistoryService: { getTeamRunResumeConfig } as any,
      projectionReader: { getProjection } as any,
      agentRunViewProjectionService: createAgentRunViewProjectionService({
        runId: "student-run",
        summary: null,
        lastActivityAt: null,
        conversation: [],
      }) as any,
    });

    const result = await service.getProjection("team-1", "student");

    expect(result.agentRunId).toBe("student-run");
    expect(result.summary).toBeNull();
    expect(result.lastActivityAt).toBeNull();
    expect(result.conversation).toEqual([]);
  });
});
